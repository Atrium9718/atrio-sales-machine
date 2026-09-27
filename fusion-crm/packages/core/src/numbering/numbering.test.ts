import { describe, it, expect } from 'vitest';
import { formatQuoteNumber, nextInSequence, orderNumberFor, parseQuoteNumber, sanitizeNumbering, DEFAULT_NUMBERING } from './numbering';

describe('numeración de documentos', () => {
  const q = DEFAULT_NUMBERING.quote;

  it('formatea con prefijo, año y ceros', () => {
    expect(formatQuoteNumber(q, 12, 2026)).toBe('COT-00012');
    expect(formatQuoteNumber({ ...q, yearFormat: 'YY', padding: 4 }, 7, 2026)).toBe('COT-26-0007');
    expect(formatQuoteNumber({ ...q, yearFormat: 'YYYY' }, 123456, 2026)).toBe('COT-2026-123456');
  });

  it('lee el consecutivo solo de números de la misma serie y año', () => {
    const yy = { ...q, yearFormat: 'YY' as const };
    expect(parseQuoteNumber(q, 'COT-00041', 2026)).toBe(41);
    expect(parseQuoteNumber(q, 'FCG-12345', 2026)).toBeNull();
    expect(parseQuoteNumber(yy, 'COT-26-0009', 2026)).toBe(9);
    expect(parseQuoteNumber(yy, 'COT-25-0900', 2026)).toBeNull();
  });

  it('reinicia cada año solo si la serie lo pide', () => {
    const yearly = { ...q, yearFormat: 'YY' as const, resetYearly: true };
    expect(nextInSequence(yearly, { last: 80, year: 2025 }, 2026)).toEqual({ last: 1, year: 2026 });
    expect(nextInSequence(q, { last: 80, year: 2025 }, 2026)).toEqual({ last: 81, year: 2026 });
  });

  it('la OT toma el número de la cotización', () => {
    expect(orderNumberFor('COT-00012')).toBe('OT-00012');
    expect(orderNumberFor('COT-26-0007')).toBe('OT-26-0007');
    expect(orderNumberFor('FCG-54321')).toBe('OT-54321');
    expect(orderNumberFor('COT-00012', { ...DEFAULT_NUMBERING, order: { prefix: 'OP-' } })).toBe('OP-00012');
  });

  it('valida la configuración (sin año no se puede reiniciar: repetiría números)', () => {
    expect(sanitizeNumbering({ quote: { prefix: 'cot 2/', yearFormat: 'NONE', padding: 99, resetYearly: true } }).quote).toEqual({
      prefix: 'COT2',
      yearFormat: 'NONE',
      padding: 10,
      resetYearly: false,
    });
    expect(sanitizeNumbering({}).order.prefix).toBe('OT-');
  });
});
