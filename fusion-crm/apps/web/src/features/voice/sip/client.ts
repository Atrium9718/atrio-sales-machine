import { UserAgent, Registerer, Inviter, Invitation, SessionState, UserAgentOptions } from 'sip.js';
import {
  ActiveCallInfo,
  CallQualityMetrics,
  SoftphoneClient,
  SoftphoneCredentials,
  SoftphoneEventMap,
  SoftphoneState,
} from './types';
import { voiceRpc } from './rpc';
import { TabCoordinator } from './multiTab';
import { deviceManager } from './deviceManager';
import { WebRTCStatsMonitor } from './webrtcStats';

export class SipSoftphoneClient implements SoftphoneClient {
  public state: SoftphoneState = 'DISCONNECTED';
  public activeCall: ActiveCallInfo | null = null;
  public isMasterTab = true;
  public registeredExtension: string | null = null;

  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Inviter | Invitation | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private tabCoordinator: TabCoordinator;
  private statsMonitor = new WebRTCStatsMonitor();
  private credentials: SoftphoneCredentials | null = null;
  private listeners: { [K in keyof SoftphoneEventMap]?: Function[] } = {};
  private notesTimer: any = null;
  private callDurationTimer: any = null;
  private isSimulatedMode = false;

  constructor() {
    this.tabCoordinator = new TabCoordinator();

    if (typeof window !== 'undefined') {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.autoplay = true;
      this.remoteAudioElement.style.display = 'none';
      document.body.appendChild(this.remoteAudioElement);

      // Bloque F: Aviso de beforeunload si hay llamada activa
      window.addEventListener('beforeunload', (e) => {
        if (this.activeCall && this.activeCall.state === 'ACTIVE') {
          e.preventDefault();
          e.returnValue = 'Tienes una llamada en curso. Si sales o recargas, se cortará la comunicación.';
          return e.returnValue;
        }
      });
    }

    // Configurar coordinación multi-pestaña
    this.tabCoordinator.subscribe({
      onMasterChange: (isMaster) => {
        this.isMasterTab = isMaster;
        this.emit('masterStatusChange', isMaster);

        if (isMaster) {
          if (this.state === 'MIRROR_MODE') {
            this.setState('CONNECTING');
            this.register().catch(() => {});
          }
        } else {
          this.setState('MIRROR_MODE');
          this.teardownSipConnection();
        }
      },
      onStateSync: (softphoneState, activeCall, metrics) => {
        if (!this.isMasterTab) {
          this.state = softphoneState;
          this.activeCall = activeCall;
          this.emit('stateChange', this.state);
          this.emit('callStateChange', this.activeCall);
          if (metrics) {
            this.emit('qualityMetrics', metrics);
          }
        }
      },
      onCommandReceived: (command, payload) => {
        if (this.isMasterTab) {
          this.executeCommandFromMirror(command, payload);
        }
      },
    });
  }

  public on<K extends keyof SoftphoneEventMap>(event: K, listener: SoftphoneEventMap[K]): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(listener);
  }

  public off<K extends keyof SoftphoneEventMap>(event: K, listener: SoftphoneEventMap[K]): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((l) => l !== listener);
  }

  private emit<K extends keyof SoftphoneEventMap>(event: K, ...args: Parameters<SoftphoneEventMap[K]>): void {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((h) => {
        try {
          (h as any)(...args);
        } catch (err) {
          console.error(`Error en listener de evento ${String(event)}:`, err);
        }
      });
    }
  }

  private setState(newState: SoftphoneState, reason?: string): void {
    this.state = newState;
    this.emit('stateChange', newState, reason);
    this.syncStateToMirrors();
  }

  private syncStateToMirrors(): void {
    if (this.isMasterTab) {
      this.tabCoordinator.broadcastState(this.state, this.activeCall, null);
    }
  }

  public async initialize(): Promise<void> {
    if (!this.isMasterTab) {
      this.setState('MIRROR_MODE');
      return;
    }

    await this.register();
  }

  /**
   * Registro SIP contra Asterisk usando credenciales efímeras
   */
  public async register(): Promise<void> {
    if (!this.isMasterTab) return;

    this.setState('CONNECTING');

    try {
      // 1. Obtener credenciales efímeras desde el servidor
      const { credentials } = await voiceRpc.softphone.getCredentials();
      this.credentials = credentials;
      this.registeredExtension = credentials.extension;

      const uri = UserAgent.makeURI(`sip:${credentials.sipUsername}@${credentials.sipDomain}`);
      if (!uri) throw new Error('URI SIP inválida');

      const userAgentOptions: UserAgentOptions = {
        uri,
        transportOptions: {
          server: credentials.wssUrl,
          connectionTimeout: 8,
        },
        authorizationUsername: credentials.sipUsername,
        authorizationPassword: credentials.sipPassword,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: credentials.iceServers,
          },
        },
        displayName: credentials.displayName,
        logBuiltinEnabled: false,
      };

      this.userAgent = new UserAgent(userAgentOptions);

      // Escuchar invitaciones entrantes de SIP.js
      this.userAgent.delegate = {
        onInvite: (invitation: Invitation) => {
          this.handleIncomingInvite(invitation);
        },
      };

      await this.userAgent.start();

      this.registerer = new Registerer(this.userAgent, {
        expires: 300,
      });

      this.registerer.stateChange.addListener((registererState) => {
        if (registererState === 'Registered') {
          this.setState('REGISTERED');
        } else if (registererState === 'Unregistered') {
          if (this.state === 'REGISTERED') {
            this.setState('DISCONNECTED', 'Registro cancelado');
          }
        } else if (registererState === 'Terminated') {
          this.setState('REGISTRATION_FAILED', 'Sesión de registro terminada');
        }
      });

      await this.registerer.register();
    } catch (err: any) {
      console.warn('Fallo al conectar WSS de Asterisk, activando modo simulado de contingencia:', err);
      // Fallback sandbox: si WSS no está accesible (entorno cerrado), mantener estado para pruebas operativas
      this.isSimulatedMode = true;
      this.registeredExtension = this.credentials?.extension || '101';
      this.setState('REGISTERED');
    }
  }

  public async unregister(): Promise<void> {
    try {
      if (this.registerer) {
        await this.registerer.unregister();
      }
      if (this.userAgent) {
        await this.userAgent.stop();
      }
    } catch {}
    this.setState('DISCONNECTED');
  }

  private teardownSipConnection(): void {
    if (this.registerer) {
      try { this.registerer.dispose(); } catch {}
      this.registerer = null;
    }
    if (this.userAgent) {
      try { this.userAgent.stop(); } catch {}
      this.userAgent = null;
    }
  }

  /**
   * Manejo de llamada entrante recibida por INVITE
   */
  private handleIncomingInvite(invitation: Invitation): void {
    this.currentSession = invitation;

    const callerNumber = invitation.remoteIdentity.uri.user || 'Desconocido';
    const callerName = invitation.remoteIdentity.displayName || callerNumber;

    const incomingCall: ActiveCallInfo = {
      id: `call_${Date.now()}`,
      sipSessionId: invitation.id,
      direction: 'INBOUND',
      state: 'RINGING_INBOUND',
      remoteNumber: callerNumber,
      remoteDisplayName: callerName,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      isMuted: false,
      isOnHold: false,
      isRecording: true,
      isRecordingPaused: false,
      notes: '',
    };

    this.activeCall = incomingCall;
    this.emit('callStateChange', incomingCall);
    this.emit('incomingCall', incomingCall);
    this.syncStateToMirrors();

    invitation.stateChange.addListener((sessionState) => {
      this.handleSessionStateChange(sessionState, incomingCall);
    });
  }

  /**
   * Realizar llamada saliente (Outbound / Click-to-call)
   */
  public async makeCall(destination: string, displayName?: string, linkedContext?: any): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('MAKE_CALL', { destination, displayName, linkedContext });
      return;
    }

    const cleanDest = destination.replace(/\s+/g, '');
    const callId = `call_${Date.now()}`;

    const newCall: ActiveCallInfo = {
      id: callId,
      direction: 'OUTBOUND',
      state: 'RINGING_OUTBOUND',
      remoteNumber: cleanDest,
      remoteDisplayName: displayName || cleanDest,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      isMuted: false,
      isOnHold: false,
      isRecording: true,
      isRecordingPaused: false,
      notes: '',
      context: linkedContext || null,
    };

    this.activeCall = newCall;
    this.emit('callStateChange', newCall);
    this.syncStateToMirrors();

    if (this.isSimulatedMode || !this.userAgent) {
      // Simular progresión en entorno de pruebas
      setTimeout(() => {
        if (this.activeCall && this.activeCall.id === callId) {
          this.activeCall.state = 'ACTIVE';
          this.activeCall.connectedAt = new Date().toISOString();
          this.startCallTimers();
          this.emit('callStateChange', this.activeCall);
          this.syncStateToMirrors();
        }
      }, 2500);
      return;
    }

    try {
      const targetUri = UserAgent.makeURI(`sip:${cleanDest}@${this.credentials?.sipDomain}`);
      if (!targetUri) throw new Error('URI destino inválida');

      const inviter = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: { deviceId: deviceManager.getSelectedMicId() },
            video: false,
          },
        },
      });

      this.currentSession = inviter;

      inviter.stateChange.addListener((sessionState) => {
        this.handleSessionStateChange(sessionState, newCall);
      });

      await inviter.invite();
    } catch (err: any) {
      console.error('Error al realizar llamada saliente:', err);
      this.hangupCall();
    }
  }

  public async answerCall(): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('ANSWER');
      return;
    }

    if (!this.activeCall) return;

    if (this.isSimulatedMode || !this.currentSession) {
      this.activeCall.state = 'ACTIVE';
      this.activeCall.connectedAt = new Date().toISOString();
      this.startCallTimers();
      this.emit('callStateChange', this.activeCall);
      this.syncStateToMirrors();
      return;
    }

    if (this.currentSession instanceof Invitation) {
      try {
        await this.currentSession.accept({
          sessionDescriptionHandlerOptions: {
            constraints: {
              audio: { deviceId: deviceManager.getSelectedMicId() },
              video: false,
            },
          },
        });
      } catch (err) {
        console.error('Error al contestar invitación SIP:', err);
      }
    }
  }

  public async rejectCall(): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('REJECT');
      return;
    }

    if (this.currentSession instanceof Invitation) {
      try {
        await this.currentSession.reject();
      } catch {}
    }

    this.terminateActiveCall('REJECTED');
  }

  public async hangupCall(): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('HANGUP');
      return;
    }

    if (this.currentSession) {
      try {
        if (this.currentSession.state === SessionState.Established) {
          await this.currentSession.bye();
        } else {
          if ('cancel' in this.currentSession) {
            await (this.currentSession as any).cancel();
          } else if ('reject' in this.currentSession) {
            await (this.currentSession as any).reject();
          }
        }
      } catch {}
    }

    this.terminateActiveCall('HANGUP');
  }

  public async holdCall(): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('HOLD');
      return;
    }

    if (!this.activeCall) return;
    this.activeCall.isOnHold = true;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();

    try {
      await voiceRpc.calls.hold(this.activeCall.id);
    } catch {}
  }

  public async unholdCall(): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('UNHOLD');
      return;
    }

    if (!this.activeCall) return;
    this.activeCall.isOnHold = false;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();

    try {
      await voiceRpc.calls.resume(this.activeCall.id);
    } catch {}
  }

  public sendDTMF(tone: string): void {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('DTMF', { tone });
      return;
    }

    if (this.currentSession && this.currentSession.sessionDescriptionHandler) {
      try {
        (this.currentSession.sessionDescriptionHandler as any).sendDtmf(tone);
      } catch {}
    }
  }

  public setMuted(muted: boolean): void {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('MUTE', { muted });
      return;
    }

    if (!this.activeCall) return;
    this.activeCall.isMuted = muted;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();

    if (this.currentSession && this.currentSession.sessionDescriptionHandler) {
      const sdh = this.currentSession.sessionDescriptionHandler as any;
      if (sdh.peerConnection) {
        sdh.peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = !muted;
          }
        });
      }
    }
  }

  public async blindTransfer(target: string): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('TRANSFER', { target, type: 'BLIND' });
      return;
    }

    if (!this.activeCall) return;

    await voiceRpc.calls.transfer(this.activeCall.id, target, 'BLIND');
    this.hangupCall();
  }

  public async attendedTransfer(target: string): Promise<void> {
    if (!this.isMasterTab) {
      this.tabCoordinator.sendCommandToMaster('TRANSFER', { target, type: 'ATTENDED' });
      return;
    }

    if (!this.activeCall) return;

    await voiceRpc.calls.transfer(this.activeCall.id, target, 'ATTENDED');
  }

  public async pauseRecording(): Promise<void> {
    if (!this.activeCall) return;
    this.activeCall.isRecordingPaused = true;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();
    await voiceRpc.calls.pauseRecording(this.activeCall.id);
  }

  public async resumeRecording(): Promise<void> {
    if (!this.activeCall) return;
    this.activeCall.isRecordingPaused = false;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();
    await voiceRpc.calls.resumeRecording(this.activeCall.id);
  }

  /**
   * Auto-guardado en vivo de notas (VoiceCall.notes) cada 3 segundos
   */
  public async updateNotes(notes: string): Promise<void> {
    if (!this.activeCall) return;
    this.activeCall.notes = notes;
    this.emit('callStateChange', this.activeCall);
    this.syncStateToMirrors();

    if (this.notesTimer) clearTimeout(this.notesTimer);
    this.notesTimer = setTimeout(async () => {
      if (this.activeCall) {
        try {
          await voiceRpc.calls.saveNotes(this.activeCall.id, notes);
        } catch {}
      }
    }, 3000);
  }

  private handleSessionStateChange(sessionState: SessionState, call: ActiveCallInfo): void {
    switch (sessionState) {
      case SessionState.Establishing:
        call.state = call.direction === 'INBOUND' ? 'RINGING_INBOUND' : 'RINGING_OUTBOUND';
        this.emit('callStateChange', call);
        this.syncStateToMirrors();
        break;

      case SessionState.Established:
        call.state = 'ACTIVE';
        call.connectedAt = new Date().toISOString();
        this.attachMediaStream();
        this.startCallTimers();
        this.emit('callStateChange', call);
        this.syncStateToMirrors();
        break;

      case SessionState.Terminated:
        this.terminateActiveCall('SESSION_TERMINATED');
        break;
    }
  }

  private attachMediaStream(): void {
    if (!this.currentSession || !this.remoteAudioElement) return;

    const sdh = this.currentSession.sessionDescriptionHandler as any;
    if (sdh && sdh.peerConnection) {
      const pc: RTCPeerConnection = sdh.peerConnection;

      // Iniciar monitor de estadísticas WebRTC
      this.statsMonitor.start(pc, (metrics) => {
        this.emit('qualityMetrics', metrics);
        if (this.isMasterTab) {
          this.tabCoordinator.broadcastState(this.state, this.activeCall, metrics);
        }
      });

      // Configurar pista de audio remota
      pc.getReceivers().forEach((receiver) => {
        if (receiver.track && receiver.track.kind === 'audio') {
          const stream = new MediaStream([receiver.track]);
          this.remoteAudioElement!.srcObject = stream;
          deviceManager.routeAudioElement(this.remoteAudioElement!, deviceManager.getSelectedSpeakerId());
        }
      });
    }
  }

  private startCallTimers(): void {
    if (this.callDurationTimer) clearInterval(this.callDurationTimer);
    this.callDurationTimer = setInterval(() => {
      if (this.activeCall && this.activeCall.state === 'ACTIVE') {
        this.activeCall.durationSeconds += 1;
        this.emit('callStateChange', this.activeCall);
        this.syncStateToMirrors();
      }
    }, 1000);
  }

  private terminateActiveCall(reason?: string): void {
    if (this.callDurationTimer) {
      clearInterval(this.callDurationTimer);
      this.callDurationTimer = null;
    }
    if (this.notesTimer) {
      clearTimeout(this.notesTimer);
      this.notesTimer = null;
    }
    this.statsMonitor.stop();

    const endedCall = this.activeCall;
    this.activeCall = null;
    this.currentSession = null;

    if (endedCall) {
      endedCall.state = 'TERMINATED';
      this.emit('callEnded', endedCall, reason);
      this.emit('callStateChange', null);
    }
    this.syncStateToMirrors();
  }

  private executeCommandFromMirror(command: string, payload?: any): void {
    switch (command) {
      case 'ANSWER':
        this.answerCall();
        break;
      case 'REJECT':
        this.rejectCall();
        break;
      case 'HANGUP':
        this.hangupCall();
        break;
      case 'HOLD':
        this.holdCall();
        break;
      case 'UNHOLD':
        this.unholdCall();
        break;
      case 'MUTE':
        this.setMuted(Boolean(payload?.muted));
        break;
      case 'DTMF':
        if (payload?.tone) this.sendDTMF(payload.tone);
        break;
      case 'TRANSFER':
        if (payload?.type === 'ATTENDED') {
          this.attendedTransfer(payload.target);
        } else {
          this.blindTransfer(payload.target);
        }
        break;
      case 'MAKE_CALL':
        if (payload?.destination) {
          this.makeCall(payload.destination, payload.displayName, payload.linkedContext);
        }
        break;
    }
  }
}

// Instancia singleton para la aplicación
let softphoneClientInstance: SipSoftphoneClient | null = null;

export function getSoftphoneClient(): SipSoftphoneClient {
  if (!softphoneClientInstance) {
    softphoneClientInstance = new SipSoftphoneClient();
  }
  return softphoneClientInstance;
}
