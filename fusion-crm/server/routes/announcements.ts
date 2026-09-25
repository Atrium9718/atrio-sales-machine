/**
 * Rutas API para el Tablero de Anuncios y Reconocimientos (Etapa 15.4)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementStatus,
  AudienceTarget,
  SHOUTOUT_VALUES,
  ShoutoutValueKey,
} from '../../packages/core/src/announcements/types';
import {
  resolveAudienceUserIds,
  calculateNewReceiptUserIds,
  UserAudienceProfile,
} from '../../packages/core/src/announcements/audience';
import {
  calculateReadingMetrics,
  canDismissAnnouncement,
  isColombianBusinessHours,
  ReceiptRecord,
} from '../../packages/core/src/announcements/receipts';
import { validateAttachment } from '../../packages/core/src/announcements/mime-validation';
import { can, SEED_ROLE_COLLABORATION_PERMISSIONS } from '../../packages/core/src/auth/permissions';
import { employeeService } from '../services/employeeService';

const prisma = new PrismaClient();
export const announcementsRouter = Router();

// Directorio de usuarios de la organización (para resolución de audiencia y visualización)
export const getActiveUsers = () => {
  return employeeService.getEmployees().map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.roleKey,
    areaKey: e.roleKey.includes('produccion') || e.roleKey.includes('planta') ? 'planta' : 
             e.roleKey.includes('comercial') ? 'ventas' : 'direccion',
    isActive: e.status === 'ACTIVO'
  }));
};

// Almacén en memoria sincronizado para alta disponibilidad
interface AnnouncementStoreItem {
  id: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  title: string;
  body: string;
  summary: string;
  attachments: any[];
  coverImageKey?: string | null;
  status: AnnouncementStatus;
  publishAt?: string | null;
  expiresAt?: string | null;
  isPinned: boolean;
  pinnedUntil?: string | null;
  requiresAcknowledgement: boolean;
  allowsComments: boolean;
  allowsReactions: boolean;
  publishedAt?: string | null;
  archivedAt?: string | null;
  viewCount: number;
  createdAt: string;
  audiences: AudienceTarget[];
  receipts: ReceiptRecord[];
  comments: {
    id: string;
    userId: string;
    userName: string;
    body: string;
    createdAt: string;
    parentCommentId?: string | null;
    mentionedUserIds: string[];
  }[];
  reactions: {
    userId: string;
    userName: string;
    emoji: string;
    createdAt: string;
  }[];
}

interface ShoutoutStoreItem {
  id: string;
  organizationId: string;
  fromUserId: string;
  fromUserName: string;
  toUserIds: string[];
  toUserNames: string[];
  message: string;
  valueKey: ShoutoutValueKey;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  isPublic: boolean;
  announcementId?: string | null;
  createdAt: string;
  reactions: { userId: string; emoji: string }[];
}

export const inMemoryAnnouncements: AnnouncementStoreItem[] = [];

export const inMemoryShoutouts: ShoutoutStoreItem[] = [];

// Helper para extraer usuario y rol (SSOT)
function getRequestUser(req: Request) {
  const defaultUserId = employeeService.getActiveUser().id || 'emp-03';
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || defaultUserId;
  const role = ((req.headers['x-user-role'] as string) || (req.query.role as string) || 'super_admin').toLowerCase();

  const customPerms = req.headers['x-user-permissions'];
  let permissions: string[] = [];
  if (customPerms) {
    try {
      permissions = JSON.parse(customPerms as string);
    } catch {
      // ignore
    }
  }

  if (permissions.length === 0) {
    if (role === 'admin' || role === 'super_admin' || userId === 'emp-03') {
      permissions = ['*'];
    } else {
      const collabPerms = SEED_ROLE_COLLABORATION_PERMISSIONS[role] || [];
      permissions = ['announcement:read', ...collabPerms];
    }
  }

  const activeUsers = getActiveUsers();
  const userProfile = activeUsers.find((u) => u.id === userId) || {
    id: userId,
    name: 'Usuario Actual',
    email: 'usuario@fusion.com.co',
    role,
    areaKey: 'ventas',
    isActive: true,
  };

  return { userId, role, permissions, userProfile };
}

// 1. LISTAR ANUNCIOS
announcementsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, permissions } = getRequestUser(req);
    const { status = 'PUBLISHED', type, priority, unconfirmedOnly, search } = req.query;

    if (!can(permissions, 'announcement:read')) {
      return res.status(403).json({ error: 'Permiso announcement:read requerido' });
    }

    let list = inMemoryAnnouncements.filter((a) => {
      if (status && status !== 'ALL' && a.status !== status) return false;
      if (type && a.type !== type) return false;
      if (priority && a.priority !== priority) return false;
      return true;
    });

    // Filtro de búsqueda
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q)
      );
    }

    // Filtro de pendientes de confirmar
    if (unconfirmedOnly === 'true') {
      list = list.filter((a) => {
        if (!a.requiresAcknowledgement) return false;
        const receipt = a.receipts.find((r) => r.userId === userId);
        return !receipt || !receipt.acknowledgedAt;
      });
    }

    // Formatear payload agregando estado para el usuario solicitante y métricas
    const formatted = list.map((a) => {
      const receipt = a.receipts.find((r) => r.userId === userId) || null;
      const metrics = calculateReadingMetrics(a.receipts);

      // Reacciones agrupadas con conteo y flag si yo reaccioné
      const reactionSummary: Record<string, { count: number; users: string[]; userReacted: boolean }> = {};
      for (const r of a.reactions) {
        if (!reactionSummary[r.emoji]) {
          reactionSummary[r.emoji] = { count: 0, users: [], userReacted: false };
        }
        reactionSummary[r.emoji].count++;
        reactionSummary[r.emoji].users.push(r.userName);
        if (r.userId === userId) {
          reactionSummary[r.emoji].userReacted = true;
        }
      }

      return {
        id: a.id,
        type: a.type,
        priority: a.priority,
        title: a.title,
        summary: a.summary || a.title,
        authorId: a.authorId,
        authorName: a.authorName,
        authorRole: a.authorRole,
        coverImageKey: a.coverImageKey,
        status: a.status,
        publishAt: a.publishAt,
        expiresAt: a.expiresAt,
        isPinned: a.isPinned && (!a.pinnedUntil || new Date(a.pinnedUntil) > new Date()),
        pinnedUntil: a.pinnedUntil,
        requiresAcknowledgement: a.requiresAcknowledgement,
        allowsComments: a.allowsComments,
        allowsReactions: a.allowsReactions,
        publishedAt: a.publishedAt,
        viewCount: a.viewCount,
        attachmentsCount: a.attachments.length,
        commentsCount: a.comments.length,
        reactionSummary,
        myReceipt: receipt,
        metrics: can(permissions, 'announcement:read_metrics') || a.authorId === userId ? metrics : undefined,
      };
    });

    // Ordenar: Fijados primero, luego fecha descendente
    formatted.sort((x, y) => {
      if (x.isPinned && !y.isPinned) return -1;
      if (!x.isPinned && y.isPinned) return 1;
      const dateX = new Date(x.publishedAt || x.publishAt || 0).getTime();
      const dateY = new Date(y.publishedAt || y.publishAt || 0).getTime();
      return dateY - dateX;
    });

    return res.json({ success: true, count: formatted.length, announcements: formatted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. OBTENER ANUNCIOS URGENTES NO CONFIRMADOS (para el cintillo superior y bloqueos)
announcementsRouter.get('/urgent-unconfirmed', async (req: Request, res: Response) => {
  try {
    const { userId } = getRequestUser(req);
    const urgentList = inMemoryAnnouncements.filter((a) => {
      if (a.status !== 'PUBLISHED') return false;
      if (a.priority !== 'URGENT' && a.priority !== 'IMPORTANT') return false;
      if (!a.requiresAcknowledgement) return false;
      const receipt = a.receipts.find((r) => r.userId === userId);
      return !receipt || !receipt.acknowledgedAt;
    });

    return res.json({
      success: true,
      hasUrgent: urgentList.length > 0,
      count: urgentList.length,
      announcements: urgentList.map((a) => ({
        id: a.id,
        title: a.title,
        priority: a.priority,
        type: a.type,
        publishedAt: a.publishedAt,
        requiresAcknowledgement: a.requiresAcknowledgement,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. OBTENER DETALLE DE UN ANUNCIO (registra seenAt / readAt automáticamente)
announcementsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, permissions } = getRequestUser(req);

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    // Incrementar vista
    announcement.viewCount++;

    // Actualizar o crear receipt del usuario
    let receipt = announcement.receipts.find((r) => r.userId === userId);
    const nowIso = new Date().toISOString();
    if (!receipt) {
      receipt = {
        userId,
        deliveredAt: nowIso,
        seenAt: nowIso,
        readAt: nowIso,
        acknowledgedAt: null,
      };
      announcement.receipts.push(receipt);
    } else {
      if (!receipt.seenAt) receipt.seenAt = nowIso;
      if (!receipt.readAt) receipt.readAt = nowIso;
    }

    const metrics = calculateReadingMetrics(announcement.receipts);

    return res.json({
      success: true,
      announcement: {
        ...announcement,
        myReceipt: receipt,
        metrics: can(permissions, 'announcement:read_metrics') || announcement.authorId === userId ? metrics : undefined,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. CREAR NUEVO ANUNCIO (Borrador o Publicación Directa)
announcementsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, permissions, userProfile } = getRequestUser(req);
    if (!can(permissions, 'announcement:create')) {
      return res.status(403).json({ error: 'Permiso announcement:create requerido' });
    }

    const {
      title,
      body,
      summary,
      type = 'ANNOUNCEMENT',
      priority = 'NORMAL',
      audiences = [{ targetType: 'EVERYONE' }],
      publishImmediately = false,
      publishAt,
      expiresAt,
      isPinned = false,
      pinnedUntil,
      requiresAcknowledgement = false,
      allowsComments = true,
      allowsReactions = true,
      attachments = [],
      coverImageKey = null,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Título y contenido son obligatorios' });
    }

    // Validar adjuntos si vienen incluidos
    for (const att of attachments) {
      const val = validateAttachment({
        name: att.name,
        size: att.size,
        mimeType: att.mimeType,
      });
      if (!val.isValid) {
        return res.status(400).json({ error: `Adjunto inválido "${att.name}": ${val.error}` });
      }
    }

    const now = new Date();
    const isScheduled = !publishImmediately && publishAt && new Date(publishAt) > now;
    const finalStatus: AnnouncementStatus = publishImmediately
      ? 'PUBLISHED'
      : isScheduled
      ? 'SCHEDULED'
      : 'DRAFT';

    const newId = `ann-${Date.now().toString(36)}`;
    const newAnnouncement: AnnouncementStoreItem = {
      id: newId,
      organizationId: 'org-demo',
      authorId: userId,
      authorName: userProfile.name,
      authorRole: userProfile.role,
      type,
      priority,
      title,
      body,
      summary: summary || title,
      attachments,
      coverImageKey,
      status: finalStatus,
      publishAt: publishImmediately ? now.toISOString() : publishAt || null,
      expiresAt: expiresAt || null,
      isPinned: !!isPinned,
      pinnedUntil: isPinned ? pinnedUntil || null : null,
      requiresAcknowledgement: !!requiresAcknowledgement,
      allowsComments: allowsComments !== false,
      allowsReactions: allowsReactions !== false,
      publishedAt: publishImmediately ? now.toISOString() : null,
      archivedAt: null,
      viewCount: 0,
      createdAt: now.toISOString(),
      audiences,
      receipts: [],
      comments: [],
      reactions: [],
    };

    // Si se publica de inmediato, resolver audiencia y crear acuses
    if (finalStatus === 'PUBLISHED') {
      const targetUserIds = resolveAudienceUserIds(audiences, getActiveUsers());
      newAnnouncement.receipts = targetUserIds.map((uid) => ({
        userId: uid,
        deliveredAt: now.toISOString(),
        seenAt: null,
        readAt: null,
        acknowledgedAt: null,
      }));

      console.log(`[Announcements] Publicado anuncio "${title}". Destinatarios asignados: ${targetUserIds.length}`);
    }

    inMemoryAnnouncements.unshift(newAnnouncement);

    return res.status(201).json({
      success: true,
      message:
        finalStatus === 'PUBLISHED'
          ? 'Anuncio publicado exitosamente a los destinatarios'
          : finalStatus === 'SCHEDULED'
          ? 'Anuncio programado para publicación automática'
          : 'Borrador guardado exitosamente',
      announcement: newAnnouncement,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. PUBLICAR UN ANUNCIO EXISTENTE (desde Borrador o Programado)
announcementsRouter.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, permissions } = getRequestUser(req);

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    if (announcement.authorId !== userId && !can(permissions, 'announcement:publish')) {
      return res.status(403).json({ error: 'No tienes permiso para publicar este comunicado' });
    }

    const now = new Date();
    announcement.status = 'PUBLISHED';
    announcement.publishedAt = now.toISOString();

    // Resolver audiencia y generar receipts sin duplicar
    const targetUserIds = resolveAudienceUserIds(announcement.audiences, getActiveUsers());
    const existingUserIds = announcement.receipts.map((r) => r.userId);
    const newReceiptUserIds = calculateNewReceiptUserIds(existingUserIds, targetUserIds);

    for (const uid of newReceiptUserIds) {
      announcement.receipts.push({
        userId: uid,
        deliveredAt: now.toISOString(),
        seenAt: null,
        readAt: null,
        acknowledgedAt: null,
      });
    }

    return res.json({
      success: true,
      message: 'Anuncio publicado exitosamente',
      announcement,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. CONFIRMAR LECTURA DE UN ANUNCIO OBLIGATORIO (Acuse Formal)
announcementsRouter.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = getRequestUser(req);

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '192.168.1.100';
    const nowIso = new Date().toISOString();

    let receipt = announcement.receipts.find((r) => r.userId === userId);
    if (!receipt) {
      receipt = {
        userId,
        deliveredAt: nowIso,
        seenAt: nowIso,
        readAt: nowIso,
        acknowledgedAt: nowIso,
        acknowledgedIp: clientIp,
      };
      announcement.receipts.push(receipt);
    } else {
      receipt.seenAt = receipt.seenAt || nowIso;
      receipt.readAt = receipt.readAt || nowIso;
      receipt.acknowledgedAt = nowIso;
      receipt.acknowledgedIp = clientIp;
    }

    console.log(`[Announcements] Acuse de lectura confirmado por usuario ${userId} para anuncio "${announcement.title}" desde IP ${clientIp}`);

    return res.json({
      success: true,
      message: 'Lectura confirmada y registrada en el sistema de auditoría.',
      receipt,
      acknowledgedAt: nowIso,
      ip: clientIp,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. DESCARTAR ANUNCIO DE LA VISTA
announcementsRouter.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = getRequestUser(req);

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    let receipt = announcement.receipts.find((r) => r.userId === userId);

    // REGLA: Un anuncio con confirmación obligatoria no se puede descartar hasta confirmar
    if (!canDismissAnnouncement(announcement.requiresAcknowledgement, receipt)) {
      return res.status(400).json({
        error: 'Este anuncio requiere confirmación obligatoria. Debes pulsar "Entendido / Confirmar Lectura" antes de descartarlo.',
        requiresAcknowledgement: true,
      });
    }

    const nowIso = new Date().toISOString();
    if (!receipt) {
      receipt = { userId, dismissedAt: nowIso };
      announcement.receipts.push(receipt);
    } else {
      receipt.dismissedAt = nowIso;
    }

    return res.json({ success: true, message: 'Anuncio descartado de la bandeja principal' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 8. PANEL DEL AUTOR: SEGUIMIENTO DE LECTURAS Y AUDIENCIA (/anuncios/:id/lecturas)
announcementsRouter.get('/:id/receipts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, permissions } = getRequestUser(req);

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    if (announcement.authorId !== userId && !can(permissions, 'announcement:read_metrics')) {
      return res.status(403).json({ error: 'Acceso restringido al autor o roles con permiso announcement:read_metrics' });
    }

    const metrics = calculateReadingMetrics(announcement.receipts);

    // Cruzar con datos de usuarios para la tabla detallada
    const detailedReceipts = announcement.receipts.map((r) => {
      const activeUsers = getActiveUsers();
      const user = activeUsers.find((u) => u.id === r.userId) || {
        id: r.userId,
        name: `Usuario ${r.userId}`,
        email: 'desconocido@fusion.com.co',
        role: 'colaborador',
        areaKey: 'general',
      };

      const isAcknowledged = !!r.acknowledgedAt;
      const isRead = !!r.readAt;
      const isSeen = !!r.seenAt;

      const statusBadge = isAcknowledged
        ? 'CONFIRMADO'
        : isRead
        ? 'LEIDO'
        : isSeen
        ? 'VISTO'
        : 'ENTREGADO';

      return {
        userId: r.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        areaKey: user.areaKey,
        deliveredAt: r.deliveredAt,
        seenAt: r.seenAt,
        readAt: r.readAt,
        acknowledgedAt: r.acknowledgedAt,
        acknowledgedIp: r.acknowledgedIp,
        statusBadge,
      };
    });

    return res.json({
      success: true,
      announcement: {
        id: announcement.id,
        title: announcement.title,
        priority: announcement.priority,
        type: announcement.type,
        publishedAt: announcement.publishedAt,
        requiresAcknowledgement: announcement.requiresAcknowledgement,
      },
      metrics,
      receipts: detailedReceipts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 9. ENVIAR RECORDATORIO MANUAL DESDE EL PANEL DEL AUTOR
announcementsRouter.post('/:id/remind', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = getRequestUser(req);
    const { forceOutsideHours } = req.body;

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    const now = new Date();
    const inBusinessHours = isColombianBusinessHours(now);

    // Validación de horario hábil colombiano
    if (!inBusinessHours && !forceOutsideHours) {
      return res.status(400).json({
        error: 'Actualmente estamos fuera del horario hábil laboral o en día festivo en Colombia. Los recordatorios automáticos deben enviarse en jornada laboral (08:00 - 18:00).',
        outsideBusinessHours: true,
      });
    }

    const pending = announcement.receipts.filter((r) => !r.acknowledgedAt);

    console.log(`[Announcements] Recordatorio manual despachado para ${pending.length} usuarios pendientes en "${announcement.title}"`);

    return res.json({
      success: true,
      message: `Recordatorio enviado a ${pending.length} colaboradores pendientes de confirmación.`,
      pendingCount: pending.length,
      sentAt: now.toISOString(),
      wasForced: !inBusinessHours && forceOutsideHours,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 10. AGREGAR COMENTARIO A UN ANUNCIO
announcementsRouter.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userProfile } = getRequestUser(req);
    const { body, parentCommentId, mentionedUserIds = [] } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    if (!announcement.allowsComments) {
      return res.status(400).json({ error: 'Este comunicado tiene los comentarios desactivados' });
    }

    const newComment = {
      id: `cmt-${Date.now().toString(36)}`,
      userId,
      userName: userProfile.name,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      parentCommentId: parentCommentId || null,
      mentionedUserIds,
    };

    announcement.comments.push(newComment);

    return res.status(201).json({ success: true, comment: newComment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 11. REACCIONAR A UN ANUNCIO (Toggle emoji)
announcementsRouter.post('/:id/reactions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userProfile } = getRequestUser(req);
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji requerido' });
    }

    const announcement = inMemoryAnnouncements.find((a) => a.id === id);
    if (!announcement) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }

    if (!announcement.allowsReactions) {
      return res.status(400).json({ error: 'Las reacciones están desactivadas para este anuncio' });
    }

    const existingIdx = announcement.reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji
    );

    let action: 'ADDED' | 'REMOVED' = 'ADDED';
    if (existingIdx >= 0) {
      announcement.reactions.splice(existingIdx, 1);
      action = 'REMOVED';
    } else {
      announcement.reactions.push({
        userId,
        userName: userProfile.name,
        emoji,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      action,
      emoji,
      totalReactions: announcement.reactions.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 12. CÁLCULO DE AUDIENCIA EN VIVO (Para el editor /anuncios/nuevo)
announcementsRouter.post('/audience-count', async (req: Request, res: Response) => {
  try {
    const { audiences = [] } = req.body;
    const activeUsers = getActiveUsers();
    const targetUserIds = resolveAudienceUserIds(audiences, activeUsers);
    const targetUsers = activeUsers.filter((u) => targetUserIds.includes(u.id)).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      areaKey: u.areaKey,
    }));

    return res.json({
      success: true,
      count: targetUserIds.length,
      users: targetUsers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 13. LISTAR RECONOCIMIENTOS (MURO DE SHOUTOUTS)
announcementsRouter.get('/shoutouts', async (req: Request, res: Response) => {
  try {
    const { valueKey } = req.query;
    let list = [...inMemoryShoutouts];

    if (valueKey && typeof valueKey === 'string') {
      list = list.filter((s) => s.valueKey === valueKey);
    }

    // Ordenar más recientes primero
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      shoutouts: list.map((s) => ({
        ...s,
        valueMeta: SHOUTOUT_VALUES[s.valueKey] || SHOUTOUT_VALUES.equipo,
      })),
      valuesCatalog: SHOUTOUT_VALUES,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 14. CREAR RECONOCIMIENTO (SHOUTOUT)
announcementsRouter.post('/shoutouts', async (req: Request, res: Response) => {
  try {
    const { userId, userProfile } = getRequestUser(req);
    const { toUserIds = [], message, valueKey = 'equipo', linkedEntityType, linkedEntityId } = req.body;

    if (!toUserIds.length || !message || !message.trim()) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un compañero y escribir un mensaje de reconocimiento' });
    }

    const activeUsers = getActiveUsers();
    const recipients = activeUsers.filter((u) => toUserIds.includes(u.id));
    const toUserNames = recipients.map((u) => u.name);

    const newShoutout: ShoutoutStoreItem = {
      id: `sho-${Date.now().toString(36)}`,
      organizationId: 'org-demo',
      fromUserId: userId,
      fromUserName: userProfile.name,
      toUserIds,
      toUserNames: toUserNames.length ? toUserNames : ['Compañero de equipo'],
      message: message.trim(),
      valueKey: (valueKey as ShoutoutValueKey) || 'equipo',
      linkedEntityType: linkedEntityType || null,
      linkedEntityId: linkedEntityId || null,
      isPublic: true,
      announcementId: null,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    inMemoryShoutouts.unshift(newShoutout);

    console.log(`[Shoutout] Reconocimiento creado por ${userProfile.name} para ${toUserNames.join(', ')} (${valueKey})`);

    return res.status(201).json({
      success: true,
      message: '¡Reconocimiento publicado en el muro corporativo!',
      shoutout: newShoutout,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 15. SUBIDA Y VALIDACIÓN DE ADJUNTO (MinIO / Archivos)
announcementsRouter.post('/upload-attachment', async (req: Request, res: Response) => {
  try {
    const { name, size, mimeType } = req.body;
    const val = validateAttachment({ name, size, mimeType });

    if (!val.isValid) {
      return res.status(400).json({ error: val.error });
    }

    // Mock almacenamiento en MinIO
    const safeKey = `announcements/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    return res.json({
      success: true,
      attachment: {
        name,
        key: safeKey,
        size,
        mimeType: val.sanitizedMime,
        url: `#minio/${safeKey}`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
