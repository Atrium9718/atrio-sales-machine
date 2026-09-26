/**
 * Tipos y Modelos de Dominio para Chat Interno y Tiempo Real (Etapa 15.5)
 */

export type ChatChannelType = 'PUBLIC' | 'PRIVATE' | 'DIRECT' | 'GROUP' | 'ENTITY';

export type ChatEntityType = 
  | 'CLIENT'
  | 'OPPORTUNITY'
  | 'QUOTE'
  | 'PRODUCTION_PROJECT'
  | 'PRINT_ORDER'
  | 'VEA_MEETING';

export type ChatMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type ChatNotificationLevel = 'ALL' | 'MENTIONS' | 'NONE';

export type ChatMessageType = 
  | 'TEXT'
  | 'FILE'
  | 'IMAGE'
  | 'SYSTEM'
  | 'CALL_SUMMARY'
  | 'ENTITY_LINK';

export type PresenceStatus = 
  | 'ONLINE'
  | 'AWAY'
  | 'BUSY'
  | 'IN_CALL'
  | 'DO_NOT_DISTURB'
  | 'OFFLINE';

export type PresenceDevice = 'WEB' | 'MOBILE' | 'KIOSK';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  storageKey?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  users: string[]; // userIds
  userReacted?: boolean;
}

export interface ChatMember {
  id: string;
  channelId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  role: ChatMemberRole;
  joinedAt: string;
  leftAt?: string | null;
  isMuted: boolean;
  mutedUntil?: string | null;
  notificationLevel: ChatNotificationLevel;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  unreadCount: number;
  unreadMentionCount: number;
}

export interface ChatChannel {
  id: string;
  organizationId: string;
  type: ChatChannelType;
  key?: string | null; // e.g. "general", "comercial", "produccion", "anuncios"
  name: string;
  topic?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  entityType?: ChatEntityType | null;
  entityId?: string | null;
  directKey?: string | null; // e.g. "dm:usr-admin:usr-comercial" (sorted user IDs)
  isArchived: boolean;
  isReadOnly: boolean;
  lastMessageAt?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  members?: ChatMember[];
  memberCount?: number;
  unreadCount?: number;
  unreadMentionCount?: number;
  lastMessage?: ChatMessage | null;
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  channelId: string;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string | null;
  type: ChatMessageType;
  body: string; // Markdown con formato limitado
  bodyPlain: string; // Texto plano sin marcas para indexación y búsqueda full-text
  parentMessageId?: string | null;
  threadReplyCount: number;
  threadLastReplyAt?: string | null;
  attachments: ChatAttachment[];
  mentionedUserIds: string[];
  mentionsEveryone: boolean;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  callSessionId?: string | null;
  editedAt?: string | null;
  deletedById?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
  updatedAt: string;
  reactions?: ChatReactionSummary[];
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedById?: string | null;
  isSending?: boolean; // Optimistic UI
  hasError?: boolean;
}

export interface ChatPin {
  id: string;
  channelId: string;
  messageId: string;
  pinnedById: string;
  pinnedByName?: string;
  pinnedAt: string;
  message?: ChatMessage;
}

export interface SavedReply {
  id: string;
  organizationId: string;
  userId?: string | null;
  shortcut: string; // e.g. "/cotiza", "/gracias"
  title: string;
  body: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  organizationId: string;
  status: PresenceStatus;
  customStatusEmoji?: string | null;
  customStatusText?: string | null;
  customStatusExpiresAt?: string | null;
  lastActiveAt: string;
  currentDevice: PresenceDevice;
  activeCallSessionId?: string | null;
  updatedAt: string;
  isWorkingHours?: boolean;
}

export interface TypingState {
  channelId: string;
  userId: string;
  userName: string;
  startedAt: number;
  expiresAt: number;
}

export interface EntityCardPreview {
  type: 'CLIENT' | 'QUOTE' | 'PRODUCTION_PROJECT' | 'OPPORTUNITY';
  id: string;
  code: string;
  title: string;
  subtitle: string;
  statusBadge: {
    label: string;
    variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
  };
  metrics?: { label: string; value: string }[];
  linkUrl: string;
  canView: boolean;
}

/**
 * Evento del canal unificado Server-Sent Events (SSE)
 */
export interface RealtimeEvent {
  id: string; // Id monótono creciente (e.g. "1", "2", "3"...)
  timestamp: string;
  type: 
    | 'chat:message'
    | 'chat:message_updated'
    | 'chat:message_deleted'
    | 'chat:reaction'
    | 'chat:pin'
    | 'chat:typing'
    | 'chat:channel_created'
    | 'chat:channel_archived'
    | 'presence:update'
    | 'announcement:new'
    | 'notification:new'
    | 'kanban:card_moved'
    | 'commercial:deviation'
    | 'call:incoming'
    | 'call:started'
    | 'call:answered'
    | 'call:ended'
    | 'call:missed'
    | 'call:rejected'
    | 'ping';
  organizationId: string;
  channelId?: string;
  targetUserIds?: string[];
  skipUserIds?: string[];
  payload: any;
}
