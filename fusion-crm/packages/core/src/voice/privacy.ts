/**
 * Gobierno y Reglas Críticas de Privacidad de Voz (Etapa 17.1)
 *
 * REGLA CRÍTICA DE PRIVACIDAD:
 * - voice:listen_recording NO implica poder oír cualquier grabación:
 *   solo las llamadas que el alcance de lectura del usuario le permite ver.
 * - Ningún rol lee por defecto la grabación de una llamada de otro.
 *   Oír una llamada ajena exige voice:read_team o voice:read_all Y queda
 *   registrado en AuditLog con la acción VOICE_RECORDING_PLAYED, siempre, sin excepción.
 * - La escucha en vivo (voice:supervise) y la irrupción (voice:barge) también quedan auditadas,
 *   con quién, a quién y cuándo (VOICE_SUPERVISE_STARTED, VOICE_BARGE_STARTED).
 */

import { can, UserLike } from '../auth/permissions';

export const VOICE_AUDIT_ACTIONS = {
  RECORDING_PLAYED: 'VOICE_RECORDING_PLAYED',
  RECORDING_DOWNLOADED: 'VOICE_RECORDING_DOWNLOADED',
  RECORDING_DELETED: 'VOICE_RECORDING_DELETED',
  SUPERVISE_STARTED: 'VOICE_SUPERVISE_STARTED',
  SUPERVISE_STOPPED: 'VOICE_SUPERVISE_STOPPED',
  BARGE_STARTED: 'VOICE_BARGE_STARTED',
  BARGE_STOPPED: 'VOICE_BARGE_STOPPED',
} as const;

export type VoiceAuditAction = (typeof VOICE_AUDIT_ACTIONS)[keyof typeof VOICE_AUDIT_ACTIONS];

export interface CallForAccessEvaluation {
  id: string;
  handledByUserId?: string | null;
  organizationId: string;
  teamId?: string | null;
  direction?: string;
  recordingId?: string | null;
}

export interface UserVoiceContext {
  id: string;
  organizationId: string;
  teamIds?: string[];
  permissions?: string[];
  role?: string | { key: string; permissions?: string[] };
}

export interface RecordingAccessResult {
  allowed: boolean;
  reason?: string;
  auditRequired: boolean;
  auditAction?: VoiceAuditAction;
  auditMetadata?: Record<string, any>;
}

/**
 * Evalúa si un usuario puede reproducir o acceder a la grabación de una llamada.
 */
export function evaluateRecordingAccess(
  user: UserVoiceContext,
  call: CallForAccessEvaluation
): RecordingAccessResult {
  // 1. Debe tener el permiso base para escuchar grabaciones
  if (!can(user, 'voice:listen_recording')) {
    return {
      allowed: false,
      reason: 'No tiene el permiso requerido (voice:listen_recording) para reproducir grabaciones.',
      auditRequired: false,
    };
  }

  const isOwnCall = call.handledByUserId === user.id;

  // 2. Si es su propia llamada, requiere voice:read_own
  if (isOwnCall) {
    if (can(user, 'voice:read_own') || can(user, 'voice:read_team') || can(user, 'voice:read_all')) {
      return {
        allowed: true,
        auditRequired: true,
        auditAction: VOICE_AUDIT_ACTIONS.RECORDING_PLAYED,
        auditMetadata: {
          callId: call.id,
          targetUserId: call.handledByUserId,
          isOwnCall: true,
          scope: 'own',
        },
      };
    }

    return {
      allowed: false,
      reason: 'No tiene permiso para consultar sus propias llamadas (voice:read_own).',
      auditRequired: false,
    };
  }

  // 3. Si es una llamada ajena, NUNCA se permite por defecto sin read_team o read_all
  if (can(user, 'voice:read_all')) {
    return {
      allowed: true,
      auditRequired: true,
      auditAction: VOICE_AUDIT_ACTIONS.RECORDING_PLAYED,
      auditMetadata: {
        callId: call.id,
        targetUserId: call.handledByUserId,
        isOwnCall: false,
        scope: 'organization_all',
      },
    };
  }

  if (can(user, 'voice:read_team')) {
    const sharesTeam =
      Boolean(call.teamId && user.teamIds?.includes(call.teamId));

    if (sharesTeam || !call.teamId) {
      return {
        allowed: true,
        auditRequired: true,
        auditAction: VOICE_AUDIT_ACTIONS.RECORDING_PLAYED,
        auditMetadata: {
          callId: call.id,
          targetUserId: call.handledByUserId,
          isOwnCall: false,
          scope: 'team',
          teamId: call.teamId,
        },
      };
    }
  }

  return {
    allowed: false,
    reason:
      'Límite de privacidad estricto: no puede acceder a las grabaciones de llamadas de otros agentes sin voice:read_team o voice:read_all.',
    auditRequired: false,
  };
}

/**
 * Valida y genera el payload de auditoría para supervisión en vivo (whisper / spy).
 */
export function evaluateSupervisionAccess(
  user: UserVoiceContext,
  targetCall: CallForAccessEvaluation
): { allowed: boolean; reason?: string; auditAction?: VoiceAuditAction; auditMetadata?: Record<string, any> } {
  if (!can(user, 'voice:supervise')) {
    return {
      allowed: false,
      reason: 'Permiso denegado: se requiere voice:supervise para monitoreo en vivo.',
    };
  }

  return {
    allowed: true,
    auditAction: VOICE_AUDIT_ACTIONS.SUPERVISE_STARTED,
    auditMetadata: {
      callId: targetCall.id,
      supervisorUserId: user.id,
      agentUserId: targetCall.handledByUserId,
      startedAt: new Date().toISOString(),
    },
  };
}

/**
 * Valida y genera el payload de auditoría para irrupción en vivo (barge).
 */
export function evaluateBargeAccess(
  user: UserVoiceContext,
  targetCall: CallForAccessEvaluation
): { allowed: boolean; reason?: string; auditAction?: VoiceAuditAction; auditMetadata?: Record<string, any> } {
  if (!can(user, 'voice:barge')) {
    return {
      allowed: false,
      reason: 'Permiso denegado: se requiere voice:barge para realizar irrupción en llamadas.',
    };
  }

  return {
    allowed: true,
    auditAction: VOICE_AUDIT_ACTIONS.BARGE_STARTED,
    auditMetadata: {
      callId: targetCall.id,
      supervisorUserId: user.id,
      agentUserId: targetCall.handledByUserId,
      startedAt: new Date().toISOString(),
    },
  };
}
