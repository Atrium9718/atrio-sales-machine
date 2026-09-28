import { DEFAULT_ORGANIZATION_ID } from '../org';
import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/src/voice/callMachine';
import { VoiceRingService } from '../services/ring';
import type { CallConnector } from '../services/connect';
import { finishCall } from '../state/lifecycle';
import { persistence, prisma } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class InternalCallHandler {
  constructor(
    private readonly ari: AriClient,
    private readonly ringService: VoiceRingService,
    private readonly connector: CallConnector
  ) {}

  /**
   * Maneja llamadas internas directas entre extensiones del equipo (ej: 101 a 102).
   */
  public async handleInternalCall(sourceChannelId: string, callerExt: string, targetExt: string): Promise<void> {
    const correlationId = telemetry.createCorrelationId('internal');
    telemetry.recordCallStarted();
    telemetry.log('INFO', `Llamada interna iniciada de ext ${callerExt} a ext ${targetExt}`, {
      correlationId,
      sourceChannelId,
    });

    const targetExtension = await prisma.voiceExtension.findFirst({
      where: {
        extension: targetExt,
        status: 'ACTIVE',
      },
    });

    const sourceExtension = await prisma.voiceExtension.findFirst({
      where: {
        extension: callerExt,
        status: 'ACTIVE',
      },
    });

    const orgId = sourceExtension?.organizationId || targetExtension?.organizationId || DEFAULT_ORGANIZATION_ID;
    const callId = `call_int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshot = createCallSnapshot(callId);

    const activeCall: ActiveCall = {
      callId,
      organizationId: orgId,
      correlationId,
      channelId: sourceChannelId,
      linkedChannelIds: [],
      direction: 'INTERNAL',
      fromNumber: callerExt,
      toNumber: targetExt,
      extensionId: sourceExtension?.id,
      machine: snapshot,
      legalConsentAnnounced: false,
      startedAt: new Date(),
    };

    callRegistry.registerCall(activeCall);
    persistence.persistCallCreation(activeCall);

    const ringTrans = transitionCall(activeCall.machine, 'RINGING', {
      channelId: sourceChannelId,
      extra: { callerExt, targetExt },
    });
    activeCall.machine = ringTrans.snapshot;
    persistence.persistCallTransition(callId, orgId, ringTrans.event, ringTrans.snapshot);

    if (!targetExtension) {
      telemetry.log('WARN', `Extensión destino ${targetExt} no encontrada.`);
      try {
        await this.ari.answerChannel(sourceChannelId);
        await this.ari.playMediaOnChannel(sourceChannelId, 'sound:ss-noservice');
      } catch (e) {}

      const failTrans = transitionCall(activeCall.machine, 'FAILED', { reason: 'EXTENSION_NOT_FOUND' });
      activeCall.machine = failTrans.snapshot;
      persistence.persistCallCompletion(activeCall, 'FAILED', 'UNALLOCATED_NUMBER', 'SYSTEM');
      callRegistry.removeCall(callId);
      return;
    }

    // Notificar al usuario destino en el CRM por SSE
    if (targetExtension.userId) {
      await broadcaster.publishToUser(targetExtension.userId, {
        event: 'voice.incoming_call',
        callId,
        channelId: sourceChannelId,
        organizationId: orgId,
        fromNumber: `Extensión ${callerExt}`,
        displayNumber: callerExt,
        state: 'RINGING',
        direction: 'INTERNAL',
        context: null,
        timestamp: new Date().toISOString(),
        waitSeconds: 0,
        talkSeconds: 0,
      });
    }

    // Timbrar extensión destino; al contestar se une con quien llamó
    await this.ringService.ringExtension(activeCall, targetExt, {
      onAnswered: async (leg, ext) => {
        await this.connector.connect(activeCall, leg, { userId: ext.userId, extensionId: ext.id, recordingPolicy: 'NEVER' });
      },
      onNoAnswer: async () => {
        await this.ari.hangupChannel(sourceChannelId, 'no_answer').catch(() => {});
        finishCall(activeCall, 'MISSED', 'NO_ANSWER', 'SYSTEM');
      },
    });
  }
}
