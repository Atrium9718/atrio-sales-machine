/**
 * Catálogo Tipado de Eventos — Fusion ERP / CRM (Etapa 4 & Etapa 15.1)
 */
import { z } from 'zod';

// ============================================================================
// ESQUEMAS ZOD DE PAYLOADS DE EVENTOS
// ============================================================================

export const AnuncioPublicadoPayloadSchema = z.object({
  announcementId: z.string(),
  organizationId: z.string(),
  authorId: z.string(),
  title: z.string(),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']),
  targetAudiences: z.array(z.string()),
  requiresAcknowledgement: z.boolean(),
  publishedAt: z.string().datetime().or(z.date()),
});

export const AnuncioLeidoPayloadSchema = z.object({
  announcementId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  readAt: z.string().datetime().or(z.date()),
});

export const AnuncioConfirmadoPayloadSchema = z.object({
  announcementId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  acknowledgedAt: z.string().datetime().or(z.date()),
  acknowledgedIp: z.string().optional(),
});

export const AnuncioSinConfirmarVencidoPayloadSchema = z.object({
  announcementId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  expiresAt: z.string().datetime().or(z.date()),
  daysPending: z.number().int(),
});

export const ChatCanalCreadoPayloadSchema = z.object({
  channelId: z.string(),
  organizationId: z.string(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'GROUP', 'ENTITY']),
  name: z.string(),
  createdById: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const ChatMensajeEnviadoPayloadSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  authorId: z.string(),
  type: z.enum(['TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'CALL_SUMMARY', 'ENTITY_LINK']),
  parentMessageId: z.string().optional(),
  mentionedUserIds: z.array(z.string()).default([]),
  mentionsEveryone: z.boolean().default(false),
  createdAt: z.string().datetime().or(z.date()),
});

export const ChatMencionPayloadSchema = z.object({
  messageId: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  authorId: z.string(),
  mentionedUserId: z.string(),
  previewText: z.string(),
});

export const ChatHiloRespondidoPayloadSchema = z.object({
  parentMessageId: z.string(),
  replyMessageId: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  replyAuthorId: z.string(),
  threadReplyCount: z.number().int(),
});

export const LlamadaIniciadaPayloadSchema = z.object({
  callSessionId: z.string(),
  roomName: z.string(),
  organizationId: z.string(),
  startedById: z.string(),
  type: z.enum(['DIRECT', 'GROUP', 'CHANNEL', 'MEETING']),
  channelId: z.string().optional(),
  invitedUserIds: z.array(z.string()).default([]),
});

export const LlamadaContestadaPayloadSchema = z.object({
  callSessionId: z.string(),
  roomName: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  participantId: z.string(),
  joinedAt: z.string().datetime().or(z.date()),
});

export const LlamadaFinalizadaPayloadSchema = z.object({
  callSessionId: z.string(),
  roomName: z.string(),
  organizationId: z.string(),
  durationSeconds: z.number().int(),
  participantCount: z.number().int(),
  endedAt: z.string().datetime().or(z.date()),
});

export const LlamadaPerdidaPayloadSchema = z.object({
  callSessionId: z.string(),
  roomName: z.string(),
  organizationId: z.string(),
  callerUserId: z.string(),
  missedUserId: z.string(),
  channelId: z.string().optional(),
});

export const LlamadaGrabadaPayloadSchema = z.object({
  callSessionId: z.string(),
  roomName: z.string(),
  organizationId: z.string(),
  recordingKey: z.string(),
  durationSeconds: z.number().int(),
  recordedById: z.string(),
});

export const PresenciaCambiadaPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  previousStatus: z.string(),
  newStatus: z.enum(['ONLINE', 'AWAY', 'BUSY', 'IN_CALL', 'DO_NOT_DISTURB', 'OFFLINE']),
  device: z.enum(['WEB', 'MOBILE', 'KIOSK']).optional(),
  updatedAt: z.string().datetime().or(z.date()),
});

export const MetaDefinidaPayloadSchema = z.object({
  goalId: z.string(),
  organizationId: z.string(),
  scope: z.enum(['ORGANIZATION', 'AREA', 'TEAM', 'USER', 'MACHINE']),
  metricKey: z.string(),
  targetValue: z.number(),
  period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR']),
  ownerUserId: z.string().optional(),
});

export const MetaActualizadaPayloadSchema = z.object({
  goalId: z.string(),
  organizationId: z.string(),
  metricKey: z.string(),
  actualValue: z.number(),
  targetValue: z.number(),
  attainmentPercent: z.number(),
  paceStatus: z.enum(['AHEAD', 'ON_TRACK', 'AT_RISK', 'BEHIND']),
});

export const MetaEnRiesgoPayloadSchema = z.object({
  goalId: z.string(),
  organizationId: z.string(),
  metricKey: z.string(),
  actualValue: z.number(),
  expectedValue: z.number(),
  deficitPercent: z.number(),
  periodEnd: z.string().datetime().or(z.date()),
});

export const MetaCumplidaPayloadSchema = z.object({
  goalId: z.string(),
  organizationId: z.string(),
  metricKey: z.string(),
  finalValue: z.number(),
  targetValue: z.number(),
  completedAt: z.string().datetime().or(z.date()),
});

export const CumplimientoTareasBajoPayloadSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  date: z.string(),
  compliancePercent: z.number(),
  overdueTasksCount: z.number().int(),
});

export const CapacidadSubutilizadaPayloadSchema = z.object({
  organizationId: z.string(),
  subjectType: z.enum(['EMPLOYEE', 'MACHINE', 'AREA']),
  subjectId: z.string(),
  date: z.string(),
  utilizationPercent: z.number(),
  availableHours: z.number(),
  loggedHours: z.number(),
});

export const CapacidadSobrecargadaPayloadSchema = z.object({
  organizationId: z.string(),
  subjectType: z.enum(['EMPLOYEE', 'MACHINE', 'AREA']),
  subjectId: z.string(),
  date: z.string(),
  committedHours: z.number(),
  availableHours: z.number(),
  overloadPercent: z.number(),
});

export const CapacidadHorasSinRegistrarPayloadSchema = z.object({
  organizationId: z.string(),
  employeeId: z.string(),
  date: z.string(),
  unregisteredHours: z.number(),
});

export const ReconocimientoPublicadoPayloadSchema = z.object({
  shoutoutId: z.string(),
  organizationId: z.string(),
  fromUserId: z.string(),
  toUserIds: z.array(z.string()),
  valueKey: z.string(),
  message: z.string(),
  isPublic: z.boolean(),
});

export const HomePersonalizadoPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  density: z.enum(['COMFORTABLE', 'COMPACT']),
  startPage: z.string(),
  widgetCount: z.number().int(),
});

// ============================================================================
// DEFINICIÓN DE CATÁLOGO COMPLETO CON VERSIONES
// ============================================================================

export const COLLABORATION_EVENT_CATALOG = {
  'anuncio.publicado': {
    eventName: 'anuncio.publicado',
    version: 1,
    schema: AnuncioPublicadoPayloadSchema,
    description: 'Se ha publicado un nuevo anuncio para una audiencia determinada',
  },
  'anuncio.leido': {
    eventName: 'anuncio.leido',
    version: 1,
    schema: AnuncioLeidoPayloadSchema,
    description: 'Un usuario ha visualizado y leído el contenido de un anuncio',
  },
  'anuncio.confirmado': {
    eventName: 'anuncio.confirmado',
    version: 1,
    schema: AnuncioConfirmadoPayloadSchema,
    description: 'Un usuario ha confirmado la recepción o acuse obligatorio de un anuncio',
  },
  'anuncio.sin_confirmar_vencido': {
    eventName: 'anuncio.sin_confirmar_vencido',
    version: 1,
    schema: AnuncioSinConfirmarVencidoPayloadSchema,
    description: 'Un usuario no ha confirmado un anuncio obligatorio en el plazo fijado',
  },
  'chat.canal_creado': {
    eventName: 'chat.canal_creado',
    version: 1,
    schema: ChatCanalCreadoPayloadSchema,
    description: 'Se ha creado un nuevo canal de chat público, privado, directo o de entidad',
  },
  'chat.mensaje_enviado': {
    eventName: 'chat.mensaje_enviado',
    version: 1,
    schema: ChatMensajeEnviadoPayloadSchema,
    description: 'Se ha publicado un nuevo mensaje en un canal de chat',
  },
  'chat.mencion': {
    eventName: 'chat.mencion',
    version: 1,
    schema: ChatMencionPayloadSchema,
    description: 'Un usuario o grupo ha sido mencionado en un mensaje de chat',
  },
  'chat.hilo_respondido': {
    eventName: 'chat.hilo_respondido',
    version: 1,
    schema: ChatHiloRespondidoPayloadSchema,
    description: 'Se ha agregado una respuesta a un hilo de conversación en chat',
  },
  'llamada.iniciada': {
    eventName: 'llamada.iniciada',
    version: 1,
    schema: LlamadaIniciadaPayloadSchema,
    description: 'Se ha abierto una sala de llamada o videoconferencia',
  },
  'llamada.contestada': {
    eventName: 'llamada.contestada',
    version: 1,
    schema: LlamadaContestadaPayloadSchema,
    description: 'Un participante se ha conectado activamente a la llamada',
  },
  'llamada.finalizada': {
    eventName: 'llamada.finalizada',
    version: 1,
    schema: LlamadaFinalizadaPayloadSchema,
    description: 'La sesión de llamada ha concluido para todos los participantes',
  },
  'llamada.perdida': {
    eventName: 'llamada.perdida',
    version: 1,
    schema: LlamadaPerdidaPayloadSchema,
    description: 'Una llamada directa o grupal no fue contestada por el destinatario',
  },
  'llamada.grabada': {
    eventName: 'llamada.grabada',
    version: 1,
    schema: LlamadaGrabadaPayloadSchema,
    description: 'Se ha generado y almacenado una grabación de llamada',
  },
  'presencia.cambiada': {
    eventName: 'presencia.cambiada',
    version: 1,
    schema: PresenciaCambiadaPayloadSchema,
    description: 'El estado de presencia o dispositivo de un usuario ha cambiado',
  },
  'meta.definida': {
    eventName: 'meta.definida',
    version: 1,
    schema: MetaDefinidaPayloadSchema,
    description: 'Se ha configurado una nueva meta de desempeño o producción',
  },
  'meta.actualizada': {
    eventName: 'meta.actualizada',
    version: 1,
    schema: MetaActualizadaPayloadSchema,
    description: 'Se ha recalculado el progreso y ritmo de una meta',
  },
  'meta.en_riesgo': {
    eventName: 'meta.en_riesgo',
    version: 1,
    schema: MetaEnRiesgoPayloadSchema,
    description: 'El ritmo de cumplimiento de la meta está por debajo del umbral previsto',
  },
  'meta.cumplida': {
    eventName: 'meta.cumplida',
    version: 1,
    schema: MetaCumplidaPayloadSchema,
    description: 'La meta ha alcanzado o superado el 100% de su valor objetivo',
  },
  'cumplimiento.tareas_bajo': {
    eventName: 'cumplimiento.tareas_bajo',
    version: 1,
    schema: CumplimientoTareasBajoPayloadSchema,
    description: 'El porcentaje de cumplimiento diario de tareas de un usuario está bajo',
  },
  'capacidad.subutilizada': {
    eventName: 'capacidad.subutilizada',
    version: 1,
    schema: CapacidadSubutilizadaPayloadSchema,
    description: 'La utilización de un empleado, máquina o área está bajo el nivel esperado',
  },
  'capacidad.sobrecargada': {
    eventName: 'capacidad.sobrecargada',
    version: 1,
    schema: CapacidadSobrecargadaPayloadSchema,
    description: 'La carga comprometida supera la capacidad disponible del recurso',
  },
  'capacidad.horas_sin_registrar': {
    eventName: 'capacidad.horas_sin_registrar',
    version: 1,
    schema: CapacidadHorasSinRegistrarPayloadSchema,
    description: 'Un operario presenta horas de jornada laboral sin asignar o reportar',
  },
  'reconocimiento.publicado': {
    eventName: 'reconocimiento.publicado',
    version: 1,
    schema: ReconocimientoPublicadoPayloadSchema,
    description: 'Se ha otorgado un reconocimiento (shoutout) a uno o más compañeros',
  },
  'home.personalizado': {
    eventName: 'home.personalizado',
    version: 1,
    schema: HomePersonalizadoPayloadSchema,
    description: 'Un usuario ha actualizado sus preferencias y widgets de inicio',
  },
} as const;

export type CollaborationEventName = keyof typeof COLLABORATION_EVENT_CATALOG;

// ============================================================================
// EVENTOS DE TELEFONÍA Y VOZ (Etapa 17.1)
// ============================================================================

export const VozLlamadaEntrantePayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  channelId: z.string(),
  fromNumber: z.string(),
  toNumber: z.string(),
  didId: z.string().optional(),
  trunkId: z.string().optional(),
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozLlamadaContestadaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  channelId: z.string(),
  answeredByUserId: z.string().optional(),
  extensionId: z.string().optional(),
  queueId: z.string().optional(),
  answeredAt: z.string().datetime().or(z.date()),
});

export const VozLlamadaPerdidaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  channelId: z.string(),
  fromNumber: z.string(),
  toNumber: z.string(),
  queueId: z.string().optional(),
  reason: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozLlamadaFinalizadaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  channelId: z.string(),
  totalSeconds: z.number().int(),
  talkSeconds: z.number().int(),
  disposition: z.string().optional(),
  hangupCause: z.string().optional(),
  hangupBy: z.enum(['CALLER', 'AGENT', 'SYSTEM', 'UNKNOWN']),
  at: z.string().datetime().or(z.date()),
});

export const VozLlamadaAbandonadaEnColaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  queueId: z.string(),
  queueName: z.string().optional(),
  fromNumber: z.string(),
  waitSeconds: z.number().int(),
  at: z.string().datetime().or(z.date()),
});

export const VozBuzonRecibidoPayloadSchema = z.object({
  voicemailId: z.string(),
  callId: z.string(),
  organizationId: z.string(),
  extensionId: z.string().optional(),
  queueId: z.string().optional(),
  fromNumber: z.string(),
  durationSeconds: z.number(),
  storageKey: z.string(),
  at: z.string().datetime().or(z.date()),
});

export const VozBuzonSinDevolverPayloadSchema = z.object({
  voicemailId: z.string(),
  organizationId: z.string(),
  extensionId: z.string().optional(),
  queueId: z.string().optional(),
  fromNumber: z.string(),
  hoursPending: z.number(),
  receivedAt: z.string().datetime().or(z.date()),
});

export const VozColaSaturadaPayloadSchema = z.object({
  queueId: z.string(),
  organizationId: z.string(),
  queueName: z.string(),
  currentCallers: z.number().int(),
  maxCallers: z.number().int(),
  at: z.string().datetime().or(z.date()),
});

export const VozColaSinAgentesPayloadSchema = z.object({
  queueId: z.string(),
  organizationId: z.string(),
  queueName: z.string(),
  waitingCallers: z.number().int(),
  at: z.string().datetime().or(z.date()),
});

export const VozEsperaExcesivaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  queueId: z.string(),
  queueName: z.string().optional(),
  waitSeconds: z.number().int(),
  maxWaitSeconds: z.number().int(),
  at: z.string().datetime().or(z.date()),
});

export const VozAgenteNoContestaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  extension: z.string().optional(),
  queueId: z.string().optional(),
  ringSeconds: z.number().int(),
  at: z.string().datetime().or(z.date()),
});

export const VozGrabacionListaPayloadSchema = z.object({
  recordingId: z.string(),
  callId: z.string(),
  organizationId: z.string(),
  storageKey: z.string(),
  durationSeconds: z.number(),
  channels: z.enum(['MONO_MIXED', 'DUAL_STEREO']),
  at: z.string().datetime().or(z.date()),
});

export const VozTranscripcionListaPayloadSchema = z.object({
  transcriptId: z.string(),
  callId: z.string(),
  organizationId: z.string(),
  recordingId: z.string().optional(),
  language: z.string().default('es-CO'),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED']).optional(),
  summary: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozIaAtendioPayloadSchema = z.object({
  sessionId: z.string(),
  callId: z.string(),
  organizationId: z.string(),
  agentConfigId: z.string().optional(),
  intent: z.string().optional(),
  turnsCount: z.number().int(),
  resolved: z.boolean(),
  at: z.string().datetime().or(z.date()),
});

export const VozIaEscaloPayloadSchema = z.object({
  sessionId: z.string(),
  callId: z.string(),
  organizationId: z.string(),
  reason: z.string(),
  targetQueueId: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozTroncalCaidaPayloadSchema = z.object({
  trunkId: z.string(),
  organizationId: z.string(),
  trunkName: z.string(),
  provider: z.string(),
  errorDetail: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozTroncalRestablecidaPayloadSchema = z.object({
  trunkId: z.string(),
  organizationId: z.string(),
  trunkName: z.string(),
  downtimeMinutes: z.number().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VozExtensionDesregistradaPayloadSchema = z.object({
  extensionId: z.string(),
  organizationId: z.string(),
  extension: z.string(),
  userId: z.string().optional(),
  sipUsername: z.string(),
  at: z.string().datetime().or(z.date()),
});

export const VozCampanaFinalizadaPayloadSchema = z.object({
  campaignId: z.string(),
  organizationId: z.string(),
  campaignName: z.string(),
  totalContacts: z.number().int(),
  answeredCount: z.number().int(),
  failedCount: z.number().int(),
  completedAt: z.string().datetime().or(z.date()),
});

export const VozNumeroEnListaNoLlamarPayloadSchema = z.object({
  phone: z.string(),
  organizationId: z.string(),
  campaignId: z.string().optional(),
  customerId: z.string().optional(),
  reason: z.string(),
  at: z.string().datetime().or(z.date()),
});

export const VozLlamadaFueraDeHorarioBloqueadaPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string(),
  fromNumber: z.string(),
  toNumber: z.string(),
  scheduleId: z.string().optional(),
  at: z.string().datetime().or(z.date()),
});

export const VOICE_EVENT_CATALOG = {
  'voz.llamada_entrante': {
    eventName: 'voz.llamada_entrante',
    version: 1,
    schema: VozLlamadaEntrantePayloadSchema,
    description: 'Ingresó una llamada entrante a través de un DID o troncal',
  },
  'voz.llamada_contestada': {
    eventName: 'voz.llamada_contestada',
    version: 1,
    schema: VozLlamadaContestadaPayloadSchema,
    description: 'La llamada fue atendida por un agente o extensión',
  },
  'voz.llamada_perdida': {
    eventName: 'voz.llamada_perdida',
    version: 1,
    schema: VozLlamadaPerdidaPayloadSchema,
    description: 'Una llamada entrante no fue respondida antes de cortar',
  },
  'voz.llamada_finalizada': {
    eventName: 'voz.llamada_finalizada',
    version: 1,
    schema: VozLlamadaFinalizadaPayloadSchema,
    description: 'La llamada terminó y se computaron sus métricas de duración',
  },
  'voz.llamada_abandonada_en_cola': {
    eventName: 'voz.llamada_abandonada_en_cola',
    version: 1,
    schema: VozLlamadaAbandonadaEnColaPayloadSchema,
    description: 'El llamante colgó mientras esperaba en la cola ACD',
  },
  'voz.buzon_recibido': {
    eventName: 'voz.buzon_recibido',
    version: 1,
    schema: VozBuzonRecibidoPayloadSchema,
    description: 'Se grabó un nuevo mensaje de voz en el buzón',
  },
  'voz.buzon_sin_devolver': {
    eventName: 'voz.buzon_sin_devolver',
    version: 1,
    schema: VozBuzonSinDevolverPayloadSchema,
    description: 'Alerta periódica de buzón de voz sin llamada de respuesta',
  },
  'voz.cola_saturada': {
    eventName: 'voz.cola_saturada',
    version: 1,
    schema: VozColaSaturadaPayloadSchema,
    description: 'La cantidad de llamadas esperando en cola llegó al límite máximo',
  },
  'voz.cola_sin_agentes': {
    eventName: 'voz.cola_sin_agentes',
    version: 1,
    schema: VozColaSinAgentesPayloadSchema,
    description: 'Hay llamadas esperando en cola pero ningún agente disponible',
  },
  'voz.espera_excesiva': {
    eventName: 'voz.espera_excesiva',
    version: 1,
    schema: VozEsperaExcesivaPayloadSchema,
    description: 'El tiempo de espera superó el umbral configurado de SLA',
  },
  'voz.agente_no_contesta': {
    eventName: 'voz.agente_no_contesta',
    version: 1,
    schema: VozAgenteNoContestaPayloadSchema,
    description: 'La llamada timbró a un agente y expiró sin respuesta (no-answer)',
  },
  'voz.grabacion_lista': {
    eventName: 'voz.grabacion_lista',
    version: 1,
    schema: VozGrabacionListaPayloadSchema,
    description: 'El archivo de audio de la grabación fue procesado y guardado en MinIO',
  },
  'voz.transcripcion_lista': {
    eventName: 'voz.transcripcion_lista',
    version: 1,
    schema: VozTranscripcionListaPayloadSchema,
    description: 'La transcripción y análisis semántico de la llamada están completos',
  },
  'voz.ia_atendio': {
    eventName: 'voz.ia_atendio',
    version: 1,
    schema: VozIaAtendioPayloadSchema,
    description: 'El agente de voz de IA completó la atención de la llamada',
  },
  'voz.ia_escalo': {
    eventName: 'voz.ia_escalo',
    version: 1,
    schema: VozIaEscaloPayloadSchema,
    description: 'El agente de voz de IA transfirió la llamada a un humano o cola',
  },
  'voz.troncal_caida': {
    eventName: 'voz.troncal_caida',
    version: 1,
    schema: VozTroncalCaidaPayloadSchema,
    description: 'Pérdida de registro o conectividad SIP con la troncal',
  },
  'voz.troncal_restablecida': {
    eventName: 'voz.troncal_restablecida',
    version: 1,
    schema: VozTroncalRestablecidaPayloadSchema,
    description: 'Conectividad SIP y registro restablecidos con la troncal',
  },
  'voz.extension_desregistrada': {
    eventName: 'voz.extension_desregistrada',
    version: 1,
    schema: VozExtensionDesregistradaPayloadSchema,
    description: 'Un endpoint WebRTC o teléfono SIP perdió el registro',
  },
  'voz.campana_finalizada': {
    eventName: 'voz.campana_finalizada',
    version: 1,
    schema: VozCampanaFinalizadaPayloadSchema,
    description: 'Todos los contactos de la campaña fueron procesados',
  },
  'voz.numero_en_lista_no_llamar': {
    eventName: 'voz.numero_en_lista_no_llamar',
    version: 1,
    schema: VozNumeroEnListaNoLlamarPayloadSchema,
    description: 'Se evitó marcar un número registrado en la lista Robinson / DNC',
  },
  'voz.llamada_fuera_de_horario_bloqueada': {
    eventName: 'voz.llamada_fuera_de_horario_bloqueada',
    version: 1,
    schema: VozLlamadaFueraDeHorarioBloqueadaPayloadSchema,
    description: 'Se aplicó regla de fuera de horario laboral o festivo colombiano',
  },
} as const;

export type VoiceEventName = keyof typeof VOICE_EVENT_CATALOG;

// ============================================================================
// ETAPA 18.1 — ESQUEMAS Y CATÁLOGO DE EVENTOS DE TARIFARIO Y AYUDA A COTIZAR
// ============================================================================

export const TarifarioVersionCreadaPayloadSchema = z.object({
  versionId: z.string(),
  code: z.string(),
  organizationId: z.string(),
  createdById: z.string(),
});

export const TarifarioVersionPublicadaPayloadSchema = z.object({
  versionId: z.string(),
  code: z.string(),
  validFrom: z.string().datetime().or(z.date()),
  cambios: z.number().int(),
  organizationId: z.string(),
  publishedById: z.string(),
});

export const TarifarioVersionArchivadaPayloadSchema = z.object({
  versionId: z.string(),
  code: z.string(),
  organizationId: z.string(),
  archivedById: z.string(),
});

export const TarifarioPrecioActualizadoPayloadSchema = z.object({
  versionId: z.string(),
  tabla: z.string(),
  itemId: z.string(),
  anterior: z.union([z.number(), z.string()]),
  nuevo: z.union([z.number(), z.string()]),
  organizationId: z.string(),
  updatedById: z.string(),
});

export const TarifarioImportacionCompletadaPayloadSchema = z.object({
  versionId: z.string(),
  archivo: z.string(),
  filas: z.number().int(),
  errores: z.array(z.string()).default([]),
  organizationId: z.string(),
});

export const CotizacionAyudaEjecutadaPayloadSchema = z.object({
  assistRunId: z.string(),
  quoteId: z.string().optional(),
  technique: z.string(),
  cantidades: z.array(z.number().int()),
  organizationId: z.string(),
  userId: z.string(),
});

export const CotizacionItemsDesdeAyudaPayloadSchema = z.object({
  quoteId: z.string(),
  itemIds: z.array(z.string()),
  assistRunId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
});

export const TARIFF_EVENT_CATALOG = {
  'tarifario.version_creada': {
    eventName: 'tarifario.version_creada',
    version: 1,
    schema: TarifarioVersionCreadaPayloadSchema,
    description: 'Se creó una nueva versión del tarifario de producción en borrador',
  },
  'tarifario.version_publicada': {
    eventName: 'tarifario.version_publicada',
    version: 1,
    schema: TarifarioVersionPublicadaPayloadSchema,
    description: 'Se publicó oficialmente una versión del tarifario de producción',
  },
  'tarifario.version_archivada': {
    eventName: 'tarifario.version_archivada',
    version: 1,
    schema: TarifarioVersionArchivadaPayloadSchema,
    description: 'Se archivó una versión anterior del tarifario',
  },
  'tarifario.precio_actualizado': {
    eventName: 'tarifario.precio_actualizado',
    version: 1,
    schema: TarifarioPrecioActualizadoPayloadSchema,
    description: 'Se modificó un precio o factor en una tabla del tarifario en borrador',
  },
  'tarifario.importacion_completada': {
    eventName: 'tarifario.importacion_completada',
    version: 1,
    schema: TarifarioImportacionCompletadaPayloadSchema,
    description: 'Finalizó la importación masiva de tablas de costos desde Excel',
  },
  'cotizacion.ayuda_ejecutada': {
    eventName: 'cotizacion.ayuda_ejecutada',
    version: 1,
    schema: CotizacionAyudaEjecutadaPayloadSchema,
    description: 'El asistente calculó los costos y precios para una o varias cantidades',
  },
  'cotizacion.items_desde_ayuda': {
    eventName: 'cotizacion.items_desde_ayuda',
    version: 1,
    schema: CotizacionItemsDesdeAyudaPayloadSchema,
    description: 'Se incorporaron ítems técnicos y sus especificaciones a la cotización',
  },
} as const;

export type TariffEventName = keyof typeof TARIFF_EVENT_CATALOG;

export const FULL_EVENT_CATALOG = {
  ...COLLABORATION_EVENT_CATALOG,
  ...VOICE_EVENT_CATALOG,
  ...TARIFF_EVENT_CATALOG,
} as const;

export type FullEventName = keyof typeof FULL_EVENT_CATALOG;

