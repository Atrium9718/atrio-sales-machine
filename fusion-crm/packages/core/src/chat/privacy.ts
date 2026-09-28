/**
 * Gobierno, Autorización y Límite Duro de Privacidad (Etapa 15.5)
 */

import { ChatChannel } from './types';

export interface ChannelAccessResult {
  canAccess: boolean;
  reason?: string;
}

export interface DirectExportVerification {
  allowed: boolean;
  requiresLegalDoubleConfirmation?: boolean;
  error?: string;
  auditPayload?: {
    action: string;
    channelId: string;
    requestingUserId: string;
    participantUserIds: string[];
    legalReason: string;
    confirmedAt: string;
  };
  notifyUserIds?: string[];
}

/**
 * Valida si un usuario tiene autorización para ver o suscribirse a un canal por SSE o API:
 * - PUBLIC: cualquier colaborador con permiso chat:read puede acceder.
 * - ANUNCIOS: solo lectura público para toda la empresa.
 * - PRIVATE / DIRECT / GROUP: ESTRICTAMENTE restringido a miembros activos del canal.
 *   Ningún rol (ni admin ni gerencia) puede 'espiar' o suscribirse a un canal privado o DM ajeno.
 * - ENTITY: miembros asignados de la entidad o autorizados.
 */
export function canAccessChannel(
  channel: Pick<ChatChannel, 'id' | 'type' | 'key'>,
  userId: string,
  memberUserIds: string[]
): ChannelAccessResult {
  if (channel.key === 'anuncios' || channel.type === 'PUBLIC') {
    return { canAccess: true };
  }

  // Canales privados, directos y grupales
  const isMember = memberUserIds.includes(userId);
  if (!isMember) {
    return {
      canAccess: false,
      reason: 'Acceso denegado: este canal es privado y usted no es miembro de la conversación.',
    };
  }

  return { canAccess: true };
}

/**
 * LÍMITE DURO DE PRIVACIDAD:
 * Ninguna pantalla de administración permite leer mensajes directos ajenos.
 * Si la empresa requiere exportar un DM por causa legal o judicial:
 * 1. Debe tener permiso explícito `chat:export` (reservado a compliance/legal).
 * 2. Debe proporcionar motivo legal justificado (mínimo 15 caracteres).
 * 3. Exige confirmación explícita (hasLegalConfirmation = true).
 * 4. Queda auditado formalmente en AuditLog.
 * 5. Se genera notificación inmutable a los titulares de la conversación.
 */
export function verifyDirectChannelExport(input: {
  channel: ChatChannel;
  requestingUserId: string;
  hasChatExportPermission: boolean;
  hasLegalConfirmation: boolean;
  legalReason?: string;
}): DirectExportVerification {
  const {
    channel,
    requestingUserId,
    hasChatExportPermission,
    hasLegalConfirmation,
    legalReason,
  } = input;

  // 1. Validar permiso chat:export
  if (!hasChatExportPermission) {
    return {
      allowed: false,
      error: 'Permiso denegado: se requiere el privilegio especial chat:export para exportar conversaciones.',
    };
  }

  // 2. Si no es un canal directo, exportación estándar permitida
  if (channel.type !== 'DIRECT') {
    return { allowed: true };
  }

  // 3. Si el usuario que solicita la exportación es miembro de su propia conversación directa
  const memberIds = channel.members?.map((m) => m.userId) || [];
  const isParticipant = memberIds.includes(requestingUserId);

  if (isParticipant) {
    return {
      allowed: true,
      auditPayload: {
        action: 'CHAT_DIRECT_EXPORT_OWNER',
        channelId: channel.id,
        requestingUserId,
        participantUserIds: memberIds,
        legalReason: 'Exportación realizada por participante legítimo',
        confirmedAt: new Date().toISOString(),
      },
    };
  }

  // 4. LÍMITE DURO: Si es un tercero (ej. auditor o admin legal) intentando exportar un DM ajeno
  if (!hasLegalConfirmation) {
    return {
      allowed: false,
      requiresLegalDoubleConfirmation: true,
      error: 'LÍMITE DURO DE PRIVACIDAD: Exportar mensajes directos de terceros requiere doble confirmación explícita, registro legal vinculante y notificación a las partes involucradas.',
    };
  }

  const trimmedReason = (legalReason || '').trim();
  if (trimmedReason.length < 15) {
    return {
      allowed: false,
      error: 'Debe fundamentar la causa legal o requerimiento judicial con al menos 15 caracteres de descripción.',
    };
  }

  return {
    allowed: true,
    auditPayload: {
      action: 'CHAT_DIRECT_EXPORT_LEGAL_OVERRIDE',
      channelId: channel.id,
      requestingUserId,
      participantUserIds: memberIds,
      legalReason: trimmedReason,
      confirmedAt: new Date().toISOString(),
    },
    notifyUserIds: memberIds, // Titulares a quienes se debe notificar
  };
}
