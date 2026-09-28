import {
  AriEvent,
  AriStasisStartEvent,
  AriChannelDestroyedEvent,
  AriChannelHoldEvent,
  AriChannelUnholdEvent,
  AriChannelDtmfReceivedEvent,
  AriRecordingFinishedEvent,
  AriRecordingFailedEvent,
  AriPlaybackFinishedEvent,
} from './types';
import { AriClient } from './client';
import { ActiveCall, callRegistry } from '../state/registry';
import { transitionCall } from '@fusion/core/src/voice/callMachine';
import { InboundCallHandler } from '../handlers/inbound';
import { OutboundCallHandler } from '../handlers/outbound';
import { InternalCallHandler } from '../handlers/internal';
import { VoiceRecordService } from '../services/record';
import { VoiceBridgeService } from '../services/bridge';
import { persistence } from '../services/persist';
import { finishCall, Disposition } from '../state/lifecycle';
import type { MediaController } from '../services/media';
import type { RingTracker } from '../services/ringGroups';
import type { VoiceQueueService } from '../services/queue';
import type { VoiceVoicemailService } from '../services/voicemail';
import type { VoiceIvrService } from '../services/ivr';

export interface DispatcherServices {
  media: MediaController;
  tracker: RingTracker;
  queue: VoiceQueueService;
  voicemail: VoiceVoicemailService;
  ivr: VoiceIvrService;
}
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class AriEventDispatcher {
  constructor(
    private readonly ari: AriClient,
    private readonly inboundHandler: InboundCallHandler,
    private readonly outboundHandler: OutboundCallHandler,
    private readonly internalHandler: InternalCallHandler,
    private readonly recordService: VoiceRecordService,
    private readonly bridgeService: VoiceBridgeService,
    private readonly services: DispatcherServices
  ) {}

  public async dispatch(event: AriEvent): Promise<void> {
    switch (event.type) {
      case 'StasisStart':
        await this.handleStasisStart(event as AriStasisStartEvent);
        break;

      case 'ChannelDestroyed':
        await this.handleChannelDestroyed(event as AriChannelDestroyedEvent);
        break;

      case 'ChannelHold':
        await this.handleChannelHold(event as AriChannelHoldEvent);
        break;

      case 'ChannelUnhold':
        await this.handleChannelUnhold(event as AriChannelUnholdEvent);
        break;

      case 'ChannelDtmfReceived':
        await this.handleDtmf(event as AriChannelDtmfReceivedEvent);
        break;

      case 'RecordingFinished':
        await this.handleRecordingFinished(event as AriRecordingFinishedEvent);
        break;

      case 'RecordingFailed': {
        const rec = (event as AriRecordingFailedEvent).recording;
        await this.services.voicemail.finished(rec.name, 0);
        break;
      }

      case 'PlaybackFinished':
        this.services.media.finished((event as AriPlaybackFinishedEvent).playback.id);
        break;

      case 'ApplicationReplaced':
        telemetry.log('ERROR', 'ALERTA CRÍTICA: ApplicationReplaced recibida en ARI. Otra instancia ha tomado la app fusion-voz.');
        break;

      default:
        // Eventos informativos adicionales (Dial, BridgeCreated, etc.)
        break;
    }
  }

  private async handleStasisStart(event: AriStasisStartEvent): Promise<void> {
    const args = event.args || [];
    const channel = event.channel;
    const callerNumber = channel.caller.number;
    const dialedExt = channel.dialplan.exten;

    telemetry.log('INFO', `StasisStart en canal ${channel.id} con args: [${args.join(', ')}]`, {
      channelId: channel.id,
      dialplanExten: dialedExt,
    });

    // 0. Una pierna que timbraba (asesor, celular, externo) contestó
    if (args[0] === 'ring_leg') {
      if (!this.services.tracker.answered(channel.id)) {
        // Contestó tarde: la llamada ya siguió su camino
        await this.ari.hangupChannel(channel.id, 'normal').catch(() => {});
      }
      return;
    }

    // 1. Lo que marca una extensión (contexto fusion-interno): interna o número externo
    if (args.includes('internal')) {
      const target = args[args.indexOf('internal') + 1] || dialedExt;
      if (/^\d{3,4}$/.test(target)) {
        await this.internalHandler.handleInternalCall(channel.id, callerNumber, target);
      } else {
        await this.outboundHandler.handleAgentDialedExternal(channel, target);
      }
      return;
    }

    // 2. Llamadas del operador y respuestas de piernas creadas por el CRM
    if (args.includes('inbound') || dialedExt.length >= 7 || dialedExt.startsWith('+')) {
      await this.inboundHandler.handleStasisStart(event);
      return;
    }

    if (args.includes('outbound_dialer') || args.some((a) => a.startsWith('outbound_dialer'))) {
      // El asesor contestó en su softphone para la llamada saliente
      const callIdArg = args.find((a) => a.startsWith('call_out_')) || args[1];
      const call = callIdArg ? callRegistry.getCallById(callIdArg) : undefined;
      if (call) {
        await this.outboundHandler.handleAgentAnsweredOutbound(call);
      }
      return;
    }

    if (args.includes('outbound_customer') || args.some((a) => a.startsWith('outbound_customer'))) {
      const callIdArg = args.find((a) => a.startsWith('call_out_')) || args[1];
      const call = callIdArg ? callRegistry.getCallById(callIdArg) : undefined;
      if (call) {
        await this.outboundHandler.handleCustomerAnsweredOutbound(call, channel.id);
      }
      return;
    }

    if (dialedExt.length === 3 && !dialedExt.startsWith('9')) {
      // Llamada interna entre extensiones (ej: 101 llama a 102)
      await this.internalHandler.handleInternalCall(channel.id, callerNumber, dialedExt);
      return;
    }

    // Por defecto tratar como entrante
    await this.inboundHandler.handleStasisStart(event);
  }

  private async handleChannelDestroyed(event: AriChannelDestroyedEvent): Promise<void> {
    const channelId = event.channel.id;
    this.services.media.channelGone(channelId);
    // Una pierna que timbraba se cayó (rechazo, ocupado, teléfono desconectado)
    if (this.services.tracker.legGone(channelId)) return;

    const call = callRegistry.getCallByChannelId(channelId);
    if (!call || call.finished) return;

    telemetry.log('INFO', `Canal ${channelId} colgado en la llamada ${call.callId}: ${event.cause_txt} (${event.cause})`);
    const isPrimary = call.channelId === channelId;
    const talking = ['CONNECTED', 'ON_HOLD', 'TRANSFERRING'].includes(call.machine.state);
    const cause = event.cause_txt || `CAUSE_${event.cause}`;

    if (talking) {
      const hangupBy = isPrimary ? (call.direction === 'OUTBOUND' ? 'AGENT' : 'CALLER') : call.direction === 'OUTBOUND' ? 'CALLER' : 'AGENT';
      await this.endConnectedCall(call, channelId, cause, hangupBy);
      return;
    }

    if (isPrimary) {
      this.services.ivr.abort(channelId);
      this.services.tracker.cancel(call.callId);
      if (this.services.voicemail.isRecording(call.callId)) {
        // El mensaje se guarda al llegar RecordingFinished; ahí se cierra la llamada
        this.services.voicemail.callerHungUp(call);
        return;
      }
      if (this.services.queue.callerLeft(call.callId)) {
        finishCall(call, 'ABANDONED_IN_QUEUE', cause, 'CALLER');
        return;
      }
      await this.hangupLinked(call, channelId);
      const disposition: Disposition =
        call.direction === 'INBOUND' ? (call.voicemail?.saved ? 'VOICEMAIL_LEFT' : 'MISSED') : 'CANCELLED';
      finishCall(call, disposition, cause, 'CALLER');
      return;
    }

    // Saliente: el cliente no contestó o rechazó antes de conectar
    if (call.direction === 'OUTBOUND') {
      await this.ari.hangupChannel(call.channelId, 'normal').catch(() => {});
      finishCall(call, 'FAILED', cause, 'CALLER');
    }
  }

  private async hangupLinked(call: ActiveCall, except: string) {
    for (const linkedId of [call.channelId, ...call.linkedChannelIds]) {
      if (linkedId !== except) await this.ari.hangupChannel(linkedId, 'normal').catch(() => {});
    }
  }

  private async endConnectedCall(call: ActiveCall, channelId: string, cause: string, hangupBy: 'CALLER' | 'AGENT') {
    await this.hangupLinked(call, channelId);
    if (call.bridgeId) await this.bridgeService.destroyBridge(call.bridgeId);
    if (call.queueId) await this.services.queue.callEnded(call);
    finishCall(call, 'ANSWERED', cause, hangupBy);
    if (call.handledByUserId) {
      await broadcaster.publishToUser(call.handledByUserId, {
        event: 'voice.call_ended',
        callId: call.callId,
        channelId,
        organizationId: call.organizationId,
        fromNumber: call.fromNumber,
        displayNumber: call.fromNumber,
        state: 'COMPLETED',
        direction: call.direction,
        context: call.context ?? null,
        timestamp: new Date().toISOString(),
        waitSeconds: call.machine.waitSeconds,
        talkSeconds: call.machine.talkSeconds,
      });
    }
  }

  private async handleChannelHold(event: AriChannelHoldEvent): Promise<void> {
    const call = callRegistry.getCallByChannelId(event.channel.id);
    if (!call || call.machine.state !== 'CONNECTED') return;

    const transition = transitionCall(call.machine, 'ON_HOLD', {
      channelId: event.channel.id,
      actorUserId: call.handledByUserId,
    });
    call.machine = transition.snapshot;
    persistence.persistCallTransition(call.callId, call.organizationId, transition.event, transition.snapshot);

    if (call.handledByUserId) {
      await broadcaster.publishToUser(call.handledByUserId, {
        event: 'voice.call_hold',
        callId: call.callId,
        channelId: event.channel.id,
        organizationId: call.organizationId,
        fromNumber: call.fromNumber,
        displayNumber: call.fromNumber,
        state: 'ON_HOLD',
        direction: call.direction,
        context: call.context ?? null,
        timestamp: new Date().toISOString(),
        waitSeconds: call.machine.waitSeconds,
        talkSeconds: call.machine.talkSeconds,
      });
    }
  }

  private async handleChannelUnhold(event: AriChannelUnholdEvent): Promise<void> {
    const call = callRegistry.getCallByChannelId(event.channel.id);
    if (!call || call.machine.state !== 'ON_HOLD') return;

    const transition = transitionCall(call.machine, 'CONNECTED', {
      channelId: event.channel.id,
      actorUserId: call.handledByUserId,
    });
    call.machine = transition.snapshot;
    persistence.persistCallTransition(call.callId, call.organizationId, transition.event, transition.snapshot);

    if (call.handledByUserId) {
      await broadcaster.publishToUser(call.handledByUserId, {
        event: 'voice.call_unhold',
        callId: call.callId,
        channelId: event.channel.id,
        organizationId: call.organizationId,
        fromNumber: call.fromNumber,
        displayNumber: call.fromNumber,
        state: 'CONNECTED',
        direction: call.direction,
        context: call.context ?? null,
        timestamp: new Date().toISOString(),
        waitSeconds: call.machine.waitSeconds,
        talkSeconds: call.machine.talkSeconds,
      });
    }
  }

  private async handleDtmf(event: AriChannelDtmfReceivedEvent): Promise<void> {
    const channelId = event.channel.id;
    // Las teclas no se guardan (pueden ser datos que el cliente digita); el menú registra la opción elegida
    if (this.services.ivr.handleDigit(channelId, event.digit)) return;
    await this.services.queue.handleDigit(channelId, event.digit);
  }

  private async handleRecordingFinished(event: AriRecordingFinishedEvent): Promise<void> {
    const rec = event.recording;
    if (await this.services.voicemail.finished(rec.name, rec.duration || 0)) return;
    await this.recordService.handleRecordingFinished(rec.name, rec.duration || 0);
  }
}
