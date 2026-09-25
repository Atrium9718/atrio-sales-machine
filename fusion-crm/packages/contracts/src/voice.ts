import { z } from 'zod';

export const VoiceCallStateSchema = z.enum([
  'CREATED',
  'RINGING',
  'IN_IVR',
  'IN_QUEUE',
  'IN_AI',
  'CONNECTED',
  'ON_HOLD',
  'TRANSFERRING',
  'VOICEMAIL',
  'ABANDONED',
  'COMPLETED',
  'FAILED',
]);

export const VoiceCustomerContextSchema = z.object({
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  customerTemperature: z.enum(['COLD', 'WARM', 'HOT', 'VIP']).nullable(),
  contactId: z.string().nullable(),
  contactName: z.string().nullable(),
  contactRole: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
  openQuotes: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      totalAmount: z.number(),
      status: z.string(),
    })
  ),
  productionProjects: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      stage: z.string(),
      committedDeliveryDate: z.string().nullable(),
    })
  ),
  financials: z
    .object({
      overdueBalance: z.number(),
      hasOverdueInvoices: z.boolean(),
    })
    .nullable(), // Solo se incluye si el usuario tiene permiso cost:read
  recentCalls: z.array(
    z.object({
      id: z.string(),
      startedAt: z.string(),
      durationSeconds: z.number(),
      summary: z.string().nullable(),
      disposition: z.string().nullable(),
    })
  ),
  openTasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueAt: z.string().nullable(),
    })
  ),
  isAmbiguous: z.boolean().default(false),
  ambiguousMatchesCount: z.number().default(0),
});

export type VoiceCustomerContext = z.infer<typeof VoiceCustomerContextSchema>;

// Mensaje para el canal voice:user:{userId}
export const UserCallNotificationSchema = z.object({
  event: z.enum([
    'voice.incoming_call',
    'voice.call_answered',
    'voice.call_hold',
    'voice.call_unhold',
    'voice.call_transferring',
    'voice.call_ended',
    'voice.agent_status_changed',
  ]),
  callId: z.string(),
  channelId: z.string(),
  organizationId: z.string(),
  fromNumber: z.string(),
  displayNumber: z.string(),
  state: VoiceCallStateSchema,
  direction: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']),
  context: VoiceCustomerContextSchema.nullable(),
  timestamp: z.string(),
  waitSeconds: z.number().default(0),
  talkSeconds: z.number().default(0),
});

export type UserCallNotification = z.infer<typeof UserCallNotificationSchema>;

// Mensaje para el canal voice:queue:{queueId}
export const QueueStateNotificationSchema = z.object({
  event: z.literal('voice.queue_updated'),
  queueId: z.string(),
  organizationId: z.string(),
  waitingCallsCount: z.number(),
  longestWaitSeconds: z.number(),
  activeAgentsCount: z.number(),
  timestamp: z.string(),
});

export type QueueStateNotification = z.infer<typeof QueueStateNotificationSchema>;

// Mensaje para el canal voice:org:{orgId}
export const OrgSupervisorNotificationSchema = z.object({
  event: z.enum([
    'voice.call_started',
    'voice.call_ended',
    'voice.trunk_status_changed',
    'voice.orphan_call_cleaned',
  ]),
  organizationId: z.string(),
  callId: z.string().optional(),
  channelId: z.string().optional(),
  trunkId: z.string().optional(),
  trunkStatus: z.enum(['UNKNOWN', 'REGISTERED', 'UNREGISTERED', 'FAILED']).optional(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export type OrgSupervisorNotification = z.infer<typeof OrgSupervisorNotificationSchema>;

// Contrato de Credenciales Efímeras de Softphone WebRTC (Etapa 17.4)
export const SoftphoneCredentialsSchema = z.object({
  extension: z.string(),
  sipUsername: z.string(),
  sipPassword: z.string(), // Solo en memoria volátil
  wssUrl: z.string(),
  sipDomain: z.string(),
  displayName: z.string(),
  callerIdDefault: z.string(),
  expiresAt: z.string(),
  iceServers: z.array(
    z.object({
      urls: z.union([z.string(), z.array(z.string())]),
      username: z.string().optional(),
      credential: z.string().optional(),
    })
  ),
});

export type SoftphoneCredentials = z.infer<typeof SoftphoneCredentialsSchema>;

export const AgentStatusTypeSchema = z.enum([
  'DISPONIBLE',
  'OCUPADO',
  'EN_PAUSA',
  'DESCONECTADO',
]);

export type AgentStatusType = z.infer<typeof AgentStatusTypeSchema>;

export const AgentPauseReasonSchema = z.enum([
  'ALMUERZO',
  'REUNION',
  'DESCANSO',
  'CAPACITACION',
  'OTRO',
]);

export type AgentPauseReason = z.infer<typeof AgentPauseReasonSchema>;

export const AgentStatusRecordSchema = z.object({
  userId: z.string(),
  status: AgentStatusTypeSchema,
  reason: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export type AgentStatusRecord = z.infer<typeof AgentStatusRecordSchema>;
