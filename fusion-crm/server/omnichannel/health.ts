import type { ChannelKind, Conversation } from '../../packages/core/src/omnichannel';
import type { StageNotice } from './notifications';
import { tokensCostUsd, type DailyUsage } from './usage';

export const LIVE_CHANNELS: Exclude<ChannelKind, 'simulator'>[] = ['whatsapp', 'messenger', 'instagram', 'webchat'];

export type HealthLevel = 'ok' | 'warning' | 'error' | 'off';

export interface ChannelHealth {
  channel: string;
  configured: boolean;
  level: HealthLevel;
  summary: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  inbound7d: number;
  outbound7d: number;
  failed7d: number;
  deliveredRate: number | null;
  lastError: string | null;
}

/**
 * Estado de cada canal a partir de lo que realmente pasó en las conversaciones: si llegan
 * mensajes, si los envíos fallan y cuánto se entrega.
 */
export function computeChannelHealth(conversations: Conversation[], configured: Record<string, boolean>, now = new Date()): ChannelHealth[] {
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  return LIVE_CHANNELS.map((channel) => {
    const msgs = conversations.filter((c) => c.channel === channel).flatMap((c) => c.messages);
    const inbound = msgs.filter((m) => m.direction === 'in');
    const outbound = msgs.filter((m) => m.direction === 'out' && ['sent', 'delivered', 'read', 'failed'].includes(m.status));
    const recentOut = outbound.filter((m) => m.createdAt >= weekAgo);
    const failed = recentOut.filter((m) => m.status === 'failed');
    const delivered = recentOut.filter((m) => m.status === 'delivered' || m.status === 'read');
    const last = (list: typeof msgs) => list.reduce<string | null>((acc, m) => (!acc || m.createdAt > acc ? m.createdAt : acc), null);
    const lastFailed = failed.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    // Web no reporta entrega: solo cuenta envío
    const deliveredRate = channel === 'webchat' || recentOut.length === 0 ? null : delivered.length / recentOut.length;
    const isConfigured = !!configured[channel];

    let level: HealthLevel = 'ok';
    let summary = 'Funcionando';
    if (!isConfigured) {
      level = 'off';
      summary = 'Sin conectar';
    } else if (recentOut.length >= 3 && failed.length / recentOut.length > 0.2) {
      level = 'error';
      summary = `${failed.length} de ${recentOut.length} envíos fallaron esta semana`;
    } else if (failed.length > 0) {
      level = 'warning';
      summary = `${failed.length} envío(s) fallido(s) esta semana`;
    } else if (!last(inbound)) {
      level = 'warning';
      summary = 'Conectado, aún sin mensajes recibidos';
    }

    return {
      channel,
      configured: isConfigured,
      level,
      summary,
      lastInboundAt: last(inbound),
      lastOutboundAt: last(outbound),
      inbound7d: inbound.filter((m) => m.createdAt >= weekAgo).length,
      outbound7d: recentOut.length,
      failed7d: failed.length,
      deliveredRate,
      lastError: lastFailed?.error ?? null,
    };
  });
}

/** Costos del mes: IA (tokens) y plantillas de WhatsApp (avisos fuera de la ventana de 24 h). */
export function computeMonthlyCosts(input: { month: string; usage: DailyUsage[]; notices: StageNotice[]; conversations: Conversation[]; prices: { inputPerM: number; outputPerM: number; templateUsd: number; usdCop: number } }) {
  const { month, usage, notices, conversations, prices } = input;
  const inMonth = (iso?: string | null) => !!iso && iso.slice(0, 7) === month;
  const promptTokens = usage.reduce((s, d) => s + d.promptTokens, 0);
  const outputTokens = usage.reduce((s, d) => s + d.outputTokens, 0);
  const aiUsd = tokensCostUsd(promptTokens, outputTokens, prices);
  const templates = notices.filter((n) => n.status === 'sent' && n.mode === 'template' && inMonth(n.sentAt ?? n.updatedAt));
  const templateUsd = templates.length * prices.templateUsd;

  const bySource = new Map<string, { calls: number; usd: number }>();
  for (const d of usage) {
    for (const [src, v] of Object.entries(d.bySource ?? {})) {
      const cur = bySource.get(src) ?? { calls: 0, usd: 0 };
      bySource.set(src, { calls: cur.calls + v.calls, usd: cur.usd + tokensCostUsd(v.promptTokens, v.outputTokens, prices) });
    }
  }

  const aiMessages = conversations.flatMap((c) => c.messages).filter((m) => m.author === 'ai' && ['sent', 'delivered', 'read'].includes(m.status) && inMonth(m.createdAt)).length;
  const totalUsd = aiUsd + templateUsd;
  return {
    month,
    ai: { calls: usage.reduce((s, d) => s + d.calls, 0), promptTokens, outputTokens, usd: aiUsd, bySource: [...bySource.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.usd - a.usd) },
    whatsappTemplates: { count: templates.length, usd: templateUsd },
    totalUsd,
    totalCop: totalUsd * prices.usdCop,
    aiMessages,
    costPerAiMessageCop: aiMessages ? (aiUsd * prices.usdCop) / aiMessages : null,
    daily: usage.map((d) => ({ day: d.id, usd: tokensCostUsd(d.promptTokens, d.outputTokens, prices), calls: d.calls })),
  };
}
