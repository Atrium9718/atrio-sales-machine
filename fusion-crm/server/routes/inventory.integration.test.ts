/** Inventario por HTTP con Postgres (TEST_DATABASE_URL): pliegos, corte, consumo en OT y kárdex. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('inventario (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres' });
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['inventory_items', 'inventory_movements'] } } });
    const { inventoryRouter } = await import('./inventory');
    const { dataRouter } = await import('./data');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.headers['x-user-name'] = 'Laura';
      next();
    });
    app.use('/api/inventory', inventoryRouter);
    app.use('/api/data', dataRouter);
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await prismaMod?.disconnectPrisma();
    process.env = saved;
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  it('del pliego a la OT, con kárdex', async () => {
    const created = await call('POST', '/api/inventory/items', { paper: { name: 'Propalcote 150g', sheetFormat: 'S70X100' }, initialQuantity: 100, initialCost: 650 });
    expect(created.status).toBe(201);
    const id = created.body.item.id;

    const cut = await call('POST', '/api/inventory/transform', { sourceId: id, targetCutCode: '.1/8', sheets: 10 });
    expect(cut.body).toMatchObject({ success: true, produced: 80, pieceCost: 81.25 });

    const used = await call('POST', '/api/inventory/issue', { itemId: cut.body.target.id, quantity: 50, projectId: 'proj-9', projectNumber: 'OT-00009' });
    expect(used.body.movement).toMatchObject({ type: 'CONSUMPTION_OUT', quantity: -50, totalCost: 4062.5 });
    expect((await call('POST', '/api/inventory/issue', { itemId: cut.body.target.id, quantity: 999, projectId: 'proj-9' })).status).toBe(400);

    const listed = await call('GET', '/api/inventory');
    expect(listed.body.items.map((i: any) => [i.name, i.available])).toEqual([
      ['Propalcote 150g · 1/8 de 70×100 (35×25 cm)', 30],
      ['Propalcote 150g · pliego 70×100', 90],
    ]);
    expect(listed.body.catalog.cuts.length).toBeGreaterThan(5);

    const kardex = await call('GET', '/api/inventory/movements?projectId=proj-9');
    expect(kardex.body.movements).toHaveLength(1);

    // Las existencias no se editan por la API genérica (no dejaría movimiento)
    expect((await call('PUT', `/api/data/inventory/${id}`, { id, available: 1_000 })).status).toBe(405);
    expect((await call('GET', '/api/data/inventory')).status).toBe(200);
  });
});
