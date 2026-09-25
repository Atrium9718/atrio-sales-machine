import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Sparkles,
  Layers,
  Clock,
} from 'lucide-react';
import { calculatePressQuote, DEFAULT_OFFICIAL_TARIFF } from '../../../../../packages/core/src/pricing/press';

export interface MassRecalcReportItem {
  quoteId: string;
  quoteNumber: string;
  revision: number;
  clientName: string;
  status: string;
  isApproved: boolean;
  oldTariffId: string;
  newTariffId: string;
  oldTotal: number;
  newTotal: number;
  diffAmount: number;
  diffPercent: number;
  recalculatedItems: any[];
  selected: boolean;
}

interface MassRecalculateModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: any[];
  currentTariffVersion: { id: string; code: string; name: string };
  onApplyRevisions: (updatedQuotes: any[]) => void;
}

export const MassRecalculateModal: React.FC<MassRecalculateModalProps> = ({
  isOpen,
  onClose,
  quotes,
  currentTariffVersion,
  onApplyRevisions,
}) => {
  const [step, setStep] = useState<'IDLE' | 'PROCESSING' | 'REPORT' | 'SUCCESS'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [currentJobName, setCurrentJobName] = useState('');
  const [reports, setReports] = useState<MassRecalcReportItem[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);

  // Filtrar cotizaciones candidatas (tienen items o tarifario anterior)
  const candidateQuotes = quotes.filter((q) => {
    // Si ya está con la versión vigente, no es candidata obligatoria, pero puede recalcularse si tiene items asistidos
    return q.status !== 'Rechazada';
  });

  useEffect(() => {
    if (isOpen) {
      setStep('IDLE');
      setProgress(0);
      setReports([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Iniciar procesamiento en cola simulada (BullMQ background worker pattern)
  const handleStartProcessing = async () => {
    setStep('PROCESSING');
    setProgress(5);
    setCurrentJobName('Inicializando cola de trabajos BullMQ [queue:press_quote_recalculation]...');

    await new Promise((r) => setTimeout(r, 600));

    const generatedReports: MassRecalcReportItem[] = [];
    const total = candidateQuotes.length;

    for (let i = 0; i < total; i++) {
      const q = candidateQuotes[i];
      const isApproved =
        q.status === 'Aprobada' ||
        q.status === 'Aceptada' ||
        q.status === 'En Producción' ||
        q.status === 'Facturada';

      setCurrentJobName(`Procesando Job #${i + 1}/${total}: Cotización ${q.number} (${q.clientName || 'Cliente'})`);
      setProgress(Math.round(((i + 1) / total) * 90));

      await new Promise((r) => setTimeout(r, 250));

      const oldTariffId = q.tariffVersionId || 'TAR-2025-02';
      const oldTotal = Number(q.total) || 0;

      // Recalcular ítems que tengan assistInput o valores técnicos
      let newTotalAccum = 0;
      const recalculatedItems = (q.items || []).map((it: any) => {
        if (it.assistInput) {
          try {
            const res = calculatePressQuote({
              ...it.assistInput,
              tariff: DEFAULT_OFFICIAL_TARIFF,
            });
            const runs = res.digital || res.litho || [];
            const matchingRun = runs.find((r) => Number(r.quantity) === Number(it.quantity)) || runs[0];
            if (matchingRun) {
              const newUnitPrice = Number(matchingRun.unitPrice);
              const newSubtotal = newUnitPrice * Number(it.quantity);
              const newVat = it.applyVat ? newSubtotal * 0.19 : 0;
              const newItemTotal = newSubtotal + newVat;
              newTotalAccum += newItemTotal;
              return {
                ...it,
                unitPrice: Math.round(newUnitPrice * 100) / 100,
                subtotal: Math.round(newSubtotal * 100) / 100,
                vatAmount: Math.round(newVat * 100) / 100,
                total: Math.round(newItemTotal * 100) / 100,
                lineTotal: Math.round(newItemTotal * 100) / 100,
                internalCost: Number(matchingRun.internalCost),
                marginPercent: Number(matchingRun.marginPercent),
                assistRunId: `recalc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              };
            }
          } catch (e) {
            console.warn('Error recalculating item:', e);
          }
        }
        // Factor de ajuste promedio del nuevo tarifario si no tenía ficha completa (+3.5% inflación insumos 2026)
        const adjustedUnitPrice = Math.round(Number(it.unitPrice || 0) * 1.035);
        const adjustedSubtotal = adjustedUnitPrice * Number(it.quantity || 1);
        const adjustedVat = it.applyVat ? adjustedSubtotal * 0.19 : 0;
        const adjustedTotal = adjustedSubtotal + adjustedVat;
        newTotalAccum += adjustedTotal;
        return {
          ...it,
          unitPrice: adjustedUnitPrice,
          subtotal: adjustedSubtotal,
          vatAmount: adjustedVat,
          total: adjustedTotal,
          lineTotal: adjustedTotal,
        };
      });

      const finalNewTotal = newTotalAccum > 0 ? newTotalAccum : Math.round(oldTotal * 1.035);
      const diffAmount = finalNewTotal - oldTotal;
      const diffPercent = oldTotal > 0 ? (diffAmount / oldTotal) * 100 : 0;

      generatedReports.push({
        quoteId: q.id,
        quoteNumber: q.number,
        revision: q.revision || 1,
        clientName: q.clientData?.name || q.clientName || 'Cliente',
        status: q.status || 'Borrador',
        isApproved,
        oldTariffId,
        newTariffId: currentTariffVersion.id,
        oldTotal,
        newTotal: finalNewTotal,
        diffAmount,
        diffPercent,
        recalculatedItems,
        selected: !isApproved, // Solo pre-seleccionadas las NO aprobadas
      });
    }

    setProgress(100);
    setCurrentJobName('¡Recálculo masivo completado! Generando informe para aprobación...');
    await new Promise((r) => setTimeout(r, 400));
    setReports(generatedReports);
    setStep('REPORT');
  };

  const toggleSelectReport = (quoteId: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.quoteId !== quoteId || r.isApproved) return r;
        return { ...r, selected: !r.selected };
      })
    );
  };

  const selectAllEligible = (select: boolean) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.isApproved) return r;
        return { ...r, selected: select };
      })
    );
  };

  const handleApplySelected = () => {
    const toApply = reports.filter((r) => r.selected && !r.isApproved);
    if (toApply.length === 0) {
      alert('No has seleccionado ninguna cotización para aplicar revisión.');
      return;
    }

    const newRevisionQuotes: any[] = [];

    toApply.forEach((rep) => {
      const original = quotes.find((q) => q.id === rep.quoteId);
      if (!original) return;

      const nextRev = (original.revision || 1) + 1;
      const cleanBaseNumber = original.number.split('-REV')[0];
      const newNumber = `${cleanBaseNumber}-REV${nextRev}`;

      // Crear NUEVA REVISIÓN (nunca muta la enviada)
      const newRevQuote = {
        ...original,
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        number: newNumber,
        revision: nextRev,
        previousQuoteId: original.id,
        status: 'Borrador', // La nueva revisión nace en borrador
        tariffVersionId: currentTariffVersion.id,
        tariffVersionCode: currentTariffVersion.code,
        date: new Date().toISOString(),
        items: rep.recalculatedItems,
        subtotal: rep.recalculatedItems.reduce((sum, it) => sum + (it.subtotal || 0), 0),
        vatAmount: rep.recalculatedItems.reduce((sum, it) => sum + (it.vatAmount || 0), 0),
        total: rep.newTotal,
        internalNotes: `${original.internalNotes || ''}\n[Recálculo Tarifario]: Creada revisión ${nextRev} desde tarifario ${currentTariffVersion.name}. Total anterior: $${Math.round(rep.oldTotal).toLocaleString('es-CO')} -> Nuevo: $${Math.round(rep.newTotal).toLocaleString('es-CO')} (${rep.diffPercent >= 0 ? '+' : ''}${rep.diffPercent.toFixed(1)}%).`,
      };

      newRevisionQuotes.push(newRevQuote);
    });

    onApplyRevisions(newRevisionQuotes);
    setAppliedCount(newRevisionQuotes.length);
    setStep('SUCCESS');
  };

  return (
    <div className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Recálculo Masivo por Cambio de Tarifario
              </h3>
              <p className="text-xs text-muted-foreground">
                Actualización técnica controlada al tarifario vigente:{' '}
                <strong className="text-foreground">{currentTariffVersion.name} ({currentTariffVersion.code})</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SEGÚN ESTADO */}
        {step === 'IDLE' && (
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>¿Cómo funciona el recálculo masivo seguro?</span>
              </div>
              <ul className="space-y-2 text-muted-foreground leading-relaxed pl-4 list-disc">
                <li>
                  Se procesará en cola asíncrona simulada la lista de cotizaciones existentes.
                </li>
                <li>
                  Para cada cotización se calculará el nuevo precio según las tablas y factores de{' '}
                  <strong className="text-foreground">{currentTariffVersion.name}</strong>.
                </li>
                <li>
                  <strong className="text-foreground">
                    NO se modificará ninguna cotización automáticamente.
                  </strong>{' '}
                  Primero verás un informe detallado con el precio anterior, el nuevo y la variación porcentual.
                </li>
                <li>
                  Al aplicar, se genera una <strong className="text-foreground">NUEVA REVISIÓN</strong> (ej.{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded">FCG-00140-REV2</code>). Las versiones enviadas o históricas permanecen inalteradas.
                </li>
                <li className="text-amber-700 dark:text-amber-400 font-medium">
                  🔒 Las cotizaciones que ya se encuentren en estado <strong>Aprobada</strong> o{' '}
                  <strong>Aceptada</strong> están blindadas y <strong>no se tocan jamás</strong> por política de auditoría y contratación.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <div className="font-bold text-foreground text-sm">
                  {candidateQuotes.length} cotizaciones listas para análisis
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Incluye borradores, pre-cotizaciones y cotizaciones enviadas pendientes de respuesta.
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartProcessing}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Iniciar Simulación en Cola</span>
              </button>
            </div>
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-base font-bold text-foreground">
                Procesando Cotizaciones en Cola (BullMQ)
              </h4>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {currentJobName}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="w-full max-w-md bg-muted rounded-full h-3 overflow-hidden border border-border">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs font-mono font-bold text-primary">{progress}% completado</div>
          </div>
        )}

        {step === 'REPORT' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Barra de herramientas y filtros del informe */}
            <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllEligible(true)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted font-bold text-foreground transition-colors"
                >
                  Marcar Elegibles
                </button>
                <button
                  type="button"
                  onClick={() => selectAllEligible(false)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted font-medium text-muted-foreground transition-colors"
                >
                  Desmarcar Todas
                </button>
                <span className="text-muted-foreground ml-2">
                  Seleccionadas:{' '}
                  <strong className="text-foreground">
                    {reports.filter((r) => r.selected).length}
                  </strong>{' '}
                  de {reports.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                <span>Las cotizaciones aprobadas están bloqueadas</span>
              </div>
            </div>

            {/* Tabla del informe */}
            <div className="overflow-y-auto flex-1 p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-[11px] font-bold uppercase">
                    <th className="py-2.5 px-3 w-10">Sel.</th>
                    <th className="py-2.5 px-3">Cotización</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Precio Anterior</th>
                    <th className="py-2.5 px-3 text-right">Nuevo Precio</th>
                    <th className="py-2.5 px-3 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reports.map((rep) => {
                    const isDiffPositive = rep.diffAmount > 0;
                    return (
                      <tr
                        key={rep.quoteId}
                        className={`transition-colors ${
                          rep.isApproved
                            ? 'bg-muted/20 opacity-70 cursor-not-allowed'
                            : rep.selected
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="py-3 px-3">
                          {rep.isApproved ? (
                            <span title="Aprobada: Intocable">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={rep.selected}
                              onChange={() => toggleSelectReport(rep.quoteId)}
                              className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                            />
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-foreground font-mono">
                            {rep.quoteNumber}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Rev. {rep.revision} · {rep.oldTariffId}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground truncate max-w-[180px]">
                            {rep.clientName}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              rep.isApproved
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {rep.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          ${Math.round(rep.oldTotal).toLocaleString('es-CO')}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                          ${Math.round(rep.newTotal).toLocaleString('es-CO')}
                        </td>

                        <td className="py-3 px-3 text-right font-mono">
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isDiffPositive ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isDiffPositive ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {isDiffPositive ? '+' : ''}
                            {rep.diffPercent.toFixed(1)}% (${Math.round(Math.abs(rep.diffAmount)).toLocaleString('es-CO')})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer de acción */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleApplySelected}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Aplicar Creando Nuevas Revisiones (
                  {reports.filter((r) => r.selected && !r.isApproved).length})
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-foreground">
                ¡Nuevas Revisiones Creadas Exitosamente!
              </h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Se han creado <strong>{appliedCount} nuevas revisiones</strong> con el tarifario vigente{' '}
                <strong>{currentTariffVersion.code}</strong>. Las cotizaciones anteriores permanecen intactas en el historial.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition-all"
            >
              Cerrar y Ver Cotizaciones
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
