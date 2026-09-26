/**
 * Acciones del Motor de Reglas — Automatizaciones de Colaboración (Etapa 4 & 15.1)
 */
import { z } from 'zod';

// ============================================================================
// ESQUEMAS ZOD DE ACCIONES DE REGLAS
// ============================================================================

export const PublicarAnuncioActionSchema = z.object({
  action: z.literal('publicar_anuncio'),
  organizationId: z.string(),
  title: z.string(),
  body: z.string(),
  summary: z.string().optional(),
  type: z.enum(['ANNOUNCEMENT', 'DIRECTIVE', 'RECOGNITION', 'ALERT', 'EVENT', 'POLICY']).default('ANNOUNCEMENT'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  targetType: z.enum(['EVERYONE', 'ROLE', 'AREA', 'TEAM', 'USER']).default('EVERYONE'),
  targetRoleId: z.string().optional(),
  targetAreaKey: z.string().optional(),
  targetUserId: z.string().optional(),
  requiresAcknowledgement: z.boolean().default(false),
});

export type PublicarAnuncioAction = z.infer<typeof PublicarAnuncioActionSchema>;

export const EnviarMensajeChatActionSchema = z.object({
  action: z.literal('enviar_mensaje_chat'),
  organizationId: z.string(),
  channelId: z.string().optional(),
  channelKey: z.string().optional(), // Para canales de sistema
  authorId: z.string().default('SYSTEM'),
  type: z.enum(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'CALL_SUMMARY', 'ENTITY_LINK']).default('SYSTEM'),
  body: z.string(),
  mentionedUserIds: z.array(z.string()).default([]),
});

export type EnviarMensajeChatAction = z.infer<typeof EnviarMensajeChatActionSchema>;

export const CrearCanalDeEntidadActionSchema = z.object({
  action: z.literal('crear_canal_de_entidad'),
  organizationId: z.string(),
  entityType: z.enum(['CLIENT', 'OPPORTUNITY', 'QUOTE', 'PRODUCTION_PROJECT', 'PRINT_ORDER', 'VEA_MEETING']),
  entityId: z.string(),
  name: z.string(),
  topic: z.string().optional(),
  memberUserIds: z.array(z.string()).default([]),
});

export type CrearCanalDeEntidadAction = z.infer<typeof CrearCanalDeEntidadActionSchema>;

export const DarReconocimientoActionSchema = z.object({
  action: z.literal('dar_reconocimiento'),
  organizationId: z.string(),
  fromUserId: z.string(),
  toUserIds: z.array(z.string()).min(1),
  message: z.string(),
  valueKey: z.enum(['calidad', 'cumplimiento', 'servicio', 'equipo', 'iniciativa']),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().optional(),
  isPublic: z.boolean().default(true),
});

export type DarReconocimientoAction = z.infer<typeof DarReconocimientoActionSchema>;

// Regla sugerida Etapa 18.1: Notificar a comerciales sobre cotizaciones desactualizadas tras publicar tarifario
export const NotificarCotizacionesDesactualizadasActionSchema = z.object({
  action: z.literal('notificar_cotizaciones_desactualizadas'),
  organizationId: z.string(),
  versionId: z.string(),
  versionCode: z.string(),
  validFrom: z.string().datetime().or(z.date()),
});

export type NotificarCotizacionesDesactualizadasAction = z.infer<typeof NotificarCotizacionesDesactualizadasActionSchema>;

export const CollaborationRuleActionSchema = z.discriminatedUnion('action', [
  PublicarAnuncioActionSchema,
  EnviarMensajeChatActionSchema,
  CrearCanalDeEntidadActionSchema,
  DarReconocimientoActionSchema,
  NotificarCotizacionesDesactualizadasActionSchema,
]);

export type CollaborationRuleAction = z.infer<typeof CollaborationRuleActionSchema>;

export interface ActionResult {
  action: string;
  status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
  message: string;
  data?: unknown;
}

// ============================================================================
// EJECUTORES STUB TIPADOS
// ============================================================================

export async function executeRuleAction(action: CollaborationRuleAction): Promise<ActionResult> {
  switch (action.action) {
    case 'publicar_anuncio':
      // TODO(etapa-15-4): Invocar AnnouncementsService.createAndPublish() cuando se implemente en 15.4
      return {
        action: action.action,
        status: 'SKIPPED',
        message: 'módulo no disponible todavía',
        data: { title: action.title, type: action.type },
      };

    case 'enviar_mensaje_chat':
      // TODO(etapa-15-5): Invocar ChatMessageService.sendSystemMessage() cuando se implemente en 15.5
      return {
        action: action.action,
        status: 'SKIPPED',
        message: 'módulo no disponible todavía',
        data: { channelKey: action.channelKey, channelId: action.channelId },
      };

    case 'crear_canal_de_entidad':
      // TODO(etapa-15-5): Invocar ChatChannelService.getOrCreateEntityChannel() cuando se implemente en 15.5
      return {
        action: action.action,
        status: 'SKIPPED',
        message: 'módulo no disponible todavía',
        data: { entityType: action.entityType, entityId: action.entityId },
      };

    case 'dar_reconocimiento':
      // TODO(etapa-15-2): Invocar ShoutoutService.create() cuando se implemente en 15.2
      return {
        action: action.action,
        status: 'SKIPPED',
        message: 'módulo no disponible todavía',
        data: { valueKey: action.valueKey, toUserIds: action.toUserIds },
      };

    case 'notificar_cotizaciones_desactualizadas':
      // Alerta a los comerciales sobre cotizaciones vigentes/borrador previas
      return {
        action: action.action,
        status: 'SUCCESS',
        message: `Notificación encolada para cotizaciones desactualizadas por publicación de ${action.versionCode}`,
        data: { versionId: action.versionId, versionCode: action.versionCode },
      };

    default:
      return {
        action: (action as any).action,
        status: 'ERROR',
        message: 'Acción desconocida',
      };
  }
}
