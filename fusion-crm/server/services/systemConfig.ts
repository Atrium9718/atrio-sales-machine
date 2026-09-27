import { documentRepository } from '../repositories/documentStore';
import type { DocumentRepository } from '../repositories/types';
import {
  DEFAULT_NUMBERING,
  formatQuoteNumber,
  nextInSequence,
  parseQuoteNumber,
  sanitizeNumbering,
  type NumberingConfig,
  type SequenceState,
} from '../../packages/core/src/numbering/numbering';
import { DEFAULT_WORK_CALENDAR, sanitizeWorkCalendar, type WorkCalendar } from '../../packages/core/src/calendar/workCalendar';

/**
 * Configuración de administración guardada en la base (colección system_config):
 * numeración, calendario laboral y política de seguridad. Se carga al arrancar y se lee
 * desde memoria (el inicio de sesión la consulta en cada petición).
 */

export interface SecurityPolicy {
  /** Días que dura una sesión antes de volver a entrar con Google (1 a 14). */
  sessionDays: number;
  /** Si hay dominios, solo correos de esos dominios pueden entrar (además de ser colaborador activo). */
  allowedDomains: string[];
  /** Cada cuántos días se recomienda revisar los accesos. */
  reviewEveryDays: number;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = { sessionDays: 5, allowedDomains: [], reviewEveryDays: 90 };

export function sanitizeSecurityPolicy(input: any): SecurityPolicy {
  const domains = (Array.isArray(input?.allowedDomains) ? input.allowedDomains : String(input?.allowedDomains ?? '').split(/[,\s]+/))
    .map((d: unknown) => String(d).trim().toLowerCase().replace(/^@/, ''))
    .filter((d: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d));
  const clamp = (v: unknown, min: number, max: number, def: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || def));
  return {
    sessionDays: clamp(input?.sessionDays, 1, 14, DEFAULT_SECURITY_POLICY.sessionDays),
    allowedDomains: [...new Set<string>(domains)].slice(0, 10),
    reviewEveryDays: clamp(input?.reviewEveryDays, 30, 365, DEFAULT_SECURITY_POLICY.reviewEveryDays),
  };
}

type ConfigDoc = { id: string; value?: any; updatedAt?: string; updatedBy?: string; last?: number; year?: number };

export interface SystemConfigDeps {
  repo: DocumentRepository<ConfigDoc>;
  /** Números de las cotizaciones existentes (para no repetir). */
  existingQuoteNumbers: () => Promise<string[]>;
  now: () => Date;
}

const bogotaYear = (d: Date) => new Date(d.getTime() - 5 * 3600_000).getUTCFullYear();

export function createSystemConfig(deps: SystemConfigDeps) {
  let numbering: NumberingConfig = DEFAULT_NUMBERING;
  let calendar: WorkCalendar = DEFAULT_WORK_CALENDAR;
  let security: SecurityPolicy = DEFAULT_SECURITY_POLICY;
  let meta: Record<string, { updatedAt?: string; updatedBy?: string }> = {};
  // Una emisión a la vez: el servidor es una sola instancia (docker-compose), así no hay duplicados
  let lock: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.then(fn, fn);
    lock = run.catch(() => undefined);
    return run;
  };

  const highestExisting = async (cfg: NumberingConfig['quote'], year: number) => {
    let max = 0;
    for (const n of await deps.existingQuoteNumbers()) {
      const v = parseQuoteNumber(cfg, String(n || ''), year);
      if (v !== null && v > max) max = v;
    }
    return max;
  };

  const readState = async (): Promise<SequenceState | null> => {
    const doc = await deps.repo.get('sequence_quote');
    return doc && typeof doc.last === 'number' ? { last: doc.last, year: doc.year ?? bogotaYear(deps.now()) } : null;
  };

  async function save(id: string, value: unknown, by: string) {
    const updatedAt = deps.now().toISOString();
    await deps.repo.upsert({ id, value, updatedAt, updatedBy: by });
    meta[id] = { updatedAt, updatedBy: by };
  }

  return {
    async load() {
      const [n, c, s] = await Promise.all([deps.repo.get('numbering'), deps.repo.get('work_calendar'), deps.repo.get('security_policy')]);
      if (n?.value) numbering = sanitizeNumbering(n.value);
      if (c?.value) calendar = sanitizeWorkCalendar(c.value);
      if (s?.value) security = sanitizeSecurityPolicy(s.value);
      meta = Object.fromEntries([n, c, s].filter(Boolean).map((d) => [d!.id, { updatedAt: d!.updatedAt, updatedBy: d!.updatedBy }]));
    },

    numbering: () => numbering,
    calendar: () => calendar,
    security: () => security,
    meta: () => meta,

    async setCalendar(value: unknown, by: string) {
      calendar = sanitizeWorkCalendar(value);
      await save('work_calendar', calendar, by);
      return calendar;
    },

    async setSecurity(value: unknown, by: string) {
      security = sanitizeSecurityPolicy(value);
      await save('security_policy', security, by);
      return security;
    },

    /** Estado de la serie: último emitido, el mayor existente y el próximo número. */
    async numberingStatus() {
      const year = bogotaYear(deps.now());
      const state = await readState();
      const existingMax = await highestExisting(numbering.quote, year);
      const last = state ? (numbering.quote.resetYearly && state.year !== year ? 0 : state.last) : existingMax;
      const next = Math.max(last, existingMax) + 1;
      return { config: numbering, last, existingMax, next: formatQuoteNumber(numbering.quote, next, year), meta: meta.numbering };
    },

    /**
     * Cambia el formato y, si se indica, el último número emitido. No se permite bajar de un
     * número que ya existe (habría duplicados).
     */
    async setNumbering(value: unknown, lastIssued: number | undefined, by: string) {
      return exclusive(async () => {
        const cfg = sanitizeNumbering(value);
        const year = bogotaYear(deps.now());
        const existingMax = await highestExisting(cfg.quote, year);
        if (lastIssued !== undefined) {
          const n = Math.floor(Number(lastIssued));
          if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error('El último número debe ser un entero positivo'), { status: 400 });
          if (n < existingMax) {
            throw Object.assign(new Error(`Ya existe la cotización ${formatQuoteNumber(cfg.quote, existingMax, year)}: el último número no puede ser menor que ${existingMax}`), { status: 409 });
          }
          await deps.repo.upsert({ id: 'sequence_quote', last: n, year });
        }
        numbering = cfg;
        await save('numbering', cfg, by);
      });
    },

    /** Emite el siguiente número de cotización (nunca repite uno existente). */
    async issueQuoteNumber(): Promise<string> {
      return exclusive(async () => {
        const year = bogotaYear(deps.now());
        const cfg = numbering.quote;
        let state = (await readState()) ?? { last: await highestExisting(cfg, year), year };
        const taken = new Set((await deps.existingQuoteNumbers()).map((n) => String(n || '').toUpperCase()));
        let number: string;
        do {
          state = nextInSequence(cfg, state, year);
          number = formatQuoteNumber(cfg, state.last, year);
        } while (taken.has(number.toUpperCase()));
        await deps.repo.upsert({ id: 'sequence_quote', last: state.last, year: state.year });
        return number;
      });
    },
  };
}

export type SystemConfig = ReturnType<typeof createSystemConfig>;

let instance: SystemConfig | null = null;
export function systemConfig(): SystemConfig {
  if (!instance) {
    instance = createSystemConfig({
      repo: documentRepository<ConfigDoc>('system_config'),
      existingQuoteNumbers: async () => {
        const { repositories } = await import('../repositories');
        return (await repositories().quotes.list()).map((q: any) => q.number);
      },
      now: () => new Date(),
    });
  }
  return instance;
}

export async function loadSystemConfig() {
  try {
    await systemConfig().load();
  } catch (err) {
    console.error('[configuración del sistema] No se pudo cargar; se usan los valores por defecto:', err);
  }
}

export function __setSystemConfig(c: SystemConfig | null) {
  instance = c;
}
