import { describe, it, expect } from 'vitest';
import { paperPlanFromItems, pliegosToCut } from './paperPlan';

const cuts = [
  { code: '.1', divisor: 1 },
  { code: '.1/4', divisor: 4 },
  { code: '.1/8', divisor: 8 },
];
const litho = (over: any = {}) => ({
  description: 'Volantes media carta 4x4\ndetalle',
  quantity: 5000,
  printTechnique: 'LITHO',
  paperTypeId: 'Propalcote 150g',
  paperSheets: 338,
  sheetsNeeded: 2700,
  assistInput: { technique: 'LITHO', paperName: 'Propalcote 150g', sheetFormat: 'S70X100', sheetCutCode: '.1/8' },
  ...over,
});

describe('papel de una OT desde la cotización', () => {
  it('agrupa por papel, pliego y corte, con hojas y pliegos del motor', () => {
    const plan = paperPlanFromItems(
      [litho(), litho({ quantity: 1000, paperSheets: 88, sheetsNeeded: 700 }), litho({ paperTypeId: 'Propalcote 115g', assistInput: { paperName: 'Propalcote 115g', sheetFormat: 'S70X100', sheetCutCode: '.1/4' }, paperSheets: 100, sheetsNeeded: 400 })],
      cuts,
    );
    expect(plan.status).toBe('PENDIENTE');
    expect(plan.lines.map((l) => [l.paperName, l.cutCode, l.cutSheets, l.pliegos, l.sourceItemId, l.cutItemId])).toEqual([
      ['Propalcote 150g', '.1/8', 3400, 426, 'paper-propalcote-150g-s70x100-1', 'paper-propalcote-150g-s70x100-1-8'],
      ['Propalcote 115g', '.1/4', 400, 100, 'paper-propalcote-115g-s70x100-1', 'paper-propalcote-115g-s70x100-1-4'],
    ]);
    expect(plan.lines[0].items).toEqual(['Volantes media carta 4x4 · 5.000 un.', 'Volantes media carta 4x4 · 1.000 un.']);
  });

  it('digital va aparte y los ítems incompletos quedan como nota', () => {
    const plan = paperPlanFromItems(
      [
        { description: 'Tarjetas', printTechnique: 'DIGITAL', sheetsNeeded: 125, assistInput: { digitalFormatName: 'Carta' } },
        litho({ paperTypeId: '', assistInput: { sheetFormat: 'S70X100', sheetCutCode: '.1/8' } }),
        { description: 'Diseño', quantity: 1 },
      ],
      cuts,
    );
    expect(plan.status).toBe('SIN_PAPEL');
    expect(plan.digital).toEqual([{ format: 'Carta', sheets: 125, description: 'Tarjetas' }]);
    expect(plan.notes).toHaveLength(1);
  });

  it('usa primero las hojas ya cortadas', () => {
    expect(pliegosToCut({ cutSheets: 2700, divisor: 8 }, 0)).toBe(338);
    expect(pliegosToCut({ cutSheets: 2700, divisor: 8 }, 700)).toBe(250);
    expect(pliegosToCut({ cutSheets: 2700, divisor: 8 }, 5000)).toBe(0);
    expect(pliegosToCut({ cutSheets: 500, divisor: 1 }, 0)).toBe(0);
  });
});
