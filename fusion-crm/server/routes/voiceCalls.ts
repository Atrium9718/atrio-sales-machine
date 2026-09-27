import { Router } from 'express';
import { getPrisma } from '../repositories/prisma/client';
import { ORGANIZATION_ID } from '../repositories/prisma/mappers';
import { employeeService } from '../services/employeeService';
import { permissionsForRequest } from '../auth/userPermissions';
import { can } from '../../packages/core/src/auth/permissions';
import { summarizeCalls, startOfBogotaDay, isMissedCall, pendingCallbacks } from '../../packages/core/src/voice/callStats';
import { voiceDbAvailable } from '../services/voiceStore';
import { repositories } from '../repositories';
import { identifyCaller } from '../../packages/core/src/voice/identifyCaller';

/**
 * Historial de llamadas: lo que el puente de voz (apps/voice) registra en Postgres.
 * Quien supervisa ve todas; los demás ven las suyas y las entrantes perdidas (para devolverlas).
 */
export const voiceCallsRouter = Router();

const canSeeAll = (req: any) => {
  const { permissions } = permissionsForRequest(req);
  return can(permissions, 'voice:supervise') || can(permissions, 'voice:manage_all');
};

function visibilityWhere(req: any) {
  if (canSeeAll(req)) return {};
  const userId = String(req.headers['x-user-id'] || '');
  return { OR: [{ handledByUserId: userId }, { direction: 'INBOUND' as const, answeredAt: null }] };
}

async function withNames(calls: any[]) {
  const clientIds = [...new Set(calls.map((c) => c.customerId).filter(Boolean))];
  const clients = clientIds.length ? await getPrisma().client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : [];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  return calls.map((c) => ({
    id: c.id,
    direction: c.direction,
    status: c.status,
    disposition: c.disposition,
    missed: isMissedCall(c),
    fromNumber: c.fromNumber,
    toNumber: c.toNumber,
    customerId: c.customerId,
    customerName: c.customerId ? clientName.get(c.customerId) ?? null : null,
    handledByUserId: c.handledByUserId,
    handledByName: c.handledByUserId ? employeeService.getEmployeeById(c.handledByUserId)?.name ?? null : null,
    startedAt: c.startedAt,
    answeredAt: c.answeredAt,
    endedAt: c.endedAt,
    waitSeconds: c.waitSeconds,
    talkSeconds: c.talkSeconds,
    totalSeconds: c.totalSeconds,
    hangupBy: c.hangupBy,
    hangupCause: c.hangupCause,
    recordingId: c.recordingId,
    notes: c.notes,
    tags: c.tags,
  }));
}

const noDb = (res: any) =>
  res.status(503).json({ success: false, code: 'VOICE_DB_REQUIRED', error: 'El historial de llamadas necesita la base de datos Postgres (DATABASE_URL).' });

// GET /api/voice/calls?direction=INBOUND&filter=missed|answered&q=300&from=2026-09-01&to=2026-09-30&cursor=<id>
voiceCallsRouter.get('/calls', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const and: any[] = [{ organizationId: ORGANIZATION_ID, deletedAt: null }, visibilityWhere(req)];
    const direction = String(req.query.direction || '');
    if (['INBOUND', 'OUTBOUND', 'INTERNAL'].includes(direction)) and.push({ direction });
    const filter = String(req.query.filter || '');
    if (filter === 'missed') and.push({ direction: 'INBOUND', OR: [{ disposition: { in: ['MISSED', 'ABANDONED_IN_QUEUE'] } }, { status: { in: ['ABANDONED', 'NO_ANSWER'] } }] });
    if (filter === 'answered') and.push({ OR: [{ disposition: 'ANSWERED' }, { answeredAt: { not: null } }] });
    const q = String(req.query.q || '').replace(/[^\d+]/g, '');
    if (q.length >= 3) and.push({ OR: [{ fromNumber: { contains: q } }, { toNumber: { contains: q } }] });
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if (from && !Number.isNaN(from.getTime())) and.push({ startedAt: { gte: from } });
    if (to && !Number.isNaN(to.getTime())) and.push({ startedAt: { lte: to } });
    if (req.query.customerId) and.push({ customerId: String(req.query.customerId) });

    const rows = await getPrisma().voiceCall.findMany({
      where: { AND: and },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(req.query.cursor ? { cursor: { id: String(req.query.cursor) }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    res.json({ success: true, calls: await withNames(page), nextCursor: rows.length > limit ? page[page.length - 1].id : null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// GET /api/voice/calls/summary — indicadores de hoy (hora de Bogotá)
voiceCallsRouter.get('/calls/summary', async (req, res) => {
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const since = startOfBogotaDay();
    const rows = await getPrisma().voiceCall.findMany({
      where: { AND: [{ organizationId: ORGANIZATION_ID, deletedAt: null, startedAt: { gte: since } }, visibilityWhere(req)] },
      orderBy: { startedAt: 'desc' },
      take: 2000,
    });
    const recent = await withNames(rows.slice(0, 8));
    // Por devolver: perdidas de los últimos 3 días que nadie ha devuelto
    const window = await getPrisma().voiceCall.findMany({
      where: { AND: [{ organizationId: ORGANIZATION_ID, deletedAt: null, startedAt: { gte: new Date(since.getTime() - 2 * 86400_000) } }, visibilityWhere(req)] },
      orderBy: { startedAt: 'desc' },
      take: 3000,
    });
    const callbacks = await withNames(pendingCallbacks(window as any[]).slice(0, 20));
    res.json({ success: true, since: since.toISOString(), summary: summarizeCalls(rows as any), recent, pendingCallbacks: callbacks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// GET /api/voice/calls/:id — detalle con la línea de tiempo
voiceCallsRouter.get('/calls/:id', async (req, res, next) => {
  if (req.params.id === 'summary') return next();
  if (!voiceDbAvailable()) return noDb(res);
  try {
    const call = await getPrisma().voiceCall.findFirst({
      where: { AND: [{ id: req.params.id, organizationId: ORGANIZATION_ID, deletedAt: null }, visibilityWhere(req)] },
      include: { events: { orderBy: { at: 'asc' } } },
    });
    if (!call) return res.status(404).json({ success: false, error: 'Llamada no encontrada' });
    const [row] = await withNames([call]);
    res.json({
      success: true,
      call: { ...row, events: call.events.map((e) => ({ id: e.id, at: e.at, type: e.type, actorUserId: e.actorUserId, payload: e.payload })) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// GET /api/voice/identify?number=3001234567 — quién llama (ventana de llamada entrante)
voiceCallsRouter.get('/identify', async (req, res) => {
  try {
    const { permissions } = permissionsForRequest(req);
    const repo = repositories();
    const [clients, quotes, projects] = await Promise.all([repo.clients.list(), repo.quotes.list(), repo.projects.list()]);
    const identity = identifyCaller(String(req.query.number || ''), { clients, quotes, projects }, { includeAmounts: can(permissions, 'cost:read') });
    let lastCall: any = null;
    if (identity.number && voiceDbAvailable()) {
      const prev = await getPrisma().voiceCall.findFirst({
        where: { organizationId: ORGANIZATION_ID, deletedAt: null, OR: [{ fromNumber: identity.number }, { toNumber: identity.number }], ...(req.query.excludeCallId ? { NOT: { id: String(req.query.excludeCallId) } } : {}) },
        orderBy: { startedAt: 'desc' },
      });
      if (prev) [lastCall] = await withNames([prev]);
    }
    res.json({ success: true, identity, lastCall });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
