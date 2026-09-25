import { CallMachineSnapshot, VoiceCallState } from '@fusion/core/voice/callMachine';
import { VoiceCustomerContext } from '@fusion/contracts/voice';

export interface ActiveCall {
  callId: string;
  organizationId: string;
  correlationId: string;
  channelId: string;
  linkedChannelIds: string[];
  bridgeId?: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  fromNumber: string;
  toNumber: string;
  didId?: string;
  trunkId?: string;
  machine: CallMachineSnapshot;
  context?: VoiceCustomerContext;
  handledByUserId?: string;
  extensionId?: string;
  targetExtensionNumber?: string;
  recordingName?: string;
  recordingId?: string;
  isRecordingPaused?: boolean;
  legalConsentAnnounced: boolean;
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  ringTimer?: NodeJS.Timeout;
  queueId?: string;
  ivrFlowId?: string;
  holdMusicClass?: string;
  transferredFromUserId?: string;
  attendedTransferSecondBridgeId?: string;
}

class CallRegistry {
  private callsById = new Map<string, ActiveCall>();
  private callIdByChannelId = new Map<string, string>();
  private callIdByBridgeId = new Map<string, string>();

  public registerCall(call: ActiveCall): void {
    this.callsById.set(call.callId, call);
    this.callIdByChannelId.set(call.channelId, call.callId);
    for (const linkedId of call.linkedChannelIds) {
      this.callIdByChannelId.set(linkedId, call.callId);
    }
    if (call.bridgeId) {
      this.callIdByBridgeId.set(call.bridgeId, call.callId);
    }
  }

  public getCallById(callId: string): ActiveCall | undefined {
    return this.callsById.get(callId);
  }

  public getCallByChannelId(channelId: string): ActiveCall | undefined {
    const callId = this.callIdByChannelId.get(channelId);
    if (!callId) return undefined;
    return this.callsById.get(callId);
  }

  public getCallByBridgeId(bridgeId: string): ActiveCall | undefined {
    const callId = this.callIdByBridgeId.get(bridgeId);
    if (!callId) return undefined;
    return this.callsById.get(callId);
  }

  public linkChannelToCall(callId: string, channelId: string): void {
    const call = this.callsById.get(callId);
    if (call) {
      if (!call.linkedChannelIds.includes(channelId)) {
        call.linkedChannelIds.push(channelId);
      }
      this.callIdByChannelId.set(channelId, callId);
    }
  }

  public setBridgeForCall(callId: string, bridgeId: string): void {
    const call = this.callsById.get(callId);
    if (call) {
      call.bridgeId = bridgeId;
      this.callIdByBridgeId.set(bridgeId, callId);
    }
  }

  public getAllActiveCalls(): ActiveCall[] {
    return Array.from(this.callsById.values());
  }

  public getActiveCallsCount(): number {
    return this.callsById.size;
  }

  public getOldestCallAgeSeconds(): number {
    if (this.callsById.size === 0) return 0;
    const now = Date.now();
    let minStartTime = now;
    for (const call of this.callsById.values()) {
      const time = call.startedAt.getTime();
      if (time < minStartTime) {
        minStartTime = time;
      }
    }
    return Math.floor((now - minStartTime) / 1000);
  }

  public removeCall(callId: string): ActiveCall | undefined {
    const call = this.callsById.get(callId);
    if (!call) return undefined;

    if (call.ringTimer) {
      clearTimeout(call.ringTimer);
    }

    this.callIdByChannelId.delete(call.channelId);
    for (const linkedId of call.linkedChannelIds) {
      this.callIdByChannelId.delete(linkedId);
    }
    if (call.bridgeId) {
      this.callIdByBridgeId.delete(call.bridgeId);
    }
    this.callsById.delete(callId);
    return call;
  }

  public clear(): void {
    for (const call of this.callsById.values()) {
      if (call.ringTimer) {
        clearTimeout(call.ringTimer);
      }
    }
    this.callsById.clear();
    this.callIdByChannelId.clear();
    this.callIdByBridgeId.clear();
  }
}

export const callRegistry = new CallRegistry();
