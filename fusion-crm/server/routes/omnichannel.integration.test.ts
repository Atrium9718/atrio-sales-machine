/**
 * Flujo completo por HTTP con Postgres real (TEST_DATABASE_URL): chat web → bandeja → respuesta
 * de una persona → el visitante la recibe. Sin GEMINI_API_KEY, así que todo pasa a personas.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('omnicanal por HTTP (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATA_BACKEND = 'postgres';
    delete process.env.GEMINI_API_KEY;
    delete process.env.WEBCHAT_PUBLIC_KEY;
    process.env.WEBCHAT_ALLOWED_ORIGINS = 'https://fusion.test';
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['omni_conversations', 'omnichannel_settings'] } } });

    process.env.META_APP_SECRET = 'secreto-de-prueba';
    const { widgetRouter } = await import('./widget');
    const { omnichannelRouter } = await import('./omnichannel');
    const { metaWebhookRouter } = await import('./metaWebhook');
    const { dataRouter } = await import('./data');
    const { startStageNotifications } = await import('../omnichannel/runtime');
    startStageNotifications();
    const app = express();
    app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
    app.use('/api/widget', widgetRouter);
    app.use('/api/webhooks/meta', metaWebhookRouter);
    // Identidad que en producción pone requireAuth
    app.use((req, _res, next) => {
      req.headers['x-user-id'] = 'emp-1';
      req.headers['x-user-name'] = 'Laura';
      req.headers['x-user-role'] = String(req.headers['x-test-role'] || 'comercial');
      next();
    });
    app.use('/api/omnichannel', omnichannelRouter);
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

  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
  };

  it('chat web → bandeja → respuesta humana → el visitante la recibe', async () => {
    const cfg = await call('GET', '/api/widget/config', undefined, { Origin: 'https://fusion.test' });
    expect(cfg.status).toBe(200);
    expect(cfg.headers.get('access-control-allow-origin')).toBe('https://fusion.test');
    expect(cfg.body.organizationName).toBeTruthy();

    const { body: session } = await call('POST', '/api/widget/session', {});
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect((await call('POST', '/api/widget/identify', { token: session.token, name: 'Andrea', contactInfo: '3001234567' })).status).toBe(200);

    const sent = await call('POST', '/api/widget/messages', { token: session.token, text: '¿Hacen tarjetas de presentación?' });
    expect(sent.status).toBe(200);
    expect(sent.body.reply).toBeNull(); // sin IA configurada, espera a una persona

    const list = await call('GET', '/api/omnichannel/conversations?filter=needsHuman');
    expect(list.body.conversations).toHaveLength(1);
    const summary = list.body.conversations[0];
    expect(summary).toMatchObject({ channel: 'webchat', contactName: 'Andrea (3001234567)', needsHuman: true, unread: 1 });
    // El token del visitante no queda expuesto en el id
    expect(summary.id).not.toContain(session.token);

    const reply = await call('POST', `/api/omnichannel/conversations/${summary.id}/reply`, { text: 'Sí, desde 100 unidades. ¿Qué cantidad necesitas?' });
    expect(reply.body.conversation).toMatchObject({ needsHuman: false, assigneeName: 'Laura', mode: 'human' });

    const poll = await call('GET', `/api/widget/messages?token=${session.token}`);
    expect(poll.body.messages.map((m: any) => m.text)).toEqual(['Sí, desde 100 unidades. ¿Qué cantidad necesitas?']);
    // No se repite en la siguiente consulta
    expect((await call('GET', `/api/widget/messages?token=${session.token}`)).body.messages).toEqual([]);

    const resolved = await call('POST', `/api/omnichannel/conversations/${summary.id}/resolve`);
    expect(resolved.body.conversation.status).toBe('resolved');
    expect((await call('GET', '/api/omnichannel/stats')).body.stats).toMatchObject({ conversations: 1, needsHuman: 0, humanMessagesSent: 1 });
  });

  it('la configuración solo la cambia un administrador y se valida', async () => {
    const denied = await call('PUT', '/api/omnichannel/config', { aiMode: 'auto' });
    expect(denied.status).toBe(403);
    const bad = await call('PUT', '/api/omnichannel/config', { aiMode: 'siempre' }, { 'x-test-role': 'admin' });
    expect(bad.status).toBe(400);
    const ok = await call('PUT', '/api/omnichannel/config', { aiMode: 'auto', knowledge: 'Horario: lunes a sábado 8 a 6.' }, { 'x-test-role': 'admin' });
    expect(ok.status).toBe(200);
    const read = await call('GET', '/api/omnichannel/config');
    expect(read.body.config).toMatchObject({ aiMode: 'auto', knowledge: 'Horario: lunes a sábado 8 a 6.' });
    expect(read.body.channels).toMatchObject({ whatsapp: false, ai: false });
  });

  it('rechaza tokens de sesión inválidos', async () => {
    expect((await call('POST', '/api/widget/messages', { token: '../../x', text: 'hola' })).status).toBe(400);
    expect((await call('GET', '/api/widget/messages?token=corto')).status).toBe(400);
  });

  it('webhook de WhatsApp firmado → conversación en la bandeja; sin firma se rechaza', async () => {
    const { createHmac } = await import('crypto');
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ value: {
        contacts: [{ wa_id: '573009998877', profile: { name: 'Jorge' } }],
        messages: [{ from: '573009998877', id: 'wamid.int.1', type: 'text', text: { body: 'buenas, necesito 200 cajas' } }],
      } }] }],
    });
    const sign = 'sha256=' + createHmac('sha256', 'secreto-de-prueba').update(payload).digest('hex');
    const post = (headers: Record<string, string>) =>
      fetch(`${base}/api/webhooks/meta`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: payload });

    expect((await post({})).status).toBe(401);
    expect((await post({ 'X-Hub-Signature-256': sign })).status).toBe(200);
    // Reintento de Meta con el mismo mensaje
    expect((await post({ 'X-Hub-Signature-256': sign })).status).toBe(200);

    let conv: any = null;
    for (let i = 0; i < 40 && !conv; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const detail = await call('GET', '/api/omnichannel/conversations/whatsapp_573009998877');
      if (detail.status === 200) conv = detail.body.conversation;
    }
    expect(conv).toMatchObject({ channel: 'whatsapp', contactName: 'Jorge', needsHuman: true });
    await new Promise((r) => setTimeout(r, 200));
    const again = await call('GET', '/api/omnichannel/conversations/whatsapp_573009998877');
    expect(again.body.conversation.messages.filter((m: any) => m.direction === 'in')).toHaveLength(1);
  });

  it('cambio de etapa desde el tablero → aviso registrado (y en cola si WhatsApp no está configurado)', async () => {
    const db = prismaMod.getPrisma();
    await db.storedDocument.deleteMany({ where: { collection: 'omni_stage_notices' } });
    const { repositories } = await import('../repositories');
    await repositories().clients.upsert({ id: 'cli-aviso', name: 'Tintas del Valle S.A.S', nit: '901222333-4', phone: '3157778899' } as any);
    await repositories().quotes.upsert({ id: 'q-aviso', number: 'COT-5501', status: 'Aprobada', clientName: 'Tintas del Valle S.A.S', clientNit: '901222333-4', items: [] } as any);

    const admin = { 'x-test-role': 'admin' };
    const cfg = (await call('GET', '/api/omnichannel/config')).body.config;
    expect((await call('PUT', '/api/omnichannel/config', { ...cfg, notifications: { ...cfg.notifications, enabled: true, sendFrom: '00:00', sendUntil: '23:59' } }, admin)).status).toBe(200);

    expect((await call('PUT', '/api/data/projects/proj-aviso', { number: 'OT-5501', quoteId: 'q-aviso', stageId: '2' })).status).toBe(200);
    expect((await call('PUT', '/api/data/projects/proj-aviso', { number: 'OT-5501', quoteId: 'q-aviso', stageId: '3' })).status).toBe(200);

    let notice: any = null;
    // Se espera al primer intento de envío (se registra antes y se intenta enseguida)
    for (let i = 0; i < 50 && !(notice?.attempts >= 1); i++) {
      await new Promise((r) => setTimeout(r, 100));
      notice = (await call('GET', '/api/omnichannel/notifications')).body.notices.find((n: any) => n.projectId === 'proj-aviso');
    }
    expect(notice).toMatchObject({ stageKey: 'EN_PRODUCCION', phone: '573157778899', orderNumber: 'OT-5501', clientName: 'Tintas del Valle S.A.S' });
    // Sin credenciales de WhatsApp en la prueba: queda en cola para reintento, con el motivo
    expect(notice.status).toBe('scheduled');
    expect(notice.reason).toContain('WhatsApp no está configurado');
    // Y la conversación del cliente muestra el intento en la bandeja
    const conv = (await call('GET', '/api/omnichannel/conversations/whatsapp_573157778899')).body.conversation;
    expect(conv.messages.at(-1)).toMatchObject({ author: 'system', status: 'failed' });
  });
});
