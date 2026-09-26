import { describe, it, expect } from 'vitest';
import { recalculateQuoteTotals, reviewQuotePricing, itemVatRate, isApprovedStatus } from './quoteReview';
import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from './press';
import { DEFAULT_ASSIST_FORM_STATE } from '../../../../apps/web/src/features/quote-assist/types';

describe('recalculateQuoteTotals', () => {
  it('recalcula líneas y totales ignorando los totales enviados', () => {
    const r = recalculateQuoteTotals([
      { id: 'a', quantity: 1000, unitPrice: 150, applyVat: true, subtotal: 1, vatAmount: 1, total: 999999999 },
      { id: 'b', quantity: 2, unitPrice: 50000, applyVat: false, total: 5 },
    ]);
    expect(r.items[0]).toMatchObject({ lineSubtotal: 150000, vatAmount: 28500, total: 178500 });
    expect(r.items[1]).toMatchObject({ lineSubtotal: 100000, vatAmount: 0, total: 100000 });
    expect(r).toMatchObject({ subtotal: 250000, vatAmount: 28500, total: 278500 });
  });

  it('usa la tasa propia del ítem y neutraliza valores inválidos', () => {
    expect(recalculateQuoteTotals([{ quantity: 10, unitPrice: 100, applyVat: true, vatRate: 0.05 }]).vatAmount).toBe(50);
    const bad = recalculateQuoteTotals([{ quantity: -5, unitPrice: 100 }, { quantity: 3, unitPrice: 'abc' }, null]);
    expect(bad.total).toBe(0);
    expect(recalculateQuoteTotals(undefined).items).toEqual([]);
  });

  it('respeta ítems antiguos exentos', () => {
    expect(itemVatRate({ vatAmount: 0, total: 100 })).toBe(0);
    expect(itemVatRate({})).toBe(0.19);
  });
});

describe('reviewQuotePricing', () => {
  const form = { ...DEFAULT_ASSIST_FORM_STATE, technique: 'LITHO' as const, jobName: 'Volantes' };
  const result = calculatePressQuote(buildPressQuoteInput(form, DEFAULT_OFFICIAL_TARIFF)!);
  const qr = result.litho![0];
  const quantity = Number(qr.quantity);
  const suggested = Math.round(Number(qr.unitPriceBeforeTax) * 100) / 100;
  const unitCost = Number(qr.internalCost) / quantity;
  const runs = { run1: result };
  const item = (unitPrice: number, extra: object = {}) => ({ id: 'i1', description: 'Volantes', quantity, unitPrice, assistRunId: 'run1', printTechnique: 'LITHO', ...extra });

  it('el motor produce un costo menor que el precio sugerido', () => {
    expect(unitCost).toBeGreaterThan(0);
    expect(suggested).toBeGreaterThan(unitCost);
  });

  it('marca OK al precio sugerido y DISCOUNTED con descuento sobre el costo', () => {
    expect(reviewQuotePricing([item(suggested)], runs).items[0].status).toBe('OK');
    const discounted = reviewQuotePricing([item((suggested + unitCost) / 2)], runs);
    expect(discounted.items[0].status).toBe('DISCOUNTED');
    expect(discounted.belowCost).toBe(false);
  });

  it('detecta precios por debajo del costo', () => {
    const review = reviewQuotePricing([item(unitCost * 0.8)], runs);
    expect(review.items[0].status).toBe('BELOW_COST');
    expect(review.belowCost).toBe(true);
  });

  it('distingue ítems manuales y no verificables', () => {
    const review = reviewQuotePricing(
      [{ id: 'm', quantity: 1, unitPrice: 1 }, item(suggested, { quantity: quantity + 7 }), item(suggested, { assistRunId: 'desconocido' })],
      runs
    );
    expect(review.items.map((i) => i.status)).toEqual(['MANUAL', 'UNVERIFIED', 'UNVERIFIED']);
    expect(review.unverifiedCount).toBe(2);
    expect(review.belowCost).toBe(false);
  });
});

describe('isApprovedStatus', () => {
  it('reconoce los estados aprobados', () => {
    expect(isApprovedStatus('Aprobada')).toBe(true);
    expect(isApprovedStatus(' ganada ')).toBe(true);
    expect(isApprovedStatus('Enviada')).toBe(false);
  });
});
