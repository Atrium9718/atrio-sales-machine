/** Portal del cliente con Postgres (TEST_DATABASE_URL): enlace → vista del cliente → solicitud → gestión interna. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('portal del cliente con Postgres (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres' });
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['client_portal_links', 'client_requests'] } } });
    const { portalPublicRouter, clientPortalRouter } = await import('./clientPortal');
    const app = express();
    app.use(express.json());
    app.use('/api/portal', portalPublicRouter);
    app.use((req, _res, next) => {
      req.headers['x-user-id'] = 'emp-1';
      req.headers['x-user-name'] = 'Laura';
      next();
    });
    app.use('/api/client-portal', clientPortalRouter);
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
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  it('crea el enlace, el cliente entra, envía una solicitud y el equipo la gestiona', async () => {
    const created = await call('POST', '/api/client-portal/links', { clientName: 'Portal Prueba SAS', clientNit: '900111222' });
    expect(created.status).toBe(201);
    const token = created.body.path.split('/').pop();
    expect(created.body.link.id).not.toContain(token); // solo se guarda el hash

    const view = await call('GET', `/api/portal/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.client.name).toBe('Portal Prueba SAS');

    const sent = await call('POST', `/api/portal/${token}/requests`, { description: 'Necesito 500 cajas iguales al pedido anterior', quantity: 500 });
    expect(sent.status).toBe(201);
    expect((await call('GET', '/api/client-portal/requests/summary')).body.newCount).toBe(1);

    const list = await call('GET', '/api/client-portal/requests');
    const reqId = list.body.requests[0].id;
    expect((await call('PATCH', `/api/client-portal/requests/${reqId}`, { status: 'QUOTED', response: 'Te enviamos la cotización' })).status).toBe(200);
    expect((await call('GET', `/api/portal/${token}`)).body.requests[0]).toMatchObject({ response: 'Te enviamos la cotización' });
    expect((await call('PATCH', '/api/client-portal/requests/sol-no-existe', { status: 'QUOTED' })).status).toBe(404);

    // Revocado: el enlace deja de funcionar
    expect((await call('DELETE', `/api/client-portal/links/${created.body.link.id}`)).status).toBe(200);
    expect((await call('GET', `/api/portal/${token}`)).status).toBe(404);
  });
});
