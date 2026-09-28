import { describe, it, expect } from 'vitest';
import { computeProfitability, estimateItemCost, summarize } from './profitability';

const quotes = [
  {
    id: 'q1',
    number: 'COT-100',
    subtotal: 1_000_000,
    items: [
      { internalCost: 400_000, lineSubtotal: 600_000 }, // costo del motor
      { marginPercent: 25, lineSubtotal: 400_000 }, // manual: 400.000 / 1,25 = 320.000
    ],
  },
  { id: 'q2', number: 'COT-200', total: 1_190_000, items: [{ quantity: 10, unitPrice: 100_000 }] }, // sin costo
];

const projects = [
  { id: 'p1', number: 'OT-100', quoteId: 'q1', client: 'Pintuco', laborCost: 300_000, materialCost: 350_000, outsourcedCost: 150_000, otherCost: 0, totalRealHours: 12, completedAt: '2026-09-10' },
  { id: 'p2', number: 'OT-200', quoteNumber: 'cot-200', client: 'Alpina', laborCost: 0, materialCost: 0 },
];

describe('rentabilidad por orden', () => {
  const rows = computeProfitability(projects, quotes);

  it('costo estimado desde el motor o deducido del margen', () => {
    expect(estimateItemCost({ internalCost: 5 })).toEqual({ cost: 5, fromMargin: false });
    expect(estimateItemCost({ marginPercent: 25, lineSubtotal: 125 })).toEqual({ cost: 100, fromMargin: true });
    expect(estimateItemCost({ lineSubtotal: 100 })).toBeNull();
  });

  it('venta, costos y márgenes de una orden con costos registrados', () => {
    expect(rows[0]).toMatchObject({ sale: 1_000_000, estimatedCost: 720_000, realCost: 800_000, estimatedFromMargin: true, realHours: 12, completed: true });
    expect(rows[0].estimatedMargin).toBeCloseTo(0.28);
    expect(rows[0].realMargin).toBeCloseTo(0.2);
    expect(rows[0].costDeviation).toBeCloseTo(800 / 720 - 1);
  });

  it('orden sin costos del cotizador ni reales', () => {
    expect(rows[1]).toMatchObject({ sale: 1_000_000, estimatedCost: null, realCost: 0, realMargin: null, costDeviation: null });
  });

  it('resumen: solo cuenta órdenes con costos reales', () => {
    const s = summarize(rows);
    expect(s).toMatchObject({ orders: 2, withRealCosts: 1, sale: 1_000_000, realCost: 800_000, overBudget: 1 });
    expect(s.realMargin).toBeCloseTo(0.2);
    expect(s.breakdown).toEqual({ labor: 300_000, material: 350_000, outsourced: 150_000, other: 0 });
  });
});
