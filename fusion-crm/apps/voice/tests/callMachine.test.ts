import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCallSnapshot,
  transitionCall,
  canTransition,
  VoiceCallState,
} from '@fusion/core/voice/callMachine';
import { VoiceInvalidStateTransitionError } from '@fusion/core/voice/errors';

describe('Máquina de Estados de Llamadas (callMachine)', () => {
  it('1. Ciclo de vida completo exitoso: CREATED -> RINGING -> CONNECTED -> COMPLETED', () => {
    const start = new Date(1000000);
    const snap0 = createCallSnapshot('call-1', start);
    assert.equal(snap0.state, 'CREATED');

    // Transición a RINGING
    const t1 = transitionCall(snap0, 'RINGING', {}, new Date(1005000));
    assert.equal(t1.snapshot.state, 'RINGING');
    assert.equal(t1.event.type, 'RINGING');

    // Transición a CONNECTED (5 segundos después)
    const t2 = transitionCall(t1.snapshot, 'CONNECTED', {}, new Date(1010000));
    assert.equal(t2.snapshot.state, 'CONNECTED');
    assert.equal(t2.snapshot.waitSeconds, 10);
    assert.ok(t2.snapshot.answeredAt);
    assert.equal(t2.event.type, 'ANSWERED');

    // Transición a COMPLETED (30 segundos después)
    const t3 = transitionCall(t2.snapshot, 'COMPLETED', { reason: 'normal_hangup' }, new Date(1040000));
    assert.equal(t3.snapshot.state, 'COMPLETED');
    assert.equal(t3.snapshot.totalSeconds, 40);
    assert.equal(t3.snapshot.talkSeconds, 30);
    assert.equal(t3.event.type, 'HANGUP');
  });

  it('2. Flujo con Espera (Hold): CONNECTED -> ON_HOLD -> CONNECTED', () => {
    const start = new Date(1000000);
    let snap = createCallSnapshot('call-2', start);
    snap = transitionCall(snap, 'RINGING', {}, new Date(1002000)).snapshot;
    snap = transitionCall(snap, 'CONNECTED', {}, new Date(1004000)).snapshot;

    // Poner en espera
    const tHold = transitionCall(snap, 'ON_HOLD', { reason: 'consult_specialist' }, new Date(1010000));
    assert.equal(tHold.snapshot.state, 'ON_HOLD');
    assert.equal(tHold.event.type, 'HOLD');

    // Reanudar
    const tUnhold = transitionCall(tHold.snapshot, 'CONNECTED', {}, new Date(1020000));
    assert.equal(tUnhold.snapshot.state, 'CONNECTED');
    assert.equal(tUnhold.event.type, 'UNHOLD');
  });

  it('3. Flujo IVR -> Cola -> Asesor', () => {
    let snap = createCallSnapshot('call-3');
    snap = transitionCall(snap, 'RINGING').snapshot;
    snap = transitionCall(snap, 'IN_IVR').snapshot;
    assert.equal(snap.state, 'IN_IVR');

    snap = transitionCall(snap, 'IN_QUEUE').snapshot;
    assert.equal(snap.state, 'IN_QUEUE');

    snap = transitionCall(snap, 'CONNECTED').snapshot;
    assert.equal(snap.state, 'CONNECTED');
  });

  it('4. Flujo IVR -> Agente de IA -> Asesor', () => {
    let snap = createCallSnapshot('call-4');
    snap = transitionCall(snap, 'RINGING').snapshot;
    snap = transitionCall(snap, 'IN_IVR').snapshot;
    snap = transitionCall(snap, 'IN_AI').snapshot;
    assert.equal(snap.state, 'IN_AI');

    snap = transitionCall(snap, 'CONNECTED').snapshot;
    assert.equal(snap.state, 'CONNECTED');
  });

  it('5. Flujo Transferencia: CONNECTED -> TRANSFERRING -> CONNECTED', () => {
    let snap = createCallSnapshot('call-5');
    snap = transitionCall(snap, 'RINGING').snapshot;
    snap = transitionCall(snap, 'CONNECTED').snapshot;

    const tTrans = transitionCall(snap, 'TRANSFERRING');
    assert.equal(tTrans.snapshot.state, 'TRANSFERRING');

    const tComplete = transitionCall(tTrans.snapshot, 'CONNECTED');
    assert.equal(tComplete.snapshot.state, 'CONNECTED');
  });

  it('6. Rechaza estrictamente transiciones ilegales y no muta el snapshot previo', () => {
    const illegalTransitions: [VoiceCallState, VoiceCallState][] = [
      ['COMPLETED', 'RINGING'],
      ['COMPLETED', 'CONNECTED'],
      ['FAILED', 'RINGING'],
      ['CREATED', 'CONNECTED'],
      ['CREATED', 'ON_HOLD'],
      ['CREATED', 'IN_IVR'],
      ['ON_HOLD', 'IN_QUEUE'],
      ['ON_HOLD', 'IN_IVR'],
      ['IN_QUEUE', 'ON_HOLD'],
      ['TRANSFERRING', 'IN_IVR'],
      ['VOICEMAIL', 'RINGING'],
    ];

    for (const [from, to] of illegalTransitions) {
      assert.equal(canTransition(from, to), false, `canTransition(${from}, ${to}) debe ser false`);

      // Probar que transitionCall lance VoiceInvalidStateTransitionError
      const dummySnap = {
        ...createCallSnapshot('call-illegal'),
        state: from,
      };

      assert.throws(
        () => {
          transitionCall(dummySnap, to);
        },
        (err: any) => {
          assert.ok(err instanceof VoiceInvalidStateTransitionError);
          assert.equal(err.fromState, from);
          assert.equal(err.toState, to);
          return true;
        },
        `Debe lanzar VoiceInvalidStateTransitionError para ${from} -> ${to}`
      );

      // Verificar que el estado original no fue mutado
      assert.equal(dummySnap.state, from);
    }
  });
});
