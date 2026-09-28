import { createHmac, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Meta firma cada POST del webhook con HMAC-SHA256 del cuerpo crudo usando el
 * App Secret, en la cabecera `X-Hub-Signature-256: sha256=<hex>`.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
 */
export function isValidMetaSignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string): boolean {
  if (!rawBody || !header || !appSecret) return false;
  const [scheme, received] = header.split('=', 2);
  if (scheme !== 'sha256' || !received || !/^[0-9a-f]{64}$/i.test(received)) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const given = Buffer.from(received, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Rechaza los POST sin firma válida. Sin META_APP_SECRET configurado, no acepta nada. */
export function requireMetaSignature(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.META_APP_SECRET || '';
  if (!secret) {
    console.error('[meta-webhook] META_APP_SECRET no configurado: se rechazan los eventos entrantes.');
    return res.sendStatus(503);
  }
  const ok = isValidMetaSignature((req as any).rawBody, req.get('x-hub-signature-256'), secret);
  if (!ok) {
    console.warn('[meta-webhook] Firma inválida o ausente; evento descartado.');
    return res.sendStatus(401);
  }
  next();
}

/** Token de verificación del webhook (GET de suscripción). Sin valor por defecto. */
export function metaVerifyToken(): string {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || '';
}
