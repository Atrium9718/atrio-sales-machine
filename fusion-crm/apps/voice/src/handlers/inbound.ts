import { DEFAULT_ORGANIZATION_ID } from '../org';
import { AriStasisStartEvent } from '../ari/types';
import { ActiveCall, callRegistry } from '../state/registry';
import { finishCall, moveCall } from '../state/lifecycle';
import { createCallSnapshot } from '@fusion/core/src/voice/callMachine';
import { resolveCallerIdentity } from '../services/identify';
import { persistence, prisma } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';
import { trunkDialString } from '../trunk';
import type { VoiceRingService } from '../services/ring';
import type { CallConnector } from '../services/connect';
import type { MediaController } from '../services/media';
import type { VoiceQueueService } from '../services/queue';
import type { VoiceVoicemailService } from '../services/voicemail';
import type { IvrRoutes, VoiceIvrService } from '../services/ivr';

export interface InboundAri {
  answerChannel(channelId: string): Promise<void>;
  hangupChannel(channelId: string, reason?: string): Promise<void>;
  ringChannel(channelId: string): Promise<void>;
}

export interface InboundDeps {
  ari: InboundAri;
  ring: VoiceRingService;
  connector: CallConnector;
  media: MediaController;
  queue: VoiceQueueService;
  voicemail: VoiceVoicemailService;
  ivr?: VoiceIvrService;
}

/**
 * Llamadas que entran por la troncal: identifica a quien llama, registra la llamada y la envía
 * al destino del número marcado (extensión, menú, cola, buzón). También es el enrutador que usa
 * el menú de opciones al terminar.
 */
export class InboundCallHandler implements IvrRoutes {
  constructor(private readonly deps: InboundDeps) {}

  public setIvr(ivr: VoiceIvrService) {
    this.deps.ivr = ivr;
  }

  public async handleStasisStart(event: AriStasisStartEvent): Promise<void> {
    const channel = event.channel;
    const fromNumber = channel.caller.number || 'Desconocido';
    const rawDialedDid = channel.dialplan.exten;

    const correlationId = telemetry.createCorrelationId('inbound');
    telemetry.recordCallStarted();
    telemetry.log('INFO', `Llamada entrante en ${channel.id} desde ${fromNumber} al ${rawDialedDid}`, { correlationId, channelId: channel.id });

    const didRecord = await prisma.voiceNumber.findFirst({
      where: { number: { in: [rawDialedDid, `+57${rawDialedDid}`, `+${rawDialedDid}`] }, deletedAt: null },
    });
    const organizationId = didRecord?.organizationId || DEFAULT_ORGANIZATION_ID;
    const identity = await resolveCallerIdentity(fromNumber, organizationId);

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const call: ActiveCall = {
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
      machine: createCallSnapshot(callId),
      context: identity.context,
      legalConsentAnnounced: false,
      startedAt: new Date(),
    };
    callRegistry.registerCall(call);
    persistence.persistCallCreation(call);
    moveCall(call, 'RINGING', { channelId: channel.id, extra: { fromNumber, rawDialedDid } });

    if (!didRecord?.inboundTarget) {
      telemetry.log('ERROR', `El número ${rawDialedDid} no tiene destino configurado en el CRM`, { callId, correlationId });
      // Que no quede en silencio: buzón general
      await this.deps.voicemail.start(call);
      return;
    }
    await this.route(call, didRecord.inboundTarget, didRecord.inboundTargetId || '');
  }

  /** Envía la llamada al destino configurado. */
  public async route(call: ActiveCall, target: string, targetId: string): Promise<void> {
    switch (target) {
      case 'EXTENSION':
        return this.toExtension(call, targetId);
      case 'IVR_FLOW': {
        const started = this.deps.ivr ? await this.deps.ivr.start(call, targetId) : false;
        if (!started) await this.toVoicemail(call);
        return;
      }
      case 'QUEUE':
        return this.toQueue(call, targetId);
      case 'VOICEMAIL':
        return this.voicemailFor(call, targetId);
      case 'AI_AGENT':
      default:
        // El agente de voz con IA llega en la fase 3: mientras tanto, buzón
        return this.toVoicemail(call);
    }
  }

  public async toQueue(call: ActiveCall, queueId: string): Promise<void> {
    await this.deps.queue.enqueueCall(call, queueId);
  }

  public async toVoicemail(call: ActiveCall, greeting?: string[]): Promise<void> {
    await this.deps.voicemail.start(call, { greeting });
  }

  /** Buzón de una extensión (si el destino es un número de extensión) o el general. */
  private async voicemailFor(call: ActiveCall, targetId: string): Promise<void> {
    const ext = targetId
      ? await prisma.voiceExtension.findFirst({ where: { organizationId: call.organizationId, extension: targetId, deletedAt: null } }).catch(() => null)
      : null;
    await this.deps.voicemail.start(call, { extensionId: ext?.id ?? null, assigneeUserId: ext?.userId ?? null });
  }

  public async toExternal(call: ActiveCall, number: string): Promise<void> {
    await this.deps.ring.ringEndpoints(
      call,
      [{ endpoint: trunkDialString(number), label: `externo ${number}` }],
      30,
      async (leg) => {
        await this.deps.connector.connect(call, leg, { reason: 'IVR_TRANSFER_EXTERNAL' });
      },
      async () => {
        await this.deps.media.stopChannel(call.channelId);
        await this.toVoicemail(call);
      }
    );
  }

  /** Timbra una extensión; si nadie contesta, buzón de esa extensión (o llamada perdida). */
  public async toExtension(call: ActiveCall, extensionNumber: string): Promise<void> {
    await this.deps.ring.ringExtension(call, extensionNumber, {
      onRinging: async (ext) => {
        // Quien llama oye timbrar: indicación si aún no se contestó, tono si viene del menú
        if (call.callerAnswered) this.deps.media.start(call.channelId, ['tone:ring']);
        else await this.deps.ari.ringChannel(call.channelId).catch(() => {});
        if (ext.userId) {
          await broadcaster.publishToUser(ext.userId, {
            event: 'voice.incoming_call',
            callId: call.callId,
            channelId: call.channelId,
            organizationId: call.organizationId,
            fromNumber: call.fromNumber,
            displayNumber: call.fromNumber,
            state: 'RINGING',
            direction: call.direction,
            context: call.context ?? null,
            timestamp: new Date().toISOString(),
            waitSeconds: 0,
            talkSeconds: 0,
          });
        }
      },
      onAnswered: async (leg, ext) => {
        await this.deps.connector.connect(call, leg, { userId: ext.userId, extensionId: ext.id, recordingPolicy: ext.recordingPolicy });
      },
      onNoAnswer: async (ext) => {
        if (!callRegistry.getCallById(call.callId)) return;
        await this.deps.media.stopChannel(call.channelId);
        if (!ext || ext.voicemailEnabled) {
          await this.deps.voicemail.start(call, { extensionId: ext?.id ?? null, assigneeUserId: ext?.userId ?? null });
          return;
        }
        telemetry.log('WARN', `Llamada ${call.callId} de ${call.fromNumber} sin contestar en la extensión ${extensionNumber}`);
        await this.deps.ari.hangupChannel(call.channelId, 'no_answer').catch(() => {});
        finishCall(call, 'MISSED', 'NO_ANSWER', 'SYSTEM');
      },
    });
  }
}
