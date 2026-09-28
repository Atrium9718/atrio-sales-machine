import { clientPhones } from '../omnichannel/identity';
import { normalizeNit } from './clientProgress';

/**
 * Ingreso del cliente a su portal con cédula o NIT.
 *
 * El documento solo identifica (un NIT sale en facturas y en el RUES; no es secreto): para
 * entrar, el cliente escribe además un código de un solo uso que se envía al WhatsApp o al
 * correo que la empresa tiene registrados para ese cliente.
 */

export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Documento comparable: solo dígitos, sin dígito de verificación del NIT. */
export function normalizeDocument(raw: unknown): string {
  return normalizeNit(raw);
}

const DOC_FIELDS = ['nit', 'doc', 'document', 'documentNumber', 'cedula', 'taxId'];
const EMAIL_FIELDS = ['email', 'billingEmail', 'contactEmail'];

export function clientDocuments(client: any): string[] {
  return DOC_FIELDS.map((f) => normalizeDocument(client?.[f])).filter((d) => d.length >= 5);
}

export function findClientsByDocument(clients: any[], document: string): any[] {
  const doc = normalizeDocument(document);
  if (doc.length < 5) return [];
  return (Array.isArray(clients) ? clients : []).filter((c) => clientDocuments(c).includes(doc));
}

/** Celulares colombianos (+573…) registrados: los únicos que reciben WhatsApp. */
export function loginPhones(clients: any[]): string[] {
  return [...new Set(clients.flatMap((c) => clientPhones(c)).filter((p) => /^\+573\d{9}$/.test(p)))];
}

export function loginEmails(clients: any[]): string[] {
  const out = new Set<string>();
  for (const c of clients) {
    const values = [...EMAIL_FIELDS.map((f) => c?.[f]), ...(Array.isArray(c?.contacts) ? c.contacts.map((x: any) => x?.email) : [])];
    for (const v of values) {
      for (const part of String(v ?? '').split(/[,;\s]+/)) {
        const email = part.trim().toLowerCase();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) out.add(email);
      }
    }
  }
  return [...out];
}

export const maskPhone = (phone: string) => `celular terminado en ${phone.replace(/\D/g, '').slice(-4)}`;

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${'•'.repeat(Math.max(3, user.length - visible.length))}@${domain}`;
}

export interface LoginChallenge {
  id: string;
  document: string;
  clientName: string;
  clientNit: string;
  codeHash: string;
  channel: 'whatsapp' | 'email';
  destination: string;
  attempts: number;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export type VerifyResult = { ok: true } | { ok: false; error: string; locked?: boolean };

/** Revisa el código sin efectos: el llamador guarda el intento y marca el uso. */
export function checkLoginCode(challenge: LoginChallenge | null, codeHash: string, now = Date.now()): VerifyResult {
  if (!challenge || challenge.usedAt) return { ok: false, error: 'El código ya no es válido. Pide uno nuevo.', locked: true };
  if (Date.parse(challenge.expiresAt) < now) return { ok: false, error: 'El código venció. Pide uno nuevo.', locked: true };
  if (challenge.attempts >= LOGIN_MAX_ATTEMPTS) return { ok: false, error: 'Demasiados intentos. Pide un código nuevo.', locked: true };
  if (challenge.codeHash !== codeHash) {
    const left = LOGIN_MAX_ATTEMPTS - challenge.attempts - 1;
    return left > 0
      ? { ok: false, error: `Código incorrecto. Te quedan ${left} ${left === 1 ? 'intento' : 'intentos'}.` }
      : { ok: false, error: 'Código incorrecto. Pide un código nuevo.', locked: true };
  }
  return { ok: true };
}

/** Límite deslizante en memoria (por IP y por documento) para no permitir envíos masivos. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(now);
    hits.set(key, recent);
    return allowed;
  };
}
