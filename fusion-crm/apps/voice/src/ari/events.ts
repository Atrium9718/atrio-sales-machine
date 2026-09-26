import {
  AriEvent,
  AriStasisStartEvent,
  AriChannelDestroyedEvent,
  AriChannelHoldEvent,
  AriChannelUnholdEvent,
  AriChannelDtmfReceivedEvent,
  AriRecordingFinishedEvent,
} from './types';
import { AriClient } from './client';
import { callRegistry } from '../state/registry';
import { transitionCall } from '@fusion/core/voice/callMachine';
import { InboundCallHandler } from '../handlers/inbound';
import { OutboundCallHandler } from '../handlers/outbound';
import { InternalCallHandler } from '../handlers/internal';
import { VoiceRecordService } from '../services/record';
import { VoiceBridgeService } from '../services/bridge';
import { persistence } from '../services/persist';
import { broadcaster } from '../services/broadcast';
import { telemetry } from '../telemetry';

export class AriEventDispatcher {
  constructor(
    private readonly ari: AriClient,
    private readonly inboundHandler: InboundCallHandler,
    private readonly outboundHandler: OutboundCallHandler,
    private readonly internalHandler: InternalCallHandler,
    private readonly recordService: VoiceRecordService,
    private readonly bridgeService: VoiceBridgeService
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

    // 1. Clasificación por argumento de Stasis
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

    if (args.includes('internal') || (dialedExt.length === 3 && !dialedExt.startsWith('9'))) {
      // Llamada interna entre extensiones (ej: 101 llama a 102)
      await this.internalHandler.handleInternalCall(channel.id, callerNumber, dialedExt);
      return;
    }

    // Por defecto tratar como entrante
    await this.inboundHandler.handleStasisStart(event);
  }

  private async handleChannelDestroyed(event: AriChannelDestroyedEvent): Promise<void> {
    const channelId = event.channel.id;
    const call = callRegistry.getCallByChannelId(channelId);

    if (!call) return;

    telemetry.log('INFO', `Canal ${channelId} destruido en llamada ${call.callId}. Causa: ${event.cause_txt} (${event.cause})`);

    const isPrimaryChannel = call.channelId === channelId;

    if (isPrimaryChannel || call.machine.state === 'CONNECTED') {
      // La parte principal o una de las partes en conversación colgó
      const disposition = call.machine.state === 'CONNECTED' ? 'ANSWERED' : 'FAILED';
      const hangupBy = isPrimaryChannel ? 'CALLER' : 'AGENT';

      const compTrans = transitionCall(call.machine, 'COMPLETED', {
        reason: event.cause_txt,
        hangupCause: `CAUSE_${event.cause}`,
        channelId,
      });
      call.machine = compTrans.snapshot;

      // Persistir cierre
      persistence.persistCallCompletion(call, disposition, event.cause_txt, hangupBy);

      // Colgar canales asociados restantes
      for (const linkedId of call.linkedChannelIds) {
        if (linkedId !== channelId) {
          try {
            await this.ari.hangupChannel(linkedId, 'normal');
          } catch (e) {}
        }
      }

      // Destruir el puente si existía
      if (call.bridgeId) {
        await this.bridgeService.destroyBridge(call.bridgeId);
      }

      // Notificar al navegador por Redis SSE
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

      telemetry.recordCallCompleted(disposition !== 'ANSWERED');
      callRegistry.removeCall(call.callId);
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
    const call = callRegistry.getCallByChannelId(event.channel.id);
    if (!call) return;

    telemetry.log('INFO', `DTMF '${event.digit}' recibido en llamada ${call.callId} (${event.duration_ms}ms)`);

    // Persistir evento DTMF
    await persistence.persistCallTransition(
      call.callId,
      call.organizationId,
      {
        type: 'DTMF',
        from: call.machine.state,
        to: call.machine.state,
        at: new Date(),
        payload: { digit: event.digit, durationMs: event.duration_ms },
      },
      call.machine
    );
  }

  private async handleRecordingFinished(event: AriRecordingFinishedEvent): Promise<void> {
    const rec = event.recording;
    await this.recordService.handleRecordingFinished(rec.name, rec.duration || 0);
  }
}
