/** Canales por los que escriben los clientes. `simulator` es para probar sin gastar mensajes. */
export type ChannelKind = 'whatsapp' | 'messenger' | 'instagram' | 'webchat' | 'simulator';

/** Quién atiende la conversación: la IA sola, la IA sugiere y una persona aprueba, o solo personas. */
export type ConversationMode = 'auto' | 'suggest' | 'human';

export type MessageAuthor = 'customer' | 'ai' | 'agent' | 'system';

/**
 * - `received`: mensaje del cliente.
 * - `sent` / `delivered` / `read`: salida confirmada por el canal.
 * - `failed`: el canal rechazó el envío (ver `error`).
 * - `suggested`: respuesta de la IA pendiente de aprobación (modo sugerencia).
 * - `discarded`: sugerencia descartada por una persona.
 */
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed' | 'suggested' | 'discarded';

export interface ConversationMessage {
  id: string;
  direction: 'in' | 'out';
  author: MessageAuthor;
  text: string;
  status: MessageStatus;
  createdAt: string;
  /** Id del mensaje en el canal (wamid de WhatsApp, mid de Messenger…). */
  externalId?: string | null;
  /** Nombre de la persona del equipo que escribió o aprobó. */
  agentName?: string | null;
  /** Agente IA que produjo la respuesta. */
  aiAgent?: AgentKey | null;
  error?: string | null;
}

export type AgentKey = 'recepcionista' | 'servicio' | 'comercial';

export type Intent = 'estado_pedido' | 'cotizacion' | 'saludo' | 'queja' | 'pago' | 'humano' | 'otro';

export interface Conversation {
  id: string;
  channel: ChannelKind;
  /** Teléfono (WhatsApp), PSID (Messenger), IGSID (Instagram) o sesión (web). */
  externalUserId: string;
  contactName: string;
  /** Cliente identificado; solo con verificación la IA comparte datos de sus pedidos. */
  clientId: string | null;
  clientName: string | null;
  clientNit: string | null;
  verified: boolean;
  /** Cómo se identificó: número registrado, NIT o número de pedido. */
  verifiedBy: 'phone' | 'nit' | 'order' | null;
  mode: ConversationMode;
  needsHuman: boolean;
  /** Hay una respuesta de la IA esperando aprobación (modo sugerencia). */
  awaitingApproval: boolean;
  handoffReason: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  status: 'open' | 'resolved';
  lastIntent: Intent | null;
  lastInboundAt: string | null;
  lastMessageAt: string;
  unread: number;
  /** Ruta del portal de avance generada para este cliente (se reutiliza). */
  portalPath: string | null;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Cliente mínimo que usa el módulo (viene del repositorio de clientes). */
export interface ClientRecord {
  id: string;
  name?: string;
  company?: string;
  nit?: string;
  [key: string]: unknown;
}
