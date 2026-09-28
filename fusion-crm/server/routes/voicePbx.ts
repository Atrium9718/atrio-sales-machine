import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getPrisma } from '../repositories/prisma/client';
import { ORGANIZATION_ID } from '../repositories/prisma/mappers';
import { documentRepository } from '../repositories/documentStore';
import { employeeService } from '../services/employeeService';
import { systemConfig } from '../services/systemConfig';
import { permissionsForRequest } from '../auth/userPermissions';
import { voiceDbAvailable } from '../services/voiceStore';
import { can } from '../../packages/core/src/auth/permissions';
import { IvrFlowDefinition, validateIvrFlow, generateFlowDiff, runFlowStep, executeCrmLookup } from '../../packages/core/src/voice/ivrEngine';
import { getColombianHolidays } from '../../packages/core/src/voice/holidays';
import { businessStatusAt, DAY_NAMES, bogotaYmd } from '../../packages/core/src/calendar/workCalendar';
import { asteriskWavProblem, parseWav, promptFilename } from '../../packages/core/src/voice/wav';
import { normalizeColombianPhone } from '../../packages/core/src/voice/normalizePhone';

/**
 * Central telefónica en la base: colas y sus asesores, estado de cada asesor, buzón de voz,
 * locuciones (archivos de audio que reproduce Asterisk), menús de opciones y horario.
 * El puente de voz (apps/voice) lee estas mismas tablas para atender las llamadas.
 */
export const voicePbxRouter = Router();

const db = () => getPrisma();
const ORG = ORGANIZATION_ID;

/** Carpeta compartida con Asterisk (/var/lib/asterisk/sounds/fusion): locuciones. */
export const soundsDir = () => process.env.VOICE_SOUNDS_DIR || path.resolve('data/voice/sounds');
/** Carpeta de grabaciones de Asterisk (/var/spool/asterisk/recording): buzón y llamadas grabadas. */
export const recordingsDir = () => process.env.VOICE_RECORDINGS_DIR || path.resolve('data/voice/recordings');

/** Ruta del archivo de una grabación a partir de su storageKey (solo el nombre: sin rutas relativas). */
export function recordingPath(storageKey: string): string | null {
  const name = path.basename(String(storageKey || ''));
  if (!/^[\w.-]+\.wav$/.test(name)) return null;
  return path.join(recordingsDir(), name);
}

function auth(req: Request) {
  const { userId, role, permissions } = permissionsForRequest(req);
  return {
    userId,
    role,
    supervise: can(permissions, 'voice:supervise') || can(permissions, 'voice:manage_all'),
    manage: can(permissions, 'voice:manage_all'),
  };
}

const noDb = (res: Response) =>
  res.status(503).json({ success: false, code: 'VOICE_DB_REQUIRED', error: 'La telefonía necesita la base de datos Postgres (DATABASE_URL).' });

const fail = (res: Response, err: any) => res.status(500).json({ success: false, error: err?.message || String(err) });

const employeeName = (id: string | null | undefined) => (id ? employeeService.getEmployeeById(id)?.name ?? null : null);

/** Envía un WAV del disco (con soporte de rango para que el reproductor pueda adelantar). */
function sendWav(req: Request, res: Response, file: string | null) {
  if (!file || !fs.existsSync(file)) return res.status(404).json({ success: false, error: 'El audio ya no está disponible en el servidor.' });
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(file, { acceptRanges: true });
}

// ============================================================================
// ESTADO DE LOS ASESORES
// ============================================================================

export type AgentState = 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
const AGENT_STATES: AgentState[] = ['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE'];

/** Estados del teléfono del navegador (en español) ↔ estados de la cola. */
export const SOFTPHONE_TO_STATE: Record<string, { status: AgentState; reason: string | null }> = {
  DISPONIBLE: { status: 'AVAILABLE', reason: null },
  OCUPADO: { status: 'BREAK', reason: 'Ocupado' },
  EN_PAUSA: { status: 'BREAK', reason: null },
  DESCONECTADO: { status: 'OFFLINE', reason: null },
};
export function stateToSoftphone(status: string | null | undefined, reason?: string | null): string {
  if (!status || status === 'AVAILABLE') return 'DISPONIBLE';
  if (status === 'OFFLINE') return 'DESCONECTADO';
  if (status === 'BREAK' && reason !== 'Ocupado') return 'EN_PAUSA';
  return 'OCUPADO';
}

export async function setAgentState(userId: string, status: AgentState, reason: string | null = null) {
  await db().voiceAgentStatus.upsert({
    where: { userId },
    create: { organizationId: ORG, userId, status, reason, since: new Date() },
    update: { status, reason, since: new Date(), ...(status === 'AVAILABLE' || status === 'OFFLINE' ? { currentCallId: null } : {}) },
  });
}

async function agentRows() {
  const [exts, statuses, members, queues] = await Promise.all([
    db().voiceExtension.findMany({ where: { organizationId: ORG, deletedAt: null, userId: { not: null } }, orderBy: { extension: 'asc' } }),
    db().voiceAgentStatus.findMany({ where: { organizationId: ORG } }),
    db().voiceQueueMember.findMany({ where: { organizationId: ORG, deletedAt: null, isActive: true } }),
    db().voiceQueue.findMany({ where: { organizationId: ORG, deletedAt: null } }),
  ]);
  const today = await db().voiceCall.groupBy({
    by: ['handledByUserId'],
    where: { organizationId: ORG, deletedAt: null, answeredAt: { not: null }, startedAt: { gte: new Date(`${bogotaYmd(new Date())}T05:00:00Z`) } },
    _count: { _all: true },
  });
  const statusBy = new Map(statuses.map((s) => [s.userId, s]));
  const queueName = new Map(queues.map((q) => [q.id, q.name]));
  const countBy = new Map(today.map((t) => [t.handledByUserId, t._count._all]));
  return exts.map((e) => {
    const s = statusBy.get(e.userId!);
    const emp = employeeService.getEmployeeById(e.userId!);
    const sinceAt = s?.since ?? e.createdAt;
    return {
      userId: e.userId!,
      name: emp?.name ?? e.label,
      extension: e.extension,
      role: emp?.roleName ?? '',
      status: (s?.status as AgentState) ?? 'AVAILABLE',
      reason: s?.reason ?? null,
      since: sinceAt.toISOString(),
      timeInStateSeconds: Math.max(0, Math.round((Date.now() - sinceAt.getTime()) / 1000)),
      currentCallId: s?.currentCallId ?? null,
      callsHandledToday: countBy.get(e.userId!) ?? 0,
      queues: members.filter((m) => m.userId === e.userId).map((m) => queueName.get(m.queueId)).filter(Boolean),
    };
  });
}

voicePbxRouter.get('/agents', async (_req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    res.json({ success: true, agents: await agentRows() });
  } catch (err) {
    fail(res, err);
  }
});

// Cambiar el estado propio, o el de otro si supervisa
voicePbxRouter.post('/agents/status', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const a = auth(req);
  const target = String(req.body?.targetUserId || a.userId);
  const status = String(req.body?.status || '') as AgentState;
  if (!AGENT_STATES.includes(status) || status === 'ON_CALL' || status === 'WRAP_UP') {
    return res.status(400).json({ success: false, error: 'Estado no válido: usa disponible, pausa o desconectado.' });
  }
  if (target !== a.userId && !a.supervise) return res.status(403).json({ success: false, error: 'Solo quien supervisa puede cambiar el estado de otra persona.' });
  try {
    await setAgentState(target, status, status === 'BREAK' ? String(req.body?.reason || 'Pausa').slice(0, 80) : null);
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// Terminar el respiro después de una llamada
voicePbxRouter.post('/agents/end-wrapup', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const a = auth(req);
  const target = String(req.body?.userId || a.userId);
  if (target !== a.userId && !a.supervise) return res.status(403).json({ success: false, error: 'Sin permiso' });
  try {
    await db().voiceAgentStatus.updateMany({ where: { userId: target, status: 'WRAP_UP' }, data: { status: 'AVAILABLE', since: new Date(), currentCallId: null } });
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// Teléfono del navegador: estado propio en español
voicePbxRouter.get('/agent-status', async (req, res) => {
  const a = auth(req);
  if (!voiceDbAvailable()) return res.json({ success: true, agentStatus: { userId: a.userId, status: 'DISPONIBLE', reason: null } });
  try {
    const s = await db().voiceAgentStatus.findUnique({ where: { userId: a.userId } });
    res.json({ success: true, agentStatus: { userId: a.userId, status: stateToSoftphone(s?.status, s?.reason), reason: s?.reason ?? null, updatedAt: s?.since ?? null } });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.post('/agent-status', async (req, res) => {
  const a = auth(req);
  const mapped = SOFTPHONE_TO_STATE[String(req.body?.status || '')];
  if (!mapped) return res.status(400).json({ success: false, error: `Estado no válido: ${req.body?.status}` });
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const reason = mapped.reason ?? (mapped.status === 'BREAK' ? String(req.body?.reason || 'Pausa').slice(0, 80) : null);
    await setAgentState(a.userId, mapped.status, reason);
    res.json({ success: true, agentStatus: { userId: a.userId, status: req.body.status, reason, updatedAt: new Date().toISOString() } });
  } catch (err) {
    fail(res, err);
  }
});

// Directorio para transferir: quién tiene extensión y cómo está
voicePbxRouter.get('/agents/directory', async (_req, res) => {
  if (!voiceDbAvailable()) return res.json({ success: true, agents: [] });
  try {
    const rows = await agentRows();
    res.json({
      success: true,
      agents: rows.map((r) => ({ userId: r.userId, name: r.name, role: r.role, extension: r.extension, avatar: null, status: stateToSoftphone(r.status, r.reason), reason: r.reason })),
    });
  } catch (err) {
    fail(res, err);
  }
});

// ============================================================================
// COLAS
// ============================================================================

const STRATEGIES = ['RINGALL', 'ROUND_ROBIN', 'LEAST_RECENT', 'FEWEST_CALLS', 'LONGEST_IDLE', 'SKILL_BASED'] as const;
const OVERFLOWS = ['VOICEMAIL', 'ANOTHER_QUEUE', 'EXTERNAL_NUMBER', 'AI_AGENT', 'HANGUP_WITH_MESSAGE'] as const;

async function waitingByQueue() {
  const rows = await db().voiceCall.findMany({
    where: { organizationId: ORG, deletedAt: null, status: 'IN_QUEUE', endedAt: null, queueId: { not: null }, startedAt: { gte: new Date(Date.now() - 6 * 3600_000) } },
    orderBy: { startedAt: 'asc' },
  });
  const clientIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as string[];
  const clients = clientIds.length ? await db().client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const nameBy = new Map(clients.map((c) => [c.id, c.name]));
  const by = new Map<string, any[]>();
  for (const r of rows) {
    const list = by.get(r.queueId!) ?? [];
    list.push({
      callId: r.id,
      queueId: r.queueId,
      fromNumber: r.fromNumber,
      callerName: r.customerId ? nameBy.get(r.customerId) ?? null : null,
      enteredAt: r.startedAt.toISOString(),
      waitSeconds: Math.max(0, Math.round((Date.now() - r.startedAt.getTime()) / 1000)),
      position: list.length + 1,
    });
    by.set(r.queueId!, list);
  }
  return by;
}

voicePbxRouter.get('/queues', async (_req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const [queues, members, exts, statuses, waiting, todays] = await Promise.all([
      db().voiceQueue.findMany({ where: { organizationId: ORG, deletedAt: null }, orderBy: { name: 'asc' } }),
      db().voiceQueueMember.findMany({ where: { organizationId: ORG, deletedAt: null } }),
      db().voiceExtension.findMany({ where: { organizationId: ORG, deletedAt: null, userId: { not: null } } }),
      db().voiceAgentStatus.findMany({ where: { organizationId: ORG } }),
      waitingByQueue(),
      db().voiceCall.findMany({
        where: { organizationId: ORG, deletedAt: null, queueId: { not: null }, startedAt: { gte: new Date(`${bogotaYmd(new Date())}T05:00:00Z`) } },
        select: { queueId: true, answeredAt: true, disposition: true, waitSeconds: true },
      }),
    ]);
    const extBy = new Map(exts.map((e) => [e.userId, e]));
    const statusBy = new Map(statuses.map((s) => [s.userId, s.status as string]));
    res.json({
      success: true,
      queues: queues.map((q) => {
        const qm = members.filter((m) => m.queueId === q.id);
        const st = qm.filter((m) => m.isActive).map((m) => statusBy.get(m.userId) ?? 'AVAILABLE');
        const w = waiting.get(q.id) ?? [];
        const calls = todays.filter((c) => c.queueId === q.id);
        const answered = calls.filter((c) => c.answeredAt);
        const withinSla = answered.filter((c) => (c.waitSeconds ?? 0) <= 20).length;
        return {
          id: q.id,
          name: q.name,
          extension: q.extension,
          strategy: q.strategy,
          ringSeconds: q.ringSeconds,
          wrapUpSeconds: q.wrapUpSeconds,
          maxWaitSeconds: q.maxWaitSeconds,
          maxCallers: q.maxCallers,
          announcePositionEverySeconds: q.announcePositionEverySeconds,
          announceHoldTime: q.announceHoldTime,
          musicOnHold: q.musicOnHold,
          greetingPromptId: q.greetingPromptId,
          periodicPromptId: q.periodicPromptId,
          overflowTarget: q.overflowTarget,
          overflowTargetId: q.overflowTargetId,
          isActive: q.isActive,
          members: qm.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: employeeName(m.userId) ?? extBy.get(m.userId)?.label ?? m.userId,
            extension: extBy.get(m.userId)?.extension ?? null,
            penalty: m.penalty,
            skills: m.skills,
            isActive: m.isActive,
          })),
          waiting: w,
          waitingCallsCount: w.length,
          longestWaitSeconds: w[0]?.waitSeconds ?? 0,
          agentsConnectedCount: st.filter((s) => s !== 'OFFLINE').length,
          agentsAvailableCount: st.filter((s) => s === 'AVAILABLE').length,
          agentsOnCallCount: st.filter((s) => s === 'ON_CALL').length,
          answeredToday: answered.length,
          abandonedToday: calls.filter((c) => c.disposition === 'ABANDONED_IN_QUEUE').length,
          // Nivel de servicio: llamadas de hoy atendidas en 20 s o menos
          serviceLevelPercentage: calls.length ? Math.round((withinSla / calls.length) * 100) : null,
        };
      }),
    });
  } catch (err) {
    fail(res, err);
  }
});

const int = (v: unknown, min: number, max: number, def: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
};

voicePbxRouter.post('/queues', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ success: false, error: 'La cola necesita un nombre.' });
  const strategy = STRATEGIES.includes(b.strategy) ? b.strategy : 'RINGALL';
  const overflowTarget = OVERFLOWS.includes(b.overflowTarget) ? b.overflowTarget : 'VOICEMAIL';
  let overflowTargetId: string | null = b.overflowTargetId ? String(b.overflowTargetId).trim() : null;
  if (overflowTarget === 'EXTERNAL_NUMBER') {
    overflowTargetId = overflowTargetId ? normalizeColombianPhone(overflowTargetId) : null;
    if (!overflowTargetId) return res.status(400).json({ success: false, error: 'Escribe un número válido para desbordar.' });
  }
  if (overflowTarget === 'ANOTHER_QUEUE' && (!overflowTargetId || overflowTargetId === b.id)) {
    return res.status(400).json({ success: false, error: 'Elige la otra cola a la que se desborda.' });
  }
  if (!['ANOTHER_QUEUE', 'EXTERNAL_NUMBER'].includes(overflowTarget)) overflowTargetId = null;

  const members: Array<{ userId: string; penalty: number; skills: string[]; isActive: boolean }> = (Array.isArray(b.members) ? b.members : [])
    .filter((m: any) => m?.userId && employeeService.getEmployeeById(String(m.userId)))
    .map((m: any) => ({
      userId: String(m.userId),
      penalty: int(m.penalty, 0, 9, 0),
      skills: (Array.isArray(m.skills) ? m.skills : String(m.skills || '').split(',')).map((s: any) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 10),
      isActive: m.isActive !== false,
    }));
  const data = {
    organizationId: ORG,
    name,
    extension: b.extension ? String(b.extension).replace(/\D/g, '').slice(0, 4) || null : null,
    strategy,
    ringSeconds: int(b.ringSeconds, 5, 120, 20),
    wrapUpSeconds: int(b.wrapUpSeconds, 0, 300, 10),
    maxWaitSeconds: int(b.maxWaitSeconds, 15, 3600, 180),
    maxCallers: int(b.maxCallers, 1, 100, 20),
    announcePositionEverySeconds: int(b.announcePositionEverySeconds, 15, 600, 45),
    announceHoldTime: b.announceHoldTime !== false,
    musicOnHold: String(b.musicOnHold || 'default').replace(/[^\w-]/g, '').slice(0, 40) || 'default',
    greetingPromptId: b.greetingPromptId || null,
    periodicPromptId: b.periodicPromptId || null,
    overflowTarget,
    overflowTargetId,
    isActive: b.isActive !== false,
    updatedById: auth(req).userId,
  } as const;
  try {
    const queue = b.id
      ? await db().voiceQueue.update({ where: { id: String(b.id) }, data: { ...data, version: { increment: 1 } } })
      : await db().voiceQueue.create({ data: { ...data, createdById: auth(req).userId } });
    const keep = new Set(members.map((m) => m.userId));
    await db().$transaction([
      db().voiceQueueMember.updateMany({ where: { queueId: queue.id, userId: { notIn: [...keep] } }, data: { deletedAt: new Date(), isActive: false } }),
      ...members.map((m) =>
        db().voiceQueueMember.upsert({
          where: { queueId_userId: { queueId: queue.id, userId: m.userId } },
          create: { organizationId: ORG, queueId: queue.id, ...m },
          update: { ...m, deletedAt: null },
        })
      ),
    ]);
    res.json({ success: true, queue: { id: queue.id, name: queue.name } });
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ success: false, error: 'Cola no encontrada' });
    fail(res, err);
  }
});

voicePbxRouter.delete('/queues/:id', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const used = await db().voiceNumber.count({ where: { organizationId: ORG, deletedAt: null, inboundTarget: 'QUEUE', inboundTargetId: req.params.id } });
    if (used) return res.status(409).json({ success: false, error: 'Un número de la empresa entra a esta cola: cámbialo antes de borrarla.' });
    await db().voiceQueue.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// Teléfono del navegador: colas a las que pertenece quien entra
voicePbxRouter.get('/queues/status', async (req, res) => {
  if (!voiceDbAvailable()) return res.json({ success: true, queues: [] });
  try {
    const a = auth(req);
    const mine = await db().voiceQueueMember.findMany({ where: { userId: a.userId, deletedAt: null, isActive: true } });
    const [queues, waiting] = await Promise.all([
      db().voiceQueue.findMany({ where: { id: { in: mine.map((m) => m.queueId) }, deletedAt: null } }),
      waitingByQueue(),
    ]);
    res.json({
      success: true,
      queues: queues.map((q) => ({
        id: q.id,
        name: q.name,
        waitingCallsCount: waiting.get(q.id)?.length ?? 0,
        longestWaitSeconds: waiting.get(q.id)?.[0]?.waitSeconds ?? 0,
        activeAgentsCount: 0,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

// ============================================================================
// BUZÓN DE VOZ
// ============================================================================

/** Quién ve un mensaje: quien supervisa, todos; los demás, los de su extensión, sus colas y el buzón general. */
async function voicemailWhere(req: Request) {
  const a = auth(req);
  if (a.supervise) return {};
  const [ext, queues] = await Promise.all([
    db().voiceExtension.findMany({ where: { userId: a.userId, deletedAt: null }, select: { id: true } }),
    db().voiceQueueMember.findMany({ where: { userId: a.userId, deletedAt: null, isActive: true }, select: { queueId: true } }),
  ]);
  return {
    OR: [
      { extensionId: { in: ext.map((e) => e.id) } },
      { queueId: { in: queues.map((q) => q.queueId) } },
      { extensionId: null, queueId: null },
    ],
  };
}

async function voicemailList(req: Request, extra: Record<string, unknown> = {}) {
  const rows = await db().voiceVoicemail.findMany({
    where: { AND: [{ organizationId: ORG, deletedAt: null, ...extra }, await voicemailWhere(req)] },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const callIds = rows.map((r) => r.callId);
  const [calls, exts, queues] = await Promise.all([
    db().voiceCall.findMany({ where: { id: { in: callIds } } }),
    db().voiceExtension.findMany({ where: { id: { in: rows.map((r) => r.extensionId).filter(Boolean) as string[] } } }),
    db().voiceQueue.findMany({ where: { id: { in: rows.map((r) => r.queueId).filter(Boolean) as string[] } } }),
  ]);
  const clientIds = [...new Set(calls.map((c) => c.customerId).filter(Boolean))] as string[];
  const clients = clientIds.length ? await db().client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const callBy = new Map(calls.map((c) => [c.id, c]));
  const extBy = new Map(exts.map((e) => [e.id, e]));
  const queueBy = new Map(queues.map((q) => [q.id, q]));
  const clientBy = new Map(clients.map((c) => [c.id, c.name]));
  return rows.map((r) => {
    const call = callBy.get(r.callId);
    const ext = r.extensionId ? extBy.get(r.extensionId) : null;
    return {
      id: r.id,
      callId: r.callId,
      fromNumber: call?.fromNumber ?? '',
      customerId: call?.customerId ?? null,
      callerName: call?.customerId ? clientBy.get(call.customerId) ?? null : null,
      durationSeconds: Number(r.durationSeconds),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      heardAt: r.heardAt?.toISOString() ?? null,
      heardByName: employeeName(r.heardById),
      returnedCallId: r.returnedCallId,
      queueName: r.queueId ? queueBy.get(r.queueId)?.name ?? null : null,
      extension: ext?.extension ?? null,
      ownerName: ext?.userId ? employeeName(ext.userId) : null,
      transcriptText: r.transcriptText,
      audioUrl: `/api/voice/voicemails/${r.id}/audio`,
    };
  });
}

voicePbxRouter.get('/voicemails', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const status = String(req.query.status || '');
    const extra = ['NEW', 'HEARD', 'RETURNED', 'ARCHIVED'].includes(status) ? { status } : { status: { not: 'ARCHIVED' } };
    res.json({ success: true, voicemails: await voicemailList(req, extra) });
  } catch (err) {
    fail(res, err);
  }
});

async function visibleVoicemail(req: Request, id: string) {
  return db().voiceVoicemail.findFirst({ where: { AND: [{ id, organizationId: ORG, deletedAt: null }, await voicemailWhere(req)] } });
}

voicePbxRouter.get('/voicemails/:id/audio', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const vm = await visibleVoicemail(req, req.params.id);
    if (!vm) return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    sendWav(req, res, recordingPath(vm.storageKey));
  } catch (err) {
    fail(res, err);
  }
});

const voicemailAction = (status: 'HEARD' | 'RETURNED' | 'ARCHIVED') => async (req: Request, res: Response) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const vm = await visibleVoicemail(req, req.params.id);
    if (!vm) return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    const a = auth(req);
    const data: any = { status, updatedById: a.userId };
    if (status === 'HEARD') {
      if (vm.status !== 'NEW') return res.json({ success: true });
      Object.assign(data, { heardAt: new Date(), heardById: a.userId });
    }
    if (status === 'RETURNED') {
      Object.assign(data, { returnedCallId: req.body?.callId ? String(req.body.callId) : vm.returnedCallId });
      if (!vm.heardAt) Object.assign(data, { heardAt: new Date(), heardById: a.userId });
    }
    await db().voiceVoicemail.update({ where: { id: vm.id }, data });
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
};
voicePbxRouter.post('/voicemails/:id/heard', voicemailAction('HEARD'));
voicePbxRouter.post('/voicemails/:id/returned', voicemailAction('RETURNED'));
voicePbxRouter.post('/voicemails/:id/archive', voicemailAction('ARCHIVED'));

// Teléfono del navegador: contador y últimos mensajes
voicePbxRouter.get('/voicemail/unread-count', async (req, res) => {
  if (!voiceDbAvailable()) return res.json({ success: true, unreadCount: 0 });
  try {
    const unreadCount = await db().voiceVoicemail.count({ where: { AND: [{ organizationId: ORG, deletedAt: null, status: 'NEW' as const }, await voicemailWhere(req)] } });
    res.json({ success: true, unreadCount });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.get('/voicemail/messages', async (req, res) => {
  if (!voiceDbAvailable()) return res.json({ success: true, messages: [] });
  try {
    const list = await voicemailList(req, { status: { in: ['NEW', 'HEARD'] } });
    res.json({
      success: true,
      messages: list.slice(0, 20).map((v) => ({ id: v.id, callerNumber: v.fromNumber, callerName: v.callerName, durationSeconds: v.durationSeconds, createdAt: v.createdAt, transcription: v.transcriptText, isRead: v.status !== 'NEW', audioUrl: v.audioUrl })),
    });
  } catch (err) {
    fail(res, err);
  }
});

// ============================================================================
// LOCUCIONES
// ============================================================================

const PROMPT_CATEGORIES = ['GREETING', 'MENU', 'QUEUE', 'VOICEMAIL', 'ANNOUNCEMENT', 'ERROR', 'CLOSED', 'LEGAL'] as const;
const promptFile = (asteriskFilename: string) => path.join(soundsDir(), `${path.basename(asteriskFilename)}.wav`);

/** Dónde se usa una locución (menús publicados o en borrador y colas). */
async function promptUsage(id: string): Promise<string[]> {
  const [flows, queues, drafts] = await Promise.all([
    db().voiceIvrFlow.findMany({ where: { organizationId: ORG, deletedAt: null } }),
    db().voiceQueue.findMany({ where: { organizationId: ORG, deletedAt: null, OR: [{ greetingPromptId: id }, { periodicPromptId: id }] } }),
    documentRepository<any>('voice_ivr_drafts').list().catch(() => []),
  ]);
  const uses = (def: any) => JSON.stringify(def?.nodes ?? []).includes(`"${id}"`);
  return [
    ...flows.filter((f) => uses(f.definition) || drafts.some((d: any) => d.id === f.id && uses(d.definition))).map((f) => `menú "${f.name}"`),
    ...queues.map((q) => `cola "${q.name}"`),
  ];
}

voicePbxRouter.get('/prompts', async (_req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const rows = await db().voicePrompt.findMany({ where: { organizationId: ORG, deletedAt: null }, orderBy: { name: 'asc' } });
    res.json({
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        source: p.source,
        text: p.text,
        asteriskFilename: p.asteriskFilename,
        durationSeconds: Number(p.durationSeconds),
        isActive: p.isActive,
        version: p.version,
        hasAudio: fs.existsSync(promptFile(p.asteriskFilename)),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

/**
 * Crear o actualizar una locución. El audio llega como WAV en base64 (el navegador ya lo
 * convirtió a 8 kHz mono 16 bits) y se guarda en la carpeta que Asterisk reproduce.
 */
voicePbxRouter.post('/prompts', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 80);
  const text = String(b.text || '').trim().slice(0, 2000);
  if (!name) return res.status(400).json({ success: false, error: 'La locución necesita un nombre.' });
  if (!text) return res.status(400).json({ success: false, error: 'Escribe el guion (lo que dice el audio): sirve para buscarla y revisarla.' });
  const category = PROMPT_CATEGORIES.includes(b.category) ? b.category : 'ANNOUNCEMENT';
  let audio: Buffer | null = null;
  let duration: number | null = null;
  if (b.audioBase64) {
    audio = Buffer.from(String(b.audioBase64).replace(/^data:[^,]+,/, ''), 'base64');
    const info = parseWav(new Uint8Array(audio));
    const problem = asteriskWavProblem(info);
    if (problem) return res.status(400).json({ success: false, error: problem });
    duration = Math.round(info!.durationSeconds * 100) / 100;
  }
  try {
    const a = auth(req);
    const existing = b.id ? await db().voicePrompt.findFirst({ where: { id: String(b.id), organizationId: ORG, deletedAt: null } }) : null;
    if (b.id && !existing) return res.status(404).json({ success: false, error: 'Locución no encontrada' });
    if (!existing && !audio) return res.status(400).json({ success: false, error: 'Graba o sube el audio de la locución.' });
    const source = ['RECORDED_BROWSER', 'UPLOADED', 'RECORDED_PHONE', 'TTS'].includes(b.source) ? b.source : 'UPLOADED';
    let prompt = existing
      ? await db().voicePrompt.update({
          where: { id: existing.id },
          data: {
            name,
            text,
            category,
            description: b.description ? String(b.description).slice(0, 200) : null,
            isActive: b.isActive !== false,
            updatedById: a.userId,
            ...(audio ? { durationSeconds: duration!, source, version: { increment: 1 } } : {}),
          },
        })
      : await db().voicePrompt.create({
          data: {
            organizationId: ORG,
            name,
            text,
            category,
            source,
            description: b.description ? String(b.description).slice(0, 200) : null,
            storageKey: 'pendiente',
            asteriskFilename: 'pendiente',
            durationSeconds: duration!,
            createdById: a.userId,
          },
        });
    if (!existing) {
      const filename = promptFilename(name, prompt.id);
      prompt = await db().voicePrompt.update({ where: { id: prompt.id }, data: { asteriskFilename: filename, storageKey: `sounds/fusion/${filename}.wav` } });
    }
    if (audio) {
      fs.mkdirSync(soundsDir(), { recursive: true });
      const target = promptFile(prompt.asteriskFilename);
      fs.writeFileSync(`${target}.tmp`, audio);
      fs.renameSync(`${target}.tmp`, target);
    }
    res.json({ success: true, data: { id: prompt.id, name: prompt.name, asteriskFilename: prompt.asteriskFilename } });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.get('/prompts/:id/audio', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const p = await db().voicePrompt.findFirst({ where: { id: req.params.id, organizationId: ORG, deletedAt: null } }).catch(() => null);
  if (!p) return res.status(404).json({ success: false, error: 'Locución no encontrada' });
  sendWav(req, res, promptFile(p.asteriskFilename));
});

voicePbxRouter.delete('/prompts/:id', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const uses = await promptUsage(req.params.id);
    if (uses.length) return res.status(409).json({ success: false, error: `Se usa en ${uses.join(', ')}. Quítala de ahí antes de borrarla.` });
    await db().voicePrompt.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// ============================================================================
// MENÚS DE OPCIONES (IVR)
// ============================================================================
// La fila VoiceIvrFlow guarda la versión que atiende las llamadas (la que lee el puente).
// Mientras se edita un menú ya publicado, los cambios van a un borrador aparte y solo
// reemplazan la versión en uso al publicar. Las versiones anteriores quedan para revertir.

interface FlowDraft {
  id: string;
  definition: IvrFlowDefinition;
  updatedAt: string;
  updatedBy: string;
}
interface FlowHistory {
  id: string;
  versions: Array<{ version: number; publishedAt: string; publishedById: string | null; diffSummary: string[]; definition: IvrFlowDefinition }>;
}
const drafts = () => documentRepository<FlowDraft>('voice_ivr_drafts');
const history = () => documentRepository<FlowHistory>('voice_ivr_history');

function newFlowDefinition(id: string, name: string): IvrFlowDefinition {
  return {
    id,
    organizationId: ORG,
    name,
    version: 1,
    status: 'DRAFT',
    initialNodeId: 'node_start',
    nodes: [
      {
        id: 'node_start',
        type: 'INICIO',
        position: { x: 50, y: 100 },
        data: { label: 'Inicio', type: 'INICIO', outputs: [{ id: 'out_1', label: 'siguiente', targetNodeId: null }] },
      },
    ],
    edges: [],
  };
}

async function loadFlow(id: string) {
  const row = await db().voiceIvrFlow.findFirst({ where: { id, organizationId: ORG, deletedAt: null } });
  if (!row) return null;
  const draft = row.status === 'PUBLISHED' ? await drafts().get(id).catch(() => null) : null;
  const definition = (draft?.definition ?? row.definition) as unknown as IvrFlowDefinition;
  return {
    row,
    draft,
    definition,
    view: {
      id: row.id,
      name: row.name,
      description: row.description,
      didIds: row.didIds,
      version: row.version,
      // Lo que se ve en el editor: publicado sin cambios, o borrador pendiente de publicar
      status: draft || row.status !== 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
      isLive: row.status === 'PUBLISHED',
      hasPendingChanges: !!draft,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishedByName: employeeName(row.publishedById),
      definition,
      updatedAt: (draft?.updatedAt ? new Date(draft.updatedAt) : row.updatedAt).toISOString(),
    },
  };
}

async function validationCatalog() {
  const [prompts, queues, exts] = await Promise.all([
    db().voicePrompt.findMany({ where: { organizationId: ORG, deletedAt: null, isActive: true } }),
    db().voiceQueue.findMany({ where: { organizationId: ORG, deletedAt: null } }),
    db().voiceExtension.findMany({ where: { organizationId: ORG, deletedAt: null } }),
  ]);
  return {
    prompts: prompts.map((p) => ({ id: p.id, asteriskFilename: p.asteriskFilename, verified: fs.existsSync(promptFile(p.asteriskFilename)) })),
    queues: queues.map((q) => ({ id: q.id, name: q.name, isActive: q.isActive })),
    extensions: exts.map((e) => ({ extension: e.extension, status: e.status })),
  };
}

voicePbxRouter.get('/ivr-flows', async (_req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const [rows, pending] = await Promise.all([
      db().voiceIvrFlow.findMany({ where: { organizationId: ORG, deletedAt: null }, orderBy: { name: 'asc' } }),
      drafts().list().catch(() => [] as FlowDraft[]),
    ]);
    const numbers = await db().voiceNumber.findMany({ where: { organizationId: ORG, deletedAt: null, inboundTarget: 'IVR_FLOW' } });
    const pendingIds = new Set(pending.map((d) => d.id));
    res.json({
      success: true,
      data: rows.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        version: f.version,
        status: f.status === 'PUBLISHED' && !pendingIds.has(f.id) ? 'PUBLISHED' : 'DRAFT',
        isLive: f.status === 'PUBLISHED',
        hasPendingChanges: pendingIds.has(f.id),
        publishedAt: f.publishedAt?.toISOString() ?? null,
        nodeCount: ((f.definition as any)?.nodes ?? []).length,
        numbers: numbers.filter((n) => n.inboundTargetId === f.id).map((n) => n.number),
        updatedAt: f.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.get('/ivr-flows/:id', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    res.json({ success: true, data: f.view });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.post('/ivr-flows', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ success: false, error: 'El menú necesita un nombre.' });
  try {
    const row = await db().voiceIvrFlow.create({
      data: { organizationId: ORG, name, description: req.body?.description ? String(req.body.description).slice(0, 300) : null, definition: {} as any, createdById: auth(req).userId },
    });
    const definition = newFlowDefinition(row.id, name);
    await db().voiceIvrFlow.update({ where: { id: row.id }, data: { definition: definition as any } });
    res.status(201).json({ success: true, data: (await loadFlow(row.id))!.view });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.put('/ivr-flows/:id', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    const a = auth(req);
    const name = req.body?.name ? String(req.body.name).trim().slice(0, 80) : f.row.name;
    await db().voiceIvrFlow.update({
      where: { id: f.row.id },
      data: { name, description: req.body?.description !== undefined ? String(req.body.description || '').slice(0, 300) || null : f.row.description, updatedById: a.userId },
    });
    const def = req.body?.definition as IvrFlowDefinition | undefined;
    if (def) {
      if (!Array.isArray(def.nodes) || !def.nodes.length) return res.status(400).json({ success: false, error: 'El menú no tiene pasos.' });
      const clean = { ...def, id: f.row.id, organizationId: ORG, name };
      if (f.row.status === 'PUBLISHED') {
        await drafts().upsert({ id: f.row.id, definition: clean, updatedAt: new Date().toISOString(), updatedBy: a.userId });
      } else {
        await db().voiceIvrFlow.update({ where: { id: f.row.id }, data: { definition: clean as any } });
      }
    }
    res.json({ success: true, data: (await loadFlow(f.row.id))!.view });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.post('/ivr-flows/:id/validate', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    const c = await validationCatalog();
    res.json({ success: true, data: validateIvrFlow(f.definition, c.prompts, c.queues, c.extensions) });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.post('/ivr-flows/:id/publish', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    const c = await validationCatalog();
    const validation = validateIvrFlow(f.definition, c.prompts, c.queues, c.extensions);
    if (!validation.isValid) {
      return res.status(422).json({ success: false, code: 'VALIDATION_FAILED_BLOCKING', error: 'El menú tiene errores que impiden publicarlo.', validation });
    }
    const a = auth(req);
    const wasLive = f.row.status === 'PUBLISHED';
    const previous = wasLive ? (f.row.definition as unknown as IvrFlowDefinition) : null;
    const diffSummary = generateFlowDiff(previous, f.definition);
    const version = wasLive ? f.row.version + 1 : f.row.version;
    if (wasLive && previous) {
      const h = (await history().get(f.row.id).catch(() => null)) ?? { id: f.row.id, versions: [] };
      h.versions.push({ version: f.row.version, publishedAt: f.row.publishedAt?.toISOString() ?? new Date().toISOString(), publishedById: f.row.publishedById, diffSummary, definition: previous });
      h.versions = h.versions.slice(-10);
      await history().upsert(h);
    }
    const published = { ...f.definition, version, status: 'PUBLISHED' as const };
    await db().voiceIvrFlow.update({
      where: { id: f.row.id },
      data: { definition: published as any, status: 'PUBLISHED', version, publishedAt: new Date(), publishedById: a.userId, updatedById: a.userId },
    });
    if (f.draft) await drafts().delete(f.row.id).catch(() => {});
    res.json({
      success: true,
      data: (await loadFlow(f.row.id))!.view,
      diffSummary,
      message: `Menú publicado (versión ${version}). Las llamadas que ya estaban en el menú terminan con la versión anterior.`,
    });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.post('/ivr-flows/:id/rollback', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    const h = await history().get(f.row.id).catch(() => null);
    const last = h?.versions.pop();
    if (!h || !last) return res.status(400).json({ success: false, error: 'No hay una versión anterior para restaurar.' });
    const version = f.row.version + 1;
    await db().voiceIvrFlow.update({
      where: { id: f.row.id },
      data: { definition: { ...last.definition, version, status: 'PUBLISHED' } as any, status: 'PUBLISHED', version, publishedAt: new Date(), publishedById: auth(req).userId },
    });
    await history().upsert(h);
    await drafts().delete(f.row.id).catch(() => {});
    res.json({ success: true, data: (await loadFlow(f.row.id))!.view, message: `Se restauró la versión ${last.version} (ahora versión ${version}).` });
  } catch (err) {
    fail(res, err);
  }
});

voicePbxRouter.delete('/ivr-flows/:id', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const used = await db().voiceNumber.count({ where: { organizationId: ORG, deletedAt: null, inboundTarget: 'IVR_FLOW', inboundTargetId: req.params.id } });
    if (used) return res.status(409).json({ success: false, error: 'Un número de la empresa entra a este menú: cámbialo antes de borrarlo.' });
    await db().voiceIvrFlow.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    await drafts().delete(req.params.id).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    fail(res, err);
  }
});

// Simulador del editor: un paso del motor con el borrador y el horario real de la empresa
voicePbxRouter.post('/ivr-flows/:id/simulate-step', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const f = await loadFlow(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: 'Menú no encontrado' });
    const flow = f.definition;
    const { context, event } = req.body || {};
    const virtual = context?.currentVirtualTimeBogota ? new Date(context.currentVirtualTimeBogota) : new Date();
    const override = await documentRepository<any>('voice_settings').get('override').catch(() => null);
    const execContext = {
      callId: `sim_${Date.now()}`,
      organizationId: ORG,
      fromNumber: '+573000000000',
      toNumber: '',
      variables: {},
      currentNodeId: flow.initialNodeId || flow.nodes[0]?.id,
      currentRetries: {},
      dtmfBuffer: '',
      accumulatedWaitSeconds: 0,
      stepHistory: [],
      legalNoticePlayed: false,
      activeMenuDepth: 0,
      ...(context || {}),
      businessStatus: businessStatusAt(virtual, systemConfig().calendar(), context?.currentVirtualTimeBogota ? null : override?.closedUntil),
    };
    const step = runFlowStep(flow, execContext, event);
    if (step.action === 'CRM_LOOKUP' && step.crmLookup) {
      const crm = await executeCrmLookup(step.crmLookup.queryType as any, step.crmLookup.input, step.nextContext);
      step.crmLookup.allowed = crm.success;
    }
    res.json({ success: true, step });
  } catch (err) {
    fail(res, err);
  }
});

// ============================================================================
// HORARIO DE ATENCIÓN (sale de Administración → Calendario laboral)
// ============================================================================

interface VoiceOverride {
  id: string;
  closedUntil: string | null;
  reason: string | null;
  by?: string;
}
const overrides = () => documentRepository<VoiceOverride>('voice_settings');

async function currentOverride(): Promise<VoiceOverride | null> {
  const o = await overrides().get('override').catch(() => null);
  return o?.closedUntil && Date.parse(o.closedUntil) > Date.now() ? o : null;
}

function scheduleView() {
  const cal = systemConfig().calendar();
  // Lunes primero, como se lee un horario
  const order = [1, 2, 3, 4, 5, 6, 0];
  return {
    id: 'sched_main',
    name: 'Horario de atención (calendario laboral de la empresa)',
    timezone: 'America/Bogota',
    holidaysFollowLaw51: true,
    weeklyHours: order.map((d, i) => ({ dayOfWeek: i + 1, dayName: DAY_NAMES[d], enabled: cal.days[d].open, openTime: cal.days[d].from, closeTime: cal.days[d].to })),
    exceptions: cal.exceptions,
    openAction: 'IVR_FLOW',
    closedAction: 'VOICEMAIL',
    holidayAction: 'VOICEMAIL',
  };
}

voicePbxRouter.get('/schedules', (_req, res) => {
  const year = new Date().getFullYear();
  const today = bogotaYmd(new Date());
  res.json({
    success: true,
    schedule: scheduleView(),
    upcomingHolidays: [...getColombianHolidays(year), ...getColombianHolidays(year + 1)].filter((h) => h.date >= today).slice(0, 6),
  });
});

voicePbxRouter.get('/schedules/status', async (_req, res) => {
  const now = new Date();
  const override = await currentOverride();
  const status = businessStatusAt(now, systemConfig().calendar(), override?.closedUntil);
  const today = bogotaYmd(now);
  const holiday = [...getColombianHolidays(now.getFullYear())].find((h) => h.date === today);
  const year = now.getFullYear();
  const next = [...getColombianHolidays(year), ...getColombianHolidays(year + 1)].find((h) => h.date > today) ?? null;
  const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  res.json({
    success: true,
    data: {
      isOpen: status === 'abierto',
      status,
      isHolidayToday: !!holiday,
      holidayTodayName: holiday?.name ?? null,
      nextHoliday: next,
      overrideActive: !!override,
      overrideReason: override?.reason ?? null,
      overrideUntil: override?.closedUntil ?? null,
      statusHeadline: status === 'abierto' ? 'ABIERTO' : 'CERRADO',
      detailText: override
        ? `Cierre temporal: "${override.reason}". Se reabre solo a las ${hhmm(override.closedUntil!)}.`
        : status === 'festivo'
          ? `Hoy es festivo${holiday ? ` (${holiday.name})` : ''}.`
          : status === 'abierto'
            ? 'En horario de atención.'
            : 'Fuera del horario de atención.',
      timezone: 'America/Bogota',
    },
  });
});

// "Cerrar ahora": el nodo Horario de los menús toma la salida de cerrado hasta la hora indicada
voicePbxRouter.post('/schedules/:id/override', async (req, res) => {
  const a = auth(req);
  if (!a.manage) return res.status(403).json({ success: false, error: 'Solo quien administra la telefonía puede cerrar la atención.' });
  const active = !!req.body?.active;
  const reason = String(req.body?.reason || '').trim().slice(0, 120);
  if (active && !reason) return res.status(400).json({ success: false, error: 'Escribe el motivo del cierre.' });
  const minutes = int(req.body?.reopenMinutes, 5, 24 * 60, 120);
  const doc: VoiceOverride = active
    ? { id: 'override', closedUntil: new Date(Date.now() + minutes * 60_000).toISOString(), reason, by: a.userId }
    : { id: 'override', closedUntil: null, reason: null, by: a.userId };
  await overrides().upsert(doc);
  res.json({ success: true, message: active ? `Atención cerrada hasta las ${new Date(doc.closedUntil!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}.` : 'Atención normal reanudada.' });
});
