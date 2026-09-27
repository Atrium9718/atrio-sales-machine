import { describe, it, expect } from 'vitest';
import { applyCostEntry, buildCostEntry, removeCostEntry } from './projectCosts';
import { computeProfitability } from '@/lib/profitability';

const NOW = new Date('2026-09-20T10:00:00Z');

describe('costos reales de la orden', () => {
  it('mano de obra = horas × tarifa; materiales y terceros por monto', () => {
    expect(buildCostEntry({ costType: 'MANO_OBRA', hours: 3, rate: 20000, amount: 999, by: 'Ana', now: NOW, id: 'a' })).toMatchObject({ hours: 3, costAmount: 60000 });
    expect(buildCostEntry({ costType: 'TERCEROS', hours: 5, amount: 80000, by: 'Ana', now: NOW, id: 'b' })).toMatchObject({ hours: 0, costAmount: 80000 });
    expect(buildCostEntry({ costType: 'OTROS', amount: -5, by: 'x' }).costAmount).toBe(0);
  });

  it('suma y descuenta, incluso en órdenes antiguas sin campos de costo', () => {
    const legacy: any = { id: 'p1', quoteTotal: 1_190_000 };
    let p = applyCostEntry(legacy, buildCostEntry({ costType: 'MANO_OBRA', hours: 2, rate: 50000, by: 'Ana', id: 'e1' }));
    p = applyCostEntry(p, buildCostEntry({ costType: 'MATERIALES', amount: 300000, by: 'Ana', id: 'e2' }));
    expect(p).toMatchObject({ totalRealHours: 2, laborCost: 100000, materialCost: 300000, outsourcedCost: 0, otherCost: 0 });
    expect(p.timeEntries.map((e) => e.id)).toEqual(['e2', 'e1']);

    // Lo registrado llega a la rentabilidad
    expect(computeProfitability([p], [])[0]).toMatchObject({ realCost: 400000, realHours: 2 });

    p = removeCostEntry(p, 'e1');
    expect(p).toMatchObject({ totalRealHours: 0, laborCost: 0, materialCost: 300000 });
    expect(removeCostEntry(p, 'no-existe')).toEqual(p);
  });
});
