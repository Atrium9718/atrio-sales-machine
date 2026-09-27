import { DEFAULT_OMNICHANNEL_CONFIG, type Conversation, type OmnichannelConfig } from '../../packages/core/src/omnichannel';
import { documentRepository } from '../repositories/documentStore';
import { repositories } from '../repositories';
import { eventBus } from '../events/DomainEventBus';
import { createPortalLinkForAssistant } from '../routes/clientPortal';
import { generatePreQuoteInternal } from '../routes/quotes';
import { createMetaSender } from './senders';
import { createGeminiClient } from './llm';
import { createOmnichannelService, type OmnichannelService } from './service';
import type { AgentDeps } from './agents';

export const CONVERSATIONS_COLLECTION = 'omni_conversations';
const SETTINGS_COLLECTION = 'omnichannel_settings';
const CONFIG_ID = 'config';

/** Lecturas repetidas en poco tiempo (varios mensajes seguidos) reutilizan el resultado. */
function cached<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let value: { at: number; data: Promise<T> } | null = null;
  return () => {
    if (!value || Date.now() - value.at > ttlMs) {
      const data = load();
      value = { at: Date.now(), data };
      data.catch(() => (value = null));
    }
    return value.data;
  };
}

export async function loadOmnichannelConfig(): Promise<OmnichannelConfig> {
  try {
    const stored = await documentRepository(SETTINGS_COLLECTION).get(CONFIG_ID);
    const { id: _id, ...rest } = (stored ?? {}) as Record<string, unknown>;
    return { ...DEFAULT_OMNICHANNEL_CONFIG, ...(rest as Partial<OmnichannelConfig>) };
  } catch {
    return DEFAULT_OMNICHANNEL_CONFIG;
  }
}

export async function saveOmnichannelConfig(config: OmnichannelConfig): Promise<OmnichannelConfig> {
  await documentRepository(SETTINGS_COLLECTION).upsert({ id: CONFIG_ID, ...config });
  return config;
}

let service: OmnichannelService | null = null;
let agentDeps: AgentDeps | null | undefined;

function buildAgentDeps(): AgentDeps | null {
  if (!process.env.GEMINI_API_KEY) return null;
  const listClients = cached(30_000, () => repositories().clients.list());
  const listProjects = cached(30_000, () => repositories().projects.list());
  const listQuotes = cached(30_000, () => repositories().quotes.list());
  return {
    llm: createGeminiClient(),
    listClients: listClients as AgentDeps['listClients'],
    listProjects,
    listQuotes,
    createPortalLink: createPortalLinkForAssistant,
    async createPreQuote({ conversation, customer, channel }) {
      const result = await generatePreQuoteInternal({ conversation, customer, channel });
      return { number: result.preQuote.number };
    },
    appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
    now: () => new Date(),
  };
}

/** Servicio omnicanal del proceso (datos reales, Meta y Gemini). */
export function omnichannel(): OmnichannelService {
  if (!service) {
    service = createOmnichannelService({
      conversations: documentRepository<Conversation>(CONVERSATIONS_COLLECTION),
      loadConfig: cached(15_000, loadOmnichannelConfig),
      sender: createMetaSender(),
      agentDeps: () => {
        if (agentDeps === undefined) agentDeps = buildAgentDeps();
        return agentDeps;
      },
      publish: (conv, preview) =>
        eventBus.publish('OMNICHANNEL_CONVERSATION_UPDATED', {
          conversationId: conv.id,
          channel: conv.channel,
          contactName: conv.contactName,
          needsHuman: conv.needsHuman,
          awaitingApproval: conv.awaitingApproval,
          handoffReason: conv.handoffReason,
          preview: preview.slice(0, 140),
        }),
      now: () => new Date(),
    });
  }
  return service;
}

/** Tras cambiar la configuración, el próximo mensaje la lee de nuevo. */
export function resetOmnichannelRuntime() {
  service = null;
  agentDeps = undefined;
}
