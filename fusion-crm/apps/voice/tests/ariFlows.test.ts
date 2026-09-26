import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AriSimulator } from './helpers/ariSimulator';
import { callRegistry, ActiveCall } from '../src/state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/voice/callMachine';

describe('Flujos de Llamadas Simulados con ARI (ariSimulator)', () => {
  let sim: AriSimulator;

  beforeEach(() => {
    callRegistry.clear();
    sim = new AriSimulator();
  });

  it('1. Inbound Contestada: StasisStart -> Answer -> Bridge -> Grabación -> Hangup', async () => {
    // 1. Simular canal entrante del operador
    const callerChannel = sim.createMockChannel({
      id: 'ch-inbound-1',
      callerNumber: '3001234567',
      exten: '6068801234',
    });

    const callId = 'call-test-answered';
    const startTime = new Date(Date.now() - 35000);
    const snapshot = createCallSnapshot(callId, startTime);

    const activeCall: ActiveCall = {
      callId,
      organizationId: 'org-test',
      correlationId: 'corr-1',
      channelId: callerChannel.id,
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: '+573001234567',
      toNumber: '6068801234',
      machine: snapshot,
      legalConsentAnnounced: true,
      startedAt: startTime,
    };

    callRegistry.registerCall(activeCall);

    // Timbrado
    activeCall.machine = transitionCall(activeCall.machine, 'RINGING', {
      channelId: callerChannel.id,
    }).snapshot;
    assert.equal(activeCall.machine.state, 'RINGING');

    // 2. Simular asesor contestando en su extensión
    const agentChannel = sim.createMockChannel({
      id: 'ch-agent-101',
      callerNumber: '101',
      state: 'Up',
    });
    callRegistry.linkChannelToCall(callId, agentChannel.id);

    // Conectar en mixing bridge
    const bridgeId = 'bridge-mix-1';
    callRegistry.setBridgeForCall(callId, bridgeId);

    activeCall.machine = transitionCall(activeCall.machine, 'CONNECTED', {
      channelId: agentChannel.id,
      bridgeId,
    }, new Date(Date.now() - 30000)).snapshot;

    activeCall.answeredAt = activeCall.machine.answeredAt;
    assert.equal(activeCall.machine.state, 'CONNECTED');
    assert.equal(activeCall.machine.waitSeconds, 5);

    // 3. Simular colgado (ChannelDestroyed)
    const compResult = transitionCall(activeCall.machine, 'COMPLETED', {
      hangupCause: 'NORMAL_CLEARING',
    }, new Date());
    activeCall.machine = compResult.snapshot;

    assert.equal(activeCall.machine.state, 'COMPLETED');
    assert.equal(activeCall.machine.talkSeconds, 30);
    assert.equal(activeCall.machine.totalSeconds, 35);
    assert.equal(compResult.event.type, 'HANGUP');

    callRegistry.removeCall(callId);
    assert.equal(callRegistry.getActiveCallsCount(), 0);
  });

  it('2. Inbound No Contestada (Missed): Timbrado -> Timeout -> Disposition MISSED', () => {
    const callerChannel = sim.createMockChannel({
      id: 'ch-inbound-missed',
      callerNumber: '3109876543',
    });

    const callId = 'call-test-missed';
    let snapshot = createCallSnapshot(callId);
    snapshot = transitionCall(snapshot, 'RINGING').snapshot;

    const activeCall: ActiveCall = {
      callId,
      organizationId: 'org-test',
      correlationId: 'corr-2',
      channelId: callerChannel.id,
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: '+573109876543',
      toNumber: '6068801234',
      machine: snapshot,
      legalConsentAnnounced: false,
      startedAt: new Date(Date.now() - 25000),
    };
    callRegistry.registerCall(activeCall);

    // Simular timeout tras 25 segundos
    const compResult = transitionCall(activeCall.machine, 'COMPLETED', {
      reason: 'NO_ANSWER_TIMEOUT',
      hangupCause: 'NO_ANSWER',
    });
    activeCall.machine = compResult.snapshot;

    assert.equal(activeCall.machine.state, 'COMPLETED');
    assert.equal(activeCall.answeredAt, undefined); // Nunca fue contestada
    assert.equal(activeCall.machine.talkSeconds, 0);

    callRegistry.removeCall(callId);
    assert.equal(callRegistry.getActiveCallsCount(), 0);
  });

  it('3. Inbound Abandonada por el Cliente durante el Timbrado', () => {
    const callerChannel = sim.createMockChannel({
      id: 'ch-inbound-abandon',
      callerNumber: '3157778899',
    });

    const callId = 'call-test-abandon';
    let snapshot = createCallSnapshot(callId);
    snapshot = transitionCall(snapshot, 'RINGING').snapshot;

    const activeCall: ActiveCall = {
      callId,
      organizationId: 'org-test',
      correlationId: 'corr-3',
      channelId: callerChannel.id,
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: '+573157778899',
      toNumber: '6068801234',
      machine: snapshot,
      legalConsentAnnounced: false,
      startedAt: new Date(Date.now() - 8000),
    };
    callRegistry.registerCall(activeCall);

    // Cliente cuelga antes de que contesten
    const compResult = transitionCall(activeCall.machine, 'COMPLETED', {
      reason: 'CALLER_HUNG_UP_WHILE_RINGING',
      hangupCause: 'CALLER_CANCEL',
    });
    activeCall.machine = compResult.snapshot;

    assert.equal(activeCall.machine.state, 'COMPLETED');
    assert.equal(activeCall.answeredAt, undefined);
    assert.equal(activeCall.machine.talkSeconds, 0);

    callRegistry.removeCall(callId);
  });

  it('4. Reconexión con Reconciliación: descarta llamadas cuyos canales murieron en Asterisk', () => {
    // Caso 1: Llamada activa cuyo canal sobrevivió
    const activeCallSurviving: ActiveCall = {
      callId: 'call-surviving',
      organizationId: 'org-test',
      correlationId: 'corr-4',
      channelId: 'ch-alive-1',
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: '+573001234567',
      toNumber: '6068801234',
      machine: transitionCall(
        transitionCall(createCallSnapshot('call-surviving'), 'RINGING').snapshot,
        'CONNECTED'
      ).snapshot,
      legalConsentAnnounced: true,
      startedAt: new Date(),
    };
    callRegistry.registerCall(activeCallSurviving);

    // Caso 2: Llamada fantasma cuyo canal cayó durante la caída de la conexión
    const activeCallGhost: ActiveCall = {
      callId: 'call-ghost',
      organizationId: 'org-test',
      correlationId: 'corr-5',
      channelId: 'ch-dead-99',
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: '+573111111111',
      toNumber: '6068801234',
      machine: transitionCall(createCallSnapshot('call-ghost'), 'RINGING').snapshot,
      legalConsentAnnounced: false,
      startedAt: new Date(),
    };
    callRegistry.registerCall(activeCallGhost);

    assert.equal(callRegistry.getActiveCallsCount(), 2);

    // Asterisk reporta solo 'ch-alive-1' vivo
    const asteriskLiveChannelIds = new Set(['ch-alive-1']);

    // Reconciliación
    for (const call of callRegistry.getAllActiveCalls()) {
      if (!asteriskLiveChannelIds.has(call.channelId)) {
        callRegistry.removeCall(call.callId);
      }
    }

    // Solo debe quedar la llamada viva
    assert.equal(callRegistry.getActiveCallsCount(), 1);
    assert.ok(callRegistry.getCallById('call-surviving'));
    assert.equal(callRegistry.getCallById('call-ghost'), undefined);
  });
});
