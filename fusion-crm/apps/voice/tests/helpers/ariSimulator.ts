import EventEmitter from 'node:events';
import { AriChannel, AriBridge, AriLiveRecording, AriEvent } from '../../src/ari/types';

export interface RecordedCallOperation {
  method: 'POST' | 'DELETE' | 'GET';
  path: string;
  payload?: any;
  timestamp: Date;
}

/**
 * Simulador en memoria de Asterisk REST Interface (ARI).
 * Permite inyectar eventos WebSocket e inspeccionar las operaciones REST ejecutadas
 * sin necesidad de un servidor Asterisk real en ejecución.
 */
export class AriSimulator extends EventEmitter {
  public channels = new Map<string, AriChannel>();
  public bridges = new Map<string, AriBridge>();
  public recordings = new Map<string, AriLiveRecording>();
  public operations: RecordedCallOperation[] = [];

  private isConnected = true;

  // Inyectar un evento que recibirá el despachador
  public emitEvent(event: AriEvent): void {
    this.emit('event', event);
  }

  public recordOp(method: 'POST' | 'DELETE' | 'GET', path: string, payload?: any): void {
    this.operations.push({
      method,
      path,
      payload,
      timestamp: new Date(),
    });
  }

  // Simulación de canales
  public createMockChannel(params: {
    id: string;
    name?: string;
    state?: AriChannel['state'];
    callerNumber?: string;
    exten?: string;
    context?: string;
  }): AriChannel {
    const ch: AriChannel = {
      id: params.id,
      name: params.name || `PJSIP/${params.id}-00000001`,
      state: params.state || 'Ring',
      caller: {
        name: 'Caller',
        number: params.callerNumber || '3001234567',
      },
      connected: {
        name: '',
        number: '',
      },
      accountcode: '',
      dialplan: {
        context: params.context || 'from-trunk',
        exten: params.exten || '6068801234',
        priority: 1,
      },
      creationtime: new Date().toISOString(),
      language: 'es',
    };
    this.channels.set(ch.id, ch);
    return ch;
  }

  public getMockChannels(): AriChannel[] {
    return Array.from(this.channels.values());
  }

  public getMockBridges(): AriBridge[] {
    return Array.from(this.bridges.values());
  }

  public simulateAnswer(channelId: string): void {
    const ch = this.channels.get(channelId);
    if (ch) {
      ch.state = 'Up';
      this.emitEvent({
        type: 'ChannelStateChange',
        application: 'fusion-voz',
        timestamp: new Date().toISOString(),
        channel: ch,
      });
    }
  }

  public simulateHangup(channelId: string, cause = 16, causeTxt = 'Normal Clearing'): void {
    const ch = this.channels.get(channelId);
    if (ch) {
      this.channels.delete(channelId);
      this.emitEvent({
        type: 'ChannelDestroyed',
        application: 'fusion-voz',
        timestamp: new Date().toISOString(),
        channel: ch,
        cause,
        cause_txt: causeTxt,
      });
    }
  }

  public reset(): void {
    this.channels.clear();
    this.bridges.clear();
    this.recordings.clear();
    this.operations = [];
  }
}
