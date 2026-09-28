import { calculatePressQuote, buildPressQuoteInput } from '../../../../../packages/core/src/pricing/press';
import type { TariffSnapshot } from '../../../../../packages/core/src/pricing/press/types';
import { getResultRuns, type UnifiedRun } from './ResultsPanel';

/**
 * Recálculo de cotizaciones con otro tarifario. Solo se recalculan los ítems hechos con la
 * Ayuda para cotizar (guardan el formulario en assistInput); los demás conservan su precio.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Montos de una línea a partir de una corrida del motor (precio antes de IVA + IVA aparte). */
export function engineLineAmounts(run: Pick<UnifiedRun, 'unitPriceBeforeTax' | 'quantity'>, vatRate: number) {
  const unitPrice = round2(run.unitPriceBeforeTax);
  const lineSubtotal = round2(unitPrice * run.quantity);
  const vatAmount = round2(lineSubtotal * vatRate);
  const total = round2(lineSubtotal + vatAmount);
  return { unitPrice, subtotal: lineSubtotal, lineSubtotal, vatAmount, total, lineTotal: total };
}

export type ItemRecalcStatus = 'RECALCULATED' | 'NO_SHEET' | 'MANUAL' | 'NO_MATCH' | 'ERROR';

export const ITEM_STATUS_LABEL: Record<ItemRecalcStatus, string> = {
  RECALCULATED: 'Recalculado',
  NO_SHEET: 'Sin ficha del asistente: conserva su precio',
  MANUAL: 'Precio ajustado a mano: se conserva',
  NO_MATCH: 'El tarifario no da precio para esta cantidad: se conserva',
  ERROR: 'No se pudo calcular: se conserva',
};

export interface ItemRecalc {
  item: any;
  status: ItemRecalcStatus;
  oldTotal: number;
  newTotal: number;
}

export interface QuoteRecalc {
  items: ItemRecalc[];
  oldTotal: number;
  newTotal: number;
  diffAmount: number;
  diffPercent: number;
  recalculated: number;
}

const itemTotal = (it: any) => Number(it.total ?? it.lineTotal ?? 0) || 0;

export function recalculateItem(it: any, tariff: TariffSnapshot): ItemRecalc {
  const oldTotal = itemTotal(it);
  const keep = (status: ItemRecalcStatus): ItemRecalc => ({ item: it, status, oldTotal, newTotal: oldTotal });
  if (!it?.assistInput) return keep('NO_SHEET');
  if (it.isManuallyAdjusted || it.manualAdjustedPrice != null) return keep('MANUAL');
  try {
    const input = buildPressQuoteInput(it.assistInput, tariff);
    if (!input) return keep('ERROR');
    // La técnica de la línea (el asistente puede haber comparado ambas)
    const technique: string = it.printTechnique === 'DIGITAL' || it.printTechnique === 'LITHO' ? it.printTechnique : it.assistInput.technique;
    const runs = getResultRuns(calculatePressQuote(input), 'BOTH').filter((r) => technique === 'BOTH' || r.technique === technique);
    const run = runs.find((r) => Number(r.quantity) === Number(it.quantity));
    if (!run) return keep('NO_MATCH');
    const vatRate = it.applyVat === false ? 0 : Number(it.vatRate ?? 0.19);
    const amounts = engineLineAmounts(run, vatRate);
    return {
      item: { ...it, ...amounts, internalCost: Math.round(run.internalCost), marginPercent: run.marginPercent, suggestedUnitPrice: amounts.unitPrice },
      status: 'RECALCULATED',
      oldTotal,
      newTotal: amounts.total,
    };
  } catch (err) {
    console.warn('No se pudo recalcular el ítem:', err);
    return keep('ERROR');
  }
}

export function recalculateQuote(quote: any, tariff: TariffSnapshot): QuoteRecalc {
  const items = (Array.isArray(quote?.items) ? quote.items : []).map((it: any) => recalculateItem(it, tariff));
  const oldTotal = items.reduce((s: number, r: ItemRecalc) => s + r.oldTotal, 0) || Number(quote?.total) || 0;
  const newTotal = items.reduce((s: number, r: ItemRecalc) => s + r.newTotal, 0) || oldTotal;
  const diffAmount = round2(newTotal - oldTotal);
  return {
    items,
    oldTotal,
    newTotal,
    diffAmount,
    diffPercent: oldTotal > 0 ? (diffAmount / oldTotal) * 100 : 0,
    recalculated: items.filter((r: ItemRecalc) => r.status === 'RECALCULATED').length,
  };
}

const APPROVED = ['aprobada', 'aceptada', 'ganada', 'en producción', 'facturada'];
export const isLockedQuote = (q: any) => APPROVED.includes(String(q?.status || '').toLowerCase().trim());

/** Nueva revisión (la cotización enviada nunca se modifica). */
export function buildRevision(original: any, recalc: QuoteRecalc, version: { id: string; code?: string; name?: string }, now = new Date()) {
  const nextRev = (Number(original.revision) || 1) + 1;
  const base = String(original.number || '').split('-REV')[0];
  const items = recalc.items.map((r) => r.item);
  return {
    ...original,
    id: `quote-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    number: `${base}-REV${nextRev}`,
    revision: nextRev,
    previousQuoteId: original.id,
    status: 'Borrador',
    tariffVersionId: version.id,
    tariffVersionCode: version.code,
    date: now.toISOString(),
    items,
    subtotal: round2(items.reduce((s, it) => s + (Number(it.subtotal ?? it.lineSubtotal) || 0), 0)),
    vatAmount: round2(items.reduce((s, it) => s + (Number(it.vatAmount) || 0), 0)),
    total: round2(recalc.newTotal),
    approvedAt: undefined,
    approvedBy: undefined,
    sentAt: undefined,
    internalNotes: `${original.internalNotes || ''}\n[Recálculo de tarifario] Revisión ${nextRev} con ${version.name || version.code || version.id}: ${recalc.recalculated} ítem(s) recalculados. Total anterior $${Math.round(recalc.oldTotal).toLocaleString('es-CO')} → $${Math.round(recalc.newTotal).toLocaleString('es-CO')} (${recalc.diffPercent >= 0 ? '+' : ''}${recalc.diffPercent.toFixed(1)}%).`.trim(),
  };
}
