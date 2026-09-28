export interface AriCallerId {
  name: string;
  number: string;
}

export interface AriChannel {
  id: string;
  name: string;
  state: 'Down' | 'Rsrvd' | 'OffHook' | 'Dialing' | 'Ring' | 'Ringing' | 'Up' | 'Busy';
  caller: AriCallerId;
  connected: AriCallerId;
  accountcode: string;
  dialplan: {
    context: string;
    exten: string;
    priority: number;
  };
  creationtime: string;
  language: string;
}

export interface AriBridge {
  id: string;
  technology: string;
  bridge_type: 'mixing' | 'holding';
  bridge_class: string;
  creator: string;
  name: string;
  channels: string[];
  creationtime: string;
  video_mode?: string;
}

export interface AriLiveRecording {
  name: string;
  format: string;
  status: 'queued' | 'recording' | 'paused' | 'done' | 'failed' | 'canceled';
  target_uri: string;
  duration?: number;
  talking_duration?: number;
  silence_duration?: number;
  cause?: string;
}

export interface AriEventBase {
  type: string;
  application: string;
  timestamp: string;
  asterisk_id?: string;
}

export interface AriStasisStartEvent extends AriEventBase {
  type: 'StasisStart';
  args: string[];
  channel: AriChannel;
  replace_channel?: AriChannel;
}

export interface AriStasisEndEvent extends AriEventBase {
  type: 'StasisEnd';
  channel: AriChannel;
}

export interface AriChannelCreatedEvent extends AriEventBase {
  type: 'ChannelCreated';
  channel: AriChannel;
}

export interface AriChannelDestroyedEvent extends AriEventBase {
  type: 'ChannelDestroyed';
  channel: AriChannel;
  cause: number;
  cause_txt: string;
}

export interface AriChannelStateChangeEvent extends AriEventBase {
  type: 'ChannelStateChange';
  channel: AriChannel;
}

export interface AriChannelHangupRequestEvent extends AriEventBase {
  type: 'ChannelHangupRequest';
  channel: AriChannel;
  cause?: number;
  soft?: boolean;
}

export interface AriChannelDtmfReceivedEvent extends AriEventBase {
  type: 'ChannelDtmfReceived';
  channel: AriChannel;
  digit: string;
  duration_ms: number;
}

export interface AriChannelEnteredBridgeEvent extends AriEventBase {
  type: 'ChannelEnteredBridge';
  bridge: AriBridge;
  channel: AriChannel;
}

export interface AriChannelLeftBridgeEvent extends AriEventBase {
  type: 'ChannelLeftBridge';
  bridge: AriBridge;
  channel: AriChannel;
}

export interface AriBridgeCreatedEvent extends AriEventBase {
  type: 'BridgeCreated';
  bridge: AriBridge;
}

export interface AriBridgeDestroyedEvent extends AriEventBase {
  type: 'BridgeDestroyed';
  bridge: AriBridge;
}

export interface AriBridgeBlindTransferEvent extends AriEventBase {
  type: 'BridgeBlindTransfer';
  channel: AriChannel;
  bridge: AriBridge;
  context: string;
  exten: string;
  result: string;
}

export interface AriBridgeAttendedTransferEvent extends AriEventBase {
  type: 'BridgeAttendedTransfer';
  transferer_first_leg: AriChannel;
  transferer_second_leg: AriChannel;
  transferer_first_leg_bridge: AriBridge;
  transferer_second_leg_bridge: AriBridge;
  transferee: AriChannel;
  destination_type: string;
  result: string;
}

export interface AriChannelHoldEvent extends AriEventBase {
  type: 'ChannelHold';
  channel: AriChannel;
  musicclass?: string;
}

export interface AriChannelUnholdEvent extends AriEventBase {
  type: 'ChannelUnhold';
  channel: AriChannel;
}

export interface AriPlaybackStartedEvent extends AriEventBase {
  type: 'PlaybackStarted';
  playback: { id: string; media_uri: string; target_uri: string; language: string; state: string };
}

export interface AriPlaybackFinishedEvent extends AriEventBase {
  type: 'PlaybackFinished';
  playback: { id: string; media_uri: string; target_uri: string; language: string; state: string };
}

export interface AriRecordingStartedEvent extends AriEventBase {
  type: 'RecordingStarted';
  recording: AriLiveRecording;
}

export interface AriRecordingFinishedEvent extends AriEventBase {
  type: 'RecordingFinished';
  recording: AriLiveRecording;
}

export interface AriRecordingFailedEvent extends AriEventBase {
  type: 'RecordingFailed';
  recording: AriLiveRecording;
}

export interface AriChannelTalkingStartedEvent extends AriEventBase {
  type: 'ChannelTalkingStarted';
  channel: AriChannel;
}

export interface AriChannelTalkingFinishedEvent extends AriEventBase {
  type: 'ChannelTalkingFinished';
  channel: AriChannel;
  duration: number;
}

export interface AriDialEvent extends AriEventBase {
  type: 'Dial';
  caller?: AriChannel;
  peer: AriChannel;
  dialstatus: string;
  dialstring: string;
}

export interface AriDeviceStateChangedEvent extends AriEventBase {
  type: 'DeviceStateChanged';
  device_state: {
    name: string;
    state: string;
  };
}

export interface AriEndpointStateChangeEvent extends AriEventBase {
  type: 'EndpointStateChange';
  endpoint: {
    technology: string;
    resource: string;
    state: string;
    channel_ids: string[];
  };
}

export interface AriApplicationReplacedEvent extends AriEventBase {
  type: 'ApplicationReplaced';
}

export type AriEvent =
  | AriStasisStartEvent
  | AriStasisEndEvent
  | AriChannelCreatedEvent
  | AriChannelDestroyedEvent
  | AriChannelStateChangeEvent
  | AriChannelHangupRequestEvent
  | AriChannelDtmfReceivedEvent
  | AriChannelEnteredBridgeEvent
  | AriChannelLeftBridgeEvent
  | AriBridgeCreatedEvent
  | AriBridgeDestroyedEvent
  | AriBridgeBlindTransferEvent
  | AriBridgeAttendedTransferEvent
  | AriChannelHoldEvent
  | AriChannelUnholdEvent
  | AriPlaybackStartedEvent
  | AriPlaybackFinishedEvent
  | AriRecordingStartedEvent
  | AriRecordingFinishedEvent
  | AriRecordingFailedEvent
  | AriChannelTalkingStartedEvent
  | AriChannelTalkingFinishedEvent
  | AriDialEvent
  | AriDeviceStateChangedEvent
  | AriEndpointStateChangeEvent
  | AriApplicationReplacedEvent;
