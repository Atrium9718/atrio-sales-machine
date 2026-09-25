import React, { useState, useMemo } from 'react';
import {
  calculateWideFormat,
  WideFormatClientType,
  WideFormatCalculationResult,
} from '../../../../../packages/core/src/pricing/press/wide-format';
import {
  Ruler,
  CheckCircle2,
  PlusCircle,
  Package,
  Layers,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Printer,
  FileCheck,
} from 'lucide-react';

interface WideFormatAssistProps {
  onApplyToQuote?: (items: any[], tariffVersionId: string, notesAppendix?: string) => void;
  tariffVersionId?: string;
}

export const WideFormatAssist: React.FC<WideFormatAssistProps> = ({
  onApplyToQuote,
  tariffVersionId = 'tariff-press-2025-01',
}) => {
  const [description, setDescription] = useState('Stickers UV-DTF Premium');
  const [reference, setReference] = useState('DTF-001');
  const [linearCm, setLinearCm] = useState<number>(115);
  const [clientType, setClientType] = useState<WideFormatClientType>('PEER');
  const [isCompletedWork, setIsCompletedWork] = useState<boolean>(false);

  // Estados de feedback
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [addedItemSuccess, setAddedItemSuccess] = useState<boolean>(false);

  // Precios vigentes
  const pricePerMeter = 68000;
  const peerDiscountPerMeter = 10000;

  // Cálculo en tiempo real con redondeo a múltiplo de 500
  const calculation: WideFormatCalculationResult = useMemo(() => {
    return calculateWideFormat({
      linearCm: Math.max(0, linearCm || 0),
      pricePerMeter,
      peerDiscountPerMeter,
      clientType,
      roundToNearest: 500, // Redondeo al múltiplo de 500
    });
  }, [linearCm, clientType]);

  const pricePerCmFinal = pricePerMeter / 100; // 680
  const pricePerCmPeer = (pricePerMeter - peerDiscountPerMeter) / 100; // 580

  const handleConfirm = () => {
    const totalNumber = calculation.total.toNumber();
    const rawTotalNumber = calculation.rawTotal.toNumber();
    const pricePerCmNumber = calculation.pricePerCm.toNumber();

    if (isCompletedWork) {
      // Registrar directamente como orden de impresión por demanda de Etapa 8
      const orderNumber = `IPD-${Math.floor(10000 + Math.random() * 90000)}`;
      const newOrder = {
        id: `ord_demand_${Date.now()}`,
        number: orderNumber,
        customerName: clientType === 'PEER' ? 'Colega Gráfico (Aliado)' : 'Cliente Final',
        channel: 'STORE',
        status: 'IN_PRODUCTION',
        paymentStatus: 'PENDING',
        subtotal: totalNumber,
        vat: Math.round(totalNumber * 0.19),
        total: Math.round(totalNumber * 1.19),
        notes: `Trabajo UV-DTF ya ejecutado · Ref: ${reference} · ${linearCm} cm lineales @ $${pricePerCmNumber}/cm`,
        createdAt: new Date().toISOString(),
        items: [
          {
            description: `${description} (${linearCm} cm lineales)`,
            quantity: 1,
            unitPrice: totalNumber,
            total: totalNumber,
          },
        ],
      };

      // Guardar en localStorage para módulo de demanda / kiosko
      try {
        const stored = localStorage.getItem('fusion_print_orders');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newOrder);
        localStorage.setItem('fusion_print_orders', JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('fusion_print_orders_updated'));
      } catch (err) {
        console.warn('Error al persistir orden en localStorage:', err);
      }

      setCreatedOrderNumber(orderNumber);
      return;
    }

    // Agregar a la cotización activa
    if (onApplyToQuote) {
      const lineItem = {
        id: `it_wide_${Date.now()}`,
        productType: 'WIDE_FORMAT',
        serviceType: 'UV_DTF',
        description: `${description} · Ref: ${reference} (${linearCm} cm lineales)`,
        quantity: 1,
        unitPrice: totalNumber,
        subtotal: totalNumber,
        vatRate: 19,
        vatAmount: Math.round(totalNumber * 0.19),
        total: Math.round(totalNumber * 1.19),
        notes: `Gran Formato UV-DTF · Longitud: ${linearCm} cm | Tarifa: $${pricePerCmNumber}/cm (${clientType === 'PEER' ? 'Colega' : 'Cliente Final'}) | Subtotal previo a redondeo: $${rawTotalNumber.toLocaleString('es-CO')} | Redondeo MROUND a 500: $${totalNumber.toLocaleString('es-CO')}`,
        specSheet: {
          rawInput: {
            description,
            reference,
            linearCm,
            clientType,
            roundToNearest: 500,
          },
          calculatedCostBreakdown: {
            pricePerMeter,
            peerDiscountPerMeter: clientType === 'PEER' ? peerDiscountPerMeter : 0,
            pricePerCm: pricePerCmNumber,
            rawTotal: rawTotalNumber,
            total: totalNumber,
          },
        },
      };

      onApplyToQuote([lineItem], tariffVersionId, `[Gran Formato UV-DTF] ${description}`);
      setAddedItemSuccess(true);
      setTimeout(() => setAddedItemSuccess(null as any), 3500);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Mensaje de orden creada exitosamente */}
      {createdOrderNumber && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-sm space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                ¡Orden de Impresión por Demanda Creada!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Registrada directamente en el módulo de producción sin pasar por cotización.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-background/80 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">Número de Orden:</span>
              <span className="text-xl font-mono font-black text-foreground">
                {createdOrderNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Total Registrado:</span>
              <span className="text-xl font-mono font-black text-primary">
                ${calculation.total.toNumber().toLocaleString('es-CO')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreatedOrderNumber(null)}
            className="text-xs font-semibold underline text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
          >
            Registrar otro trabajo
          </button>
        </div>
      )}

      {/* Notificación de ítem agregado a cotización */}
      {addedItemSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>¡Ítem UV-DTF agregado con éxito a la cotización!</span>
        </div>
      )}

      {/* Formulario Corto */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-border/80 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Costeo Rápido UV-DTF por Centímetro Lineal
            </h3>
            <p className="text-xs text-muted-foreground">
              Cálculo estandarizado con redondeo al múltiplo de 500 (MROUND).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Descripción del Trabajo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Stickers UV-DTF para termos"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Referencia */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Referencia / Código
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej: DTF-001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Centímetros Lineales */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Centímetros de Impresión (cm lineales)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={linearCm}
                onChange={(e) => setLinearCm(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-muted-foreground font-semibold">
                cm
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Longitud total del rollo o pliego a imprimir.
            </span>
          </div>

          {/* Tipo de Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Tipo de Cliente
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClientType('FINAL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  clientType === 'FINAL'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Cliente Final
              </button>
              <button
                type="button"
                onClick={() => setClientType('PEER')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  clientType === 'PEER'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Colega (Tarifa Especial)
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta de precios vigentes para transparencia */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>Tarifario UV-DTF Vigente (de dónde sale el valor):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                clientType === 'FINAL'
                  ? 'bg-card border-primary/40 font-bold'
                  : 'bg-background/60 border-border/60 text-muted-foreground'
              }`}
            >
              <div className="flex justify-between">
                <span>Cliente Final:</span>
                <span className="font-mono text-foreground">${pricePerCmFinal} / cm</span>
              </div>
              <span className="text-[10px] text-muted-foreground block">
                ${pricePerMeter.toLocaleString('es-CO')} por metro lineal
              </span>
            </div>

            <div
              className={`p-2.5 rounded-lg border transition-all ${
                clientType === 'PEER'
                  ? 'bg-card border-primary/40 font-bold'
                  : 'bg-background/60 border-border/60 text-muted-foreground'
              }`}
            >
              <div className="flex justify-between">
                <span>Colega (Aliado):</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ${pricePerCmPeer} / cm
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block">
                ${(pricePerMeter - peerDiscountPerMeter).toLocaleString('es-CO')} por metro
                (-$10.000 dto.)
              </span>
            </div>
          </div>
        </div>

        {/* Resultado y Redondeo MROUND */}
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-muted-foreground block">
              Valor Calculado ({linearCm} cm × ${calculation.pricePerCm.toNumber()}/cm)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-primary">
                ${calculation.total.toNumber().toLocaleString('es-CO')}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                (Múltiplo de 500)
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Cálculo exacto previo a redondeo: $
              {calculation.rawTotal.toNumber().toLocaleString('es-CO')}
            </div>
          </div>

          {/* Toggle "¿Es un trabajo ya hecho, no una cotización?" */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground select-none">
              <input
                type="checkbox"
                checked={isCompletedWork}
                onChange={(e) => setIsCompletedWork(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
              />
              <span>¿Es un trabajo ya hecho, no una cotización?</span>
            </label>
            <span className="text-[10px] text-muted-foreground text-right max-w-xs block">
              {isCompletedWork
                ? 'Crea directamente una orden de producción por demanda en lugar de un ítem de cotización.'
                : 'Se agregará a la lista de ítems de la cotización actual.'}
            </span>
          </div>
        </div>

        {/* Botón de Acción */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
              isCompletedWork
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            } active:scale-95`}
          >
            {isCompletedWork ? (
              <>
                <Printer className="w-4 h-4" />
                <span>Registrar como Orden de Impresión por Demanda</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Agregar a la Cotización</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
