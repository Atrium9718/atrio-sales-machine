import { normalizePhone } from '../identity/normalization';
import type { ClientRecord } from './types';

const PHONE_KEY = /phone|mobile|celular|whatsapp|telefono|tel$/i;

/** Todos los teléfonos de un cliente (campos propios y de sus contactos), normalizados. */
export function clientPhones(client: ClientRecord): string[] {
  const found = new Set<string>();
  const visit = (value: unknown, key: string, depth: number) => {
    if (depth > 3 || value == null) return;
    if (typeof value === 'string' || typeof value === 'number') {
      if (PHONE_KEY.test(key)) {
        for (const part of String(value).split(/[,/;]| y /)) {
          const p = normalizePhone(part.trim());
          if (p) found.add(p);
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, key, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) visit(v, k, depth + 1);
    }
  };
  visit(client, '', 0);
  return [...found];
}

/** Cliente cuyo teléfono registrado coincide con el número que escribe (solo si hay uno). */
export function matchClientByPhone<T extends ClientRecord>(clients: T[], rawPhone: string): T | null {
  const phone = normalizePhone(rawPhone) ?? normalizePhone(`+${rawPhone.replace(/\D/g, '')}`);
  if (!phone) return null;
  const matches = clients.filter((c) => clientPhones(c).includes(phone));
  return matches.length === 1 ? matches[0] : null;
}

export const normalizeNit = (nit: unknown): string => {
  const digits = String(nit ?? '').replace(/\D/g, '');
  // NIT con dígito de verificación (9 dígitos + 1) → se comparan los 9 primeros
  return digits.length === 10 ? digits.slice(0, 9) : digits;
};

/** Candidatos de NIT/cédula dentro de un texto libre ("mi nit es 900.123.456-1"). */
export function extractNits(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b\d[\d.\s]{5,13}\d(?:-\d)?\b/g)) {
    const n = normalizeNit(m[0]);
    if (n.length >= 6 && n.length <= 10) out.add(n);
  }
  return [...out];
}

/** Números de pedido/OT/cotización mencionados ("OT-1234", "cotización 88", "pedido #77"). */
export function extractOrderNumbers(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(?:OT|COT|PRE)[-\s#]?(\d{2,8})\b/gi)) out.add(m[1]);
  for (const m of text.matchAll(/\b(?:pedido|orden|ot|cotizaci[oó]n)\s*(?:n[°ºo.]?\s*|#\s*)?(\d{2,8})\b/gi)) out.add(m[1]);
  return [...out];
}

export function matchClientByNit<T extends ClientRecord>(clients: T[], text: string): T | null {
  const nits = extractNits(text);
  if (!nits.length) return null;
  const matches = clients.filter((c) => nits.includes(normalizeNit(c.nit)) && normalizeNit(c.nit).length >= 6);
  return matches.length === 1 ? matches[0] : null;
}

/** Número de pedido sin prefijo, para comparar "OT-1234" con "1234". */
export const orderDigits = (value: unknown): string => String(value ?? '').replace(/\D/g, '').replace(/^0+/, '');
