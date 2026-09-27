import { canTransition, transitionCall, VoiceCallState } from '@fusion/core/src/voice/callMachine';
import { ActiveCall, callRegistry } from './registry';
import { persistence } from '../services/persist';
import { telemetry } from '../telemetry';

export type Disposition = 'ANSWERED' | 'MISSED' | 'ABANDONED_IN_QUEUE' | 'VOICEMAIL_LEFT' | 'HANDLED_BY_AI' | 'FAILED' | 'CANCELLED';

type Payload = Parameters<typeof transitionCall>[2];

/** Cambia el estado de la llamada y lo guarda. Una transición no permitida se registra y se ignora. */
export function moveCall(call: ActiveCall, to: VoiceCallState, payload: Payload = {}): boolean {
  if (!canTransition(call.machine.state, to)) {
    telemetry.log('WARN', `Transición ignorada en ${call.callId}: ${call.machine.state} → ${to}`);
    return false;
  }
  if (call.machine.state === to) return true;
  const t = transitionCall(call.machine, to, payload);
  call.machine = t.snapshot;
  persistence.persistCallTransition(call.callId, call.organizationId, t.event, t.snapshot);
  return true;
}

/** Cierra la llamada una sola vez: estado final, resultado y salida de la memoria viva. */
export function finishCall(
  call: ActiveCall,
  disposition: Disposition,
  cause = 'NORMAL_CLEARING',
  hangupBy: 'CALLER' | 'AGENT' | 'SYSTEM' | 'UNKNOWN' = 'UNKNOWN'
): void {
  if (call.finished) return;
  call.finished = true;
  if (canTransition(call.machine.state, 'COMPLETED') && call.machine.state !== 'COMPLETED') {
    call.machine = transitionCall(call.machine, 'COMPLETED', { reason: disposition, hangupCause: cause }).snapshot;
  }
  persistence.persistCallCompletion(call, disposition, cause, hangupBy);
  telemetry.recordCallCompleted(disposition !== 'ANSWERED');
  callRegistry.removeCall(call.callId);
}
