/**
 * Consecutivos de documentos (cotizaciones y órdenes de trabajo).
 * El servidor es el único que emite números; esto solo formatea y calcula.
 */

export type YearFormat = 'NONE' | 'YY' | 'YYYY';

export interface NumberingConfig {
  quote: { prefix: string; yearFormat: YearFormat; padding: number; resetYearly: boolean };
  /** La OT toma el número de su cotización con este prefijo (COT-00012 → OT-00012). */
  order: { prefix: string };
}

export const DEFAULT_NUMBERING: NumberingConfig = {
  quote: { prefix: 'COT-', yearFormat: 'NONE', padding: 5, resetYearly: false },
  order: { prefix: 'OT-' },
};

export interface SequenceState {
  /** Último número emitido. */
  last: number;
  /** Año del último número (para reiniciar cada año). */
  year: number;
}

const yearPart = (format: YearFormat, year: number) => (format === 'YYYY' ? `${year}-` : format === 'YY' ? `${String(year).slice(-2)}-` : '');

export function formatQuoteNumber(cfg: NumberingConfig['quote'], n: number, year: number): string {
  return `${cfg.prefix}${yearPart(cfg.yearFormat, year)}${String(n).padStart(Math.max(1, Math.min(10, cfg.padding)), '0')}`;
}

/** Siguiente número; reinicia en 1 si cambió el año y la serie se reinicia anualmente. */
export function nextInSequence(cfg: NumberingConfig['quote'], state: SequenceState, year: number): SequenceState {
  const last = cfg.resetYearly && state.year !== year ? 0 : state.last;
  return { last: last + 1, year };
}

/** Número (consecutivo) de un documento emitido con esta configuración, o null si no corresponde. */
export function parseQuoteNumber(cfg: NumberingConfig['quote'], number: string, year: number): number | null {
  const head = `${cfg.prefix}${yearPart(cfg.yearFormat, year)}`;
  if (!number.toUpperCase().startsWith(head.toUpperCase())) return null;
  const rest = number.slice(head.length);
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

/** Número de la OT a partir del de la cotización (COT-26-00012 → OT-26-00012). */
export function orderNumberFor(quoteNumber: string, cfg: NumberingConfig = DEFAULT_NUMBERING): string {
  const n = String(quoteNumber || '').trim();
  const body = n.toUpperCase().startsWith(cfg.quote.prefix.toUpperCase()) ? n.slice(cfg.quote.prefix.length) : n.replace(/^[A-Za-z]+-?/, '');
  return `${cfg.order.prefix}${body || n}`;
}

export function sanitizeNumbering(input: any): NumberingConfig {
  const q = input?.quote ?? {};
  const yearFormat: YearFormat = ['NONE', 'YY', 'YYYY'].includes(q.yearFormat) ? q.yearFormat : 'NONE';
  const prefix = (v: unknown, fallback: string) => {
    const s = String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    return s || fallback;
  };
  return {
    quote: {
      prefix: prefix(q.prefix, DEFAULT_NUMBERING.quote.prefix),
      yearFormat,
      padding: Math.max(1, Math.min(10, Math.round(Number(q.padding) || DEFAULT_NUMBERING.quote.padding))),
      // Sin el año en el número, reiniciar repetiría números de años anteriores
      resetYearly: !!q.resetYearly && yearFormat !== 'NONE',
    },
    order: { prefix: prefix(input?.order?.prefix, DEFAULT_NUMBERING.order.prefix) },
  };
}
