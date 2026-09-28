import { z } from 'zod';

export type CallSessionType = 'DIRECT' | 'GROUP' | 'CHANNEL' | 'MEETING';
export type CallSessionStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'CANCELLED' | 'FAILED';
export type CallParticipantRole = 'HOST' | 'PARTICIPANT' | 'VIEWER';
export type CallQuality = 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
export type CallInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface CallSession {
  id: string;
  organizationId: string;
  roomName: string;
  title?: string | null;
  type: CallSessionType;
  channelId?: string | null;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  startedById: string;
  startedByName?: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  status: CallSessionStatus;
  maxParticipants: number;
  hadScreenShare: boolean;
  isRecorded: boolean;
  recordingKey?: string | null;
  recordingUrl?: string | null;
  recordingConsentBy: string[];
  summary?: string | null;
  activityId?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: CallParticipant[];
  invitations: CallInvitation[];
}

export interface CallParticipant {
  id: string;
  callSessionId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  joinedAt: string;
  leftAt?: string | null;
  durationSeconds: number;
  role: CallParticipantRole;
  connectionQuality: CallQuality;
  device?: string | null;
  leftReason?: string | null;
}

export interface CallInvitation {
  id: string;
  callSessionId: string;
  invitedUserId: string;
  invitedUserName?: string;
  invitedById: string;
  sentAt: string;
  status: CallInvitationStatus;
  respondedAt?: string | null;
}

export const StartCallSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP', 'CHANNEL', 'MEETING']).default('DIRECT'),
  title: z.string().optional(),
  targetUserId: z.string().optional(),
  channelId: z.string().optional(),
  linkedEntityType: z.enum(['CLIENT', 'OPPORTUNITY', 'PRODUCTION_PROJECT', 'QUOTE']).optional(),
  linkedEntityId: z.string().optional(),
});

export type StartCallInput = z.infer<typeof StartCallSchema>;

export const CallTokenSchema = z.object({
  roomName: z.string().min(1, 'El nombre de la sala es requerido'),
});

export const RespondCallSchema = z.object({
  sessionId: z.string(),
  action: z.enum(['ANSWER', 'REJECT', 'MESSAGE']),
  declineMessage: z.string().optional(),
});

export const EndCallSchema = z.object({
  sessionId: z.string(),
  durationSeconds: z.number().int().nonnegative().optional().default(0),
  hadScreenShare: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

export const LeaveParticipantSchema = z.object({
  sessionId: z.string(),
  connectionQuality: z.enum(['GOOD', 'FAIR', 'POOR', 'UNKNOWN']).default('GOOD'),
  durationSeconds: z.number().int().nonnegative().default(0),
  device: z.string().optional(),
  leftReason: z.string().optional(),
});
