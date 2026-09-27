import { ActiveCall, callRegistry } from '../state/registry';
import { moveCall } from '../state/lifecycle';
import { persistence } from './persist';
import { broadcaster } from './broadcast';
import { telemetry } from '../telemetry';
import type { MediaController } from './media';
import type { VoiceRecordService } from './record';

export interface ConnectAri {
  answerChannel(channelId: string): Promise<void>;
  stopMusicOnHold(channelId: string): Promise<void>;
  stopRinging(channelId: string): Promise<void>;
  createBridge(type?: 'mixing' | 'holding', name?: string): Promise<{ id: string }>;
  addChannelToBridge(bridgeId: string, channelId: string): Promise<void>;
  hangupChannel(channelId: string, reason?: string): Promise<void>;
}

export interface ConnectOptions {
  userId?: string | null;
  extensionId?: string | null;
  recordingPolicy?: 'ALWAYS' | 'NEVER' | 'INBOUND_ONLY' | 'OUTBOUND_ONLY';
  reason?: string;
}

/** Contesta a quien llama si aún no se había hecho (el menú y la cola ya lo contestan). */
export async function answerCaller(ari: Pick<ConnectAri, 'answerChannel'>, call: ActiveCall): Promise<void> {
  if (call.callerAnswered) return;
  await ari.answerChannel(call.channelId);
  call.callerAnswered = true;
}

/**
 * Une a quien llama con la pierna que contestó (asesor, celular o número externo):
 * calla lo que estuviera sonando, crea el puente, pasa la llamada a CONNECTED, graba según la
 * política de la extensión y avisa al navegador del asesor.
 */
export class CallConnector {
  constructor(
    private readonly ari: ConnectAri,
    private readonly media: MediaController,
    private readonly recordService: Pick<VoiceRecordService, 'startBridgeRecording'>
  ) {}

  public async connect(call: ActiveCall, legChannelId: string, opts: ConnectOptions = {}): Promise<boolean> {
    if (!callRegistry.getCallById(call.callId)) {
      // Quien llamaba colgó mientras timbraba
      await this.ari.hangupChannel(legChannelId, 'normal').catch(() => {});
      return false;
    }
    try {
      await this.media.stopChannel(call.channelId);
      await this.ari.stopMusicOnHold(call.channelId).catch(() => {});
      if (!call.callerAnswered) await this.ari.stopRinging(call.channelId).catch(() => {});
      await answerCaller(this.ari, call);

      const bridge = await this.ari.createBridge('mixing', `mix-${call.callId}`);
      callRegistry.linkChannelToCall(call.callId, legChannelId);
      callRegistry.setBridgeForCall(call.callId, bridge.id);
      await this.ari.addChannelToBridge(bridge.id, call.channelId);
      await this.ari.addChannelToBridge(bridge.id, legChannelId);

      if (opts.userId) call.handledByUserId = opts.userId;
      if (opts.extensionId) call.extensionId = opts.extensionId;
      moveCall(call, 'CONNECTED', { channelId: legChannelId, bridgeId: bridge.id, actorUserId: call.handledByUserId, reason: opts.reason });
      call.answeredAt = call.machine.answeredAt ?? new Date();
      persistence.updateCall(call.callId, {
        handledByUserId: call.handledByUserId ?? null,
        extensionId: call.extensionId ?? null,
        queueId: call.queueId ?? null,
        bridgeId: bridge.id,
      });

      await this.recordService.startBridgeRecording(call, opts.recordingPolicy ?? 'ALWAYS');

      if (call.handledByUserId) {
        await broadcaster.publishToUser(call.handledByUserId, {
          event: 'voice.call_answered',
          callId: call.callId,
          channelId: legChannelId,
          organizationId: call.organizationId,
          fromNumber: call.fromNumber,
          displayNumber: call.fromNumber,
          state: 'CONNECTED',
          direction: call.direction,
          context: call.context ?? null,
          timestamp: new Date().toISOString(),
          waitSeconds: call.machine.waitSeconds,
          talkSeconds: 0,
        });
      }
      telemetry.log('INFO', `Llamada ${call.callId} conectada con ${legChannelId}`);
      return true;
    } catch (err: any) {
      telemetry.log('ERROR', `No se pudo conectar la llamada ${call.callId}: ${err.message}`);
      return false;
    }
  }
}
