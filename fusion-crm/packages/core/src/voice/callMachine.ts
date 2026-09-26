/**
 * Máquina de Estados Finita Pura para el Ciclo de Vida de Llamadas (VoiceCall).
 * Sub-Etapa 17.3 — Bloque C.
 *
 * Transiciones declaradas y estrictas:
 *   CREATED → RINGING → {IN_IVR | IN_QUEUE | IN_AI | CONNECTED}
 *   IN_IVR → {IN_QUEUE | IN_AI | CONNECTED | VOICEMAIL | COMPLETED}
 *   IN_QUEUE → {CONNECTED | VOICEMAIL | ABANDONED | IN_AI}
 *   CONNECTED → {ON_HOLD | TRANSFERRING | COMPLETED}
 *   ON_HOLD → {CONNECTED | COMPLETED}
 *   TRANSFERRING → {CONNECTED | COMPLETED | FAILED}
 *   CUALQUIER ESTADO → {COMPLETED | FAILED} (por colgado del abonado, asesor o error de canal)
 */

import { VoiceInvalidStateTransitionError } from './errors';

export type VoiceCallState =
  | 'CREATED'
  | 'RINGING'
  | 'IN_IVR'
  | 'IN_QUEUE'
  | 'IN_AI'
  | 'CONNECTED'
  | 'ON_HOLD'
  | 'TRANSFERRING'
  | 'VOICEMAIL'
  | 'ABANDONED'
  | 'COMPLETED'
  | 'FAILED';

export interface CallMachineSnapshot {
  readonly callId: string;
  readonly state: VoiceCallState;
  readonly previousState?: VoiceCallState;
  readonly startedAt: Date;
  readonly answeredAt?: Date;
  readonly endedAt?: Date;
  readonly waitSeconds: number;
  readonly talkSeconds: number;
  readonly holdSeconds: number;
  readonly totalSeconds: number;
  readonly history: ReadonlyArray<{
    readonly from: VoiceCallState;
    readonly to: VoiceCallState;
    readonly at: Date;
    readonly reason?: string;
    readonly payload?: Record<string, unknown>;
  }>;
}

export interface TransitionPayload {
  readonly reason?: string;
  readonly actorUserId?: string;
  readonly hangupCause?: string;
  readonly bridgeId?: string;
  readonly channelId?: string;
  readonly extra?: Record<string, unknown>;
}

export interface TransitionResult {
  readonly snapshot: CallMachineSnapshot;
  readonly event: {
    readonly type: string;
    readonly from: VoiceCallState;
    readonly to: VoiceCallState;
    readonly at: Date;
    readonly actorUserId?: string;
    readonly payload: Record<string, unknown>;
  };
}

/**
 * Tabla exhaustiva de transiciones permitidas.
 * Cualquier transición no declarada aquí disparará VoiceInvalidStateTransitionError.
 */
const VALID_TRANSITIONS: Readonly<Record<VoiceCallState, ReadonlySet<VoiceCallState>>> = {
  CREATED: new Set<VoiceCallState>(['RINGING', 'COMPLETED', 'FAILED']),
  RINGING: new Set<VoiceCallState>([
    'IN_IVR',
    'IN_QUEUE',
    'IN_AI',
    'CONNECTED',
    'VOICEMAIL',
    'ABANDONED',
    'COMPLETED',
    'FAILED',
  ]),
  IN_IVR: new Set<VoiceCallState>([
    'IN_QUEUE',
    'IN_AI',
    'CONNECTED',
    'VOICEMAIL',
    'ABANDONED',
    'COMPLETED',
    'FAILED',
  ]),
  IN_QUEUE: new Set<VoiceCallState>([
    'CONNECTED',
    'VOICEMAIL',
    'ABANDONED',
    'IN_AI', // Desborde a agente de IA si la cola excede tiempo máximo
    'COMPLETED',
    'FAILED',
  ]),
  IN_AI: new Set<VoiceCallState>([
    'IN_QUEUE', // Handoff de IA a cola humana
    'CONNECTED', // Handoff directo a un asesor
    'VOICEMAIL',
    'COMPLETED',
    'FAILED',
  ]),
  CONNECTED: new Set<VoiceCallState>([
    'ON_HOLD',
    'TRANSFERRING',
    'COMPLETED',
    'FAILED',
  ]),
  ON_HOLD: new Set<VoiceCallState>([
    'CONNECTED', // Reanudar llamada
    'TRANSFERRING', // Pasar de espera a transferir
    'COMPLETED',
    'FAILED',
  ]),
  TRANSFERRING: new Set<VoiceCallState>([
    'CONNECTED', // Transferencia completada exitosamente
    'ON_HOLD', // Si la transferencia falló y regresa al asesor en espera
    'COMPLETED',
    'FAILED',
  ]),
  VOICEMAIL: new Set<VoiceCallState>([
    'COMPLETED',
    'FAILED',
  ]),
  ABANDONED: new Set<VoiceCallState>([
    'COMPLETED', // Cierre final de ciclo
  ]),
  COMPLETED: new Set<VoiceCallState>([]), // Estado terminal
  FAILED: new Set<VoiceCallState>([]), // Estado terminal
};

/**
 * Verifica de forma pura si una transición es válida.
 */
export function canTransition(from: VoiceCallState, to: VoiceCallState): boolean {
  if (from === to) return true; // idempotente
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.has(to) : false;
}

/**
 * Valida la transición lanzando una excepción si es ilegal.
 */
export function assertValidTransition(from: VoiceCallState, to: VoiceCallState, callId?: string): void {
  if (!canTransition(from, to)) {
    throw new VoiceInvalidStateTransitionError(from, to, callId);
  }
}

/**
 * Crea el snapshot inicial de una llamada en la máquina de estados.
 */
export function createCallSnapshot(callId: string, initialTimestamp = new Date()): CallMachineSnapshot {
  return {
    callId,
    state: 'CREATED',
    startedAt: initialTimestamp,
    waitSeconds: 0,
    talkSeconds: 0,
    holdSeconds: 0,
    totalSeconds: 0,
    history: [],
  };
}

/**
 * Ejecuta una transición pura sobre el snapshot de la llamada.
 * Devuelve el nuevo snapshot inmutable y el evento generado para la auditoría.
 */
export function transitionCall(
  current: CallMachineSnapshot,
  targetState: VoiceCallState,
  payload: TransitionPayload = {},
  timestamp = new Date()
): TransitionResult {
  assertValidTransition(current.state, targetState, current.callId);

  // Si es auto-transición sin cambio de estado, no genera evento duplicado
  if (current.state === targetState) {
    return {
      snapshot: current,
      event: {
        type: `NOOP_${targetState}`,
        from: current.state,
        to: targetState,
        at: timestamp,
        actorUserId: payload.actorUserId,
        payload: { ...payload.extra, reason: payload.reason },
      },
    };
  }

  const nowMs = timestamp.getTime();
  const startMs = current.startedAt.getTime();
  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));

  let answeredAt = current.answeredAt;
  let waitSeconds = current.waitSeconds;
  let talkSeconds = current.talkSeconds;
  let holdSeconds = current.holdSeconds;
  let endedAt = current.endedAt;

  // Si entra al estado CONNECTED por primera vez: registrar answeredAt y waitSeconds
  if (targetState === 'CONNECTED' && !answeredAt) {
    answeredAt = timestamp;
    waitSeconds = totalSeconds;
  }

  // Si la llamada finaliza
  if (targetState === 'COMPLETED' || targetState === 'FAILED' || targetState === 'ABANDONED') {
    endedAt = timestamp;
    if (answeredAt) {
      talkSeconds = Math.max(0, Math.floor((nowMs - answeredAt.getTime()) / 1000) - holdSeconds);
    }
  }

  const newHistory = [
    ...current.history,
    {
      from: current.state,
      to: targetState,
      at: timestamp,
      reason: payload.reason,
      payload: payload.extra,
    },
  ];

  const nextSnapshot: CallMachineSnapshot = {
    callId: current.callId,
    state: targetState,
    previousState: current.state,
    startedAt: current.startedAt,
    answeredAt,
    endedAt,
    waitSeconds,
    talkSeconds,
    holdSeconds,
    totalSeconds,
    history: newHistory,
  };

  // Mapear el evento correspondiente para persistir en VoiceCallEvent
  const eventType = mapStateToEventType(current.state, targetState);

  return {
    snapshot: nextSnapshot,
    event: {
      type: eventType,
      from: current.state,
      to: targetState,
      at: timestamp,
      actorUserId: payload.actorUserId,
      payload: {
        ...payload.extra,
        reason: payload.reason,
        hangupCause: payload.hangupCause,
        bridgeId: payload.bridgeId,
        channelId: payload.channelId,
        durationSeconds: totalSeconds,
      },
    },
  };
}

function mapStateToEventType(from: VoiceCallState, to: VoiceCallState): string {
  if (to === 'RINGING') return 'RINGING';
  if (to === 'IN_IVR') return 'IVR_ENTERED';
  if (to === 'IN_QUEUE') return 'QUEUE_ENTERED';
  if (to === 'IN_AI') return 'AI_STARTED';
  if (to === 'CONNECTED') {
    return from === 'ON_HOLD' ? 'UNHOLD' : 'ANSWERED';
  }
  if (to === 'ON_HOLD') return 'HOLD';
  if (to === 'TRANSFERRING') return 'TRANSFER_ATTENDED';
  if (to === 'VOICEMAIL') return 'VOICEMAIL_STARTED';
  if (to === 'ABANDONED') return 'HANGUP';
  if (to === 'COMPLETED' || to === 'FAILED') return 'HANGUP';
  return `STATE_CHANGED_TO_${to}`;
}
