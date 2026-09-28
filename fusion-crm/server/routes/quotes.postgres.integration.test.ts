/**
 * Flujo de cotizaciones y proyectos por HTTP con DATA_BACKEND=postgres.
 * Solo corre con TEST_DATABASE_URL (Postgres con migraciones aplicadas).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('rutas de cotizaciones con Postgres (integración)', () => {
  let base = '';
  let server: any;
  let prismaMod: typeof import('../repositories/prisma/client');

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATA_BACKEND = 'postgres';
    prismaMod = await import('../repositories/prisma/client');
    const db = prismaMod.getPrisma();
    await db.quoteItem.deleteMany({});
    await db.quote.deleteMany({});
    await db.productionProject.deleteMany({});
    await db.storedDocument.deleteMany({ where: { collection: 'system_config' } });

    const { quotesRouter } = await import('./quotes');
    const { dataRouter } = await import('./data');
    const app = express();
    app.use(express.json());
    // Identidad ya verificada (en producción la pone requireAuth)
    app.use((req, _res, next) => {
      req.headers['x-user-id'] = 'emp-20';
      req.headers['x-user-name'] = 'Carolina Ruiz';
      req.headers['x-user-role'] = 'comercial';
      next();
    });
    app.use('/api/quotes', quotesRouter);
    app.use('/api/data', dataRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    delete process.env.DATA_BACKEND;
    await prismaMod?.disconnectPrisma();
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  it('guarda con montos del servidor, aprueba, crea la OT y la mueve de etapa', async () => {
    const saved = await call('POST', '/api/quotes', {
      id: 'q-http-1',
      number: 'COT-7001',
      status: 'Borrador',
      clientName: 'Grupo Éxito',
      clientNit: '890.900.608-9',
      total: 1, // manipulado
      items: [{ id: 'i1', description: 'Pendón 1x2 m', quantity: 2, unitPrice: 85000, applyVat: true, vatRate: 0.19 }],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.quote).toMatchObject({ subtotal: 170000, vatAmount: 32300, total: 202300 });

    const row = await prismaMod.getPrisma().quote.findUnique({ where: { id: 'q-http-1' }, include: { owner: true } });
    expect(Number(row!.total)).toBe(202300);
    expect(row!.owner.name).toBe('Carolina Ruiz');

    const approved = await call('POST', '/api/quotes/q-http-1/approve', {});
    expect(approved.status).toBe(200);
    expect(approved.body.quote).toMatchObject({ status: 'Aprobada', approvedBy: 'Carolina Ruiz' });
    expect(approved.body.project).toMatchObject({ quoteId: 'q-http-1', number: 'OT-7001', stageId: '1' });

    const listed = await call('GET', '/api/quotes');
    expect(listed.body.quotes.map((q: any) => q.id)).toEqual(['q-http-1']);

    const projects = await call('GET', '/api/quotes/projects-sync');
    expect(projects.body.projects).toHaveLength(1);
    const projectId = projects.body.projects[0].id;

    const moved = await call('PATCH', `/api/quotes/projects/${projectId}/stage`, { stageId: '3' });
    expect(moved.body).toMatchObject({ success: true, toStage: '3' });
    const pRow = await prismaMod.getPrisma().productionProject.findUnique({ where: { id: projectId }, include: { stage: true } });
    expect(pRow!.stage.key).toBe('EN_PRODUCCION');

    // La API genérica de datos lee los mismos proyectos
    const viaData = await call('GET', '/api/data/projects');
    expect(viaData.body.items.map((p: any) => p.id)).toEqual([projectId]);

    const deleted = await call('DELETE', `/api/quotes/projects/${projectId}`, { quoteId: 'q-http-1' });
    expect(deleted.status).toBe(200);
    expect((await call('GET', '/api/quotes/projects-sync')).body.projects).toHaveLength(0);
  });

  it('registra el envío y conserva los demás campos', async () => {
    // Ya aprobada: el envío queda registrado sin cambiar su estado
    const resent = await call('POST', '/api/quotes/q-http-1/send', { channel: 'EMAIL' });
    expect(resent.body.quote).toMatchObject({ status: 'Aprobada', sentVia: 'EMAIL', sentBy: 'Carolina Ruiz' });

    await call('POST', '/api/quotes', { id: 'q-http-2', status: 'Finalizada', clientName: 'Grupo Éxito', items: [{ id: 'i1', description: 'Volantes', quantity: 1000, unitPrice: 150 }] });
    const sent = await call('POST', '/api/quotes/q-http-2/send', { channel: 'WHATSAPP', destination: '3001234567' });
    expect(sent.body.quote).toMatchObject({ status: 'Enviada', sentBy: 'Carolina Ruiz', clientName: 'Grupo Éxito' });
    expect((await prismaMod.getPrisma().quote.findUnique({ where: { id: 'q-http-2' } }))!.status).toBe('SENT');
    await call('DELETE', '/api/quotes/q-http-2');
    // El consecutivo vuelve a empezar para la prueba de numeración
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: 'system_config' } });
    expect((await call('PATCH', '/api/quotes/no-existe/status', { status: 'Enviada' })).status).toBe(404);
  });

  it('elimina la cotización', async () => {
    expect((await call('DELETE', '/api/quotes/q-http-1')).status).toBe(200);
    expect((await call('GET', '/api/quotes')).body.quotes).toEqual([]);
  });

  it('numera en el servidor: consecutivo sin repetir y la OT lleva el mismo número', async () => {
    const item = { id: 'i1', description: 'Volantes', quantity: 1000, unitPrice: 150, applyVat: true, vatRate: 0.19 };
    const a = await call('POST', '/api/quotes', { id: 'q-num-a', status: 'Borrador', clientName: 'A', items: [item] });
    const b = await call('POST', '/api/quotes', { id: 'q-num-b', number: 'COT-00001', status: 'Borrador', clientName: 'B', items: [item] });
    expect(a.body.quote.number).toBe('COT-00001');
    // Número ocupado: el servidor asigna el siguiente
    expect(b.body.quote.number).toBe('COT-00002');
    // Una cotización existente conserva su número aunque el navegador envíe otro
    const again = await call('POST', '/api/quotes', { id: 'q-num-a', number: 'FCG-99999', status: 'Borrador', items: [item] });
    expect(again.body.quote.number).toBe('COT-00001');
    const reserved = await call('POST', '/api/quotes/issue-number');
    expect(reserved.body.number).toBe('COT-00003');

    const approved = await call('POST', '/api/quotes/q-num-b/approve', { deliveryTime: '3 a 5 días hábiles' });
    expect(approved.body.project.number).toBe('OT-00002');
    expect(approved.body.project.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(approved.body.project).toMatchObject({ approvedScaleUnits: 1000, deliveryTime: '3 a 5 días hábiles' });
    await call('DELETE', '/api/quotes/q-num-a');
    await call('DELETE', '/api/quotes/q-num-b');
    await call('DELETE', `/api/quotes/projects/${approved.body.project.id}`, { quoteId: 'q-num-b' });
  });
});
