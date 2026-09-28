/** Kiosco con Postgres (TEST_DATABASE_URL): equipo → pantalla pública → pedido → pre-cotización y cliente. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('kiosco con Postgres (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  beforeAll(async () => {
    const uploads = (await import('fs')).mkdtempSync(require('path').join(require('os').tmpdir(), 'kiosk-uploads-'));
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres', FILE_STORAGE: 'local', UPLOADS_DIR: uploads });
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['kiosk_settings', 'kiosk_devices', 'catalog_products'] } } });
    const { documentRepository } = await import('../repositories/documentStore');
    await documentRepository('catalog_products').upsertMany([
      { id: 'kp-1', name: 'Tarjetas de presentación', category: 'Papelería', defaultPrice: 120, active: true },
      { id: 'kp-2', name: 'Pendón', category: 'Gran formato', defaultPrice: 60000, active: true },
    ]);
    const { kioskPublicRouter, kioskRouter } = await import('./kiosk');
    const app = express();
    app.use(express.json({ limit: '20mb' }));
    app.use('/api/kiosk-public', kioskPublicRouter);
    app.use((req, _res, next) => {
      req.headers['x-user-name'] = 'Laura';
      next();
    });
    app.use('/api/kiosk', kioskRouter);
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

  it('configura, recibe un pedido y lo deja como pre-cotización con su cliente', async () => {
    await call('PUT', '/api/kiosk/config', { productIds: ['kp-1'], showPrices: true, title: 'Pide aquí' });
    const device = await call('POST', '/api/kiosk/devices', { name: 'Mostrador' });
    expect(device.status).toBe(201);
    const token = device.body.device.token;

    const view = await call('GET', `/api/kiosk-public/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.config.title).toBe('Pide aquí');
    expect(view.body.products.map((p: any) => p.id)).toEqual(['kp-1']);
    expect(view.body.config.productIds).toBeUndefined();

    const noConsent = await call('POST', `/api/kiosk-public/${token}/orders`, {
      items: [{ productId: 'kp-1', quantity: 1000 }],
      customer: { name: 'Ana Kiosco', phone: '3001234567' },
    });
    expect(noConsent.status).toBe(400);

    const hidden = await call('POST', `/api/kiosk-public/${token}/orders`, {
      items: [{ productId: 'kp-2', quantity: 1 }],
      customer: { name: 'Ana Kiosco', phone: '3001234567' },
      consent: true,
    });
    expect(hidden.status).toBe(400);

    const sent = await call('POST', `/api/kiosk-public/${token}/orders`, {
      items: [{ productId: 'kp-1', quantity: 1000, notes: 'a color por ambas caras' }, { description: 'Stickers redondos de 5 cm', quantity: 200 }],
      customer: { name: 'Ana Kiosco', phone: '300 123 45 67', company: 'Kiosco Pruebas SAS', nit: '901777888-1' },
      consent: true,
    });
    expect(sent.status).toBe(201);
    expect(sent.body.total).toBe(142800); // 1000 × 120 + IVA; lo "por definir" va en 0

    const { repositories } = await import('../repositories');
    const quote = (await repositories().quotes.list()).find((q: any) => q.number === sent.body.number) as any;
    expect(quote).toMatchObject({ source: 'KIOSK', isPreQuote: true, status: 'Borrador', clientName: 'Kiosco Pruebas SAS', kioskDeviceName: 'Mostrador' });
    expect(quote.items).toHaveLength(2);
    const client = (await repositories().clients.list()).find((c: any) => c.id === quote.clientId) as any;
    expect(client).toMatchObject({ name: 'Kiosco Pruebas SAS', nit: '901777888-1', source: 'Kiosco' });

    const orders = await call('GET', '/api/kiosk/orders');
    expect(orders.body.orders[0]).toMatchObject({ number: sent.body.number, deviceName: 'Mostrador' });

    // El segundo pedido del mismo celular no duplica al cliente
    const again = await call('POST', `/api/kiosk-public/${token}/orders`, {
      items: [{ productId: 'kp-1', quantity: 100 }],
      customer: { name: 'Ana Kiosco', phone: '3001234567' },
      consent: true,
    });
    expect(again.status).toBe(201);
    const clients = (await repositories().clients.list()).filter((c: any) => c.nit === '901777888-1');
    expect(clients).toHaveLength(1);

    await call('DELETE', `/api/kiosk/devices/${device.body.device.id}`);
    expect((await call('GET', `/api/kiosk-public/${token}`)).status).toBe(404);
  });
});
