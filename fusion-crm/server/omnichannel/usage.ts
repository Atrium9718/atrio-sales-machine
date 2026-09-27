import type { DocumentRepository } from '../repositories/types';
import { documentRepository } from '../repositories/documentStore';

/**
 * Consumo de la IA (tokens de Gemini) por día, para ver cuánto cuesta y avisar si se pasa del
 * presupuesto. Un documento por día (id AAAA-MM-DD) con totales por origen.
 */

export interface UsageSample {
  promptTokens: number;
  outputTokens: number;
  model: string;
  /** Quién gastó: agentes, simulador, precotizaciones… */
  source: string;
}

export interface DailyUsage {
  id: string;
  calls: number;
  promptTokens: number;
  outputTokens: number;
  bySource: Record<string, { calls: number; promptTokens: number; outputTokens: number }>;
  models: string[];
}

/** Precios en USD por millón de tokens (ajustables por variables de entorno). */
export function aiPrices() {
  return {
    inputPerM: Number(process.env.AI_PRICE_INPUT_PER_M_USD) || 0.3,
    outputPerM: Number(process.env.AI_PRICE_OUTPUT_PER_M_USD) || 2.5,
  };
}

/** Tarifas usadas para estimar costos (IA, plantillas de WhatsApp y dólar). */
export function costPrices() {
  return {
    ...aiPrices(),
    templateUsd: Number(process.env.WHATSAPP_TEMPLATE_PRICE_USD) || 0.0008,
    usdCop: Number(process.env.USD_COP) || 4000,
  };
}

export const tokensCostUsd = (promptTokens: number, outputTokens: number, prices = aiPrices()) =>
  (promptTokens / 1e6) * prices.inputPerM + (outputTokens / 1e6) * prices.outputPerM;

const bogotaDay = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);

export function createUsageTracker(repo: DocumentRepository<DailyUsage>, now: () => Date = () => new Date()) {
  // Escrituras en fila: dos respuestas simultáneas no se pisan el contador
  let queue: Promise<unknown> = Promise.resolve();

  return {
    record(sample: UsageSample): Promise<void> {
      const run = queue.then(async () => {
        const id = bogotaDay(now());
        const day: DailyUsage = (await repo.get(id)) ?? { id, calls: 0, promptTokens: 0, outputTokens: 0, bySource: {}, models: [] };
        const src = day.bySource[sample.source] ?? { calls: 0, promptTokens: 0, outputTokens: 0 };
        await repo.upsert({
          ...day,
          calls: day.calls + 1,
          promptTokens: day.promptTokens + sample.promptTokens,
          outputTokens: day.outputTokens + sample.outputTokens,
          bySource: { ...day.bySource, [sample.source]: { calls: src.calls + 1, promptTokens: src.promptTokens + sample.promptTokens, outputTokens: src.outputTokens + sample.outputTokens } },
          models: day.models.includes(sample.model) ? day.models : [...day.models, sample.model],
        });
      });
      queue = run.catch((err) => console.warn('[IA] No se pudo registrar el consumo:', err?.message || err));
      return queue as Promise<void>;
    },

    /** Días del mes AAAA-MM (hora de Colombia). */
    async month(month: string): Promise<DailyUsage[]> {
      return (await repo.list()).filter((d) => d.id.startsWith(month)).sort((a, b) => a.id.localeCompare(b.id));
    },
  };
}

let tracker: ReturnType<typeof createUsageTracker> | null = null;
export function aiUsage() {
  if (!tracker) tracker = createUsageTracker(documentRepository<DailyUsage>('ai_usage'));
  return tracker;
}

/** Registra el consumo de una respuesta de Gemini hecha fuera del cliente de agentes. */
export function recordGeminiUsage(response: any, model: string, source: string) {
  const u = response?.usageMetadata;
  if (!u) return;
  aiUsage()
    .record({ promptTokens: u.promptTokenCount || 0, outputTokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), model, source })
    .catch(() => undefined);
}
