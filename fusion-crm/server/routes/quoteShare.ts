import { Router, type Request } from 'express';
import crypto from 'crypto';
import { documentRepository } from '../repositories/documentStore';
import { fileStorage, readStoredFile } from '../services/fileStorage';
import { repositories } from '../repositories';

/**
 * Enlace público del PDF de una cotización para enviarlo por WhatsApp o correo. El PDF se
 * guarda en el servidor (disco con respaldo) y el enlace lleva un token difícil de adivinar;
 * cada vez que el cliente lo abre queda registrado en la cotización.
 */

export interface QuoteLink {
  id: string; // token
  quoteId: string;
  number: string;
  storageKey: string;
  fileName: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  views: number;
  lastViewedAt?: string;
}

const LINK_DAYS = 120;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const links = () => documentRepository<QuoteLink>('quote_links');

/** Base pública de la app: APP_URL o, si no está, el host por el que llegó la petición. */
export function publicBase(req: Pick<Request, 'headers' | 'protocol'>): string {
  const env = (process.env.APP_URL || '').replace(/\/$/, '');
  if (env) return env;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  return host ? `${proto}://${host}` : '';
}

/** Interno (con sesión): guarda el PDF y devuelve el enlace público. */
export const quoteShareRouter = Router();

quoteShareRouter.post('/:id/share-link', async (req, res) => {
  try {
    const { pdfBase64, fileName, number } = req.body ?? {};
    if (typeof pdfBase64 !== 'string' || !pdfBase64) return res.status(400).json({ success: false, error: 'Falta el PDF' });
    const bytes = Buffer.from(pdfBase64, 'base64');
    if (bytes.length > MAX_PDF_BYTES) return res.status(413).json({ success: false, error: 'El PDF es demasiado grande' });
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return res.status(400).json({ success: false, error: 'El archivo no es un PDF' });

    const token = crypto.randomBytes(18).toString('base64url');
    const cleanName = String(fileName || 'cotizacion.pdf').replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'cotizacion.pdf';
    const storageKey = `quotes/${String(req.params.id).replace(/[^\w\-]/g, '_')}/${token}.pdf`;
    await fileStorage().save(storageKey, bytes, 'application/pdf');
    const now = new Date();
    const link: QuoteLink = {
      id: token,
      quoteId: req.params.id,
      number: String(number || ''),
      storageKey,
      fileName: cleanName,
      createdAt: now.toISOString(),
      createdBy: String(req.headers['x-user-name'] || ''),
      expiresAt: new Date(now.getTime() + LINK_DAYS * 86400_000).toISOString(),
      views: 0,
    };
    await links().upsert(link);
    res.json({ success: true, url: `${publicBase(req)}/api/portal/cotizacion/${token}`, expiresAt: link.expiresAt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

/** Público: el cliente abre el PDF (sin sesión). */
export const quotePublicRouter = Router();

quotePublicRouter.get('/cotizacion/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[\w-]{20,40}$/.test(token)) return res.status(404).send('Enlace no válido');
    const link = await links().get(token);
    if (!link) return res.status(404).send('Enlace no válido');
    if (Date.parse(link.expiresAt) < Date.now()) return res.status(410).send('Este enlace venció. Pide la cotización actualizada a tu asesor.');
    const bytes = await readStoredFile(link.storageKey);
    const now = new Date().toISOString();
    // Registro de apertura (no bloquea la descarga)
    links()
      .upsert({ ...link, views: (link.views || 0) + 1, lastViewedAt: now })
      .then(() => repositories().quotes.patch(link.quoteId, { viewedByClientAt: now, clientViews: (link.views || 0) + 1 }))
      .catch((err) => console.warn('[cotización] No se pudo registrar la apertura:', err?.message || err));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(link.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(bytes);
  } catch (err: any) {
    res.status(500).send('No se pudo abrir la cotización');
  }
});
