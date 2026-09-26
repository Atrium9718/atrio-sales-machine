import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { memoryAssistRuns } from '../routes/tariff';
import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press';
import type { PressQuoteResult } from '../../packages/core/src/pricing/press/types';
import {
  recalculateQuoteTotals,
  reviewQuotePricing,
  type QuotePricingReview,
  type QuoteTotals,
} from '../../packages/core/src/pricing/quoteReview';

/**
 * Recalcula en el servidor el resultado del motor de cada corrida del asistente usada en la
 * cotización, a partir de la entrada guardada y del tarifario oficial (no del resultado que
 * haya enviado el navegador).
 */
async function loadEngineResults(db: Firestore | null, runIds: string[]): Promise<Record<string, PressQuoteResult | null>> {
  const results: Record<string, PressQuoteResult | null> = {};
  await Promise.all(
    runIds.map(async (runId) => {
      try {
        let run: any = memoryAssistRuns.get(runId);
        if (!run && db && /^[A-Za-z0-9_-]{1,100}$/.test(runId)) {
          const snap = await getDoc(doc(db, 'quote_assist_runs', runId));
          run = snap.exists() ? snap.data() : null;
        }
        const input = run?.input ? buildPressQuoteInput(run.input, DEFAULT_OFFICIAL_TARIFF) : null;
        results[runId] = input ? calculatePressQuote(input) : null;
      } catch (err) {
        console.warn(`[quoteReview] No se pudo recalcular la corrida ${runId}:`, err);
        results[runId] = null;
      }
    })
  );
  return results;
}

export interface QuoteReviewOutcome {
  totals: QuoteTotals;
  pricingReview: QuotePricingReview & { checkedAt: string };
}

export async function reviewQuote(db: Firestore | null, items: unknown): Promise<QuoteReviewOutcome> {
  const totals = recalculateQuoteTotals(items);
  const runIds = Array.from(
    new Set(totals.items.map((it) => it?.assistRunId).filter((id): id is string => typeof id === 'string' && !!id))
  );
  const engineResults = await loadEngineResults(db, runIds);
  const review = reviewQuotePricing(totals.items, engineResults);
  return { totals, pricingReview: { ...review, checkedAt: new Date().toISOString() } };
}

export function isAdminRole(role: unknown): boolean {
  return role === 'super_admin' || role === 'admin';
}

/** Mensaje de rechazo si la cotización no puede aprobarla este usuario; null si puede. */
export function approvalBlockReason(review: QuotePricingReview, role: unknown): string | null {
  if (!review.belowCost || isAdminRole(role)) return null;
  const items = review.items
    .filter((i) => i.status === 'BELOW_COST')
    .map((i) => `"${i.description}" (precio ${i.unitPrice.toLocaleString('es-CO')} < costo ${i.unitCost?.toLocaleString('es-CO')} por unidad)`);
  return `La cotización tiene ítems por debajo del costo de producción: ${items.join('; ')}. Solo un administrador puede aprobarla.`;
}
