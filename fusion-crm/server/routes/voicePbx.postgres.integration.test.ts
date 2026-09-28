/**
 * Central en la base (Postgres): colas y asesores, estado del teléfono, buzón con audio,
 * locuciones con archivo, menús con borrador/publicación/reversión y cierre temporal.
 * Solo corre con TEST_DATABASE_URL.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'net';
import { encodeWav } from '../../packages/core/src/voice/wav';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

const USERS: Record<string, { id: string; role: string }> = {
  admin: { id: 'emp-03', role: 'super_admin' },
  comercial: { id: 'emp-07', role: 'director_comercial' },
  planta: { id: 'emp-01', role: 'operario_planta' },
};

suite('central telefónica en Postgres (integración)', () => {
  let base = '';
  let server: any;
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-'));

  const clean = async () => {
    const db = prismaMod.getPrisma();
    await db.voiceVoicemail.deleteMany({});
    await db.voiceRecording.deleteMany({});
    await db.voiceCallEvent.deleteMany({});
    await db.voiceCall.deleteMany({});
    await db.voiceQueueMember.deleteMany({});
    await db.voiceQueue.deleteMany({});
    await db.voiceAgentStatus.deleteMany({});
    await db.voicePrompt.deleteMany({});
    await db.voiceIvrFlow.deleteMany({});
    await db.voiceExtension.deleteMany({});
    await db.storedDocument.deleteMany({ where: { collection: { in: ['voice_ivr_drafts', 'voice_ivr_history', 'voice_settings'] } } });
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: url,
      DATA_BACKEND: 'postgres',
      ASTERISK_ARI_URL: 'http://127.0.0.1:9',
      VOICE_SOUNDS_DIR: path.join(tmp, 'sounds'),
      VOICE_RECORDINGS_DIR: path.join(tmp, 'recordings'),
    });
    prismaMod = await import('../repositories/prisma/client');
    await clean();
    const db = prismaMod.getPrisma();
    for (const [userId, ext] of [['emp-07', '101'], ['emp-05', '102']]) {
      await db.voiceExtension.create({ data: { organizationId: 'org-1', userId, extension: ext, label: `Ext ${ext}`, sipUsername: `ext_${ext}_pbx`, sipPasswordSecretId: 'x' } });
    }
    const { voiceRouter } = await import('./voice');
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use((req, _res, next) => {
      const u = USERS[String(req.headers['x-test-user'] || 'admin')];
      req.headers['x-user-id'] = u.id;
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
    fs.rmSync(tmp, { recursive: true, force: true });
    await prismaMod?.disconnectPrisma();
  });

  const call = async (who: keyof typeof USERS, method: string, p: string, body?: unknown) => {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-test-user': who },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, type, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
  };

  it('colas con asesores reales; solo quien administra las cambia', async () => {
    const body = { name: 'Ventas', strategy: 'ROUND_ROBIN', maxWaitSeconds: 120, members: [{ userId: 'emp-07', penalty: 0 }, { userId: 'emp-05', penalty: 1 }, { userId: 'no-existe' }] };
    expect((await call('comercial', 'POST', '/api/voice/queues', body)).status).toBe(403);
    const created = await call('admin', 'POST', '/api/voice/queues', body);
    expect(created.status).toBe(200);
    const id = created.body.queue.id;
    expect(await prismaMod.getPrisma().voiceQueueMember.count({ where: { queueId: id, deletedAt: null } })).toBe(2);

    // Quitar a un asesor
    await call('admin', 'POST', '/api/voice/queues', { ...body, id, members: [{ userId: 'emp-07' }] });
    const list = await call('comercial', 'GET', '/api/voice/queues');
    const q = list.body.queues.find((x: any) => x.id === id);
    expect(q.members.map((m: any) => m.userId)).toEqual(['emp-07']);
    expect(q).toMatchObject({ strategy: 'ROUND_ROBIN', maxWaitSeconds: 120, waitingCallsCount: 0 });

    // Validaciones del desborde
    expect((await call('admin', 'POST', '/api/voice/queues', { name: 'X', overflowTarget: 'EXTERNAL_NUMBER', overflowTargetId: '12' })).status).toBe(400);

    // Quien espera se ve en vivo (llamada IN_QUEUE que registró el puente)
    await prismaMod.getPrisma().voiceCall.create({
      data: { id: 'c-wait', organizationId: 'org-1', channelId: 'ch-w', direction: 'INBOUND', status: 'IN_QUEUE', fromNumber: '+573001112233', toNumber: '6068801234', queueId: id, startedAt: new Date(Date.now() - 30_000) },
    });
    const live = (await call('admin', 'GET', '/api/voice/queues')).body.queues.find((x: any) => x.id === id);
    expect(live.waiting).toHaveLength(1);
    expect(live.waiting[0].waitSeconds).toBeGreaterThanOrEqual(29);
  });

  it('el estado del teléfono del navegador llega a la base con el que usan las colas', async () => {
    await call('comercial', 'POST', '/api/voice/agent-status', { status: 'EN_PAUSA', reason: 'Almuerzo' });
    expect(await prismaMod.getPrisma().voiceAgentStatus.findUnique({ where: { userId: 'emp-07' } })).toMatchObject({ status: 'BREAK', reason: 'Almuerzo' });
    expect((await call('comercial', 'GET', '/api/voice/agent-status')).body.agentStatus.status).toBe('EN_PAUSA');
    await call('comercial', 'POST', '/api/voice/agent-status', { status: 'OCUPADO' });
    expect((await call('comercial', 'GET', '/api/voice/agent-status')).body.agentStatus.status).toBe('OCUPADO');

    // Cambiar el estado de otra persona exige supervisar
    expect((await call('comercial', 'POST', '/api/voice/agents/status', { targetUserId: 'emp-05', status: 'OFFLINE' })).status).toBe(403);
    expect((await call('admin', 'POST', '/api/voice/agents/status', { targetUserId: 'emp-05', status: 'OFFLINE' })).status).toBe(200);
    const agents = (await call('admin', 'GET', '/api/voice/agents')).body.agents;
    expect(agents.find((a: any) => a.userId === 'emp-05').status).toBe('OFFLINE');
  });

  it('buzón: se escucha, se marca y cada quien ve lo suyo', async () => {
    const db = prismaMod.getPrisma();
    const ext = await db.voiceExtension.findFirst({ where: { extension: '102' } });
    await db.voiceCall.create({ data: { id: 'c-vm', organizationId: 'org-1', channelId: 'ch-vm', direction: 'INBOUND', status: 'COMPLETED', disposition: 'VOICEMAIL_LEFT', fromNumber: '+573009998877', toNumber: '6068801234', startedAt: new Date() } });
    const vm = await db.voiceVoicemail.create({ data: { organizationId: 'org-1', callId: 'c-vm', extensionId: ext!.id, storageKey: 'recording/vm_c-vm.wav', durationSeconds: 7 } });
    fs.mkdirSync(path.join(tmp, 'recordings'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'recordings', 'vm_c-vm.wav'), encodeWav(new Float32Array(8000)));

    // Es de la extensión 102 (otra persona): el comercial no lo ve; quien supervisa sí
    expect((await call('comercial', 'GET', '/api/voice/voicemails')).body.voicemails).toHaveLength(0);
    const all = (await call('admin', 'GET', '/api/voice/voicemails')).body.voicemails;
    expect(all[0]).toMatchObject({ id: vm.id, fromNumber: '+573009998877', status: 'NEW', extension: '102' });
    expect((await call('comercial', 'GET', `/api/voice/voicemails/${vm.id}/audio`)).status).toBe(404);

    const audio = await call('admin', 'GET', `/api/voice/voicemails/${vm.id}/audio`);
    expect(audio.status).toBe(200);
    expect(audio.type).toContain('audio/wav');
    expect(Buffer.from(audio.body as ArrayBuffer).subarray(0, 4).toString()).toBe('RIFF');

    await call('admin', 'POST', `/api/voice/voicemails/${vm.id}/heard`);
    expect(await db.voiceVoicemail.findUnique({ where: { id: vm.id } })).toMatchObject({ status: 'HEARD', heardById: 'emp-03' });
    await call('admin', 'POST', `/api/voice/voicemails/${vm.id}/returned`);
    expect((await call('admin', 'GET', '/api/voice/voicemail/unread-count')).body.unreadCount).toBe(0);
  });

  it('locuciones: el audio se verifica y queda donde Asterisk lo reproduce; no se borra si está en uso', async () => {
    const wav = Buffer.from(encodeWav(new Float32Array(8000 * 2).map((_, i) => Math.sin(i / 8) * 0.4))).toString('base64');
    const bad = Buffer.from(encodeWav(new Float32Array(44100 * 2), 44100)).toString('base64');
    expect((await call('admin', 'POST', '/api/voice/prompts', { name: 'Bienvenida', text: 'Hola', audioBase64: bad })).body.error).toMatch(/8000 Hz/);
    expect((await call('admin', 'POST', '/api/voice/prompts', { name: 'Bienvenida' })).status).toBe(400);
    const created = await call('admin', 'POST', '/api/voice/prompts', { name: 'Bienvenida Ventas', text: 'Gracias por llamar', category: 'GREETING', audioBase64: wav });
    expect(created.status).toBe(200);
    const file = path.join(tmp, 'sounds', `${created.body.data.asteriskFilename}.wav`);
    expect(fs.existsSync(file)).toBe(true);
    expect(created.body.data.asteriskFilename).toMatch(/^bienvenida_ventas_/);
    const listed = (await call('admin', 'GET', '/api/voice/prompts')).body.data[0];
    expect(listed).toMatchObject({ name: 'Bienvenida Ventas', hasAudio: true, durationSeconds: 2 });
    expect((await call('comercial', 'GET', `/api/voice/prompts/${listed.id}/audio`)).status).toBe(200);

    const q = await prismaMod.getPrisma().voiceQueue.findFirst({ where: { name: 'Ventas' } });
    await prismaMod.getPrisma().voiceQueue.update({ where: { id: q!.id }, data: { greetingPromptId: listed.id } });
    const blocked = await call('admin', 'DELETE', `/api/voice/prompts/${listed.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatch(/cola "Ventas"/);
  });

  it('menú: el borrador no toca lo publicado hasta publicar; se puede revertir', async () => {
    const created = await call('admin', 'POST', '/api/voice/ivr-flows', { name: 'Principal' });
    const id = created.body.data.id;
    const queue = await prismaMod.getPrisma().voiceQueue.findFirst({ where: { name: 'Ventas' } });
    const prompt = await prismaMod.getPrisma().voicePrompt.findFirst({});
    const def = (menuTarget: string) => ({
      ...created.body.data.definition,
      nodes: [
        { id: 'node_start', type: 'INICIO', position: { x: 0, y: 0 }, data: { label: 'Inicio', type: 'INICIO', outputs: [{ id: 'o', label: 'siguiente', targetNodeId: 'legal' }] } },
        { id: 'legal', type: 'LOCUCION', position: { x: 0, y: 0 }, data: { label: 'Aviso de grabación', type: 'LOCUCION', isLegalConsent: true, promptId: prompt!.id, outputs: [{ id: 'o', label: 'siguiente', targetNodeId: 'menu' }] } },
        { id: 'menu', type: 'MENU', position: { x: 0, y: 0 }, data: { label: 'Menú', type: 'MENU', outputs: [{ id: '1', label: '1', targetNodeId: 'cola' }, { id: '0', label: '0', targetNodeId: menuTarget }] } },
        { id: 'cola', type: 'IR_A_COLA', position: { x: 0, y: 0 }, data: { label: 'Ventas', type: 'IR_A_COLA', queueId: queue!.id, outputs: [] } },
        { id: 'ext', type: 'IR_A_EXTENSION', position: { x: 0, y: 0 }, data: { label: 'Recepción', type: 'IR_A_EXTENSION', extension: '101', outputs: [] } },
      ],
    });
    await call('admin', 'PUT', `/api/voice/ivr-flows/${id}`, { definition: def('ext') });
    const validation = (await call('admin', 'POST', `/api/voice/ivr-flows/${id}/validate`)).body.data;
    expect(validation.errors, JSON.stringify(validation.errors)).toEqual([]);
    const pub = await call('admin', 'POST', `/api/voice/ivr-flows/${id}/publish`);
    expect(pub.status).toBe(200);
    const db = prismaMod.getPrisma();
    expect(await db.voiceIvrFlow.findUnique({ where: { id } })).toMatchObject({ status: 'PUBLISHED', version: 1 });

    // Editar lo publicado: queda en borrador y la versión en uso no cambia
    await call('admin', 'PUT', `/api/voice/ivr-flows/${id}`, { definition: def('cola') });
    const row = await db.voiceIvrFlow.findUnique({ where: { id } });
    expect((row!.definition as any).nodes[2].data.outputs[1].targetNodeId).toBe('ext');
    expect((await call('admin', 'GET', `/api/voice/ivr-flows/${id}`)).body.data).toMatchObject({ status: 'DRAFT', isLive: true, hasPendingChanges: true });

    await call('admin', 'POST', `/api/voice/ivr-flows/${id}/publish`);
    const v2 = await db.voiceIvrFlow.findUnique({ where: { id } });
    expect(v2!.version).toBe(2);
    expect((v2!.definition as any).nodes[2].data.outputs[1].targetNodeId).toBe('cola');

    const back = await call('admin', 'POST', `/api/voice/ivr-flows/${id}/rollback`);
    expect(back.status).toBe(200);
    const v3 = await db.voiceIvrFlow.findUnique({ where: { id } });
    expect(v3!.version).toBe(3);
    expect((v3!.definition as any).nodes[2].data.outputs[1].targetNodeId).toBe('ext');

    // Un menú que no pasa la validación no se publica
    await call('admin', 'PUT', `/api/voice/ivr-flows/${id}`, { definition: { ...def('ext'), nodes: def('ext').nodes.filter((n: any) => n.id !== 'ext') } });
    expect((await call('admin', 'POST', `/api/voice/ivr-flows/${id}/publish`)).status).toBe(422);
  });

  it('cerrar ahora: el horario queda cerrado hasta la hora indicada y se puede reanudar', async () => {
    expect((await call('comercial', 'POST', '/api/voice/schedules/sched_main/override', { active: true, reason: 'Reunión' })).status).toBe(403);
    expect((await call('admin', 'POST', '/api/voice/schedules/sched_main/override', { active: true, reason: '' })).status).toBe(400);
    await call('admin', 'POST', '/api/voice/schedules/sched_main/override', { active: true, reason: 'Inventario', reopenMinutes: 60 });
    const st = (await call('admin', 'GET', '/api/voice/schedules/status')).body.data;
    expect(st).toMatchObject({ isOpen: false, status: 'cerrado', overrideActive: true, overrideReason: 'Inventario' });
    const doc = await prismaMod.getPrisma().storedDocument.findUnique({ where: { collection_id: { collection: 'voice_settings', id: 'override' } } });
    expect((doc!.data as any).closedUntil).toBeTruthy();
    await call('admin', 'POST', '/api/voice/schedules/sched_main/override', { active: false });
    expect((await call('admin', 'GET', '/api/voice/schedules/status')).body.data.overrideActive).toBe(false);
    const sched = (await call('admin', 'GET', '/api/voice/schedules')).body.schedule;
    expect(sched.weeklyHours[0]).toMatchObject({ dayName: 'Lunes' });
  });
});
