import { SoftphoneCredentials } from '@fusion/contracts';
export type { SoftphoneCredentials };

export type SoftphoneState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'REGISTERED'
  | 'REGISTRATION_FAILED'
  | 'MIRROR_MODE';

export type CallSessionState =
  | 'IDLE'
  | 'RINGING_INBOUND'
  | 'RINGING_OUTBOUND'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'TRANSFERRING'
  | 'TERMINATED';

export type QualityRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface CallQualityMetrics {
  packetLossPercent: number;
  jitterMs: number;
  roundTripTimeMs: number;
  audioInputLevel: number; // 0 to 100
  rating: QualityRating;
  warning?: string | null;
}

export interface ActiveCallInfo {
  id: string;
  sipSessionId?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  state: CallSessionState;
  remoteNumber: string;
  remoteDisplayName: string;
  startedAt?: string;
  connectedAt?: string;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  notes: string;
  context?: any | null;
}

export interface AudioDeviceConfig {
  inputDeviceId: string;
  outputDeviceId: string;
  ringtoneDeviceId: string;
  inputVolume: number; // 0 to 100
  ringtoneVolume: number; // 0 to 100
}

export interface SoftphoneEventMap {
  stateChange: (state: SoftphoneState, reason?: string) => void;
  callStateChange: (call: ActiveCallInfo | null) => void;
  incomingCall: (call: ActiveCallInfo) => void;
  callEnded: (call: ActiveCallInfo, reason?: string) => void;
  qualityMetrics: (metrics: CallQualityMetrics) => void;
  masterStatusChange: (isMaster: boolean) => void;
}

export interface SoftphoneClient {
  readonly state: SoftphoneState;
  readonly activeCall: ActiveCallInfo | null;
  readonly isMasterTab: boolean;
  readonly registeredExtension: string | null;

  initialize(): Promise<void>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  makeCall(destination: string, displayName?: string, linkedContext?: any): Promise<void>;
  answerCall(): Promise<void>;
  rejectCall(): Promise<void>;
  hangupCall(): Promise<void>;
  holdCall(): Promise<void>;
  unholdCall(): Promise<void>;
  sendDTMF(tone: string): void;
  setMuted(muted: boolean): void;
  blindTransfer(target: string): Promise<void>;
  attendedTransfer(target: string): Promise<void>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  updateNotes(notes: string): Promise<void>;

  on<K extends keyof SoftphoneEventMap>(event: K, listener: SoftphoneEventMap[K]): void;
  off<K extends keyof SoftphoneEventMap>(event: K, listener: SoftphoneEventMap[K]): void;
}
