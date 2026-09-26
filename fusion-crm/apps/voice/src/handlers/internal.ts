import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/voice/callMachine';
import { VoiceRingService } from '../services/ring';
import { VoiceBridgeService } from '../services/bridge';
import { persistence, prisma } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class InternalCallHandler {
  constructor(
    private readonly ari: AriClient,
    private readonly ringService: VoiceRingService,
    private readonly bridgeService: VoiceBridgeService
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

    const orgId = sourceExtension?.organizationId || targetExtension?.organizationId || 'org_default';
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

    // Timbrar extensión destino
    await this.ringService.ringExtension(
      activeCall,
      targetExt,
      // Al contestar destino:
      async (answeredChannelId: string) => {
        try {
          await this.ari.answerChannel(sourceChannelId);

          const bridgeId = await this.bridgeService.createMixingBridge(activeCall, `int-${callId}`);
          activeCall.bridgeId = bridgeId;

          await this.bridgeService.bridgeChannels(bridgeId, [sourceChannelId, answeredChannelId]);

          const connTrans = transitionCall(activeCall.machine, 'CONNECTED', {
            channelId: answeredChannelId,
            bridgeId,
          });
          activeCall.machine = connTrans.snapshot;
          activeCall.answeredAt = connTrans.snapshot.answeredAt;

          persistence.persistCallTransition(callId, orgId, connTrans.event, connTrans.snapshot);

          telemetry.log('INFO', `Llamada interna ${callId} conectada entre ${callerExt} y ${targetExt}`);
        } catch (err: any) {
          telemetry.log('ERROR', `Fallo al unir llamada interna: ${err.message}`);
        }
      },
      // Timeout o rechazo:
      async () => {
        try {
          await this.ari.hangupChannel(sourceChannelId, 'no_answer');
        } catch (e) {}

        const compTrans = transitionCall(activeCall.machine, 'COMPLETED', {
          reason: 'INTERNAL_NO_ANSWER',
        });
        activeCall.machine = compTrans.snapshot;
        persistence.persistCallCompletion(activeCall, 'MISSED', 'NO_ANSWER', 'SYSTEM');
        callRegistry.removeCall(callId);
      }
    );
  }
}
