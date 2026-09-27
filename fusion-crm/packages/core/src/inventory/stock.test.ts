import { describe, it, expect } from 'vitest';
import { count, isLowStock, issue, monthSummary, paperItemId, paperItemName, piecesPerSheet, receive, transform, weightedAverage, type PaperSpec, type StockItem } from './stock';

let n = 0;
const ctx = { by: 'Ana', at: '2026-03-24T15:00:00.000Z', id: () => `m${++n}` };
const pliego: PaperSpec = { name: 'Propalcote 150g', sheetFormat: 'S70X100', cutCode: '.1', divisor: 1, widthCm: 100, heightCm: 70 };
const cuarto: PaperSpec = { ...pliego, cutCode: '.1/4', divisor: 4, widthCm: 50, heightCm: 35 };
const medio: PaperSpec = { ...pliego, cutCode: '.1/2', divisor: 2, widthCm: 70, heightCm: 50 };
const tercio: PaperSpec = { ...pliego, cutCode: '.1/3', divisor: 3, widthCm: 70, heightCm: 33.3 };
const item = (over: Partial<StockItem> = {}): StockItem => ({ id: 'p', name: 'Pliego', category: 'Papel', kind: 'PAPER', unit: 'pliego', available: 0, reserved: 0, unitCost: 0, lastCost: 0, minStock: 0, active: true, paper: pliego, ...over });

describe('existencias y costo promedio', () => {
  it('promedia el costo al comprar', () => {
    expect(weightedAverage(100, 600, 100, 700)).toBe(650);
    const a = receive(item({ available: 100, unitCost: 600 }), { quantity: 300, unitCost: 700, supplier: 'Dist. Papeles', document: 'FV-12' }, ctx);
    expect(a.item).toMatchObject({ available: 400, unitCost: 675, lastCost: 700 });
    expect(a.movement).toMatchObject({ type: 'PURCHASE_IN', quantity: 300, totalCost: 210000, balanceAfter: 400, supplier: 'Dist. Papeles' });
  });

  it('no deja sacar más de lo que hay y exige la OT en un consumo', () => {
    const it0 = item({ available: 10, unitCost: 650 });
    expect(() => issue(it0, { quantity: 11, projectId: 'p1' }, ctx)).toThrow(/No hay suficiente/);
    expect(() => issue(it0, { quantity: 1 }, ctx)).toThrow(/OT/);
    const r = issue(it0, { quantity: 4, projectId: 'p1', projectNumber: 'OT-00012' }, ctx);
    expect(r.item.available).toBe(6);
    expect(r.movement).toMatchObject({ type: 'CONSUMPTION_OUT', quantity: -4, totalCost: 2600, projectNumber: 'OT-00012' });
  });

  it('ajusta por conteo físico solo si hay diferencia', () => {
    expect(count(item({ available: 50, unitCost: 600 }), 50, ctx).movement).toBeNull();
    const r = count(item({ available: 50, unitCost: 600 }), 47, ctx);
    expect(r.item.available).toBe(47);
    expect(r.movement).toMatchObject({ type: 'COUNT_ADJUST', quantity: -3, totalCost: 1800 });
  });
});

describe('papel: pliegos que se transforman en cortes', () => {
  it('sabe qué cortes salen exactos', () => {
    expect(piecesPerSheet(pliego, cuarto)).toBe(4);
    expect(piecesPerSheet(medio, cuarto)).toBe(2);
    expect(piecesPerSheet(medio, tercio)).toBe(0);
    expect(piecesPerSheet(cuarto, medio)).toBe(0);
    expect(piecesPerSheet(pliego, { ...cuarto, sheetFormat: 'S60X90' })).toBe(0);
  });

  it('corta pliegos en cuartos repartiendo el costo del desperdicio', () => {
    const src = item({ available: 100, unitCost: 650 });
    const dst = item({ id: 'c', name: 'Cuarto', unit: 'hoja', paper: cuarto });
    const r = transform(src, dst, { sheets: 10, wastePieces: 2 }, { ...ctx, groupId: 'g1' });
    expect(r.produced).toBe(38);
    expect(r.source.available).toBe(90);
    expect(r.target.available).toBe(38);
    // 10 pliegos × $650 = $6.500 / 38 hojas buenas
    expect(r.pieceCost).toBeCloseTo(171.0526, 3);
    expect(r.movements.map((m) => [m.type, m.quantity, m.groupId])).toEqual([
      ['TRANSFORM_OUT', -10, 'g1'],
      ['TRANSFORM_IN', 38, 'g1'],
    ]);
    expect(() => transform(src, dst, { sheets: 1, wastePieces: 4 }, { ...ctx, groupId: 'g2' })).toThrow(/desperdicio/);
    expect(() => transform(src, dst, { sheets: 1.5 }, { ...ctx, groupId: 'g3' })).toThrow(/entero/);
  });

  it('nombres e ids estables', () => {
    expect(paperItemName(pliego)).toBe('Propalcote 150g · pliego 70×100');
    expect(paperItemName(cuarto)).toBe('Propalcote 150g · 1/4 de 70×100 (50×35 cm)');
    expect(paperItemId(cuarto)).toBe('paper-propalcote-150g-s70x100-1-4');
  });
});

describe('alertas y resumen', () => {
  it('bajo mínimo', () => {
    expect(isLowStock(item({ available: 5, minStock: 10 }))).toBe(true);
    expect(isLowStock(item({ available: 0 }))).toBe(false); // sin mínimo definido no alerta
    expect(isLowStock(item({ available: 3, reserved: 5 }))).toBe(true);
    expect(isLowStock(item({ available: 5, minStock: 10, active: false }))).toBe(false);
  });

  it('valor en bodega y mermas del mes', () => {
    const items = [item({ available: 10, unitCost: 100 }), item({ id: 'x', available: 2, unitCost: 50 })];
    const mv = (type: any, quantity: number, totalCost: number, at = '2026-03-10T00:00:00Z') => ({ type, quantity, totalCost, at }) as any;
    const s = monthSummary(items, [mv('CONSUMPTION_OUT', -10, 900), mv('DAMAGE_OUT', -1, 50), mv('COUNT_ADJUST', -1, 50), mv('PURCHASE_IN', 5, 500), mv('DAMAGE_OUT', -9, 9999, '2026-02-01T00:00:00Z')], '2026-03');
    expect(s).toMatchObject({ stockValue: 1100, purchases: 500, consumption: 900, waste: 100, wastePercent: 10 });
  });
});
