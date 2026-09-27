import { describe, it, expect } from 'vitest';
import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from '../../../../../packages/core/src/pricing/press';
import { DEFAULT_ASSIST_FORM_STATE } from './types';
import { getResultRuns } from './ResultsPanel';
import { buildRevision, engineLineAmounts, isLockedQuote, recalculateQuote } from './recalculate';

const form = { ...DEFAULT_ASSIST_FORM_STATE, jobName: 'Volantes', technique: 'LITHO' as const };

/** Ítem como lo crea la Ayuda para cotizar con el tarifario de fábrica. */
function assistItem(quantity: number, extra: Record<string, unknown> = {}) {
  const runs = getResultRuns(calculatePressQuote(buildPressQuoteInput(form, DEFAULT_OFFICIAL_TARIFF)!), 'LITHO');
  const run = runs.find((r) => r.quantity === quantity)!;
  return { id: `it-${quantity}`, description: 'Volantes', quantity, printTechnique: 'LITHO', applyVat: true, vatRate: 0.19, ...engineLineAmounts(run, 0.19), assistInput: form, ...extra };
}

// Tarifario nuevo: el papel sube 20 %
const newer = {
  ...DEFAULT_OFFICIAL_TARIFF,
  papers: DEFAULT_OFFICIAL_TARIFF.papers.map((p: any) => ({ ...p, pricePerSheet: Number(p.pricePerSheet) * 1.2 })),
};

describe('recálculo con el tarifario vigente', () => {
  it('con el mismo tarifario no cambia nada', () => {
    const r = recalculateQuote({ items: [assistItem(1000)] }, DEFAULT_OFFICIAL_TARIFF);
    expect(r.recalculated).toBe(1);
    expect(Math.abs(r.diffAmount)).toBeLessThan(1);
  });

  it('recalcula los ítems del asistente y conserva los demás (sin inventar aumentos)', () => {
    const manual = { id: 'm', description: 'Diseño', quantity: 1, unitPrice: 50000, total: 59500, applyVat: true, vatRate: 0.19 };
    const adjusted = assistItem(2500, { isManuallyAdjusted: true, total: 123 });
    const r = recalculateQuote({ items: [assistItem(1000), manual, adjusted] }, newer);
    expect(r.items.map((i) => i.status)).toEqual(['RECALCULATED', 'NO_SHEET', 'MANUAL']);
    expect(r.items[0].newTotal).toBeGreaterThan(r.items[0].oldTotal);
    expect(r.items[1].newTotal).toBe(59500);
    expect(r.items[2].newTotal).toBe(123);
    expect(r.newTotal).toBeCloseTo(r.items[0].newTotal + 59500 + 123, 2);
  });

  it('respeta el IVA de cada ítem y avisa si la cantidad ya no está', () => {
    const noVat = recalculateQuote({ items: [assistItem(1000, { applyVat: false })] }, newer).items[0];
    expect(noVat.item.vatAmount).toBe(0);
    const odd = recalculateQuote({ items: [assistItem(1000, { quantity: 1234 })] }, newer).items[0];
    expect(odd.status).toBe('NO_MATCH');
  });

  it('crea una revisión nueva sin tocar la original', () => {
    const original = { id: 'q1', number: 'COT-00012', status: 'Enviada', revision: 1, items: [assistItem(1000)], approvedAt: 'x' };
    const recalc = recalculateQuote(original, newer);
    const rev = buildRevision(original, recalc, { id: 'tar-3', code: 'TAR-3' });
    expect(rev).toMatchObject({ number: 'COT-00012-REV2', revision: 2, previousQuoteId: 'q1', status: 'Borrador', tariffVersionId: 'tar-3' });
    expect(rev.id).not.toBe('q1');
    expect(rev.approvedAt).toBeUndefined();
    expect(original.items[0]).not.toBe(rev.items[0]);
    expect(isLockedQuote({ status: 'Aprobada' })).toBe(true);
    expect(isLockedQuote({ status: 'Enviada' })).toBe(false);
  });
});
