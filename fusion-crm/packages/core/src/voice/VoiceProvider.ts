export interface CallParams {
  from: string;
  to: string;
  agentId?: string;
  record?: boolean;
}

export interface VoiceProvider {
  /**
   * Initiates an outbound call. 
   * In a two-leg setup, this rings the agent first, then the customer.
   */
  makeCall(params: CallParams): Promise<{ callId: string; status: string }>;
  
  /**
   * Hangs up an active call
   */
  endCall(callId: string): Promise<boolean>;

  /**
   * Generates a secure, short-lived URL for an audio recording.
   */
  getSecureRecordingUrl(externalRecordingId: string): Promise<string>;
}
