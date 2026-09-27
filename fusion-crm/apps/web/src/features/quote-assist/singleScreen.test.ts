import { describe, it, expect } from 'vitest';
import { DEFAULT_ASSIST_FORM_STATE } from './types';
import { applyKind, commercialSummary, finishingSummary, kindOf, sectionsFor } from './singleScreen';

describe('ayuda para cotizar en una sola pantalla', () => {
  it('una sola elección fija el modo y la técnica', () => {
    expect(applyKind('DIGITAL')).toEqual({ mode: 'GUIDED', technique: 'DIGITAL' });
    expect(applyKind('BOTH')).toEqual({ mode: 'GUIDED', technique: 'BOTH' });
    expect(applyKind('WIDE_FORMAT')).toEqual({ mode: 'WIDE_FORMAT' });
    expect(applyKind('MANUAL')).toEqual({ mode: 'MANUAL' });
    expect(kindOf('GUIDED', 'LITHO')).toBe('LITHO');
    expect(kindOf('MANUAL', 'LITHO')).toBe('MANUAL');
    expect(kindOf('WIDE_FORMAT', 'DIGITAL')).toBe('WIDE_FORMAT');
  });

  it('papel y montaje solo aparece cuando hay litografía', () => {
    expect(sectionsFor('DIGITAL').map((s) => s.key)).toEqual(['trabajo', 'tecnica', 'acabados', 'comercial']);
    expect(sectionsFor('LITHO').map((s) => s.key)).toContain('papel');
    expect(sectionsFor('BOTH')).toHaveLength(5);
  });

  it('resume acabados y condiciones para las secciones plegadas', () => {
    expect(finishingSummary({ ...DEFAULT_ASSIST_FORM_STATE, cutRuns: 0 })).toBe('Sin acabados');
    expect(finishingSummary({ ...DEFAULT_ASSIST_FORM_STATE, laminationMode: 'BOTH_FACES', cutRuns: 2, other1Label: 'Empaque' })).toBe('plastificado · 2 cortes · Empaque');
    const s = commercialSummary({ ...DEFAULT_ASSIST_FORM_STATE, otherDiscountPercent: 5 });
    expect(s).toContain('IVA 19%');
    expect(s).toContain('desc. 5%');
    expect(s).toContain('entrega 3 a 5 días hábiles');
  });
});

import { calculatePressQuote, buildPressQuoteInput, DEFAULT_OFFICIAL_TARIFF } from '../../../../../packages/core/src/pricing/press';
import { getResultRuns } from './ResultsPanel';

describe('margen en los resultados', () => {
  it('se muestra en porcentaje (30 %), no como fracción (0,3 %)', () => {
    const form = { ...DEFAULT_ASSIST_FORM_STATE, jobName: 'Volantes', technique: 'LITHO' as const, lithoMarginPercent: 30 };
    const result = calculatePressQuote(buildPressQuoteInput(form, DEFAULT_OFFICIAL_TARIFF)!);
    const runs = getResultRuns(result, 'LITHO');
    expect(runs.length).toBeGreaterThan(0);
    for (const r of runs) {
      expect(r.marginPercent).toBeCloseTo((r.marginAmount / r.internalCost) * 100, 0);
      expect(r.marginPercent).toBeGreaterThan(20);
    }
  });
});
