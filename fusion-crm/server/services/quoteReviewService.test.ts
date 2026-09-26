import { describe, it, expect } from 'vitest';
import { reviewQuote, approvalBlockReason } from './quoteReviewService';
import { memoryAssistRuns } from '../routes/tariff';
import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press';
import { DEFAULT_ASSIST_FORM_STATE } from '../../apps/web/src/features/quote-assist/types';

const form = { ...DEFAULT_ASSIST_FORM_STATE, technique: 'LITHO' as const, jobName: 'Volantes' };
memoryAssistRuns.set('run_test_1', { id: 'run_test_1', input: form });

const qr = calculatePressQuote(buildPressQuoteInput(form, DEFAULT_OFFICIAL_TARIFF)!).litho![0];
const quantity = Number(qr.quantity);
const unitCost = Number(qr.internalCost) / quantity;

const engineItem = (unitPrice: number) => ({
  id: 'it1',
  description: 'Volantes media carta',
  quantity,
  unitPrice,
  applyVat: true,
  vatRate: 0.19,
  assistRunId: 'run_test_1',
  printTechnique: 'LITHO',
  total: 1, // total manipulado: el servidor lo ignora
});

describe('reviewQuote (servidor)', () => {
  it('recalcula el costo desde la entrada guardada y detecta precios bajo costo', async () => {
    const { totals, pricingReview } = await reviewQuote(null, [engineItem(Math.floor(unitCost * 0.5))]);
    expect(pricingReview.belowCost).toBe(true);
    expect(totals.items[0].total).toBeGreaterThan(1);
    expect(approvalBlockReason(pricingReview, 'comercial')).toMatch(/por debajo del costo/);
    expect(approvalBlockReason(pricingReview, 'admin')).toBeNull();
    expect(approvalBlockReason(pricingReview, 'super_admin')).toBeNull();
  });

  it('permite aprobar precios sobre el costo a cualquier rol', async () => {
    const { pricingReview } = await reviewQuote(null, [engineItem(Math.ceil(unitCost * 2)), { id: 'm', quantity: 1, unitPrice: 10 }]);
    expect(pricingReview.belowCost).toBe(false);
    expect(approvalBlockReason(pricingReview, 'comercial')).toBeNull();
  });

  it('no bloquea ítems cuya corrida no existe (quedan como no verificados)', async () => {
    const { pricingReview } = await reviewQuote(null, [{ ...engineItem(1), assistRunId: 'run_inexistente' }]);
    expect(pricingReview.items[0].status).toBe('UNVERIFIED');
    expect(approvalBlockReason(pricingReview, 'comercial')).toBeNull();
  });
});
