import type { Conversation, ConversationMessage, OmnichannelConfig } from '../../../../../../../../packages/core/src/omnichannel';

export type { Conversation, ConversationMessage, OmnichannelConfig };

export interface ConversationSummary {
  id: string;
  channel: Conversation['channel'];
  contactName: string;
  clientName: string | null;
  verified: boolean;
  mode: Conversation['mode'];
  needsHuman: boolean;
  awaitingApproval: boolean;
  handoffReason: string | null;
  assigneeName: string | null;
  status: Conversation['status'];
  lastIntent: string | null;
  unread: number;
  lastMessageAt: string;
  lastMessage: { text: string; author: string; status: string } | null;
}

export interface InboxStats {
  conversations: number;
  needsHuman: number;
  awaitingApproval: number;
  aiResolvedPercent: number | null;
  aiMessagesSent: number;
  humanMessagesSent: number;
  failedMessages: number;
}

export interface StageNotice {
  id: string;
  projectId: string;
  orderNumber: string;
  stageKey: string;
  stageLabel: string;
  clientName: string;
  phone: string | null;
  status: 'scheduled' | 'sent' | 'failed' | 'skipped';
  reason: string | null;
  mode: 'text' | 'template' | null;
  attempts: number;
  dueAt: string;
  sentAt: string | null;
  createdAt: string;
}

export interface ChannelStatus {
  whatsapp: boolean;
  messenger: boolean;
  instagram: boolean;
  webhookSecret: boolean;
  ai: boolean;
}

export interface AiCorrection {
  id: string;
  at: string;
  agent: string | null;
  question: string;
  aiText: string;
  finalText: string | null;
  kind: 'editada' | 'descartada' | 'reemplazada';
  by: string;
  active: boolean;
}

export interface EvalResult {
  id: string;
  title: string;
  passed: boolean;
  failures: string[];
  reply: string;
  handoff: boolean;
  verified: boolean;
  tools: string[];
  ms: number;
}

export interface EvalRun {
  id: string;
  at: string;
  passed: number;
  total: number;
  results: EvalResult[];
}

export interface BudgetStatus {
  month: string;
  budgetCop: number | null;
  spentCop: number;
  percent: number | null;
  level: 'none' | 'ok' | 'warning' | 'exceeded';
  aiPaused: boolean;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/omnichannel${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

export const inboxApi = {
  list: (filter: string) => request<{ conversations: ConversationSummary[] }>('GET', `/conversations?filter=${filter}`).then((d) => d.conversations),
  get: (id: string) => request<{ conversation: Conversation }>('GET', `/conversations/${encodeURIComponent(id)}`).then((d) => d.conversation),
  stats: () => request<{ stats: InboxStats }>('GET', '/stats').then((d) => d.stats),
  reply: (id: string, text: string) => request<{ conversation: Conversation }>('POST', `/conversations/${encodeURIComponent(id)}/reply`, { text }).then((d) => d.conversation),
  approve: (id: string, messageId: string, text?: string) =>
    request<{ conversation: Conversation }>('POST', `/conversations/${encodeURIComponent(id)}/suggestions/${messageId}/approve`, { text }).then((d) => d.conversation),
  discard: (id: string, messageId: string) =>
    request<{ conversation: Conversation }>('POST', `/conversations/${encodeURIComponent(id)}/suggestions/${messageId}/discard`, {}).then((d) => d.conversation),
  action: (id: string, action: 'take-over' | 'return-to-ai' | 'resolve' | 'read') =>
    request<{ conversation: Conversation }>('POST', `/conversations/${encodeURIComponent(id)}/${action}`, {}).then((d) => d.conversation),
  config: () => request<{ config: OmnichannelConfig; channels: ChannelStatus }>('GET', '/config'),
  saveConfig: (config: OmnichannelConfig) => request<{ config: OmnichannelConfig }>('PUT', '/config', config).then((d) => d.config),
  simulate: (text: string, session: string, phone?: string) =>
    request<{ conversation: Conversation }>('POST', '/simulate', { text, session, phone: phone || undefined }).then((d) => d.conversation),
  resetSimulator: () => request('POST', '/simulate/reset', {}),
  notices: () => request<{ notices: StageNotice[] }>('GET', '/notifications').then((d) => d.notices),
  corrections: () => request<{ corrections: AiCorrection[] }>('GET', '/corrections').then((d) => d.corrections),
  setCorrectionActive: (id: string, active: boolean) => request('PATCH', `/corrections/${encodeURIComponent(id)}`, { active }),
  deleteCorrection: (id: string) => request('DELETE', `/corrections/${encodeURIComponent(id)}`),
  evals: () => request<{ runs: EvalRun[] }>('GET', '/evals').then((d) => d.runs),
  runEvals: () => request<{ run: EvalRun }>('POST', '/evals', {}).then((d) => d.run),
  budget: () => request<{ budget: BudgetStatus }>('GET', '/budget').then((d) => d.budget),
  retryNotice: (id: string) => request<{ notice: StageNotice }>('POST', `/notifications/${encodeURIComponent(id)}/retry`, {}).then((d) => d.notice),
};

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  instagram: 'Instagram',
  webchat: 'Chat web',
  simulator: 'Simulador',
};

export const INTENT_LABEL: Record<string, string> = {
  estado_pedido: 'Estado de pedido',
  cotizacion: 'Cotización',
  saludo: 'Saludo',
  queja: 'Queja',
  pago: 'Pagos',
  humano: 'Pidió una persona',
  otro: 'Otra consulta',
};

export const MODE_LABEL: Record<string, string> = {
  auto: 'IA automática',
  suggest: 'IA sugiere',
  human: 'Atiende una persona',
};

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
