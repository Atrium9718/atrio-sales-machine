import type { DocumentRepository } from '../repositories/types';
import type { OmnichannelConfig } from '../../packages/core/src/omnichannel';

/**
 * Tope mensual de gasto en IA y mensajería: avisa a los administradores al llegar al 80% y al
 * 100%, una sola vez por mes y nivel, y si así se configuró deja la IA en pausa (todo pasa a
 * personas) hasta el mes siguiente o hasta que se suba el tope.
 */

export type BudgetLevel = 'none' | 'ok' | 'warning' | 'exceeded';

export interface BudgetStatus {
  month: string;
  budgetCop: number | null;
  spentCop: number;
  percent: number | null;
  level: BudgetLevel;
  aiPaused: boolean;
}

export function budgetLevel(spentCop: number, budgetCop: number | null): { level: BudgetLevel; percent: number | null } {
  if (!budgetCop) return { level: 'none', percent: null };
  const percent = spentCop / budgetCop;
  return { level: percent >= 1 ? 'exceeded' : percent >= 0.8 ? 'warning' : 'ok', percent };
}

interface AlertsDoc {
  id: string;
  notified: BudgetLevel[];
}

export interface BudgetWatcherDeps {
  loadConfig(): Promise<OmnichannelConfig>;
  /** Gasto del mes (AAAA-MM) en pesos. */
  monthCostCop(month: string): Promise<number>;
  alerts: DocumentRepository<AlertsDoc>;
  publish(status: BudgetStatus): void;
  now(): Date;
}

export const bogotaMonth = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 7);

export function createBudgetWatcher(deps: BudgetWatcherDeps, minIntervalMs = 5 * 60_000) {
  let last: BudgetStatus | null = null;
  let lastAt = 0;
  let running: Promise<BudgetStatus> | null = null;

  async function evaluate(): Promise<BudgetStatus> {
    const config = await deps.loadConfig();
    const month = bogotaMonth(deps.now());
    const spentCop = await deps.monthCostCop(month);
    const { level, percent } = budgetLevel(spentCop, config.budget?.monthlyCop ?? null);
    const status: BudgetStatus = {
      month,
      budgetCop: config.budget?.monthlyCop ?? null,
      spentCop,
      percent,
      level,
      aiPaused: level === 'exceeded' && !!config.budget?.pauseAiAtLimit,
    };
    if (level === 'warning' || level === 'exceeded') {
      const doc = (await deps.alerts.get(month)) ?? { id: month, notified: [] };
      if (!doc.notified.includes(level)) {
        await deps.alerts.upsert({ ...doc, notified: [...doc.notified, level] });
        deps.publish(status);
      }
    }
    last = status;
    lastAt = Date.now();
    return status;
  }

  return {
    /** Revisa el gasto (como mucho cada 5 min, salvo force). */
    check(force = false): Promise<BudgetStatus> {
      if (!force && last && Date.now() - lastAt < minIntervalMs) return Promise.resolve(last);
      if (!running) running = evaluate().finally(() => (running = null));
      return running;
    },
    /** Último estado conocido: la IA queda en pausa si se superó el tope y así se configuró. */
    isAiPaused(): boolean {
      return !!last?.aiPaused && last.month === bogotaMonth(deps.now());
    },
    reset() {
      last = null;
      lastAt = 0;
    },
  };
}

export type BudgetWatcher = ReturnType<typeof createBudgetWatcher>;
