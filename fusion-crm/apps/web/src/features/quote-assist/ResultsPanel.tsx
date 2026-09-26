import React, { useState } from 'react';
import {
  PressQuoteResult,
  PressQuoteWarning,
  PressTechnique,
  QuantityResult,
} from '../../../../../packages/core/src/pricing/press/types';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Lock,
  PlusCircle,
  FileCheck,
} from 'lucide-react';

export interface UnifiedRun {
  technique: 'DIGITAL' | 'LITHO';
  quantity: number;
  /** Precio unitario con impuestos (para mostrar al asesor). */
  unitPrice: number;
  /** Precio unitario antes de IVA: es el que se lleva a la cotización. */
  unitPriceBeforeTax: number;
  totalPrice: number;
  imposition: number;
  printedSheets: number;
  platesCount: number | null;
  parentSheetsToBuy: number | null;
  internalCost: number;
  marginPercent: number;
  marginAmount: number;
  subtotalBeforeMargin: number;
  discounts: number;
  commission: number;
  vat: number;
  otherTaxes: number;
  lines: { key: string; label: string; amount: number }[];
  productionSpec: string;
}

export function getResultRuns(
  result: PressQuoteResult | null,
  technique: PressTechnique
): UnifiedRun[] {
  if (!result) return [];
  const runs: UnifiedRun[] = [];

  if (technique === 'DIGITAL' || technique === 'BOTH') {
    (result.digital || []).forEach((q) => {
      runs.push({
        technique: 'DIGITAL',
        quantity: Number(q.quantity),
        unitPrice: Number(q.unitPrice),
        unitPriceBeforeTax: Number(q.unitPriceBeforeTax),
        totalPrice: Number(q.total),
        imposition: q.impositionPerSheet,
        printedSheets: q.sheetsPrinted,
        platesCount: q.plateCount,
        parentSheetsToBuy: q.paperSheets,
        internalCost: Number(q.internalCost),
        marginPercent: Number(q.marginPercent),
        marginAmount: Number(q.margin),
        subtotalBeforeMargin: Number(q.subtotalBeforeMargin),
        discounts: Number(q.discounts),
        commission: Number(q.commission),
        vat: Number(q.vat),
        otherTaxes: Number(q.otherTaxes),
        lines: q.lines.map((l) => ({ key: l.key, label: l.label, amount: Number(l.amount) })),
        productionSpec: q.productionSpec,
      });
    });
  }

  if (technique === 'LITHO' || technique === 'BOTH') {
    (result.litho || []).forEach((q) => {
      runs.push({
        technique: 'LITHO',
        quantity: Number(q.quantity),
        unitPrice: Number(q.unitPrice),
        unitPriceBeforeTax: Number(q.unitPriceBeforeTax),
        totalPrice: Number(q.total),
        imposition: q.impositionPerSheet,
        printedSheets: q.sheetsPrinted,
        platesCount: q.plateCount,
        parentSheetsToBuy: q.paperSheets,
        internalCost: Number(q.internalCost),
        marginPercent: Number(q.marginPercent),
        marginAmount: Number(q.margin),
        subtotalBeforeMargin: Number(q.subtotalBeforeMargin),
        discounts: Number(q.discounts),
        commission: Number(q.commission),
        vat: Number(q.vat),
        otherTaxes: Number(q.otherTaxes),
        lines: q.lines.map((l) => ({ key: l.key, label: l.label, amount: Number(l.amount) })),
        productionSpec: q.productionSpec,
      });
    });
  }

  return runs;
}

interface ResultsPanelProps {
  result: PressQuoteResult | null;
  technique: PressTechnique;
  hasCostPermission: boolean;
  onNavigateToStep?: (stepKey: string) => void;
  isStandalonePage?: boolean;
  onSaveAsDraft?: () => void;
  onAddToQuote?: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  technique,
  hasCostPermission,
  onNavigateToStep,
  isStandalonePage = false,
  onSaveAsDraft,
  onAddToQuote,
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full text-muted-foreground">
        <HelpCircle className="w-10 h-10 mb-3 opacity-40 text-primary animate-pulse" />
        <p className="text-sm font-semibold text-foreground">Calculando propuesta en vivo...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ingresa las dimensiones y cantidades en el formulario.
        </p>
      </div>
    );
  }

  const runs = getResultRuns(result, technique);

  const hasBlockingWarnings = result.warnings.some(
    (w) =>
      w.code === 'ART_EXCEEDS_SHEET' ||
      w.code === 'PAPER_NOT_FOUND' ||
      w.code === 'INVALID_SHEET_CUT'
  );

  const getStepForWarning = (code: string): string => {
    switch (code) {
      case 'ART_EXCEEDS_SHEET':
        return 'trabajo';
      case 'PAPER_NOT_FOUND':
      case 'INVALID_SHEET_CUT':
      case 'SHEET_CUT_SIZE_NOT_FOUND':
        return 'papel';
      case 'INVALID_INK_SET':
      case 'INVALID_DIGITAL_FORMAT':
        return 'tecnica';
      default:
        return 'trabajo';
    }
  };

  // Comparativa para técnica BOTH
  const isBoth = technique === 'BOTH';
  const lithoRuns = runs.filter((r) => r.technique === 'LITHO');
  const digitalRuns = runs.filter((r) => r.technique === 'DIGITAL');

  // Punto de equilibrio aproximado si es BOTH
  const computeBreakEven = () => {
    if (!isBoth || lithoRuns.length === 0 || digitalRuns.length === 0) return null;
    const l1 = lithoRuns[0];
    const d1 = digitalRuns[0];
    if (!l1 || !d1) return null;

    const platesCost = l1.lines.find((l) => l.key === 'litho_plates')?.amount || 0;
    const unitVarLitho = (l1.totalPrice - platesCost) / Math.max(l1.quantity, 1);
    const unitVarDigital = d1.unitPrice;

    if (unitVarDigital <= unitVarLitho) return null;
    const breakEvenUnits = Math.round(platesCost / (unitVarDigital - unitVarLitho));
    return breakEvenUnits > 0 && breakEvenUnits < 50000 ? breakEvenUnits : null;
  };

  const breakEvenPoint = computeBreakEven();

  return (
    <div className="space-y-4">
      {/* FRANJA DE ADVERTENCIAS */}
      {result.warnings.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Advertencias técnicas del motor ({result.warnings.length})</span>
          </div>

          <div className="space-y-1.5 pl-6 text-xs text-amber-800 dark:text-amber-300">
            {result.warnings.map((w, idx) => {
              const targetStep = getStepForWarning(w.code);
              return (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <span>• {w.message}</span>
                  {onNavigateToStep && (
                    <button
                      type="button"
                      onClick={() => onNavigateToStep(targetStep)}
                      className="text-[10px] font-bold underline hover:opacity-80 shrink-0 text-amber-700 dark:text-amber-400"
                    >
                      Ir a {targetStep.toUpperCase()}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FRANJA DE COMPARATIVA BOTH */}
      {isBoth && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Análisis Comparativo: Digital vs Litográfica</span>
          </div>
          {result.recommended && (
            <div className="font-semibold text-foreground">
              Recomendación del motor: Convendría técnica{' '}
              <span className="font-black text-primary uppercase">{result.recommended}</span> para las escalas analizadas.
            </div>
          )}
          {breakEvenPoint ? (
            <p className="text-muted-foreground">
              Punto de equilibrio estimado:{' '}
              <strong className="text-foreground font-bold">
                Por debajo de {breakEvenPoint.toLocaleString('es-CO')} unidades conviene Digital.
              </strong>{' '}
              Por encima, la Litográfica reduce significativamente el costo unitario.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Compara el rendimiento y costo unitario de ambas técnicas para cada escala.
            </p>
          )}
        </div>
      )}

      {/* TARJETAS DE RESULTADOS POR CANTIDAD */}
      <div
        className={`space-y-4 ${
          hasBlockingWarnings ? 'opacity-50 pointer-events-none grayscale' : ''
        }`}
      >
        {runs.map((run, idx) => {
          const cardId = `${run.technique}-${run.quantity}-${idx}`;
          const isExpanded = !!expandedCards[cardId];
          const marginPercent = run.marginPercent;

          // Semáforo de margen (solo con quote:assist_cost)
          let trafficLightClass = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30';
          if (marginPercent < 15) {
            trafficLightClass = 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-500/30';
          } else if (marginPercent < 25) {
            trafficLightClass = 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-500/30';
          }

          return (
            <div
              key={cardId}
              className="p-4 rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 space-y-3"
            >
              {/* Header de Cantidad y Técnica */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-foreground">
                      {run.quantity.toLocaleString('es-CO')} unidades
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-black px-2 py-0.5 rounded ${
                        run.technique === 'DIGITAL'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}
                    >
                      {run.technique === 'DIGITAL' ? 'Digital' : 'Litografía'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                    {run.productionSpec || `Tirada #${idx + 1}`}
                  </div>
                </div>

                {/* Precios Principales */}
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                    ${Math.round(run.totalPrice).toLocaleString('es-CO')}
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    ${Math.round(run.unitPrice).toLocaleString('es-CO')} / un.
                  </div>
                </div>
              </div>

              {/* Fila de Datos Técnicos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 px-2.5 rounded-lg bg-muted/30 text-[11px] text-muted-foreground border border-border/40 font-mono">
                <div>
                  Cabida:{' '}
                  <strong className="text-foreground font-bold">
                    {run.imposition} un.
                  </strong>
                </div>
                <div>
                  Formatos:{' '}
                  <strong className="text-foreground font-bold">
                    {run.printedSheets.toLocaleString('es-CO')}
                  </strong>
                </div>
                <div>
                  Planchas:{' '}
                  <strong className="text-foreground font-bold">
                    {run.technique === 'LITHO' && run.platesCount !== null ? run.platesCount : 'N/A'}
                  </strong>
                </div>
                <div>
                  Pliegos:{' '}
                  <strong className="text-foreground font-bold">
                    {run.technique === 'LITHO' && run.parentSheetsToBuy !== null ? run.parentSheetsToBuy : 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Costo interno y margen (Gated por quote:assist_cost) */}
              {hasCostPermission ? (
                <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-muted-foreground mr-1 text-[11px]">Costo Interno:</span>
                      <strong className="font-mono text-foreground font-bold">
                        ${Math.round(run.internalCost).toLocaleString('es-CO')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1 text-[11px]">Margen:</span>
                      <strong className="font-mono text-foreground font-bold">
                        ${Math.round(run.marginAmount).toLocaleString('es-CO')}
                      </strong>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${trafficLightClass}`}
                  >
                    <span>Margen {marginPercent.toFixed(1)}%</span>
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-muted/20 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground/60" />
                  <span>Costos internos y margen restringidos por políticas de seguridad.</span>
                </div>
              )}

              {/* Botón para desplegar desglose */}
              <button
                type="button"
                onClick={() => toggleExpand(cardId)}
                className="w-full py-1.5 px-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground flex items-center justify-between transition-colors"
              >
                <span>Desglose detallado de cotización</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Acordeón de Desglose */}
              {isExpanded && (
                <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                  {run.lines.map((l) => (
                    <div
                      key={l.key}
                      className="flex items-center justify-between py-1 text-muted-foreground"
                    >
                      <span>{l.label}:</span>
                      <span className="font-mono text-foreground font-medium">
                        ${Math.round(l.amount).toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between py-1 font-semibold text-foreground border-t border-border/40">
                    <span>Subtotal Operativo:</span>
                    <span className="font-mono">
                      ${Math.round(run.subtotalBeforeMargin).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {run.discounts > 0 && (
                    <div className="flex items-center justify-between py-1 text-emerald-600">
                      <span>Descuentos comerciales:</span>
                      <span className="font-mono">
                        -${Math.round(run.discounts).toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}

                  {run.commission > 0 && (
                    <div className="flex items-center justify-between py-1 text-muted-foreground">
                      <span>Comisión de venta:</span>
                      <span className="font-mono text-foreground">
                        ${Math.round(run.commission).toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1 text-muted-foreground">
                    <span>IVA:</span>
                    <span className="font-mono text-foreground font-medium">
                      ${Math.round(run.vat).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {run.otherTaxes > 0 && (
                    <div className="flex items-center justify-between py-1 text-muted-foreground">
                      <span>Otros impuestos:</span>
                      <span className="font-mono text-foreground font-medium">
                        ${Math.round(run.otherTaxes).toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 text-sm font-black text-foreground border-t border-border">
                    <span>TOTAL COTIZADO:</span>
                    <span className="font-mono text-primary">
                      ${Math.round(run.totalPrice).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="pt-4 border-t border-border space-y-2">
        {/* Botón Agregar a la cotización (Habilitado para la Etapa 18.5) */}
        <button
          type="button"
          onClick={onAddToQuote}
          disabled={!result || hasBlockingWarnings}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all ${
            !result || hasBlockingWarnings
              ? 'bg-muted text-muted-foreground border border-border opacity-60 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground active:scale-98 cursor-pointer'
          }`}
          title={
            hasBlockingWarnings
              ? 'Corrige las advertencias bloqueantes para poder cotizar'
              : 'Configurar y agregar ítems a la cotización'
          }
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar a la cotización</span>
        </button>

        {/* Si estamos en página independiente /cotizaciones/calculadora */}
        {isStandalonePage && onSaveAsDraft && (
          <button
            type="button"
            onClick={onSaveAsDraft}
            className="w-full py-2.5 px-4 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Guardar como borrador de cotización</span>
          </button>
        )}
      </div>
    </div>
  );
};
