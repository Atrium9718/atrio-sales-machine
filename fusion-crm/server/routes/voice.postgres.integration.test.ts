/**
 * Telefonía con Postgres: configuración guardada (números y extensiones con clave cifrada),
 * historial de llamadas registradas por el puente de voz y permisos por rol.
 * Solo corre con TEST_DATABASE_URL (Postgres con migraciones aplicadas).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

// Quién hace cada petición (en producción lo fija la sesión)
const USERS: Record<string, { id: string; name: string; role: string }> = {
  admin: { id: 'emp-03', name: 'Cristian Andrés Sepúlveda', role: 'super_admin' },
  comercial: { id: 'emp-07', name: 'Asesor Comercial', role: 'director_comercial' },
  produccion: { id: 'emp-05', name: 'Jefe de Producción', role: 'jefe_produccion' },
  planta: { id: 'emp-01', name: 'Operario', role: 'operario_planta' },
};

suite('telefonía con Postgres (integración)', () => {
  let base = '';
  let server: any;
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  const clean = async () => {
    const db = prismaMod.getPrisma();
    await db.voiceCallEvent.deleteMany({});
    await db.voiceCall.deleteMany({});
    await db.voiceNumber.deleteMany({});
    await db.voiceExtension.deleteMany({});
    await db.voiceTrunk.deleteMany({});
    await db.secret.deleteMany({ where: { key: { startsWith: 'sip:secret:' } } });
    await db.storedDocument.deleteMany({ where: { collection: 'voice_number_meta' } });
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: url,
      DATA_BACKEND: 'postgres',
      // Asterisk apagado: las extensiones quedan pendientes de aprovisionar
      ASTERISK_ARI_URL: 'http://127.0.0.1:9',
      TRUNK_SIP_HOST: 'sip.operador.test',
      TRUNK_USERNAME: 'fusion601',
      VOICE_CALLER_ID: '+576068801234',
    });
    prismaMod = await import('../repositories/prisma/client');
    await clean();

    const { voiceRouter, loadVoiceConfig } = await import('./voice');
    await loadVoiceConfig();
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const u = USERS[String(req.headers['x-test-user'] || 'admin')];
      req.headers['x-user-id'] = u.id;
      req.headers['x-user-name'] = u.name;
      req.headers['x-user-role'] = u.role;
      next();
    });
    app.use('/api/voice', voiceRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await clean();
    process.env = saved;
    await prismaMod?.disconnectPrisma();
  });

  const call = async (who: keyof typeof USERS, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-test-user': who },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  it('permisos: sin voz no entra; configurar la central es de quien la administra', async () => {
    expect((await call('planta', 'GET', '/api/voice/calls')).status).toBe(403);
    expect((await call('planta', 'GET', '/api/voice/config')).status).toBe(200);
    const denied = await call('comercial', 'POST', '/api/voice/numbers', { e164Number: '6068801234', displayName: 'Fijo' });
    expect(denied).toMatchObject({ status: 403, body: { code: 'VOICE_MANAGE_REQUIRED' } });
  });

  it('la troncal sale del servidor y no se edita desde el CRM', async () => {
    expect((await call('admin', 'GET', '/api/voice/trunk')).body.trunk).toMatchObject({ sipHost: 'sip.operador.test', username: 'fusion601', callerIdDefault: '+576068801234' });
    expect((await call('admin', 'POST', '/api/voice/trunk', { sipHost: 'otro' })).status).toBe(409);
  });

  it('los números se guardan normalizados en la tabla que lee el puente de voz', async () => {
    const created = await call('admin', 'POST', '/api/voice/numbers', { e164Number: '606 880 1234', displayName: 'Fijo principal', primaryAction: 'EXTENSION', primaryTargetId: '101', scheduleId: 'horario-1' });
    expect(created.status).toBe(200);
    expect(created.body.number).toMatchObject({ e164Number: '+576068801234', trunkId: 'trunk-default' });
    const row = await prismaMod.getPrisma().voiceNumber.findFirst({ where: { number: '+576068801234' } });
    expect(row).toMatchObject({ inboundTarget: 'EXTENSION', inboundTargetId: '101', trunkId: 'trunk-default', label: 'Fijo principal' });

    expect((await call('admin', 'POST', '/api/voice/numbers', { e164Number: '6068801234', displayName: 'Otro' })).status).toBe(409);
    expect((await call('admin', 'POST', '/api/voice/numbers', { e164Number: '12', displayName: 'Malo' })).status).toBe(400);
    expect((await call('admin', 'POST', '/api/voice/numbers', { e164Number: '3001112233', displayName: 'Externo', primaryAction: 'EXTERNAL_NUMBER' })).status).toBe(400);
  });

  it('la extensión se guarda con su clave cifrada y cada quien recibe solo la suya', async () => {
    expect((await call('admin', 'POST', '/api/voice/extensions/provision', { userId: 'no-existe' })).status).toBe(400);
    const prov = await call('admin', 'POST', '/api/voice/extensions/provision', { userId: 'emp-07' });
    expect(prov.body).toMatchObject({ success: true, extension: '101', status: 'PENDING_PROVISION', inAsterisk: false });

    const db = prismaMod.getPrisma();
    const ext = await db.voiceExtension.findFirst({ where: { extension: '101' } });
    expect(ext).toMatchObject({ userId: 'emp-07', sipUsername: 'ext_101', status: 'ACTIVE' });
    const secret = await db.secret.findFirst({ where: { key: 'sip:secret:101' } });
    expect(secret?.encryptedValue).toBeTruthy();

    const own = await call('comercial', 'GET', '/api/voice/softphone/credentials');
    expect(own.body.credentials).toMatchObject({ extension: '101', sipUsername: 'ext_101' });
    expect(own.body.credentials.sipPassword).toHaveLength(24);
    expect(own.body.credentials.sipPassword).not.toBe(secret?.encryptedValue);

    // Sin extensión propia no se entrega la de otra persona
    const none = await call('produccion', 'GET', '/api/voice/softphone/credentials');
    expect(none).toMatchObject({ status: 404, body: { code: 'EXTENSION_NOT_PROVISIONED' } });

    // Tras reiniciar el servidor, todo sigue ahí y la clave se descifra igual
    const { loadVoiceConfig } = await import('./voice');
    await loadVoiceConfig();
    const again = await call('comercial', 'GET', '/api/voice/softphone/credentials');
    expect(again.body.credentials.sipPassword).toBe(own.body.credentials.sipPassword);
    expect((await call('admin', 'GET', '/api/voice/numbers')).body.numbers.map((n: any) => [n.e164Number, n.scheduleId])).toEqual([['+576068801234', 'horario-1']]);

    const fwd = await call('comercial', 'POST', '/api/voice/mobile-forwarding', { mobileNumber: '310 555 9876', ringStrategy: 'BROWSER_THEN_MOBILE' });
    expect(fwd.body).toMatchObject({ success: true, mobileNumber: '+573105559876' });
    expect(await db.voiceExtension.findFirst({ where: { extension: '101' } })).toMatchObject({ mobileNumber: '+573105559876', ringStrategy: 'BROWSER_THEN_MOBILE' });
  });

  it('historial: quien supervisa ve todo; el asesor, las suyas y las perdidas', async () => {
    const db = prismaMod.getPrisma();
    const today = new Date();
    const mk = (id: string, data: any) =>
      db.voiceCall.create({ data: { id, organizationId: 'org-1', channelId: `ch-${id}`, fromNumber: '+573001112233', toNumber: '+576068801234', startedAt: today, ...data } });
    await mk('c-own', { direction: 'INBOUND', status: 'COMPLETED', disposition: 'ANSWERED', answeredAt: today, handledByUserId: 'emp-07', waitSeconds: 8, talkSeconds: 95 });
    await mk('c-missed', { direction: 'INBOUND', status: 'COMPLETED', disposition: 'MISSED', fromNumber: '+573009998877' });
    await mk('c-other', { direction: 'OUTBOUND', status: 'COMPLETED', disposition: 'ANSWERED', answeredAt: today, handledByUserId: 'emp-06', talkSeconds: 40 });
    await db.voiceCallEvent.create({ data: { organizationId: 'org-1', callId: 'c-own', type: 'ANSWERED', payload: {} } });

    const mine = await call('comercial', 'GET', '/api/voice/calls');
    expect(mine.body.calls.map((c: any) => c.id).sort()).toEqual(['c-missed', 'c-own']);
    const all = await call('admin', 'GET', '/api/voice/calls');
    expect(all.body.calls).toHaveLength(3);
    expect((await call('admin', 'GET', '/api/voice/calls?filter=missed')).body.calls.map((c: any) => c.id)).toEqual(['c-missed']);
    expect((await call('admin', 'GET', '/api/voice/calls?q=9998')).body.calls.map((c: any) => c.id)).toEqual(['c-missed']);

    const summary = await call('admin', 'GET', '/api/voice/calls/summary');
    expect(summary.body.summary).toMatchObject({ total: 3, inbound: 2, outbound: 1, missed: 1, answered: 2, answerRate: 50 });
    expect(summary.body.pendingCallbacks.map((c: any) => c.id)).toEqual(['c-missed']);

    const detail = await call('comercial', 'GET', '/api/voice/calls/c-own');
    expect(detail.body.call).toMatchObject({ id: 'c-own', handledByUserId: 'emp-07' });
    expect(detail.body.call.events.map((e: any) => e.type)).toEqual(['ANSWERED']);
    expect((await call('comercial', 'GET', '/api/voice/calls/c-other')).status).toBe(404);

    // Devolver la perdida la saca de la lista "por devolver"
    await mk('c-back', { direction: 'OUTBOUND', status: 'COMPLETED', disposition: 'ANSWERED', answeredAt: new Date(Date.now() + 1000), startedAt: new Date(Date.now() + 1000), fromNumber: '+576068801234', toNumber: '+573009998877', handledByUserId: 'emp-07', talkSeconds: 30 });
    expect((await call('admin', 'GET', '/api/voice/calls/summary')).body.pendingCallbacks).toEqual([]);

    await call('comercial', 'POST', '/api/voice/calls/c-own/notes', { notes: 'Pidió cotización de 500 volantes' });
    expect((await db.voiceCall.findUnique({ where: { id: 'c-own' } }))?.notes).toBe('Pidió cotización de 500 volantes');
  });

  it('identifica a quien llama con los clientes y cotizaciones del CRM', async () => {
    const { repositories } = await import('../repositories');
    await repositories().clients.upsert({ id: 'cli-voz-1', name: 'Pinturas Andinas', nit: '900123456-1', phone1: '310 555 1234', temp: 'HOT' } as any);
    await repositories().quotes.upsert({ id: 'q-voz-1', number: 'COT-9901', status: 'Enviada', clientId: 'cli-voz-1', clientName: 'Pinturas Andinas', items: [], total: 500000, date: '2026-09-20' } as any);
    const who = await call('comercial', 'GET', '/api/voice/identify?number=%2B573105551234');
    expect(who.body.identity).toMatchObject({ customerId: 'cli-voz-1', customerName: 'Pinturas Andinas', openQuote: { number: 'COT-9901', total: null } });
    const whoAdmin = await call('admin', 'GET', '/api/voice/identify?number=3105551234');
    expect(whoAdmin.body.identity.openQuote.total).toBe(500000);
    await repositories().quotes.delete('q-voz-1');
    await repositories().clients.delete('cli-voz-1');
  });
});
