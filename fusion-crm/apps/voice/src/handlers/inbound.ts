import { AriChannel, AriStasisStartEvent } from '../ari/types';
import { AriClient } from '../ari/client';
import { ActiveCall, callRegistry } from '../state/registry';
import { createCallSnapshot, transitionCall } from '@fusion/core/voice/callMachine';
import { resolveCallerIdentity } from '../services/identify';
import { VoiceRingService } from '../services/ring';
import { VoiceBridgeService } from '../services/bridge';
import { VoiceRecordService } from '../services/record';
import { persistence, prisma } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class InboundCallHandler {
  constructor(
    private readonly ari: AriClient,
    private readonly ringService: VoiceRingService,
    private readonly bridgeService: VoiceBridgeService,
    private readonly recordService: VoiceRecordService
  ) {}

  /**
   * Maneja el evento StasisStart para una llamada entrante desde la troncal del operador.
   */
  public async handleStasisStart(event: AriStasisStartEvent): Promise<void> {
    const channel = event.channel;
    const fromNumber = channel.caller.number || 'Desconocido';
    const rawDialedDid = channel.dialplan.exten;

    const correlationId = telemetry.createCorrelationId('inbound');
    telemetry.recordCallStarted();
    telemetry.log('INFO', `Llamada entrante detectada en canal ${channel.id} desde ${fromNumber} hacia DID ${rawDialedDid}`, {
      correlationId,
      channelId: channel.id,
    });

    // 1. Localizar el VoiceNumber (DID) configurado en el CRM
    const didRecord = await prisma.voiceNumber.findFirst({
      where: {
        number: { in: [rawDialedDid, `+57${rawDialedDid}`, `+${rawDialedDid}`] },
        deletedAt: null,
      },
      include: { trunk: true },
    });

    const organizationId = didRecord?.organizationId || 'org_default';

    // 2. Resolver identidad en paralelo antes de timbrar (< 200 ms)
    const identity = await resolveCallerIdentity(fromNumber, organizationId);

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshot = createCallSnapshot(callId);

    const activeCall: ActiveCall = {
      callId,
      organizationId,
      correlationId,
      channelId: channel.id,
      linkedChannelIds: [],
      direction: 'INBOUND',
      fromNumber: identity.normalizedNumber,
      toNumber: rawDialedDid,
      didId: didRecord?.id,
      trunkId: didRecord?.trunkId,
      machine: snapshot,
      context: identity.context,
      legalConsentAnnounced: false,
      startedAt: new Date(),
    };

    // Registrar en memoria viva
    callRegistry.registerCall(activeCall);

    // Persistir en base de datos de forma asíncrona
    persistence.persistCallCreation(activeCall);

    // Transición a RINGING
    const ringTransition = transitionCall(activeCall.machine, 'RINGING', {
      channelId: channel.id,
      extra: { fromNumber, rawDialedDid },
    });
    activeCall.machine = ringTransition.snapshot;
    persistence.persistCallTransition(callId, organizationId, ringTransition.event, ringTransition.snapshot);

    // 3. Comprobar si el DID tiene destino configurado
    if (!didRecord || !didRecord.inboundTarget) {
      telemetry.log('ERROR', `Llamada entrante a DID ${rawDialedDid} sin destino asignado en CRM.`, {
        callId,
        correlationId,
      });

      // No dejar morir en silencio: responder y reproducir locución de error
      try {
        await this.ari.answerChannel(channel.id);
        await this.ari.playMediaOnChannel(channel.id, 'sound:tt-weasels');
      } catch (e) {}

      const failTransition = transitionCall(activeCall.machine, 'FAILED', {
        reason: 'UNCONFIGURED_DID_TARGET',
      });
      activeCall.machine = failTransition.snapshot;
      persistence.persistCallCompletion(activeCall, 'FAILED', 'UNCONFIGURED_DID', 'SYSTEM');
      callRegistry.removeCall(callId);
      return;
    }

    // 4. Enrutar según el destino del DID
    switch (didRecord.inboundTarget) {
      case 'EXTENSION': {
        const targetExt = didRecord.inboundTargetId || '101';
        await this.routeToExtension(activeCall, targetExt);
        break;
      }

      case 'IVR_FLOW': {
        const ivrTransition = transitionCall(activeCall.machine, 'IN_IVR', {
          extra: { ivrFlowId: didRecord.inboundTargetId },
        });
        activeCall.machine = ivrTransition.snapshot;
        persistence.persistCallTransition(callId, organizationId, ivrTransition.event, ivrTransition.snapshot);

        // Responder canal para arrancar audio IVR
        await this.ari.answerChannel(channel.id);
        activeCall.legalConsentAnnounced = true; // Locución legal del IVR
        telemetry.log('INFO', `Llamada ${callId} canalizada al flujo IVR ${didRecord.inboundTargetId}`);
        // La ejecución detallada del IVR reside en 17.5
        break;
      }

      case 'QUEUE': {
        const queueTransition = transitionCall(activeCall.machine, 'IN_QUEUE', {
          extra: { queueId: didRecord.inboundTargetId },
        });
        activeCall.machine = queueTransition.snapshot;
        persistence.persistCallTransition(callId, organizationId, queueTransition.event, queueTransition.snapshot);

        telemetry.log('INFO', `Llamada ${callId} en cola de atención ${didRecord.inboundTargetId}`);
        // Notificar por Redis a la cola
        await broadcaster.publishToQueue(didRecord.inboundTargetId || 'default', {
          event: 'voice.queue_updated',
          queueId: didRecord.inboundTargetId || 'default',
          organizationId,
          waitingCallsCount: 1,
          longestWaitSeconds: 0,
          activeAgentsCount: 1,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'AI_AGENT': {
        const aiTransition = transitionCall(activeCall.machine, 'IN_AI', {
          extra: { aiSessionId: `ai_${callId}` },
        });
        activeCall.machine = aiTransition.snapshot;
        persistence.persistCallTransition(callId, organizationId, aiTransition.event, aiTransition.snapshot);

        await this.ari.answerChannel(channel.id);
        telemetry.log('INFO', `Llamada ${callId} conectada al agente de IA (sub-etapa 17.7)`);
        break;
      }

      case 'VOICEMAIL': {
        const vmTransition = transitionCall(activeCall.machine, 'VOICEMAIL', {
          extra: { mailbox: didRecord.inboundTargetId },
        });
        activeCall.machine = vmTransition.snapshot;
        persistence.persistCallTransition(callId, organizationId, vmTransition.event, vmTransition.snapshot);

        await this.ari.answerChannel(channel.id);
        await this.ari.playMediaOnChannel(channel.id, 'sound:vm-intro');
        break;
      }
    }
  }

  /**
   * Rutina de timbrado hacia una extensión
   */
  private async routeToExtension(call: ActiveCall, extensionNumber: string): Promise<void> {
    const callerNumber = call.fromNumber;

    // Disparar notificación SSE al navegador del usuario receptor antes de que timbre
    if (call.handledByUserId) {
      await broadcaster.publishToUser(call.handledByUserId, {
        event: 'voice.incoming_call',
        callId: call.callId,
        channelId: call.channelId,
        organizationId: call.organizationId,
        fromNumber: callerNumber,
        displayNumber: callerNumber,
        state: 'RINGING',
        direction: 'INBOUND',
        context: call.context ?? null,
        timestamp: new Date().toISOString(),
        waitSeconds: 0,
        talkSeconds: 0,
      });
    }

    await this.ringService.ringExtension(
      call,
      extensionNumber,
      // Callback cuando el asesor contesta
      async (answeredChannelId: string) => {
        await this.handleAgentAnswered(call, answeredChannelId);
      },
      // Callback si no contesta (timeout o rechazo)
      async () => {
        await this.handleMissedCall(call);
      }
    );
  }

  /**
   * Al contestar el asesor:
   * 1. Responde el canal entrante (si no estaba respondido).
   * 2. Crea un bridge mixing y mete ambos canales.
   * 3. Pasa la máquina de estados a CONNECTED.
   * 4. Inicia la grabación del bridge.
   * 5. Notifica al navegador por SSE vía Redis.
   */
  public async handleAgentAnswered(call: ActiveCall, answeredChannelId: string): Promise<void> {
    if (call.ringTimer) {
      clearTimeout(call.ringTimer);
      call.ringTimer = undefined;
    }

    telemetry.log('INFO', `Asesor contestó llamada ${call.callId} en canal ${answeredChannelId}`);

    try {
      // 1. Responder el canal entrante del cliente
      await this.ari.answerChannel(call.channelId);

      // 2. Crear bridge mixing
      const bridgeId = await this.bridgeService.createMixingBridge(call);
      call.bridgeId = bridgeId;

      // 3. Unir canales al puente
      await this.bridgeService.bridgeChannels(bridgeId, [call.channelId, answeredChannelId]);

      // 4. Transición de estado a CONNECTED
      const transition = transitionCall(call.machine, 'CONNECTED', {
        channelId: answeredChannelId,
        bridgeId,
        actorUserId: call.handledByUserId,
      });
      call.machine = transition.snapshot;
      call.answeredAt = transition.snapshot.answeredAt;

      persistence.persistCallTransition(call.callId, call.organizationId, transition.event, transition.snapshot);

      // 5. Iniciar grabación sobre el bridge
      await this.recordService.startBridgeRecording(call, 'ALWAYS');

      // 6. Notificar al navegador por Redis SSE
      if (call.handledByUserId) {
        await broadcaster.publishToUser(call.handledByUserId, {
          event: 'voice.call_answered',
          callId: call.callId,
          channelId: answeredChannelId,
          organizationId: call.organizationId,
          fromNumber: call.fromNumber,
          displayNumber: call.fromNumber,
          state: 'CONNECTED',
          direction: 'INBOUND',
          context: call.context ?? null,
          timestamp: new Date().toISOString(),
          waitSeconds: call.machine.waitSeconds,
          talkSeconds: 0,
        });
      }
    } catch (err: any) {
      telemetry.log('ERROR', `Fallo al conectar llamada ${call.callId}: ${err.message}`);
    }
  }

  /**
   * Si nadie contesta: marca MISSED, crea tarea en CRM y emite notificación.
   */
  public async handleMissedCall(call: ActiveCall): Promise<void> {
    telemetry.log('WARN', `Llamada entrante ${call.callId} de ${call.fromNumber} no fue contestada (MISSED).`);

    try {
      await this.ari.hangupChannel(call.channelId, 'no_answer');
    } catch (e) {}

    const transition = transitionCall(call.machine, 'COMPLETED', {
      reason: 'MISSED_CALL',
      hangupCause: 'NO_ANSWER',
    });
    call.machine = transition.snapshot;

    persistence.persistCallCompletion(call, 'MISSED', 'NO_ANSWER', 'SYSTEM');
    callRegistry.removeCall(call.callId);
  }
}
