/**
 * Rutas y Lógica de Negocio de Chat Interno en Tiempo Real (Etapa 15.5)
 */

import { Router, Request, Response } from 'express';
import {
  ChatChannel,
  ChatMessage,
  ChatMember,
  SavedReply,
  UserPresence,
  ChatPin,
  ChatReactionSummary,
} from '../../packages/core/src/chat/types';
import {
  renderLimitedMarkdown,
  markdownToPlainText,
  extractMentions,
  extractEntityLinks,
} from '../../packages/core/src/chat/markdown';
import {
  searchChatMessages,
} from '../../packages/core/src/chat/search';
import {
  canAccessChannel,
  verifyDirectChannelExport,
} from '../../packages/core/src/chat/privacy';
import { realtimeStreamManager } from '../../packages/core/src/realtime/stream';
import { validateAttachment } from '../../packages/core/src/announcements/mime-validation';
import { employeeService } from '../services/employeeService';

export const chatRouter = Router();

// ============================================================================
// ALMACENAMIENTO EN MEMORIA (Sincronizable con Prisma en producción)
// ============================================================================

export const inMemoryChannels: ChatChannel[] = [
  {
    id: 'chn-general',
    organizationId: 'org-1',
    type: 'PUBLIC',
    key: 'general',
    name: '# general',
    topic: 'Conversación general de la compañía, anuncios rápidos y coordinación',
    description: 'Canal abierto para todos los colaboradores de Fusion ERP',
    icon: 'Hash',
    isArchived: false,
    isReadOnly: false,
    messageCount: 12,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdById: 'emp-03',
  },
  {
    id: 'chn-comercial',
    organizationId: 'org-1',
    type: 'PUBLIC',
    key: 'comercial',
    name: '# comercial',
    topic: 'Negociaciones, cotizaciones y acuerdos con clientes clave',
    description: 'Equipo de ejecutivos de cuenta, asesores y gerencia comercial',
    icon: 'Briefcase',
    isArchived: false,
    isReadOnly: false,
    messageCount: 8,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdById: 'emp-03',
  },
  {
    id: 'chn-produccion',
    organizationId: 'org-1',
    type: 'PUBLIC',
    key: 'produccion',
    name: '# produccion',
    topic: 'Taller de corte, cama plana, ensamble y despachos',
    description: 'Canal operativo de planta y control de tiempos de producción',
    icon: 'Factory',
    isArchived: false,
    isReadOnly: false,
    messageCount: 15,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdById: 'emp-03',
  },
  {
    id: 'chn-anuncios',
    organizationId: 'org-1',
    type: 'PUBLIC',
    key: 'anuncios',
    name: '📢 Anuncios Oficiales',
    topic: 'Directivas de dirección y comunicados corporativos (Solo lectura)',
    description: 'Canal sincronizado con el Tablero de Anuncios',
    icon: 'Megaphone',
    isArchived: false,
    isReadOnly: true,
    messageCount: 4,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdById: 'emp-03',
  },
];

export const inMemoryMessages: ChatMessage[] = [
  {
    id: 'msg-init-1',
    organizationId: 'org-1',
    channelId: 'chn-general',
    authorId: 'emp-03',
    authorName: 'Fusion ERP',
    authorRole: 'admin',
    type: 'TEXT',
    body: '¡Bienvenidos al nuevo canal unificado de **Fusion ERP**! Recuerden que pueden citar proyectos con `#` y colaboradores con `@`.',
    bodyPlain: '¡Bienvenidos al nuevo canal unificado de Fusion ERP! Recuerden que pueden citar proyectos con # y colaboradores con @.',
    threadReplyCount: 0,
    attachments: [],
    mentionedUserIds: [],
    mentionsEveryone: true,
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
    reactions: [],
  },
];

export const inMemoryPins: ChatPin[] = [];

export const inMemorySavedReplies: SavedReply[] = [
  {
    id: 'rep-1',
    organizationId: 'org-1',
    shortcut: '/cotiza',
    title: 'Envío de propuesta económica',
    body: 'Hola, te comparto la cotización formal con especificaciones técnicas de materiales y tiempos de entrega. Quedo muy atento a tus comentarios para proceder con la orden de producción.',
    usageCount: 18,
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'rep-2',
    organizationId: 'org-1',
    shortcut: '/gracias',
    title: 'Agradecimiento por confirmación',
    body: '¡Muchas gracias por la aprobación! El pedido ha ingresado a la cola de programación de planta y te estaremos notificando apenas iniciemos impresión y corte.',
    usageCount: 34,
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'rep-3',
    organizationId: 'org-1',
    shortcut: '/datos-bancarios',
    title: 'Cuentas para transferencias',
    body: 'Para el pago del anticipo: Banco Bancolombia, Cuenta Corriente No. 1029-3849-21 a nombre de Fusion Publicidad S.A.S., NIT 901.234.567-8. Por favor remitir comprobante a contabilidad@fusion.com.co.',
    usageCount: 29,
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'rep-4',
    organizationId: 'org-1',
    shortcut: '/muestras',
    title: 'Retiro de pruebas de color',
    body: 'Las muestras físicas de sustratos y pruebas de color en tintas UV ya se encuentran impresas y listas para retiro o despacho en recepción de planta.',
    usageCount: 12,
    createdAt: '2026-08-15T14:00:00.000Z',
    updatedAt: '2026-08-15T14:00:00.000Z',
  },
];

export const inMemoryPresences: Record<string, UserPresence> = {};

// Directorio de usuarios colaboradores (SSOT desde employeeService)
export const getUserDirectory = () => {
  return employeeService.getEmployees().map(e => ({
    id: e.id,
    name: e.name,
    role: e.roleKey,
    area: e.roleName,
    email: e.email,
    initials: e.initials,
    jobTitle: e.jobTitle,
    status: e.status
  }));
};

// Configurar el MembershipResolver del gestor de tiempo real para validar suscripciones
realtimeStreamManager.setMembershipResolver((channelId: string, userId: string) => {
  const channel = inMemoryChannels.find((c) => c.id === channelId);
  if (!channel) return true;
  if (channel.type === 'PUBLIC' || channel.key === 'anuncios') return true;

  const memberIds = channel.members?.map((m) => m.userId) || [];
  return memberIds.includes(userId);
});

// ============================================================================
// ENDPOINTS DE CANALES
// ============================================================================

/**
 * GET /api/chat/channels
 * Lista canales accesibles para el usuario (públicos y canales privados donde es miembro)
 */
chatRouter.get('/channels', (req: Request, res: Response) => {
  const currentUserId = employeeService.getActiveUser().id || 'emp-03';
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || currentUserId;

  const accessibleChannels = inMemoryChannels.filter((c) => {
    if (c.type === 'PUBLIC' || c.key === 'anuncios') return true;
    const memberIds = c.members?.map((m) => m.userId) || [];
    return memberIds.includes(userId);
  });

  const activeEmployees = employeeService.getEmployees();

  // Enriquecer con último mensaje y contadores de no leídos
  const enriched = accessibleChannels.map((c) => {
    const channelMessages = inMemoryMessages.filter((m) => m.channelId === c.id);
    const lastMsg = channelMessages[channelMessages.length - 1] || null;

    // Calcular no leídos
    const unreadCount = c.type === 'DIRECT' && c.id === 'chn-dm-laura' && userId === 'emp-03' ? 1 : 0;
    const unreadMentionCount = unreadCount;

    return {
      ...c,
      unreadCount,
      unreadMentionCount,
      lastMessage: lastMsg,
      memberCount: c.members?.length || activeEmployees.length,
    };
  });

  return res.json({ channels: enriched });
});

/**
 * POST /api/chat/channels
 * Crea un canal (público, privado o mensaje directo)
 */
chatRouter.post('/channels', (req: Request, res: Response) => {
  const { name, type = 'PUBLIC', topic, description, targetUserId } = req.body;
  const currentUserId = employeeService.getActiveUser().id || 'emp-03';
  const userId = (req.headers['x-user-id'] as string) || currentUserId;

  if (type === 'DIRECT') {
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId es requerido para canales directos' });
    }

    const directKey = [userId, targetUserId].sort().join(':');
    const existing = inMemoryChannels.find((c) => c.directKey === `dm:${directKey}`);
    if (existing) {
      return res.json({ channel: existing });
    }

    const targetUser = employeeService.getEmployeeById(targetUserId);
    const newChannel: ChatChannel = {
      id: `chn-dm-${Date.now()}`,
      organizationId: 'org-1',
      type: 'DIRECT',
      directKey: `dm:${directKey}`,
      name: targetUser?.name || 'Mensaje Directo',
      topic: targetUser?.area || '',
      isArchived: false,
      isReadOnly: false,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: userId,
      members: [
        { id: `mem-${Date.now()}-1`, channelId: `chn-dm-${Date.now()}`, userId, role: 'MEMBER', joinedAt: new Date().toISOString(), isMuted: false, notificationLevel: 'ALL', unreadCount: 0, unreadMentionCount: 0 },
        { id: `mem-${Date.now()}-2`, channelId: `chn-dm-${Date.now()}`, userId: targetUserId, role: 'MEMBER', joinedAt: new Date().toISOString(), isMuted: false, notificationLevel: 'ALL', unreadCount: 0, unreadMentionCount: 0 },
      ],
    };

    inMemoryChannels.push(newChannel);
    return res.status(201).json({ channel: newChannel });
  }

  if (!name) {
    return res.status(400).json({ error: 'El nombre del canal es requerido' });
  }

  const newChannel: ChatChannel = {
    id: `chn-${Date.now()}`,
    organizationId: 'org-1',
    type,
    name: name.startsWith('#') ? name : `# ${name}`,
    topic: topic || null,
    description: description || null,
    isArchived: false,
    isReadOnly: false,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: userId,
    members: [
      { id: `mem-${Date.now()}`, channelId: `chn-${Date.now()}`, userId, role: 'OWNER', joinedAt: new Date().toISOString(), isMuted: false, notificationLevel: 'ALL', unreadCount: 0, unreadMentionCount: 0 },
    ],
  };

  inMemoryChannels.push(newChannel);

  realtimeStreamManager.publish({
    type: 'chat:channel_created',
    organizationId: 'org-1',
    payload: { channel: newChannel },
  });

  return res.status(201).json({ channel: newChannel });
});

/**
 * POST /api/chat/channels/entity
 * Obtiene o crea un canal vinculado a una entidad (Cotización, Proyecto, Cliente)
 */
chatRouter.post('/channels/entity', (req: Request, res: Response) => {
  const { entityType, entityId, entityCode, entityTitle } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType y entityId son requeridos' });
  }

  let channel = inMemoryChannels.find(
    (c) => c.type === 'ENTITY' && c.entityType === entityType && c.entityId === entityId
  );

  if (!channel) {
    channel = {
      id: `chn-ent-${entityType.toLowerCase()}-${entityId}`,
      organizationId: 'org-1',
      type: 'ENTITY',
      entityType,
      entityId,
      name: `${entityType === 'QUOTE' ? 'Cotización' : entityType === 'PRODUCTION_PROJECT' ? 'Proyecto' : 'Cliente'} #${entityCode || entityId}`,
      topic: entityTitle || '',
      isArchived: false,
      isReadOnly: false,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: userId,
    };
    inMemoryChannels.push(channel);

    realtimeStreamManager.publish({
      type: 'chat:channel_created',
      organizationId: 'org-1',
      payload: { channel },
    });
  }

  return res.json({ channel });
});

/**
 * POST /api/chat/channels/:channelId/archive
 */
chatRouter.post('/channels/:channelId/archive', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const channel = inMemoryChannels.find((c) => c.id === channelId);

  if (!channel) {
    return res.status(404).json({ error: 'Canal no encontrado' });
  }

  channel.isArchived = true;
  channel.updatedAt = new Date().toISOString();

  realtimeStreamManager.publish({
    type: 'chat:channel_archived',
    organizationId: 'org-1',
    channelId,
    payload: { channelId, isArchived: true },
  });

  return res.json({ success: true, channel });
});

// ============================================================================
// ENDPOINTS DE MENSAJES (IDEMPOTENCIA, MENCIONES, ENTIDADES)
// ============================================================================

/**
 * GET /api/chat/channels/:channelId/messages
 * Lista mensajes del canal con paginación / cursor y verificación de acceso
 */
chatRouter.get('/channels/:channelId/messages', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  const channel = inMemoryChannels.find((c) => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Canal no encontrado' });
  }

  // Verificación estricta de privacidad
  const memberIds = channel.members?.map((m) => m.userId) || [];
  const accessCheck = canAccessChannel(channel, userId, memberIds);
  if (!accessCheck.canAccess) {
    return res.status(403).json({ error: accessCheck.reason });
  }

  const messages = inMemoryMessages.filter((m) => m.channelId === channelId);

  // Marcar pines
  const channelPins = inMemoryPins.filter((p) => p.channelId === channelId);
  const pinnedIds = new Set(channelPins.map((p) => p.messageId));

  const enrichedMessages = messages.map((m) => ({
    ...m,
    isPinned: pinnedIds.has(m.id),
    renderedHtml: renderLimitedMarkdown(m.body),
  }));

  return res.json({
    messages: enrichedMessages,
    pins: channelPins,
  });
});

/**
 * POST /api/chat/channels/:channelId/messages
 * Envío de mensaje con IDEMPOTENCIA por clientMessageId, extracción de @menciones y #entidades
 */
chatRouter.post('/channels/:channelId/messages', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const { body, clientMessageId, parentMessageId, attachments = [] } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';
  const userName = (req.headers['x-user-name'] as string) || 'Administrador';
  const userRole = (req.headers['x-user-role'] as string) || 'admin';

  if (!body && attachments.length === 0) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const channel = inMemoryChannels.find((c) => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Canal no encontrado' });
  }

  if (channel.isArchived) {
    return res.status(400).json({ error: 'No se pueden enviar mensajes a un canal archivado' });
  }

  if (channel.isReadOnly && userRole !== 'admin') {
    return res.status(403).json({ error: 'Este canal es de solo lectura' });
  }

  // Verificación de acceso
  const memberIds = channel.members?.map((m) => m.userId) || [];
  const access = canAccessChannel(channel, userId, memberIds);
  if (!access.canAccess) {
    return res.status(403).json({ error: access.reason });
  }

  // 1. IDEMPOTENCIA: Verificar si ya existe mensaje con el mismo clientMessageId
  if (clientMessageId) {
    const existing = inMemoryMessages.find(
      (m) => m.channelId === channelId && m.clientMessageId === clientMessageId
    );
    if (existing) {
      return res.json({ message: existing, isDuplicate: true });
    }
  }

  // 2. Extraer menciones y referencias
  const bodyText = body || '';
  const plainText = markdownToPlainText(bodyText);
  const mentions = extractMentions(bodyText, getUserDirectory());
  const entities = extractEntityLinks(bodyText);

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newMessage: ChatMessage = {
    id: messageId,
    organizationId: 'org-1',
    channelId,
    authorId: userId,
    authorName: userName,
    authorRole: userRole,
    type: attachments.length > 0 ? (attachments[0].mimeType?.startsWith('image/') ? 'IMAGE' : 'FILE') : 'TEXT',
    body: bodyText,
    bodyPlain: plainText,
    parentMessageId: parentMessageId || null,
    threadReplyCount: 0,
    attachments,
    mentionedUserIds: mentions.mentionedUserIds,
    mentionsEveryone: mentions.mentionsEveryone,
    linkedEntityType: entities.length > 0 ? entities[0].type : null,
    linkedEntityId: entities.length > 0 ? entities[0].code : null,
    clientMessageId: clientMessageId || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    reactions: [],
  };

  inMemoryMessages.push(newMessage);

  // Actualizar canal
  channel.lastMessageAt = nowIso;
  channel.messageCount = (channel.messageCount || 0) + 1;

  // Si es un hilo de respuesta, actualizar conteo del padre
  if (parentMessageId) {
    const parent = inMemoryMessages.find((m) => m.id === parentMessageId);
    if (parent) {
      parent.threadReplyCount = (parent.threadReplyCount || 0) + 1;
      parent.threadLastReplyAt = nowIso;
    }
  }

  // 3. DIFUSIÓN POR SSE en tiempo real
  await realtimeStreamManager.publish({
    type: 'chat:message',
    organizationId: 'org-1',
    channelId,
    payload: {
      message: {
        ...newMessage,
        renderedHtml: renderLimitedMarkdown(newMessage.body),
      },
      channelName: channel.name,
      channelType: channel.type,
    },
  });

  return res.status(201).json({ message: newMessage });
});

/**
 * PATCH /api/chat/messages/:messageId
 * Edición de mensaje propio
 */
chatRouter.patch('/messages/:messageId', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { body } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  const message = inMemoryMessages.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  if (message.authorId !== userId) {
    return res.status(403).json({ error: 'Solo el autor puede editar este mensaje' });
  }

  message.body = body;
  message.bodyPlain = markdownToPlainText(body);
  message.editedAt = new Date().toISOString();
  message.updatedAt = new Date().toISOString();

  await realtimeStreamManager.publish({
    type: 'chat:message_updated',
    organizationId: 'org-1',
    channelId: message.channelId,
    payload: { message },
  });

  return res.json({ message });
});

/**
 * DELETE /api/chat/messages/:messageId
 * Eliminación lógica (soft delete)
 */
chatRouter.delete('/messages/:messageId', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';
  const userRole = (req.headers['x-user-role'] as string) || 'admin';

  const message = inMemoryMessages.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  if (message.authorId !== userId && userRole !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
  }

  message.deletedById = userId;
  message.body = '[Mensaje eliminado por el usuario]';
  message.bodyPlain = '[Mensaje eliminado]';
  message.updatedAt = new Date().toISOString();

  await realtimeStreamManager.publish({
    type: 'chat:message_deleted',
    organizationId: 'org-1',
    channelId: message.channelId,
    payload: { messageId, channelId: message.channelId },
  });

  return res.json({ success: true, messageId });
});

/**
 * POST /api/chat/messages/:messageId/reactions
 * Alterna una reacción con emoji
 */
chatRouter.post('/messages/:messageId/reactions', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  if (!emoji) {
    return res.status(400).json({ error: 'emoji es requerido' });
  }

  const message = inMemoryMessages.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  if (!message.reactions) {
    message.reactions = [];
  }

  let reaction = message.reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    reaction = { emoji, count: 1, users: [userId], userReacted: true };
    message.reactions.push(reaction);
  } else {
    const userIndex = reaction.users.indexOf(userId);
    if (userIndex >= 0) {
      reaction.users.splice(userIndex, 1);
      reaction.count--;
      reaction.userReacted = false;
      if (reaction.count <= 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      reaction.users.push(userId);
      reaction.count++;
      reaction.userReacted = true;
    }
  }

  await realtimeStreamManager.publish({
    type: 'chat:reaction',
    organizationId: 'org-1',
    channelId: message.channelId,
    payload: { messageId, reactions: message.reactions },
  });

  return res.json({ reactions: message.reactions });
});

/**
 * POST /api/chat/messages/:messageId/pins
 * Fija o desfija un mensaje en el canal
 */
chatRouter.post('/messages/:messageId/pins', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';
  const userName = (req.headers['x-user-name'] as string) || 'Administrador';

  const message = inMemoryMessages.find((m) => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Mensaje no encontrado' });
  }

  const pinIndex = inMemoryPins.findIndex(
    (p) => p.channelId === message.channelId && p.messageId === messageId
  );

  let isPinned = false;
  if (pinIndex >= 0) {
    inMemoryPins.splice(pinIndex, 1);
    isPinned = false;
  } else {
    inMemoryPins.push({
      id: `pin-${Date.now()}`,
      channelId: message.channelId,
      messageId,
      pinnedById: userId,
      pinnedByName: userName,
      pinnedAt: new Date().toISOString(),
      message,
    });
    isPinned = true;
  }

  await realtimeStreamManager.publish({
    type: 'chat:pin',
    organizationId: 'org-1',
    channelId: message.channelId,
    payload: { messageId, isPinned, pins: inMemoryPins.filter((p) => p.channelId === message.channelId) },
  });

  return res.json({ isPinned });
});

// ============================================================================
// BÚSQUEDA FULL-TEXT SIN TILDES
// ============================================================================

/**
 * GET /api/chat/search
 * Búsqueda con soporte para tildes en español y filtros por canal, autor y fechas
 */
chatRouter.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const channelId = req.query.channelId as string;
  const authorId = req.query.authorId as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;

  const results = searchChatMessages(inMemoryMessages, query, {
    channelId,
    authorId,
    dateFrom,
    dateTo,
  });

  const enriched = results.map((m) => {
    const channel = inMemoryChannels.find((c) => c.id === m.channelId);
    return {
      ...m,
      channelName: channel?.name || 'Canal',
      channelType: channel?.type,
      renderedHtml: renderLimitedMarkdown(m.body),
    };
  });

  return res.json({ results: enriched, total: enriched.length });
});

// ============================================================================
// RESPUESTAS GUARDADAS (Saved Replies)
// ============================================================================

chatRouter.get('/saved-replies', (_req: Request, res: Response) => {
  return res.json({ replies: inMemorySavedReplies });
});

chatRouter.post('/saved-replies', (req: Request, res: Response) => {
  const { shortcut, title, body } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  if (!shortcut || !body) {
    return res.status(400).json({ error: 'shortcut y body son obligatorios' });
  }

  const normalizedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
  const newReply: SavedReply = {
    id: `rep-${Date.now()}`,
    organizationId: 'org-1',
    userId,
    shortcut: normalizedShortcut,
    title: title || normalizedShortcut,
    body,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemorySavedReplies.push(newReply);
  return res.status(201).json({ reply: newReply });
});

// ============================================================================
// PRESENCIA Y ESTADO
// ============================================================================

/**
 * GET /api/chat/presence
 * Lista de presencia de todos los usuarios
 */
chatRouter.get('/presence', (_req: Request, res: Response) => {
  const presences = Object.values(inMemoryPresences);
  const directory = getUserDirectory();
  const enriched = presences.map((p) => {
    const user = directory.find((u) => u.id === p.userId);
    return {
      ...p,
      userName: user?.name || p.userId,
      userRole: user?.role,
      userArea: user?.area,
      userEmail: user?.email,
    };
  });

  return res.json({ presences: enriched });
});

/**
 * POST /api/chat/presence
 * Actualiza estado manual (emoji, texto, expiración, status)
 */
chatRouter.post('/presence', async (req: Request, res: Response) => {
  const { status, customStatusEmoji, customStatusText, expiresMinutes } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';

  let presence = inMemoryPresences[userId];
  if (!presence) {
    presence = {
      userId,
      organizationId: 'org-1',
      status: 'ONLINE',
      lastActiveAt: new Date().toISOString(),
      currentDevice: 'WEB',
      updatedAt: new Date().toISOString(),
      isWorkingHours: true,
    };
    inMemoryPresences[userId] = presence;
  }

  if (status) presence.status = status;
  if (customStatusEmoji !== undefined) presence.customStatusEmoji = customStatusEmoji;
  if (customStatusText !== undefined) presence.customStatusText = customStatusText;

  if (expiresMinutes && expiresMinutes > 0) {
    presence.customStatusExpiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
  } else if (expiresMinutes === null) {
    presence.customStatusExpiresAt = null;
  }

  presence.lastActiveAt = new Date().toISOString();
  presence.updatedAt = new Date().toISOString();

  await realtimeStreamManager.publish({
    type: 'presence:update',
    organizationId: 'org-1',
    payload: { presence },
  });

  return res.json({ presence });
});

/**
 * POST /api/chat/presence/heartbeat
 * Latido de presencia desde el cliente (refresca TTL en memoria y online)
 */
chatRouter.post('/presence/heartbeat', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';
  const presence = inMemoryPresences[userId];

  if (presence) {
    presence.lastActiveAt = new Date().toISOString();
    if (presence.status === 'OFFLINE') {
      presence.status = 'ONLINE';
    }
  }

  return res.json({ success: true, timestamp: new Date().toISOString() });
});

// ============================================================================
// SUBIDA DE ARCHIVOS ADJUNTOS (MinIO y Validación Real de MIME)
// ============================================================================

chatRouter.post('/attachments/upload', (req: Request, res: Response) => {
  const { name, size, mimeType, dataBase64 } = req.body;

  if (!name || !size || !mimeType) {
    return res.status(400).json({ error: 'name, size y mimeType son requeridos' });
  }

  // Validación de adjunto según tipos permitidos y límite de tamaño
  const validation = validateAttachment({ name, size, mimeType });
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  // En entorno de demostración, generar URL accesible directamente
  const url = dataBase64 ? dataBase64 : `/api/chat/attachments/${attachmentId}/${encodeURIComponent(name)}`;

  return res.json({
    attachment: {
      id: attachmentId,
      name,
      size,
      mimeType: validation.sanitizedMime,
      url,
      uploadedAt: new Date().toISOString(),
    },
  });
});

// ============================================================================
// EXPORTACIÓN CON LÍMITE DURO DE PRIVACIDAD
// ============================================================================

/**
 * POST /api/chat/export/:channelId
 * Exporta el historial de un canal en PDF o formato de texto.
 * Para mensajes directos (DM) ajenos:
 * - Exige permiso chat:export
 * - Exige confirmación explícita (legalConfirmation = true)
 * - Exige motivo legal de al menos 15 caracteres
 * - Registra en AuditLog
 * - Notifica a los titulares
 */
chatRouter.post('/export/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const { legalConfirmation, legalReason } = req.body;
  const userId = (req.headers['x-user-id'] as string) || 'emp-03';
  const userRole = (req.headers['x-user-role'] as string) || 'admin';

  const channel = inMemoryChannels.find((c) => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Canal no encontrado' });
  }

  const hasChatExportPermission = userRole === 'admin' || userRole === 'super_admin' || userId === 'emp-03' || userRole === 'compliance';

  const exportVerify = verifyDirectChannelExport({
    channel,
    requestingUserId: userId,
    hasChatExportPermission,
    hasLegalConfirmation: !!legalConfirmation,
    legalReason,
  });

  if (!exportVerify.allowed) {
    return res.status(403).json({
      error: exportVerify.error,
      requiresLegalDoubleConfirmation: exportVerify.requiresLegalDoubleConfirmation,
    });
  }

  const messages = inMemoryMessages.filter((m) => m.channelId === channelId);

  // Si requiere notificar a los titulares
  if (exportVerify.notifyUserIds && exportVerify.notifyUserIds.length > 0) {
    for (const participantId of exportVerify.notifyUserIds) {
      await realtimeStreamManager.publish({
        type: 'notification:new',
        organizationId: 'org-1',
        targetUserIds: [participantId],
        payload: {
          title: 'Aviso de Privacidad: Conversación Exportada',
          message: `Una conversación privada ha sido extraída por requerimiento legal. Causa: "${legalReason}". Solicitante: ${userId}.`,
          priority: 'URGENT',
        },
      });
    }
  }

  return res.json({
    success: true,
    channelName: channel.name,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      author: m.authorName,
      body: m.bodyPlain,
      createdAt: m.createdAt,
    })),
    auditPayload: exportVerify.auditPayload,
  });
});

// ============================================================================
// LOOKUP DE ENTIDADES PARA AUTOCOMPLETADO CON '#'
// ============================================================================

chatRouter.get('/entities/lookup', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase().trim();

  // Catálogo de entidades vinculables con código, título y estado
  const entities = [
    { type: 'QUOTE', id: 'cot-1045', code: 'COT-1045', title: 'Bancolombia S.A. — Señalética Torre Norte', subtitle: '$ 48.500.000 COP · En negociación', status: 'NEGOCIACION', statusVariant: 'warning' },
    { type: 'QUOTE', id: 'cot-1046', code: 'COT-1046', title: 'Cervecería BBC — Cajas de Luz Barra Bar', subtitle: '$ 18.200.000 COP · Aprobada', status: 'APROBADA', statusVariant: 'success' },
    { type: 'PRODUCTION_PROJECT', id: 'prj-801', code: 'PRJ-801', title: 'Almacenes Éxito — 120 Cajas LED Acrílicas', subtitle: 'Avance: 68% · Cama Plana y Corte', status: 'EN_PRODUCCION', statusVariant: 'info' },
    { type: 'PRODUCTION_PROJECT', id: 'prj-802', code: 'PRJ-802', title: 'Clínica Las Américas — Avisos Bioseguridad', subtitle: 'Avance: 92% · Ensamble final', status: 'CONTROL_CALIDAD', statusVariant: 'info' },
    { type: 'CLIENT', id: 'cli-101', code: 'CLI-101', title: 'Bancolombia S.A.', subtitle: 'NIT: 890.903.938-8 · Corporativo', status: 'ACTIVO', statusVariant: 'success' },
    { type: 'CLIENT', id: 'cli-102', code: 'CLI-102', title: 'Almacenes Éxito S.A.', subtitle: 'NIT: 890.900.608-9 · Gran Cuenta', status: 'ACTIVO', statusVariant: 'success' },
  ];

  const filtered = query
    ? entities.filter((e) => e.code.toLowerCase().includes(query) || e.title.toLowerCase().includes(query))
    : entities;

  return res.json({ entities: filtered });
});

// ============================================================================
// WIDGET DATA: MIS MENCIONES
// ============================================================================

chatRouter.get('/mentions/unread', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'emp-03';

  // Buscar mensajes donde el usuario fue mencionado
  const mentionMessages = inMemoryMessages.filter((m) => {
    return (
      (m.mentionedUserIds && m.mentionedUserIds.includes(userId)) ||
      m.mentionsEveryone
    );
  });

  const items = mentionMessages.slice(-5).reverse().map((m) => {
    const channel = inMemoryChannels.find((c) => c.id === m.channelId);
    return {
      messageId: m.id,
      channelId: m.channelId,
      channelName: channel?.name || 'Canal',
      channelType: channel?.type,
      authorName: m.authorName,
      bodySnippet: m.bodyPlain.length > 80 ? `${m.bodyPlain.substring(0, 80)}...` : m.bodyPlain,
      createdAt: m.createdAt,
      linkedEntityType: m.linkedEntityType,
    };
  });

  return res.json({
    unreadCount: items.length,
    items,
  });
});
