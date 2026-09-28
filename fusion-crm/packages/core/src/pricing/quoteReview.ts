import type { PressQuoteResult, QuantityResult } from './press/types';

/**
 * Revisión de una cotización en el servidor, antes de guardarla o aprobarla:
 *  1. Recalcula cada línea (cantidad × precio antes de IVA, más IVA) y los totales, para que
 *     ningún total enviado por el navegador quede guardado si no cuadra con sus ítems.
 *  2. Para ítems generados con el motor de precios, compara el precio de venta con el costo
 *     interno recalculado con el tarifario oficial: por debajo del costo requiere un administrador.
 */

export const DEFAULT_VAT_RATE = 0.19;

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

export function itemVatRate(item: any): number {
  if (item?.applyVat === false) return 0;
  if (typeof item?.vatRate === 'number' && item.vatRate >= 0 && item.vatRate < 1) return item.vatRate;
  // Ítems antiguos sin applyVat ni vatRate: si traían IVA en 0, se respeta como exento
  if (item?.applyVat === undefined && num(item?.vatAmount) === 0 && num(item?.total) > 0) return 0;
  return DEFAULT_VAT_RATE;
}

export interface QuoteTotals {
  items: any[];
  subtotal: number;
  vatAmount: number;
  total: number;
}

export function recalculateQuoteTotals(items: unknown): QuoteTotals {
  const list = Array.isArray(items) ? items : [];
  const recalculated = list.map((item: any) => {
    const quantity = num(item?.quantity);
    const unitPrice = num(item?.unitPrice);
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    const safePrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
    const rate = itemVatRate(item);
    const lineSubtotal = round2(safeQty * safePrice);
    const vatAmount = round2(lineSubtotal * rate);
    const total = round2(lineSubtotal + vatAmount);
    return {
      ...item,
      quantity: safeQty,
      unitPrice: round2(safePrice),
      subtotal: lineSubtotal,
      lineSubtotal,
      vatAmount,
      total,
      lineTotal: total,
    };
  });
  const subtotal = round2(recalculated.reduce((s, it) => s + it.lineSubtotal, 0));
  const vatAmount = round2(recalculated.reduce((s, it) => s + it.vatAmount, 0));
  return { items: recalculated, subtotal, vatAmount, total: round2(subtotal + vatAmount) };
}

export type ItemPricingStatus = 'OK' | 'DISCOUNTED' | 'BELOW_COST' | 'MANUAL' | 'UNVERIFIED';

export interface ItemPricingReview {
  itemId: string | null;
  description: string;
  status: ItemPricingStatus;
  quantity: number;
  unitPrice: number;
  /** Precio sugerido por el motor (antes de IVA), si se pudo verificar. */
  suggestedUnitPrice: number | null;
  /** Costo interno por unidad según el motor, si se pudo verificar. */
  unitCost: number | null;
  /** Descuento sobre el precio sugerido, en % (positivo = más barato que lo sugerido). */
  discountPercent: number | null;
}

export interface QuotePricingReview {
  items: ItemPricingReview[];
  belowCost: boolean;
  /** Ítems del motor que no se pudieron verificar (p. ej. cantidad cambiada a mano). */
  unverifiedCount: number;
}

function findEngineQuantity(result: PressQuoteResult, technique: unknown, quantity: number): QuantityResult | undefined {
  const pools =
    technique === 'DIGITAL' ? [result.digital] : technique === 'LITHO' ? [result.litho] : [result.digital, result.litho];
  for (const pool of pools) {
    const match = (pool || []).find((q) => Number(q.quantity) === quantity);
    if (match) return match;
  }
  return undefined;
}

/**
 * @param engineResults resultado del motor recalculado en el servidor por assistRunId
 *   (null si no se pudo recalcular).
 */
export function reviewQuotePricing(
  items: any[],
  engineResults: Record<string, PressQuoteResult | null>
): QuotePricingReview {
  const reviewed = items.map((item): ItemPricingReview => {
    const base = {
      itemId: item?.id ?? null,
      description: String(item?.description ?? '').split('\n')[0].slice(0, 120),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };
    const runId = typeof item?.assistRunId === 'string' ? item.assistRunId : null;
    if (!runId) return { ...base, status: 'MANUAL', suggestedUnitPrice: null, unitCost: null, discountPercent: null };

    const result = engineResults[runId];
    const qr = result ? findEngineQuantity(result, item.printTechnique, item.quantity) : undefined;
    if (!qr) return { ...base, status: 'UNVERIFIED', suggestedUnitPrice: null, unitCost: null, discountPercent: null };

    const unitCost = round2(Number(qr.internalCost) / item.quantity);
    const suggestedUnitPrice = round2(Number(qr.unitPriceBeforeTax));
    const discountPercent = suggestedUnitPrice > 0 ? round2(((suggestedUnitPrice - item.unitPrice) / suggestedUnitPrice) * 100) : null;
    const status: ItemPricingStatus =
      item.unitPrice + 0.005 < unitCost ? 'BELOW_COST' : discountPercent !== null && discountPercent > 0.5 ? 'DISCOUNTED' : 'OK';
    return { ...base, status, suggestedUnitPrice, unitCost, discountPercent };
  });

  return {
    items: reviewed,
    belowCost: reviewed.some((r) => r.status === 'BELOW_COST'),
    unverifiedCount: reviewed.filter((r) => r.status === 'UNVERIFIED').length,
  };
}

const APPROVED_STATUSES = ['aprobada', 'ganada', 'ganado', 'aceptada'];

export function isApprovedStatus(status: unknown): boolean {
  return APPROVED_STATUSES.includes(String(status ?? '').trim().toLowerCase());
}
