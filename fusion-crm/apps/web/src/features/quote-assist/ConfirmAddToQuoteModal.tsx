import React, { useState, useEffect } from 'react';
import { AssistFormState } from './types';
import { PressQuoteResult, PressTechnique } from '../../../../../packages/core/src/pricing/press/types';
import { getResultRuns, UnifiedRun } from './ResultsPanel';
import {
  Check,
  AlertTriangle,
  FileCheck,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
  X,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

export interface ConfirmAddToQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: AssistFormState;
  result: PressQuoteResult | null;
  tariffVersion: { id: string; code: string; name: string } | null;
  existingTariffVersionId?: string;
  quoteId?: string;
  existingItemsCount?: number;
  onConfirm: (payload: {
    items: any[];
    tariffVersionId: string;
    assistRunId: string;
    notesAppendix?: string;
  }) => void;
}

export const ConfirmAddToQuoteModal: React.FC<ConfirmAddToQuoteModalProps> = ({
  isOpen,
  onClose,
  form,
  result,
  tariffVersion,
  existingTariffVersionId,
  quoteId,
  existingItemsCount = 0,
  onConfirm,
}) => {
  // Estado local para personalización del volcado
  const [jobDescription, setJobDescription] = useState('');
  const [detailedSpecs, setDetailedSpecs] = useState('');
  const [selectedRunKeys, setSelectedRunKeys] = useState<Record<string, boolean>>({});
  const [oneLinePerQuantity, setOneLinePerQuantity] = useState(true);
  const [bothModeTechniqueChoice, setBothModeTechniqueChoice] = useState<'DIGITAL' | 'LITHO' | 'BOTH'>('LITHO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedVersionMismatch, setConfirmedVersionMismatch] = useState(false);
  const [createdDemandOrderNumber, setCreatedDemandOrderNumber] = useState<string | null>(null);

  const runs = getResultRuns(result, form.technique);

  const handleRegisterAsDemandJob = () => {
    const applicable = runs.filter((r) => {
      if (form.technique !== 'BOTH') return true;
      if (bothModeTechniqueChoice === 'BOTH') return true;
      return r.technique === bothModeTechniqueChoice;
    });

    const chosenRun =
      applicable.find((r, idx) => selectedRunKeys[`${r.technique}-${r.quantity}-${idx}`]) ||
      applicable[0];
    if (!chosenRun) return;

    const orderNumber = `IPD-${Math.floor(10000 + Math.random() * 90000)}`;
    const inkStr =
      chosenRun.technique === 'LITHO'
        ? form.lithoInkSetCode || '4x4'
        : form.digitalInkMode === 'BOTH_SIDES_COLOR'
        ? '4x4'
        : form.digitalInkMode === 'ONE_SIDE_COLOR'
        ? '4x0'
        : '1x0';
    const formatStr =
      chosenRun.technique === 'LITHO'
        ? form.sheetFormat === 'S70X100'
          ? '70x100'
          : '60x90'
        : form.digitalFormatName || 'Tabloide';

    const desc = `${jobDescription} · Impresión en ${formatStr} ${inkStr} · Cantidad ${chosenRun.quantity.toLocaleString('es-CO')}`;

    const vatRate = form.vatLabel === 'EXENTO' ? 0 : 19;
    const subtotalVal = Math.round(chosenRun.totalPrice / (1 + vatRate / 100));
    const vatVal = Math.round(chosenRun.totalPrice - subtotalVal);

    const newOrder = {
      id: `ord_demand_${Date.now()}`,
      number: orderNumber,
      customerName: 'Cliente por Demanda (Mostrador)',
      channel: 'STORE',
      status: 'IN_PRODUCTION', // 'Trabajando en ello'
      paymentStatus: 'PENDING',
      responsible: 'Carlos M. / Fusion',
      subtotal: subtotalVal,
      vat: vatVal,
      total: Math.round(chosenRun.totalPrice),
      notes: `Orden por Demanda (sin cotización) · ${desc} · Ficha: ${detailedSpecs}`,
      createdAt: new Date().toISOString(),
      items: [
        {
          description: desc,
          quantity: chosenRun.quantity,
          unitPrice: chosenRun.unitPrice,
          total: Math.round(chosenRun.totalPrice),
        },
      ],
    };

    try {
      const stored = localStorage.getItem('fusion_print_orders');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newOrder);
      localStorage.setItem('fusion_print_orders', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('fusion_print_orders_updated'));
    } catch (err) {
      console.warn('Error saving demand order in localStorage:', err);
    }

    setCreatedDemandOrderNumber(orderNumber);
  };

  // Inicializar descripciones y selección al abrir
  useEffect(() => {
    if (!isOpen) return;

    // Nombre y plantilla
    const mainTitle = form.jobName || 'Trabajo gráfico en prensa';
    setJobDescription(mainTitle);

    // Formatear ficha técnica
    const sizeStr = `${form.artWidthCm} x ${form.artHeightCm} cm`;
    const inksStr =
      form.technique === 'LITHO'
        ? form.lithoInkSetCode
        : form.digitalInkMode === 'ONE_SIDE_COLOR'
        ? '4x0'
        : form.digitalInkMode === 'BOTH_SIDES_COLOR'
        ? '4x4'
        : '1x0';

    const materialStr =
      form.technique === 'LITHO'
        ? `${form.paperName} (${form.sheetFormat || '70x100'}, corte ${form.sheetCutCode || '1/8'})`
        : `Digital ${form.digitalFormatName || 'Tabloide'}`;

    const finishList: string[] = [];
    if (form.cutRuns > 0) finishList.push(`Corte (${form.cutRuns} golpes)`);
    if (form.trimRuns > 0) finishList.push(`Despunte (${form.trimRuns} golpes)`);
    if (form.perforationCount > 0) finishList.push(`Perforado (${form.perforationCount} orificios)`);
    if (form.bindingLoops > 0) finishList.push(`Argollado (${form.bindingLoops} anillas)`);
    if (form.laminationMode !== 'NONE') finishList.push(`Plastificado ${form.laminationMode}`);
    if (form.halfCutLinearCm > 0) finishList.push(`Medio corte (${form.halfCutLinearCm} cm)`);
    if (form.dieCutPrice > 0) finishList.push(`Troquelado`);

    const finishStr = finishList.length > 0 ? finishList.join(', ') : 'Sin acabados adicionales';

    const fichaConcatenada = `Tamaño: ${sizeStr} | Tintas: ${inksStr} | Papel: ${materialStr} | Acabados: ${finishStr}`;
    setDetailedSpecs(fichaConcatenada);

    // Marcar todas las cantidades por defecto
    const initialKeys: Record<string, boolean> = {};
    runs.forEach((r, idx) => {
      initialKeys[`${r.technique}-${r.quantity}-${idx}`] = true;
    });
    setSelectedRunKeys(initialKeys);

    // Si la técnica era BOTH, sugerir la recomendada del motor
    if (form.technique === 'BOTH') {
      if (result?.recommended === 'DIGITAL') {
        setBothModeTechniqueChoice('DIGITAL');
      } else {
        setBothModeTechniqueChoice('LITHO');
      }
    }
  }, [isOpen, form, result]);

  if (!isOpen || !result) return null;

  // Filtrar tiradas según la técnica seleccionada si era BOTH
  const applicableRuns = runs.filter((r) => {
    if (form.technique !== 'BOTH') return true;
    if (bothModeTechniqueChoice === 'BOTH') return true;
    return r.technique === bothModeTechniqueChoice;
  });

  const toggleRunKey = (key: string) => {
    setSelectedRunKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Verificar si hay discordancia de versión de tarifario
  const hasTariffVersionMismatch =
    Boolean(existingTariffVersionId) &&
    tariffVersion?.id &&
    existingTariffVersionId !== tariffVersion.id;

  const handleConfirmAdd = async () => {
    setIsSubmitting(true);
    try {
      // 1. Filtrar las tiradas marcadas por el usuario
      const checkedRuns: UnifiedRun[] = [];
      applicableRuns.forEach((r, idx) => {
        const key = `${r.technique}-${r.quantity}-${idx}`;
        if (selectedRunKeys[key]) {
          checkedRuns.push(r);
        }
      });

      if (checkedRuns.length === 0) {
        alert('Debes seleccionar al menos una cantidad para agregar a la cotización.');
        setIsSubmitting(false);
        return;
      }

      // 2. Registrar el assistRun en el backend/memoria para trazabilidad
      const currentTariffId = tariffVersion?.id || 'tar-2026-01';
      let assistRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      try {
        const runRes = await fetch('/api/tariff/assist-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: form,
            result,
            quoteId,
            technique: form.technique,
            tariffVersionId: currentTariffId,
          }),
        });
        if (runRes.ok) {
          const runJson = await runRes.json();
          if (runJson.id) assistRunId = runJson.id;
        }
      } catch (e) {
        console.warn('Could not register assist run on server, using generated id', e);
      }

      // 3. Determinar acabados y tintas en texto
      const sizeStr = `${form.artWidthCm} x ${form.artHeightCm} cm`;
      const finishList: string[] = [];
      if (form.cutRuns > 0) finishList.push(`Corte (${form.cutRuns} golpes)`);
      if (form.trimRuns > 0) finishList.push(`Despunte (${form.trimRuns} golpes)`);
      if (form.perforationCount > 0) finishList.push(`Perforado (${form.perforationCount} orificios)`);
      if (form.bindingLoops > 0) finishList.push(`Argollado (${form.bindingLoops} anillas)`);
      if (form.laminationMode !== 'NONE') finishList.push(`Plastificado ${form.laminationMode}`);
      if (form.halfCutLinearCm > 0) finishList.push(`Medio corte (${form.halfCutLinearCm} cm)`);
      if (form.dieCutPrice > 0) finishList.push(`Troquelado`);
      const finishStr = finishList.length > 0 ? finishList.join(', ') : 'Sin acabados';

      const applyVat = form.vatLabel !== 'EXENTO';

      // 4. Si "Una línea por cantidad" está encendido: Crear un QuoteItem por cada cantidad
      let createdItems: any[] = [];
      let notesAppendix: string | undefined = undefined;

      if (oneLinePerQuantity) {
        createdItems = checkedRuns.map((r, idx) => {
          const itemOrder = existingItemsCount + idx + 1;
          const paperCost = r.lines
            .filter((l) => l.key.includes('paper') || l.key.includes('plates'))
            .reduce((sum, l) => sum + l.amount, 0);
          const finishCost = r.lines
            .filter((l) => l.key.startsWith('finishing_'))
            .reduce((sum, l) => sum + l.amount, 0);

          const itemInks =
            r.technique === 'LITHO'
              ? form.lithoInkSetCode
              : form.digitalInkMode === 'ONE_SIDE_COLOR'
              ? '4x0'
              : form.digitalInkMode === 'BOTH_SIDES_COLOR'
              ? '4x4'
              : '1x0';

          const itemMaterials =
            r.technique === 'LITHO'
              ? `${form.paperName} (${form.sheetFormat || '70x100'}, corte ${form.sheetCutCode || '1/8'})`
              : `Digital ${form.digitalFormatName || 'Tabloide'}`;

          const fullDesc = `${jobDescription}\n${detailedSpecs}`;

          return {
            id: `it_assist_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            order: itemOrder,
            reference: String(itemOrder),
            description: fullDesc,
            productionMode: 'IN_HOUSE',
            printTechnique: r.technique,
            size: sizeStr,
            inks: itemInks,
            material: itemMaterials,
            materials: itemMaterials,
            finishes: finishStr,
            quantity: r.quantity,
            unit: 'Unidades',
            unitPrice: Math.round(r.unitPrice * 100) / 100,
            subtotal: Math.round(r.subtotalBeforeMargin * 100) / 100,
            lineSubtotal: Math.round((r.unitPrice * r.quantity) * 100) / 100,
            applyVat,
            vatAmount: Math.round(r.vat * 100) / 100,
            total: Math.round(r.totalPrice * 100) / 100,
            lineTotal: Math.round(r.totalPrice * 100) / 100,

            // Costos técnicos del motor
            rawMaterialCost: Math.round(paperCost),
            outsourcedCost: 0,
            otherCost: Math.round(finishCost),
            internalCost: Math.round(r.internalCost),
            marginPercent: r.marginPercent,
            suggestedUnitPrice: Math.round(r.unitPrice * 100) / 100,
            manualAdjustedPrice: undefined,
            isManuallyAdjusted: false,

            // Parámetros de pliego y máquina
            paperTypeId: r.technique === 'LITHO' ? form.paperName : null,
            paperSheets: r.parentSheetsToBuy,
            wastePercent:
              r.technique === 'LITHO'
                ? form.lithoWastageSheets && r.parentSheetsToBuy
                  ? Math.round((form.lithoWastageSheets / Math.max(r.parentSheetsToBuy, 1)) * 100)
                  : 10
                : 0,
            plateCount: r.platesCount,
            sheetsNeeded: r.printedSheets,
            impositionPerSheet: r.imposition,
            productionSpec: r.productionSpec,
            assistRunId,
            assistInput: form,
            assistResult: result,
            showCalcPanel: false,
            laborHours: 0,
            lastEditedField: 'unitPrice',
          };
        });
      } else {
        // Modo "Una sola línea": Se toma la primera tirada marcada y las demás se agregan a notas
        const r1 = checkedRuns[0];
        const itemOrder = existingItemsCount + 1;
        const paperCost = r1.lines
          .filter((l) => l.key.includes('paper') || l.key.includes('plates'))
          .reduce((sum, l) => sum + l.amount, 0);
        const finishCost = r1.lines
          .filter((l) => l.key.startsWith('finishing_'))
          .reduce((sum, l) => sum + l.amount, 0);

        const itemInks =
          r1.technique === 'LITHO'
            ? form.lithoInkSetCode
            : form.digitalInkMode === 'ONE_SIDE_COLOR'
            ? '4x0'
            : form.digitalInkMode === 'BOTH_SIDES_COLOR'
            ? '4x4'
            : '1x0';

        const itemMaterials =
          r1.technique === 'LITHO'
            ? `${form.paperName} (${form.sheetFormat || '70x100'}, corte ${form.sheetCutCode || '1/8'})`
            : `Digital ${form.digitalFormatName || 'Tabloide'}`;

        const alternativesNotes = checkedRuns.slice(1).map((alt) => {
          return `• Alternativa escala: ${alt.quantity.toLocaleString('es-CO')} unidades a $${Math.round(alt.unitPrice).toLocaleString('es-CO')} c/u (Total: $${Math.round(alt.totalPrice).toLocaleString('es-CO')})`;
        });

        const fullDesc = `${jobDescription}\n${detailedSpecs}`;
        const itemNotes = alternativesNotes.length > 0 ? `\n\nAlternativas de tirada:\n${alternativesNotes.join('\n')}` : '';

        createdItems = [
          {
            id: `it_assist_${Date.now()}_0_${Math.random().toString(36).substr(2, 4)}`,
            order: itemOrder,
            reference: String(itemOrder),
            description: fullDesc + itemNotes,
            productionMode: 'IN_HOUSE',
            printTechnique: r1.technique,
            size: sizeStr,
            inks: itemInks,
            material: itemMaterials,
            materials: itemMaterials,
            finishes: finishStr,
            quantity: r1.quantity,
            unit: 'Unidades',
            unitPrice: Math.round(r1.unitPrice * 100) / 100,
            subtotal: Math.round(r1.subtotalBeforeMargin * 100) / 100,
            lineSubtotal: Math.round((r1.unitPrice * r1.quantity) * 100) / 100,
            applyVat,
            vatAmount: Math.round(r1.vat * 100) / 100,
            total: Math.round(r1.totalPrice * 100) / 100,
            lineTotal: Math.round(r1.totalPrice * 100) / 100,

            rawMaterialCost: Math.round(paperCost),
            outsourcedCost: 0,
            otherCost: Math.round(finishCost),
            internalCost: Math.round(r1.internalCost),
            marginPercent: r1.marginPercent,
            suggestedUnitPrice: Math.round(r1.unitPrice * 100) / 100,
            manualAdjustedPrice: undefined,
            isManuallyAdjusted: false,

            paperTypeId: r1.technique === 'LITHO' ? form.paperName : null,
            paperSheets: r1.parentSheetsToBuy,
            wastePercent:
              r1.technique === 'LITHO'
                ? form.lithoWastageSheets && r1.parentSheetsToBuy
                  ? Math.round((form.lithoWastageSheets / Math.max(r1.parentSheetsToBuy, 1)) * 100)
                  : 10
                : 0,
            plateCount: r1.platesCount,
            sheetsNeeded: r1.printedSheets,
            impositionPerSheet: r1.imposition,
            productionSpec: r1.productionSpec,
            assistRunId,
            assistInput: form,
            assistResult: result,
            showCalcPanel: false,
            laborHours: 0,
            lastEditedField: 'unitPrice',
          },
        ];

        if (alternativesNotes.length > 0) {
          notesAppendix = `[Alternativas de tirada asistida]:\n${alternativesNotes.join('\n')}`;
        }
      }

      // 5. Emitir evento de auditoría 'cotizacion.items_desde_ayuda'
      try {
        await fetch('/api/audit-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'cotizacion.items_desde_ayuda',
            quoteId: quoteId || 'quote-draft',
            itemIds: createdItems.map((it) => it.id),
            assistRunId,
            organizationId: 'org-01',
            userId: 'user-01',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      } catch {}

      // 6. Invocar callback para insertar ítems en la cotización
      onConfirm({
        items: createdItems,
        tariffVersionId: currentTariffId,
        assistRunId,
        notesAppendix,
      });

      onClose();
    } catch (err: any) {
      console.error('Error volcando cálculo a cotización:', err);
      alert('Ocurrió un error al preparar los ítems: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Cabecera Modal */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Confirmar y Agregar a la Cotización
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                Revisa y ajusta los ítems generados por el cálculo técnico antes de insertarlos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* AVISO DISCORDANCIA DE TARIFARIO SI APLICA */}
          {hasTariffVersionMismatch && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Advertencia de Versión de Tarifario</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Esta cotización fue creada con la versión de tarifario{' '}
                <strong className="text-foreground">{existingTariffVersionId}</strong>. El asistente
                acaba de calcular con la versión vigente{' '}
                <strong className="text-foreground">{tariffVersion?.name || tariffVersion?.id}</strong>.
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedVersionMismatch}
                  onChange={(e) => setConfirmedVersionMismatch(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span>Entiendo la diferencia y confirmo actualizar la cotización a la versión vigente.</span>
              </label>
            </div>
          )}

          {/* SELECTOR DE TÉCNICA (Si la técnica fue BOTH) */}
          {form.technique === 'BOTH' && (
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Comparativa de Técnicas: Elige qué agregar a la cotización
                </span>
                {result.recommended && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black uppercase">
                    Sugerido: {result.recommended}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBothModeTechniqueChoice('LITHO')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    bothModeTechniqueChoice === 'LITHO'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-bold">Solo Litografía</div>
                  <div className="text-[10px] opacity-75">Tirada en pliegos offset</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBothModeTechniqueChoice('DIGITAL')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    bothModeTechniqueChoice === 'DIGITAL'
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-bold">Solo Digital</div>
                  <div className="text-[10px] opacity-75">Impresión por clics</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBothModeTechniqueChoice('BOTH')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    bothModeTechniqueChoice === 'BOTH'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-bold">Agregar Ambas</div>
                  <div className="text-[10px] opacity-75">Para comparar opciones</div>
                </button>
              </div>
            </div>
          )}

          {/* DESCRIPCIÓN Y FICHA TÉCNICA */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Descripción del Trabajo (Título del ítem)
              </label>
              <input
                type="text"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Ej. Volantes publicitarios 4x4..."
                className="w-full h-9 px-3 text-xs bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Ficha Técnica (Se adjuntará al ítem)
              </label>
              <textarea
                rows={2}
                value={detailedSpecs}
                onChange={(e) => setDetailedSpecs(e.target.value)}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-muted-foreground font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* INTERRUPTOR UNA LÍNEA POR CANTIDAD */}
          <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-foreground text-xs">
                Crear una línea separada por cada cantidad
              </div>
              <p className="text-[11px] text-muted-foreground">
                {oneLinePerQuantity
                  ? 'Se añadirá un ítem independiente en la cotización por cada escala marcada.'
                  : 'Se creará 1 solo ítem con la primera cantidad; las demás quedarán como alternativas en las notas.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOneLinePerQuantity(!oneLinePerQuantity)}
              className="text-primary hover:opacity-80 transition-opacity"
            >
              {oneLinePerQuantity ? (
                <ToggleRight className="w-8 h-8 text-primary" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* LISTA DE CANTIDADES CALCULADAS CON CHECKBOX */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground">
              Cantidades y Escalas Disponibles ({applicableRuns.length})
            </label>

            <div className="space-y-2">
              {applicableRuns.map((r, idx) => {
                const cardKey = `${r.technique}-${r.quantity}-${idx}`;
                const isChecked = !!selectedRunKeys[cardKey];

                return (
                  <div
                    key={cardKey}
                    onClick={() => toggleRunKey(cardKey)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5 shadow-2xs'
                        : 'border-border bg-card/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Manejado por onClick del contenedor
                        className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">
                            {r.quantity.toLocaleString('es-CO')} unidades
                          </span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black border ${
                              r.technique === 'DIGITAL'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}
                          >
                            {r.technique}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          ${Math.round(r.unitPrice).toLocaleString('es-CO')} c/u · Cabida: {r.imposition} un. · {r.printedSheets} formatos
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-black text-foreground text-xs">
                        ${Math.round(r.totalPrice).toLocaleString('es-CO')}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Margen: {r.marginPercent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer y botones */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-semibold transition-colors text-center"
          >
            Volver a editar parámetros
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Opción 1: Registrar como trabajo por demanda */}
            <button
              type="button"
              onClick={handleRegisterAsDemandJob}
              className={`w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                form.digitalOnDemand
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                  : 'bg-card hover:bg-muted text-foreground border-border'
              }`}
              title="Crea una orden directa en el módulo de demanda sin pasar por cotización"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registrar como trabajo por demanda</span>
            </button>

            {/* Opción 2: Volcar a Cotización */}
            <button
              type="button"
              disabled={isSubmitting || (hasTariffVersionMismatch && !confirmedVersionMismatch)}
              onClick={handleConfirmAdd}
              className={`w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                isSubmitting || (hasTariffVersionMismatch && !confirmedVersionMismatch)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/90 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <span>Preparando ítems...</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Confirmar y Volcar a Cotización</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal interno de éxito para orden por demanda */}
        {createdDemandOrderNumber && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-sm">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-1">
              ¡Trabajo por Demanda Registrado!
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mb-6">
              La orden se ha registrado directamente en el módulo de impresión por demanda
              bajo estado <strong>&ldquo;Trabajando en ello&rdquo;</strong>, sin pasar por cotización.
            </p>

            <div className="bg-card border border-border p-4 rounded-2xl max-w-sm w-full mb-6 text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Número de orden:</span>
                <span className="text-base font-mono font-black text-primary">
                  {createdDemandOrderNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Responsable:</span>
                <span className="text-xs font-semibold text-foreground">Carlos M. / Fusion</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Estado inicial:</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Trabajando en ello
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedDemandOrderNumber(null);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all"
            >
              Entendido y Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
