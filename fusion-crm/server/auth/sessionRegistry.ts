import crypto from 'crypto';
import { documentRepository } from '../repositories/documentStore';
import type { DocumentRepository } from '../repositories/types';

/**
 * Registro de sesiones y de intentos de acceso, para Administración → Política de seguridad
 * y Revisión de accesos. La cookie de sesión la firma Firebase; aquí se guarda solo su huella
 * (sha256), nunca la cookie.
 */

export interface SessionRecord {
  id: string; // huella de la cookie
  employeeId: string;
  name: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string;
  ip: string;
  endedAt?: string;
  endedReason?: 'logout' | 'revoked' | 'expired';
  endedBy?: string;
}

export interface SecurityEvent {
  id: string;
  at: string;
  type: 'LOGIN_OK' | 'LOGIN_DENIED' | 'SESSION_REVOKED' | 'POLICY_CHANGED' | 'ACCESS_REVIEW';
  email?: string;
  name?: string;
  detail: string;
  ip?: string;
}

export const sessionFingerprint = (cookie: string) => crypto.createHash('sha256').update(cookie).digest('hex').slice(0, 40);

/** Navegador y sistema en palabras simples ("Chrome en Windows"). */
export function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'otro sistema';
  return `${browser} en ${os}`;
}

const SEEN_FLUSH_MS = 5 * 60 * 1000;
const EVENTS_KEEP = 500;

export interface RegistryDeps {
  sessions: DocumentRepository<SessionRecord>;
  events: DocumentRepository<SecurityEvent>;
  now: () => Date;
}

export function createSessionRegistry(deps: RegistryDeps) {
  const active = new Map<string, SessionRecord>();
  const ended = new Set<string>();
  const lastFlush = new Map<string, number>();
  let events: SecurityEvent[] = [];

  const isExpired = (s: SessionRecord) => Date.parse(s.expiresAt) <= deps.now().getTime();

  async function record(type: SecurityEvent['type'], detail: string, extra: Partial<SecurityEvent> = {}) {
    const ev: SecurityEvent = { id: `sec-${deps.now().getTime()}-${crypto.randomBytes(3).toString('hex')}`, at: deps.now().toISOString(), type, detail, ...extra };
    events = [ev, ...events].slice(0, EVENTS_KEEP);
    await deps.events.upsert(ev).catch((err) => console.warn('[seguridad] No se pudo guardar el evento:', err?.message || err));
    return ev;
  }

  return {
    async load() {
      const [all, evs] = await Promise.all([deps.sessions.list(), deps.events.list()]);
      for (const s of all) {
        if (s.endedAt) ended.add(s.id);
        else if (!isExpired(s)) active.set(s.id, s);
      }
      events = evs.sort((a, b) => b.at.localeCompare(a.at)).slice(0, EVENTS_KEEP);
      // Limpieza: sesiones vencidas hace más de 30 días
      const cutoff = deps.now().getTime() - 30 * 86400_000;
      for (const s of all) if (Date.parse(s.expiresAt) < cutoff) await deps.sessions.delete(s.id).catch(() => undefined);
    },

    async started(input: { cookie: string; employeeId: string; name: string; email: string; userAgent: string; ip: string; durationMs: number }) {
      const now = deps.now();
      const s: SessionRecord = {
        id: sessionFingerprint(input.cookie),
        employeeId: input.employeeId,
        name: input.name,
        email: input.email,
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + input.durationMs).toISOString(),
        userAgent: input.userAgent.slice(0, 300),
        ip: input.ip,
      };
      active.set(s.id, s);
      lastFlush.set(s.id, now.getTime());
      await deps.sessions.upsert(s);
      await record('LOGIN_OK', `Entró desde ${describeDevice(s.userAgent)}`, { email: s.email, name: s.name, ip: s.ip });
      return s;
    },

    async denied(email: string | undefined, reason: string, ip: string) {
      await record('LOGIN_DENIED', reason, { email, ip });
    },

    /** ¿La sesión fue cerrada por un administrador o por el propio usuario? */
    isEnded(cookie: string) {
      return ended.has(sessionFingerprint(cookie));
    },

    /** Actividad de una sesión (se guarda como mucho cada 5 minutos). */
    seen(cookie: string, who: { employeeId: string; name: string; email: string; userAgent: string; ip: string; expiresAtMs: number }) {
      const id = sessionFingerprint(cookie);
      const nowMs = deps.now().getTime();
      let s = active.get(id);
      if (!s) {
        // Sesión abierta antes de existir este registro
        s = { id, employeeId: who.employeeId, name: who.name, email: who.email, createdAt: deps.now().toISOString(), lastSeenAt: deps.now().toISOString(), expiresAt: new Date(who.expiresAtMs).toISOString(), userAgent: who.userAgent.slice(0, 300), ip: who.ip };
        active.set(id, s);
      }
      s.lastSeenAt = deps.now().toISOString();
      s.ip = who.ip || s.ip;
      if (nowMs - (lastFlush.get(id) ?? 0) >= SEEN_FLUSH_MS) {
        lastFlush.set(id, nowMs);
        deps.sessions.upsert({ ...s }).catch(() => undefined);
      }
    },

    async end(cookie: string) {
      const id = sessionFingerprint(cookie);
      const s = active.get(id);
      active.delete(id);
      ended.add(id);
      if (s) await deps.sessions.upsert({ ...s, endedAt: deps.now().toISOString(), endedReason: 'logout' });
    },

    /** Cierra sesiones: una (id) o todas las de un colaborador (employeeId), o todas menos la propia. */
    async revoke(filter: { id?: string; employeeId?: string; allExcept?: string }, by: string) {
      const targets = [...active.values()].filter(
        (s) => (filter.id && s.id === filter.id) || (filter.employeeId && s.employeeId === filter.employeeId) || (filter.allExcept !== undefined && s.id !== filter.allExcept),
      );
      for (const s of targets) {
        active.delete(s.id);
        ended.add(s.id);
        await deps.sessions.upsert({ ...s, endedAt: deps.now().toISOString(), endedReason: 'revoked', endedBy: by });
      }
      if (targets.length) {
        const names = [...new Set(targets.map((t) => t.name))].join(', ');
        await record('SESSION_REVOKED', `${by} cerró ${targets.length} sesión(es) de ${names}`, { name: by });
      }
      return targets.length;
    },

    activeSessions() {
      for (const [id, s] of active) if (isExpired(s)) active.delete(id);
      return [...active.values()].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    },

    /** Último uso conocido por correo (sesiones activas e ingresos registrados). */
    lastActivityByEmail() {
      const out = new Map<string, string>();
      const bump = (email: string | undefined, at: string) => {
        const k = String(email || '').toLowerCase();
        if (k && (out.get(k) ?? '') < at) out.set(k, at);
      };
      for (const s of active.values()) bump(s.email, s.lastSeenAt);
      for (const e of events) if (e.type === 'LOGIN_OK') bump(e.email, e.at);
      return out;
    },

    events: () => events,
    record,
    fingerprint: sessionFingerprint,
  };
}

export type SessionRegistry = ReturnType<typeof createSessionRegistry>;

let instance: SessionRegistry | null = null;
export function sessionRegistry(): SessionRegistry {
  instance ??= createSessionRegistry({
    sessions: documentRepository<SessionRecord>('auth_sessions'),
    events: documentRepository<SecurityEvent>('security_events'),
    now: () => new Date(),
  });
  return instance;
}

export async function loadSessionRegistry() {
  try {
    await sessionRegistry().load();
  } catch (err) {
    console.error('[seguridad] No se pudo cargar el registro de sesiones:', err);
  }
}

export function __setSessionRegistry(r: SessionRegistry | null) {
  instance = r;
}
