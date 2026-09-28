/**
 * Flujo de punta a punta por HTTP con Postgres real (TEST_DATABASE_URL):
 * cotización → aprobación → orden de producción → cambio de etapa → aviso por WhatsApp al
 * cliente (plantilla aprobada, porque el cliente no ha escrito en 24 h) → queda en la bandeja.
 * Meta se simula interceptando las llamadas a graph.facebook.com.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('cotización → producción → aviso al cliente (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  const metaCalls: { url: string; body: any }[] = [];

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: url,
      DATA_BACKEND: 'postgres',
      WHATSAPP_PHONE_NUMBER_ID: '123456',
      WHATSAPP_ACCESS_TOKEN: 'token-de-prueba',
      APP_URL: 'https://crm.fusion.test',
    });
    delete process.env.GEMINI_API_KEY;
    globalThis.fetch = (async (input: any, init?: any) => {
      const target = String(input?.url ?? input);
      if (target.startsWith('https://graph.facebook.com/')) {
        metaCalls.push({ url: target, body: JSON.parse(init?.body || '{}') });
        return new Response(JSON.stringify({ messages: [{ id: `wamid.e2e.${metaCalls.length}` }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return realFetch(input, init);
    }) as typeof fetch;

    prismaMod = await import('../repositories/prisma/client');
    const db = prismaMod.getPrisma();
    await db.storedDocument.deleteMany({ where: { collection: { in: ['omni_conversations', 'omnichannel_settings', 'omni_stage_notices', 'portal_links'] } } });

    const { quotesRouter } = await import('./quotes');
    const { dataRouter } = await import('./data');
    const { omnichannelRouter } = await import('./omnichannel');
    const { startStageNotifications, resetOmnichannelRuntime } = await import('../omnichannel/runtime');
    resetOmnichannelRuntime();
    startStageNotifications();

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.headers['x-user-id'] = 'emp-1';
      req.headers['x-user-name'] = 'Laura';
      req.headers['x-user-role'] = 'admin';
      next();
    });
    app.use('/api/quotes', quotesRouter);
    app.use('/api/data', dataRouter);
    app.use('/api/omnichannel', omnichannelRouter);
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    globalThis.fetch = realFetch;
    await prismaMod?.disconnectPrisma();
    process.env = saved;
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await realFetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  it('el cliente recibe el aviso cuando su pedido entra a producción', async () => {
    const suffix = Date.now().toString().slice(-6);
    const nit = `901${suffix}`;
    const clientName = `Empaques E2E ${suffix}`;

    // Avisos activos todo el día (la prueba puede correr de noche)
    const cfg = await call('PUT', '/api/omnichannel/config', { notifications: { enabled: true, stages: ['EN_PRODUCCION'], sendFrom: '00:00', sendUntil: '23:59' } });
    expect(cfg.status).toBe(200);

    // 1. Cotización con el celular del contacto
    const quoteId = `q-e2e-${suffix}`;
    const created = await call('POST', '/api/quotes', {
      id: quoteId,
      number: `COT-${suffix}`,
      status: 'Borrador',
      clientName,
      clientNit: nit,
      clientPhone: '3104459921',
      clientData: { contactName: 'Claudia Pérez', nit, phone: '3104459921', mobile: '3104459921' },
      items: [{ id: 'i1', description: 'Cajas plegadizas 20x15', quantity: 1000, unitPrice: 1200, applyVat: true, vatRate: 0.19 }],
    });
    expect(created.status).toBe(200);
    expect(created.body.quote.total).toBe(1_428_000); // calculado por el servidor

    // 2. Aprobación → orden de producción
    const approved = await call('POST', `/api/quotes/${quoteId}/approve`, {});
    expect(approved.status).toBe(200);
    const project = approved.body.project;
    expect(project).toMatchObject({ quoteId, stageId: '1' });

    // 3. Producción la pasa a "En producción" (así guarda el tablero)
    const moved = await call('PUT', `/api/data/projects/${project.id}`, { ...project, stageId: '3' });
    expect(moved.status).toBe(200);

    // 4. Aviso enviado con la plantilla aprobada
    let notice: any = null;
    for (let i = 0; i < 50 && notice?.status !== 'sent'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const list = await call('GET', '/api/omnichannel/notifications');
      notice = list.body.notices.find((n: any) => n.projectId === project.id);
    }
    expect(notice).toMatchObject({ status: 'sent', mode: 'template', phone: '573104459921', stageKey: 'EN_PRODUCCION' });

    const sent = metaCalls.find((c) => c.body?.to === '573104459921');
    expect(sent?.url).toContain('/123456/messages');
    expect(sent?.body.type).toBe('template');
    const params = sent!.body.template.components[0].parameters.map((p: any) => p.text);
    expect(params[0]).toBe('Claudia');
    expect(params[1]).toBe(project.number);
    expect(params[2]).toBe('En producción');
    expect(params[3]).toMatch(/^https:\/\/crm\.fusion\.test\/portal\//);

    // 5. Queda registrado en la bandeja
    const conv = await call('GET', '/api/omnichannel/conversations/whatsapp_573104459921');
    expect(conv.status).toBe(200);
    expect(conv.body.conversation.messages.at(-1)).toMatchObject({ author: 'system', status: 'sent' });

    // 6. Un segundo guardado en la misma etapa no repite el aviso
    await call('PUT', `/api/data/projects/${project.id}`, { ...project, stageId: '3', progress: 20 });
    await new Promise((r) => setTimeout(r, 300));
    expect(metaCalls.filter((c) => c.body?.to === '573104459921')).toHaveLength(1);
  });
});
