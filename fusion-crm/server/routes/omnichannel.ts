import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  DEFAULT_OMNICHANNEL_CONFIG,
  type Conversation,
  type OmnichannelConfig,
} from '../../packages/core/src/omnichannel';
import { isAdminRole } from '../auth/session';
import { createMemoryRepository } from '../repositories/documentStore';
import { loadOmnichannelConfig, omnichannel, resetOmnichannelRuntime, saveOmnichannelConfig, stageNotifier } from '../omnichannel/runtime';
import { createOmnichannelService, type OmnichannelService } from '../omnichannel/service';
import { createGeminiClient } from '../omnichannel/llm';
import { createMetaSender } from '../omnichannel/senders';
import { computeChannelHealth, computeMonthlyCosts } from '../omnichannel/health';
import { aiPrices, aiUsage } from '../omnichannel/usage';
import { repositories } from '../repositories';
import type { ChannelSender } from '../omnichannel/senders';

/** Bandeja omnicanal (requiere sesión). */
export const omnichannelRouter = Router();

const actor = (req: Request) => ({
  id: String(req.headers['x-user-id'] || ''),
  name: String(req.headers['x-user-name'] || 'Equipo'),
});

/** Resumen para la lista (sin el historial completo). */
export function toSummary(c: Conversation) {
  const last = [...c.messages].reverse().find((m) => m.status !== 'discarded');
  return {
    id: c.id,
    channel: c.channel,
    contactName: c.contactName,
    clientName: c.clientName,
    verified: c.verified,
    mode: c.mode,
    needsHuman: c.needsHuman,
    awaitingApproval: c.awaitingApproval,
    handoffReason: c.handoffReason,
    assigneeName: c.assigneeName,
    status: c.status,
    lastIntent: c.lastIntent,
    unread: c.unread,
    lastMessageAt: c.lastMessageAt,
    lastMessage: last ? { text: last.text.slice(0, 160), author: last.author, status: last.status } : null,
  };
}

/** Indicadores: cuánto resuelve la IA sola y cuánto pasa a personas. */
export function computeStats(conversations: Conversation[], sinceIso: string) {
  const recent = conversations.filter((c) => c.lastMessageAt >= sinceIso);
  const aiReplies = recent.flatMap((c) => c.messages.filter((m) => m.author === 'ai' && m.createdAt >= sinceIso));
  const humanReplies = recent.flatMap((c) => c.messages.filter((m) => m.author === 'agent' && m.createdAt >= sinceIso));
  const escalated = recent.filter((c) => c.handoffReason || c.mode === 'human').length;
  return {
    conversations: recent.length,
    needsHuman: conversations.filter((c) => c.needsHuman && c.status === 'open').length,
    awaitingApproval: conversations.filter((c) => c.awaitingApproval && c.status === 'open').length,
    aiResolvedPercent: recent.length ? Math.round(((recent.length - escalated) / recent.length) * 100) : null,
    aiMessagesSent: aiReplies.filter((m) => ['sent', 'delivered', 'read'].includes(m.status)).length,
    humanMessagesSent: humanReplies.length,
    failedMessages: aiReplies.concat(humanReplies).filter((m) => m.status === 'failed').length,
  };
}

function fail(res: Response, err: any) {
  const status = err?.status || 500;
  if (status >= 500) console.error('[omnicanal]', err);
  res.status(status).json({ success: false, error: err?.message || 'Error' });
}

omnichannelRouter.get('/conversations', async (req, res) => {
  try {
    const filter = String(req.query.filter || 'open');
    const all = await omnichannel().list();
    const visible = all.filter((c) => {
      if (filter === 'needsHuman') return c.status === 'open' && c.needsHuman;
      if (filter === 'approval') return c.status === 'open' && c.awaitingApproval;
      if (filter === 'resolved') return c.status === 'resolved';
      if (filter === 'all') return true;
      return c.status === 'open';
    });
    // Primero lo que necesita a una persona
    visible.sort((a, b) => Number(b.needsHuman) - Number(a.needsHuman) || Number(b.awaitingApproval) - Number(a.awaitingApproval) || b.lastMessageAt.localeCompare(a.lastMessageAt));
    res.json({ success: true, conversations: visible.slice(0, 300).map(toSummary) });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.get('/stats', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    res.json({ success: true, stats: computeStats(await omnichannel().list(), since) });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await omnichannel().get(req.params.id);
    if (!conv) return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    const { widgetSeen: _seen, ...rest } = conv;
    res.json({ success: true, conversation: rest });
  } catch (err) {
    fail(res, err);
  }
});

const TextSchema = z.object({ text: z.string().trim().min(1, 'Escribe un mensaje').max(4000) });

omnichannelRouter.post('/conversations/:id/reply', async (req, res) => {
  const parsed = TextSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
  try {
    res.json({ success: true, conversation: await omnichannel().sendAgentMessage(req.params.id, parsed.data.text, actor(req)) });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.post('/conversations/:id/suggestions/:messageId/approve', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.slice(0, 4000) : undefined;
  try {
    res.json({ success: true, conversation: await omnichannel().approveSuggestion(req.params.id, req.params.messageId, actor(req), text) });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.post('/conversations/:id/suggestions/:messageId/discard', async (req, res) => {
  try {
    res.json({ success: true, conversation: await omnichannel().discardSuggestion(req.params.id, req.params.messageId, actor(req)) });
  } catch (err) {
    fail(res, err);
  }
});

const ACTIONS: Record<string, (svc: OmnichannelService, id: string, req: Request) => Promise<Conversation>> = {
  'take-over': (svc, id, req) => svc.takeOver(id, actor(req)),
  'return-to-ai': (svc, id) => svc.returnToAi(id),
  resolve: (svc, id) => svc.resolve(id),
  read: (svc, id) => svc.markRead(id),
};

omnichannelRouter.post('/conversations/:id/:action', async (req, res) => {
  const action = ACTIONS[req.params.action];
  if (!action) return res.status(404).json({ success: false, error: 'Acción desconocida' });
  try {
    res.json({ success: true, conversation: await action(omnichannel(), req.params.id, req) });
  } catch (err) {
    fail(res, err);
  }
});

// ── Configuración (lectura: todos; cambios: administradores) ────

const ConfigSchema = z.object({
  aiMode: z.enum(['off', 'suggest', 'auto']),
  autoIntents: z.array(z.enum(['estado_pedido', 'cotizacion', 'saludo', 'otro'])).max(10),
  businessName: z.string().trim().min(1).max(120),
  businessHours: z.object({
    days: z.array(z.number().int().min(0).max(6)).max(7),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  knowledge: z.string().max(20000),
  forbidden: z.string().max(4000),
  escalationEmployeeIds: z.array(z.string().max(100)).max(50),
  notifications: z.object({
    enabled: z.boolean(),
    stages: z.array(z.enum(['POR_REVISAR', 'PRODUCCION_PROGRAMADA', 'EN_PRODUCCION', 'ACABADOS', 'FINALIZADO', 'ENTREGADO'])).max(6),
    templates: z.record(z.string(), z.string().trim().max(512).regex(/^[a-z0-9_]*$/, 'El nombre de plantilla solo admite minúsculas, números y _')),
    templateLanguage: z.string().trim().min(2).max(10),
    sendFrom: z.string().regex(/^\d{2}:\d{2}$/),
    sendUntil: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

omnichannelRouter.get('/config', async (_req, res) => {
  res.json({
    success: true,
    config: await loadOmnichannelConfig(),
    channels: {
      whatsapp: !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN),
      messenger: !!process.env.MESSENGER_PAGE_ACCESS_TOKEN,
      instagram: !!process.env.MESSENGER_PAGE_ACCESS_TOKEN,
      webhookSecret: !!process.env.META_APP_SECRET,
      ai: !!process.env.GEMINI_API_KEY,
    },
  });
});

omnichannelRouter.put('/config', async (req, res) => {
  if (!isAdminRole(String(req.headers['x-user-role'] || ''))) {
    return res.status(403).json({ success: false, error: 'Solo un administrador puede cambiar la configuración' });
  }
  const parsed = ConfigSchema.safeParse({
    ...DEFAULT_OMNICHANNEL_CONFIG,
    ...req.body,
    notifications: { ...DEFAULT_OMNICHANNEL_CONFIG.notifications, ...(req.body?.notifications ?? {}) },
  });
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
  try {
    const saved = await saveOmnichannelConfig(parsed.data as OmnichannelConfig);
    resetOmnichannelRuntime();
    res.json({ success: true, config: saved });
  } catch (err) {
    fail(res, err);
  }
});

// ── Salud de canales y costos ──────────────────────────────────

omnichannelRouter.get('/health', async (_req, res) => {
  try {
    const sender = createMetaSender();
    const configured: Record<string, boolean> = {
      whatsapp: sender.isConfigured('whatsapp'),
      messenger: sender.isConfigured('messenger'),
      instagram: sender.isConfigured('instagram'),
      webchat: true,
    };
    const [conversations, notices] = await Promise.all([omnichannel().list(), stageNotifier().list()]);
    const pendingNotices = notices.filter((n) => n.status === 'scheduled').length;
    const failedNotices = notices.filter((n) => n.status === 'failed').length;
    res.json({
      success: true,
      channels: computeChannelHealth(conversations, configured),
      checks: {
        ai: !!process.env.GEMINI_API_KEY,
        webhookSignature: !!process.env.META_APP_SECRET,
        webhookVerifyToken: !!(process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN),
        notices: { pending: pendingNotices, failed: failedNotices },
      },
    });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.get('/costs', async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month)) ? String(req.query.month) : new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 7);
    const [usage, notices, conversations] = await Promise.all([aiUsage().month(month), stageNotifier().list(), omnichannel().list()]);
    const prices = {
      ...aiPrices(),
      templateUsd: Number(process.env.WHATSAPP_TEMPLATE_PRICE_USD) || 0.0008,
      usdCop: Number(process.env.USD_COP) || 4000,
    };
    res.json({ success: true, prices, costs: computeMonthlyCosts({ month, usage, notices, conversations, prices }) });
  } catch (err) {
    fail(res, err);
  }
});

// ── Avisos de cambio de etapa ──────────────────────────────────

omnichannelRouter.get('/notifications', async (_req, res) => {
  try {
    res.json({ success: true, notices: await stageNotifier().list() });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.post('/notifications/:id/retry', async (req, res) => {
  try {
    const notice = await stageNotifier().retry(req.params.id);
    if (!notice) return res.status(404).json({ success: false, error: 'Aviso no encontrado' });
    res.json({ success: true, notice });
  } catch (err) {
    fail(res, err);
  }
});

// ── Simulador: datos y IA reales, sin enviar nada ni tocar la bandeja ──

const noSend: ChannelSender = {
  isConfigured: () => true,
  sendText: async () => ({ ok: true, externalId: null }),
  sendTemplate: async () => ({ ok: true, externalId: null }),
};
let simulatorRepo = createMemoryRepository<Conversation>();

const SimulateSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  /** Para probar la verificación por número: simula un WhatsApp desde este teléfono. */
  phone: z.string().trim().max(20).optional(),
  session: z.string().trim().min(1).max(60).default('sim'),
});

omnichannelRouter.post('/simulate', async (req, res) => {
  const parsed = SimulateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ success: false, error: 'Configura GEMINI_API_KEY para usar el simulador' });
  const { text, phone, session } = parsed.data;
  try {
    const config = await loadOmnichannelConfig();
    const svc = createOmnichannelService({
      conversations: simulatorRepo,
      // En el simulador la IA siempre responde, para ver qué diría
      loadConfig: async () => ({ ...config, aiMode: 'auto', autoIntents: [] }),
      sender: noSend,
      agentDeps: () => ({
        llm: createGeminiClient(undefined, { source: 'simulador' }),
        listClients: () => repositories().clients.list() as any,
        listProjects: () => repositories().projects.list(),
        listQuotes: () => repositories().quotes.list(),
        // No se crean enlaces ni precotizaciones reales desde el simulador
        createPortalLink: async () => '/portal/(enlace-de-prueba)',
        createPreQuote: async () => ({ number: 'PRE-SIMULADA' }),
        appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
        now: () => new Date(),
      }),
      publish: () => undefined,
      now: () => new Date(),
    });
    const conv = await svc.handleInbound({
      channel: phone ? 'whatsapp' : 'simulator',
      externalUserId: phone ? phone.replace(/\D/g, '') : session,
      contactName: 'Prueba',
      text,
    });
    res.json({ success: true, conversation: conv });
  } catch (err) {
    fail(res, err);
  }
});

omnichannelRouter.post('/simulate/reset', (_req, res) => {
  simulatorRepo = createMemoryRepository<Conversation>();
  res.json({ success: true });
});
