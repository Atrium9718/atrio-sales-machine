import { Router, type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import { isWithinBusinessHours } from '../../packages/core/src/omnichannel';
import { loadOmnichannelConfig, omnichannel } from '../omnichannel/runtime';
import { conversationId } from '../omnichannel/service';

/**
 * API pública del chat web embebible (apps/widget). Cada visitante recibe un token de sesión
 * aleatorio; la conversación se guarda con un hash del token (el token no queda en la base).
 *
 * Variables: WEBCHAT_PUBLIC_KEY (si se define, el widget debe usarla),
 * WEBCHAT_ALLOWED_ORIGINS (sitios que pueden incrustar el chat, separados por coma).
 */
export const widgetRouter = Router();

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
const sessionUser = (token: string) => crypto.createHash('sha256').update(token).digest('hex').slice(0, 40);

// ── Límites (en memoria, por proceso) ───────────────────────────
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 50_000) hits.clear();
  return false;
}

// ── CORS: el widget se incrusta en el sitio web de la empresa ───
function allowedOrigins(): string[] {
  return (process.env.WEBCHAT_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
}

widgetRouter.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function validKey(key: unknown): boolean {
  const expected = process.env.WEBCHAT_PUBLIC_KEY;
  return !expected || key === expected;
}

function tokenFrom(value: unknown): string | null {
  return typeof value === 'string' && TOKEN_PATTERN.test(value) ? value : null;
}

widgetRouter.get('/config', async (req, res) => {
  if (!validKey(req.query.key)) return res.status(404).json({ error: 'Widget no encontrado' });
  const config = await loadOmnichannelConfig();
  const within = isWithinBusinessHours(config.businessHours);
  res.json({
    organizationName: config.businessName,
    primaryColor: process.env.WEBCHAT_PRIMARY_COLOR || '#2563eb',
    position: process.env.WEBCHAT_POSITION === 'left' ? 'left' : 'right',
    greeting: `¡Hola! Soy el asistente de ${config.businessName}. ¿En qué te ayudo? Puedo contarte cómo va tu pedido o ayudarte a cotizar.`,
    isWithinHours: within,
    whatsappNumber: (process.env.WHATSAPP_PUBLIC_NUMBER || '').replace(/\D/g, ''),
    outOfHoursMessage: 'Estamos fuera del horario de atención humana, pero puedo ayudarte ahora mismo y dejar tu caso listo para el equipo.',
  });
});

widgetRouter.post('/session', (req, res) => {
  if (!validKey(req.body?.publicKey)) return res.status(404).json({ error: 'Widget no encontrado' });
  if (rateLimited(`session:${req.ip}`, 30, 60 * 60 * 1000)) return res.status(429).json({ error: 'Demasiadas sesiones' });
  res.json({ token: crypto.randomBytes(32).toString('base64url') });
});

widgetRouter.post('/identify', async (req, res) => {
  const token = tokenFrom(req.body?.token);
  if (!token) return res.status(400).json({ error: 'Sesión inválida' });
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const contact = String(req.body?.contactInfo || '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: 'Falta el nombre' });
  // Los datos que escribe el visitante no lo verifican (cualquiera puede escribir un número):
  // la IA pedirá NIT + número de pedido antes de dar información de pedidos.
  await omnichannel().ensureConversation({ channel: 'webchat', externalUserId: sessionUser(token), contactName: contact ? `${name} (${contact})` : name });
  res.json({ ok: true });
});

widgetRouter.post('/messages', async (req, res) => {
  const token = tokenFrom(req.body?.token);
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  if (!token || !text) return res.status(400).json({ error: 'Mensaje inválido' });
  if (rateLimited(`msg:${token}`, 20, 10 * 60 * 1000) || rateLimited(`msg-ip:${req.ip}`, 60, 10 * 60 * 1000)) {
    return res.status(429).json({ reply: 'Recibimos muchos mensajes seguidos. Espera un momento, por favor.' });
  }
  try {
    const before = await omnichannel().get(conversationId('webchat', sessionUser(token)));
    const known = new Set((before?.messages ?? []).map((m) => m.id));
    const conv = await omnichannel().handleInbound({ channel: 'webchat', externalUserId: sessionUser(token), text });
    const replies = conv.messages.filter((m) => !known.has(m.id) && m.direction === 'out' && m.status === 'sent');
    await omnichannel().markWidgetSeen(conv.id, replies.map((m) => m.id));
    res.json({
      reply: replies.map((m) => m.text).join('\n\n') || null,
      showWhatsappButton: conv.needsHuman && !!process.env.WHATSAPP_PUBLIC_NUMBER,
    });
  } catch (err: any) {
    console.error('[widget] Error procesando mensaje:', err);
    res.status(500).json({ reply: 'Tuvimos un problema técnico. Intenta de nuevo en un momento.' });
  }
});

/** Mensajes nuevos del equipo (o sugerencias aprobadas) que el visitante aún no ha visto. */
widgetRouter.get('/messages', async (req, res) => {
  const token = tokenFrom(req.query.token);
  if (!token) return res.status(400).json({ messages: [] });
  const conv = await omnichannel().get(conversationId('webchat', sessionUser(token)));
  if (!conv) return res.json({ messages: [] });
  const seen = new Set(conv.widgetSeen ?? []);
  const pending = conv.messages.filter((m) => m.direction === 'out' && m.status === 'sent' && !seen.has(m.id));
  await omnichannel().markWidgetSeen(conv.id, pending.map((m) => m.id));
  res.json({ messages: pending.map((m) => ({ text: m.text, createdAt: m.createdAt })) });
});
