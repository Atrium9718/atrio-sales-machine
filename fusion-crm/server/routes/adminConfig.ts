import { Router, type Request, type Response, type NextFunction } from 'express';
import { documentRepository } from '../repositories/documentStore';
import { systemConfig } from '../services/systemConfig';
import { sessionRegistry, describeDevice, sessionFingerprint } from '../auth/sessionRegistry';
import { isAdminRole, parseCookies, SESSION_COOKIE } from '../auth/session';
import { employeeService } from '../services/employeeService';
import { yearOverview } from '../../packages/core/src/calendar/workCalendar';
import {
  buildAccessRows,
  daysUntilNextReview,
  pendingDecisions,
  summarize,
  type AccessDecision,
  type AccessReview,
} from '../services/accessReview';

/**
 * Administración → Seguridad: numeración, calendario laboral, política de seguridad
 * (sesiones e intentos de acceso) y revisión de accesos. Todo solo para administradores,
 * salvo leer el calendario.
 */
export const adminConfigRouter = Router();

const who = (req: Request) => String(req.headers['x-user-name'] || 'Administrador');
const adminOnly = (req: Request, res: Response, next: NextFunction) =>
  isAdminRole(String(req.headers['x-user-role'] || '')) ? next() : res.status(403).json({ success: false, error: 'Se requiere rol de administrador' });
const fail = (res: Response, err: any) => res.status(err?.status || 500).json({ success: false, error: err?.message || String(err) });

// ── Numeración ────────────────────────────────────────────────────────────
adminConfigRouter.get('/numbering', adminOnly, async (_req, res) => {
  try {
    res.json({ success: true, ...(await systemConfig().numberingStatus()) });
  } catch (err) {
    fail(res, err);
  }
});

adminConfigRouter.put('/numbering', adminOnly, async (req, res) => {
  try {
    const { config, lastIssued } = req.body ?? {};
    await systemConfig().setNumbering(config, lastIssued === undefined || lastIssued === null || lastIssued === '' ? undefined : Number(lastIssued), who(req));
    res.json({ success: true, ...(await systemConfig().numberingStatus()) });
  } catch (err) {
    fail(res, err);
  }
});

// ── Calendario laboral ────────────────────────────────────────────────────
adminConfigRouter.get('/work-calendar', (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const calendar = systemConfig().calendar();
  res.json({ success: true, calendar, year, days: yearOverview(year, calendar), meta: systemConfig().meta().work_calendar });
});

adminConfigRouter.put('/work-calendar', adminOnly, async (req, res) => {
  try {
    const calendar = await systemConfig().setCalendar(req.body?.calendar, who(req));
    const year = Number(req.body?.year) || new Date().getFullYear();
    res.json({ success: true, calendar, year, days: yearOverview(year, calendar) });
  } catch (err) {
    fail(res, err);
  }
});

// ── Política de seguridad y sesiones ─────────────────────────────────────
adminConfigRouter.get('/security', adminOnly, (req, res) => {
  const current = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const currentId = current ? sessionFingerprint(current) : null;
  const since = Date.now() - 24 * 3600_000;
  const events = sessionRegistry().events();
  const denied24h = events.filter((e) => e.type === 'LOGIN_DENIED' && Date.parse(e.at) >= since);
  res.json({
    success: true,
    policy: systemConfig().security(),
    meta: systemConfig().meta().security_policy,
    sessions: sessionRegistry()
      .activeSessions()
      .map((s) => ({ id: s.id, name: s.name, email: s.email, device: describeDevice(s.userAgent), ip: s.ip, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, current: s.id === currentId })),
    events: events.slice(0, 100),
    alerts: {
      denied24h: denied24h.length,
      // Muchos intentos rechazados del mismo correo o IP en 24 h
      repeated: Object.entries(
        denied24h.reduce<Record<string, number>>((acc, e) => {
          const k = e.email || e.ip || 'desconocido';
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
      )
        .filter(([, n]) => n >= 3)
        .map(([key, count]) => ({ key, count })),
    },
  });
});

adminConfigRouter.put('/security', adminOnly, async (req, res) => {
  try {
    const before = systemConfig().security();
    const policy = await systemConfig().setSecurity(req.body?.policy, who(req));
    const changes = [
      before.sessionDays !== policy.sessionDays && `sesión de ${policy.sessionDays} días`,
      before.allowedDomains.join(',') !== policy.allowedDomains.join(',') && `dominios: ${policy.allowedDomains.join(', ') || 'cualquiera'}`,
      before.reviewEveryDays !== policy.reviewEveryDays && `revisión cada ${policy.reviewEveryDays} días`,
    ].filter(Boolean);
    if (changes.length) await sessionRegistry().record('POLICY_CHANGED', `${who(req)} cambió la política: ${changes.join('; ')}`, { name: who(req) });
    res.json({ success: true, policy });
  } catch (err) {
    fail(res, err);
  }
});

adminConfigRouter.post('/sessions/revoke', adminOnly, async (req, res) => {
  try {
    const { id, employeeId, allOthers } = req.body ?? {};
    const current = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const filter = allOthers ? { allExcept: current ? sessionFingerprint(current) : '' } : id ? { id: String(id) } : employeeId ? { employeeId: String(employeeId) } : null;
    if (!filter) return res.status(400).json({ success: false, error: 'Indica qué sesión cerrar' });
    const closed = await sessionRegistry().revoke(filter, who(req));
    res.json({ success: true, closed });
  } catch (err) {
    fail(res, err);
  }
});

// ── Revisión de accesos ───────────────────────────────────────────────────
const reviews = () => documentRepository<AccessReview>('access_reviews');

const currentRows = () =>
  buildAccessRows({
    employees: employeeService.getEmployees({ includeInactive: true }) as any,
    roles: employeeService.getRoles(),
    lastActivityByEmail: sessionRegistry().lastActivityByEmail(),
    allowedDomains: systemConfig().security().allowedDomains,
    now: new Date(),
  });

adminConfigRouter.get('/access-reviews', adminOnly, async (_req, res) => {
  try {
    const list = (await reviews().list()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    res.json({
      success: true,
      reviews: list,
      current: currentRows(),
      everyDays: systemConfig().security().reviewEveryDays,
      daysUntilNext: daysUntilNextReview(list, systemConfig().security().reviewEveryDays, new Date()),
    });
  } catch (err) {
    fail(res, err);
  }
});

adminConfigRouter.post('/access-reviews', adminOnly, async (req, res) => {
  try {
    const open = (await reviews().list()).find((r) => r.status === 'OPEN');
    if (open) return res.status(409).json({ success: false, error: 'Ya hay una revisión abierta: termínala primero', review: open });
    const review: AccessReview = { id: `rev-${Date.now()}`, status: 'OPEN', startedAt: new Date().toISOString(), startedBy: who(req), rows: currentRows() };
    await reviews().upsert(review);
    res.status(201).json({ success: true, review });
  } catch (err) {
    fail(res, err);
  }
});

adminConfigRouter.patch('/access-reviews/:id', adminOnly, async (req, res) => {
  try {
    const review = await reviews().get(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Revisión no encontrada' });
    if (review.status !== 'OPEN') return res.status(409).json({ success: false, error: 'La revisión ya se cerró' });
    const { employeeId, decision, note } = req.body ?? {};
    const row = review.rows.find((r) => r.employeeId === employeeId);
    if (!row) return res.status(404).json({ success: false, error: 'Esa persona no está en la revisión' });
    if (decision !== null && !['KEEP', 'REMOVE', 'CHANGE_ROLE'].includes(decision)) return res.status(400).json({ success: false, error: 'Decisión inválida' });
    if (decision === 'REMOVE' && employeeId === req.headers['x-user-id']) return res.status(400).json({ success: false, error: 'No puedes quitarte el acceso a ti mismo' });
    row.decision = decision as AccessDecision | null;
    if (typeof note === 'string') row.note = note.slice(0, 300);
    await reviews().upsert(review);
    res.json({ success: true, review });
  } catch (err) {
    fail(res, err);
  }
});

/** Cierra la revisión: quita el acceso (inactiva y cierra sesiones) a quienes se marcó "Quitar". */
adminConfigRouter.post('/access-reviews/:id/complete', adminOnly, async (req, res) => {
  try {
    const review = await reviews().get(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Revisión no encontrada' });
    if (review.status !== 'OPEN') return res.status(409).json({ success: false, error: 'La revisión ya se cerró' });
    const pending = pendingDecisions(review);
    if (pending) return res.status(400).json({ success: false, error: `Faltan ${pending} persona(s) por decidir` });

    const notApplied: string[] = [];
    for (const row of review.rows.filter((r) => r.decision === 'REMOVE')) {
      const done = employeeService.deactivateEmployee(row.employeeId);
      if (!done) notApplied.push(row.name);
      else await sessionRegistry().revoke({ employeeId: row.employeeId }, who(req));
    }
    review.status = 'COMPLETED';
    review.completedAt = new Date().toISOString();
    review.completedBy = who(req);
    review.summary = summarize(review.rows);
    await reviews().upsert(review);
    await sessionRegistry().record(
      'ACCESS_REVIEW',
      `${who(req)} cerró la revisión de accesos: ${review.summary.kept} se mantienen, ${review.summary.removed} sin acceso, ${review.summary.roleChanges} con cambio de rol`,
      { name: who(req) },
    );
    res.json({ success: true, review, notApplied });
  } catch (err) {
    fail(res, err);
  }
});
