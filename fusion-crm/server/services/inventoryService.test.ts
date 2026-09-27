import { describe, it, expect } from 'vitest';
import { createMemoryRepository } from '../repositories/documentStore';
import { createInventoryService, normalizeItem } from './inventoryService';
import { toPlainTariff } from './tariffStore';
import { DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press/defaultTariff';

const make = () => {
  const items = createMemoryRepository() as any;
  const movements = createMemoryRepository() as any;
  const service = createInventoryService({ items, movements, tariff: () => toPlainTariff(DEFAULT_OFFICIAL_TARIFF), now: () => new Date('2026-03-24T15:00:00Z') });
  return { service, items, movements };
};

describe('servicio de inventario', () => {
  it('pliego del tarifario → compra → corte → consumo en OT → conteo', async () => {
    const { service } = make();
    const pliego = await service.saveItem({ paper: { name: 'Propalcote 150g', sheetFormat: 'S70X100' }, minStock: 100, initialQuantity: 200, initialCost: 600, location: 'Bodega 1' }, 'Ana');
    expect(pliego).toMatchObject({ id: 'paper-propalcote-150g-s70x100-1', name: 'Propalcote 150g · pliego 70×100', unit: 'pliego', available: 200, unitCost: 600 });
    await expect(service.saveItem({ paper: { name: 'Propalcote 150g', sheetFormat: 'S70X100' } }, 'Ana')).rejects.toMatchObject({ status: 409 });

    await service.receive({ itemId: pliego.id, quantity: 200, unitCost: 700, supplier: 'Dist. Papeles', document: 'FV-12' }, 'Ana');
    const cut = await service.transform({ sourceId: pliego.id, targetCutCode: '.1/4', sheets: 25, wastePieces: 4 }, 'Luis');
    expect(cut.target).toMatchObject({ id: 'paper-propalcote-150g-s70x100-1-4', unit: 'hoja', available: 96, location: 'Bodega 1' });
    expect(cut.source.available).toBe(375);
    // Del pliego sale cualquier corte; de un cuarto no salen tercios exactos
    await expect(service.transform({ sourceId: pliego.id, targetCutCode: '.1/64', sheets: 1 }, 'Luis')).resolves.toBeTruthy();
    await expect(service.transform({ sourceId: cut.target.id, targetCutCode: '.1/3', sheets: 1 }, 'Luis')).rejects.toThrow(/exactos/);

    const used = await service.issue({ itemId: cut.target.id, quantity: 90, projectId: 'proj-1', projectNumber: 'OT-00012' }, 'Luis');
    expect(used.item.available).toBe(6);
    const counted = await service.count([{ itemId: pliego.id, counted: 370 }, { itemId: cut.target.id, counted: 6 }], 'Ana');
    expect(counted).toMatchObject({ counted: 2, adjusted: 1 });

    const ot = await service.movements({ projectId: 'proj-1' });
    expect(ot.map((m) => [m.type, m.quantity])).toEqual([['CONSUMPTION_OUT', -90]]);
    const kardex = await service.movements({ itemId: pliego.id });
    expect(kardex.map((m) => m.type).sort()).toEqual(['COUNT_ADJUST', 'INITIAL', 'PURCHASE_IN', 'TRANSFORM_OUT', 'TRANSFORM_OUT']);
    const summary = await service.summary();
    expect(summary.purchases).toBe(140000);
    expect(summary.lowStock).toBe(0);
  });

  it('consumos simultáneos no dejan existencias negativas', async () => {
    const { service } = make();
    const tinta = await service.saveItem({ name: 'Tinta cyan', category: 'Tinta', unit: 'kg', initialQuantity: 10, initialCost: 90000 }, 'Ana');
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.issue({ itemId: tinta.id, quantity: 1, projectId: 'p', projectNumber: 'OT-1' }, 'Luis')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect((await service.list()).find((i) => i.id === tinta.id)!.available).toBe(0);
  });

  it('lee materiales guardados antes del kárdex', () => {
    expect(normalizeItem({ id: 'x', name: 'Papel bond', category: 'Papel', available: '12', reserved: 0, unit: 'resma', unitCost: 15000 })).toMatchObject({
      kind: 'SUPPLY',
      available: 12,
      lastCost: 15000,
      minStock: 0,
      active: true,
    });
  });
});
