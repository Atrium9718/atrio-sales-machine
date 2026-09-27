import { randomUUID } from 'crypto';
import {
  appendMessage,
  canAutoSend,
  DEFAULT_OMNICHANNEL_CONFIG,
  type ChannelKind,
  type Conversation,
  type ConversationMessage,
  type ConversationMode,
  type OmnichannelConfig,
} from '../../packages/core/src/omnichannel';
import type { DocumentRepository } from '../repositories/types';
import type { ChannelSender } from './senders';
import { runAgentTurn, type AgentDeps } from './agents';

export interface InboundMessage {
  channel: ChannelKind;
  /** Teléfono (WhatsApp), PSID/IGSID (Meta) o sesión (web). */
  externalUserId: string;
  contactName?: string | null;
  text: string;
  /** Id del mensaje en el canal, para no procesarlo dos veces si Meta lo reenvía. */
  externalId?: string | null;
}

export interface Actor {
  id: string;
  name: string;
}

export interface OmnichannelDeps {
  conversations: DocumentRepository<Conversation>;
  loadConfig(): Promise<OmnichannelConfig>;
  sender: ChannelSender;
  /** null cuando la IA no está disponible (sin GEMINI_API_KEY): todo pasa a personas. */
  agentDeps(): AgentDeps | null;
  publish(conv: Conversation, preview: string): void;
  now(): Date;
}

/** Id estable por canal + usuario (sin "/" para Firestore). */
export const conversationId = (channel: ChannelKind, externalUserId: string) =>
  `${channel}_${externalUserId}`.replace(/[\/\s]/g, '_').slice(0, 300);

const modeFor = (config: OmnichannelConfig): ConversationMode =>
  config.aiMode === 'auto' ? 'auto' : config.aiMode === 'suggest' ? 'suggest' : 'human';

export function createOmnichannelService(deps: OmnichannelDeps) {
  // Una operación a la vez por conversación: mensajes seguidos no se pisan entre sí
  const queues = new Map<string, Promise<unknown>>();
  const serialized = <T>(id: string, fn: () => Promise<T>): Promise<T> => {
    const prev = queues.get(id) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(fn);
    queues.set(id, next);
    next.finally(() => {
      if (queues.get(id) === next) queues.delete(id);
    }).catch(() => undefined);
    return next;
  };

  const iso = () => deps.now().toISOString();

  const message = (fields: Partial<ConversationMessage> & Pick<ConversationMessage, 'direction' | 'author' | 'text' | 'status'>): ConversationMessage => ({
    id: randomUUID(),
    createdAt: iso(),
    externalId: null,
    agentName: null,
    aiAgent: null,
    error: null,
    ...fields,
  });

  const save = async (conv: Conversation, preview: string) => {
    conv.updatedAt = iso();
    await deps.conversations.upsert(conv);
    deps.publish(conv, preview);
    return conv;
  };

  /** Envía un texto por el canal y lo agrega a la conversación con el resultado. */
  const deliver = async (conv: Conversation, msg: ConversationMessage) => {
    const result = await deps.sender.sendText(conv.channel, conv.externalUserId, msg.text);
    msg.status = result.ok ? 'sent' : 'failed';
    msg.externalId = result.externalId ?? null;
    msg.error = result.ok ? null : result.error ?? 'Error de envío';
    if (!result.ok) {
      conv.needsHuman = true;
      conv.handoffReason = `No se pudo enviar la respuesta: ${msg.error}`;
    }
    conv.lastMessageAt = msg.createdAt;
    return msg;
  };

  const newConversation = (msg: InboundMessage, config: OmnichannelConfig): Conversation => {
    const now = iso();
    return {
      id: conversationId(msg.channel, msg.externalUserId),
      channel: msg.channel,
      externalUserId: msg.externalUserId,
      contactName: msg.contactName || 'Cliente',
      clientId: null,
      clientName: null,
      clientNit: null,
      verified: false,
      verifiedBy: null,
      mode: modeFor(config),
      needsHuman: false,
      awaitingApproval: false,
      handoffReason: null,
      assigneeId: null,
      assigneeName: null,
      status: 'open',
      lastIntent: null,
      lastInboundAt: null,
      lastMessageAt: now,
      unread: 0,
      portalPath: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  };

  async function mutate(id: string, fn: (conv: Conversation) => Promise<string | void> | string | void) {
    return serialized(id, async () => {
      const conv = await deps.conversations.get(id);
      if (!conv) throw Object.assign(new Error('Conversación no encontrada'), { status: 404 });
      const preview = (await fn(conv)) || conv.messages[conv.messages.length - 1]?.text || '';
      return save(conv, preview);
    });
  }

  return {
    /** Mensaje entrante de cualquier canal: guarda, decide quién atiende y responde si corresponde. */
    handleInbound(msg: InboundMessage): Promise<Conversation> {
      const text = msg.text.trim();
      const id = conversationId(msg.channel, msg.externalUserId);
      return serialized(id, async () => {
        const config = await deps.loadConfig();
        const conv = (await deps.conversations.get(id)) ?? newConversation(msg, config);

        if (msg.externalId && conv.messages.some((m) => m.externalId === msg.externalId)) return conv; // reintento de Meta
        if (!text) return conv;

        if (msg.contactName && (conv.contactName === 'Cliente' || !conv.contactName)) conv.contactName = msg.contactName;
        const inbound = message({ direction: 'in', author: 'customer', text, status: 'received', externalId: msg.externalId ?? null });
        conv.messages = appendMessage(conv.messages, inbound);
        conv.lastInboundAt = inbound.createdAt;
        conv.lastMessageAt = inbound.createdAt;
        conv.unread += 1;
        if (conv.status === 'resolved') {
          conv.status = 'open';
          if (conv.mode !== 'human') conv.mode = modeFor(config);
        }

        // Una persona lleva la conversación: la IA no interviene
        if (conv.mode === 'human') {
          conv.needsHuman = true;
          conv.handoffReason = conv.handoffReason || 'Conversación atendida por una persona';
          return save(conv, text);
        }

        const agentDeps = config.aiMode === 'off' ? null : deps.agentDeps();
        if (!agentDeps) {
          conv.needsHuman = true;
          conv.handoffReason = config.aiMode === 'off' ? 'La IA está apagada' : 'La IA no está configurada (GEMINI_API_KEY)';
          return save(conv, text);
        }

        const outcome = await runAgentTurn(conv, text, config, agentDeps);
        if (outcome.identity) Object.assign(conv, outcome.identity);
        conv.portalPath = outcome.portalPath ?? conv.portalPath;
        conv.lastIntent = outcome.intent;

        const reply = message({ direction: 'out', author: 'ai', text: outcome.reply, status: 'suggested', aiAgent: outcome.agent });

        if (outcome.handoff) {
          // Aviso al cliente de que lo atenderá una persona (se envía también en modo sugerencia)
          conv.mode = 'human';
          conv.needsHuman = true;
          conv.awaitingApproval = false;
          conv.handoffReason = outcome.handoff.reason;
          conv.messages = appendMessage(conv.messages, await deliver(conv, reply));
          return save(conv, text);
        }

        if (conv.mode === 'auto' && canAutoSend(config, outcome.intent)) {
          conv.messages = appendMessage(conv.messages, await deliver(conv, reply));
          conv.awaitingApproval = false;
          if (reply.status === 'sent') conv.unread = 0;
        } else {
          conv.messages = appendMessage(conv.messages, reply);
          conv.awaitingApproval = true;
        }
        return save(conv, text);
      });
    },

    /** Una persona aprueba (y opcionalmente corrige) la respuesta sugerida por la IA. */
    approveSuggestion(id: string, messageId: string, actor: Actor, editedText?: string) {
      return mutate(id, async (conv) => {
        const msg = conv.messages.find((m) => m.id === messageId && m.status === 'suggested');
        if (!msg) throw Object.assign(new Error('La sugerencia ya no está pendiente'), { status: 409 });
        if (editedText?.trim()) msg.text = editedText.trim();
        msg.agentName = actor.name;
        await deliver(conv, msg);
        conv.awaitingApproval = conv.messages.some((m) => m.status === 'suggested');
        conv.unread = 0;
      });
    },

    discardSuggestion(id: string, messageId: string, actor: Actor) {
      return mutate(id, (conv) => {
        const msg = conv.messages.find((m) => m.id === messageId && m.status === 'suggested');
        if (msg) {
          msg.status = 'discarded';
          msg.agentName = actor.name;
        }
        conv.awaitingApproval = conv.messages.some((m) => m.status === 'suggested');
      });
    },

    /** Respuesta escrita por una persona: toma el control de la conversación. */
    sendAgentMessage(id: string, text: string, actor: Actor) {
      return mutate(id, async (conv) => {
        for (const m of conv.messages) if (m.status === 'suggested') m.status = 'discarded';
        const msg = message({ direction: 'out', author: 'agent', text: text.trim(), status: 'sent', agentName: actor.name });
        await deliver(conv, msg);
        conv.messages = appendMessage(conv.messages, msg);
        conv.mode = 'human';
        conv.assigneeId = actor.id;
        conv.assigneeName = actor.name;
        conv.awaitingApproval = false;
        conv.unread = 0;
        if (msg.status === 'sent') {
          conv.needsHuman = false;
          conv.handoffReason = null;
        }
        return text;
      });
    },

    takeOver(id: string, actor: Actor) {
      return mutate(id, (conv) => {
        conv.mode = 'human';
        conv.assigneeId = actor.id;
        conv.assigneeName = actor.name;
      });
    },

    /** Devuelve la conversación a la IA (según el modo configurado). */
    returnToAi(id: string) {
      return mutate(id, async (conv) => {
        const config = await deps.loadConfig();
        conv.mode = modeFor(config);
        conv.needsHuman = false;
        conv.handoffReason = null;
        conv.assigneeId = null;
        conv.assigneeName = null;
      });
    },

    resolve(id: string) {
      return mutate(id, (conv) => {
        conv.status = 'resolved';
        conv.needsHuman = false;
        conv.awaitingApproval = false;
        conv.unread = 0;
        for (const m of conv.messages) if (m.status === 'suggested') m.status = 'discarded';
      });
    },

    markRead(id: string) {
      return mutate(id, (conv) => {
        conv.unread = 0;
      });
    },

    /** Confirmaciones de entrega/lectura que envía Meta. */
    async updateDeliveryStatus(externalMessageId: string, status: 'delivered' | 'read' | 'failed', error?: string) {
      const all = await deps.conversations.list();
      const conv = all.find((c) => c.messages?.some((m) => m.externalId === externalMessageId));
      if (!conv) return null;
      return mutate(conv.id, (c) => {
        const m = c.messages.find((x) => x.externalId === externalMessageId);
        if (!m) return;
        const rank = { sent: 1, delivered: 2, read: 3 } as Record<string, number>;
        if (status === 'failed') {
          m.status = 'failed';
          m.error = error || 'Meta no pudo entregar el mensaje';
          c.needsHuman = true;
          c.handoffReason = `Mensaje no entregado: ${m.error}`;
        } else if ((rank[status] ?? 0) > (rank[m.status] ?? 0)) {
          m.status = status;
        }
        return '';
      });
    },

    async list(): Promise<Conversation[]> {
      const all = await deps.conversations.list();
      return all.sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
    },

    get(id: string) {
      return deps.conversations.get(id);
    },
  };
}

export type OmnichannelService = ReturnType<typeof createOmnichannelService>;

export { DEFAULT_OMNICHANNEL_CONFIG };
