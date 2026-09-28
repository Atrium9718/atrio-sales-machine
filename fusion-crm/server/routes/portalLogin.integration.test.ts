/** Ingreso al portal con cédula/NIT + código (Postgres, TEST_DATABASE_URL). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('ingreso al portal con documento (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };
  const sent: { channel: string; to: string; code: string }[] = [];

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres' });
    prismaMod = await import('../repositories/prisma/client');
    await prismaMod.getPrisma().storedDocument.deleteMany({ where: { collection: { in: ['portal_login_codes'] } } });
    const { repositories } = await import('../repositories');
    await repositories().clients.upsertMany([
      { id: 'cli-login-1', name: 'Login Pruebas SAS', nit: '901444555-2', phone1: '3157778899', email: 'compras@loginpruebas.co' } as any,
      { id: 'cli-login-2', name: 'Sin Contacto', nit: '901444666-1' } as any,
    ]);
    const { portalLoginRouter, __setLoginCodeSender } = await import('./portalLogin');
    __setLoginCodeSender({
      whatsappReady: () => true,
      emailReady: () => true,
      sendWhatsApp: async (to, code) => (sent.push({ channel: 'whatsapp', to, code }), { ok: true }),
      sendEmail: async (to, code) => (sent.push({ channel: 'email', to, code }), { ok: true }),
    });
    const { portalPublicRouter } = await import('./clientPortal');
    const app = express();
    app.use(express.json());
    app.use('/api/portal/acceso', portalLoginRouter);
    app.use('/api/portal', portalPublicRouter);
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await prismaMod?.disconnectPrisma();
    process.env = saved;
  });

  const call = async (path: string, body: unknown) => {
    const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  it('envía el código al WhatsApp registrado, valida y abre el portal del cliente', async () => {
    expect((await call('/api/portal/acceso/start', { document: '999888777' })).status).toBe(404);
    expect((await call('/api/portal/acceso/start', { document: '901444666-1' })).status).toBe(409);

    const start = await call('/api/portal/acceso/start', { document: '901.444.555' });
    expect(start.status).toBe(200);
    expect(start.body.sentTo).toBe('WhatsApp al celular terminado en 8899');
    expect(start.body.alternatives).toEqual([{ channel: 'email', masked: 'correo co•••••@loginpruebas.co' }]);
    const { code, to } = sent.at(-1)!;
    expect(to).toBe('+573157778899');
    expect(JSON.stringify(start.body)).not.toContain(code);

    const wrong = await call('/api/portal/acceso/verify', { challengeId: start.body.challengeId, code: code === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(400);

    const ok = await call('/api/portal/acceso/verify', { challengeId: start.body.challengeId, code });
    expect(ok.status).toBe(200);
    expect(ok.body.path).toMatch(/^\/portal\/[A-Za-z0-9_-]{32}$/);

    const view = await fetch(`${base}/api${ok.body.path}`).then((r) => r.json());
    expect(view.client.name).toBe('Login Pruebas SAS');

    // El mismo código no sirve dos veces
    expect((await call('/api/portal/acceso/verify', { challengeId: start.body.challengeId, code })).status).toBe(400);

    // Por correo si el cliente lo elige
    const byEmail = await call('/api/portal/acceso/start', { document: '901444555', channel: 'email' });
    expect(byEmail.body.sentTo).toBe('correo co•••••@loginpruebas.co');
    expect(sent.at(-1)).toMatchObject({ channel: 'email', to: 'compras@loginpruebas.co' });
  });
});
