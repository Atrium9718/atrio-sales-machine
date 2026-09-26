import WebSocket from 'ws';
import { AriEvent, AriChannel, AriBridge, AriLiveRecording } from './types';
import { telemetry } from '../telemetry';

export interface AriClientConfig {
  baseUrl: string; // http://asterisk:8088
  wsUrl: string; // ws://asterisk:8088/ari/events?app=fusion-voz&subscribeAll=false
  username: string;
  password: string;
  appName: string;
}

export type AriEventHandler = (event: AriEvent) => Promise<void> | void;

export class AriClient {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: AriEventHandler[] = [];
  private authHeader: string;
  private isClosingExplicitly = false;

  constructor(private readonly config: AriClientConfig) {
    const creds = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    this.authHeader = `Basic ${creds}`;
  }

  public onEvent(handler: AriEventHandler): void {
    this.eventHandlers.push(handler);
  }

  public async connect(): Promise<void> {
    this.isClosingExplicitly = false;
    this.initiateWebSocketConnection();
  }

  private initiateWebSocketConnection(): void {
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (e) {
        // ignore
      }
    }

    telemetry.log('INFO', `Conectando WebSocket ARI a ${this.config.wsUrl}...`);

    try {
      this.ws = new WebSocket(this.config.wsUrl, {
        headers: {
          Authorization: this.authHeader,
        },
      });

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempt = 0;
        telemetry.log('INFO', `Conexión WebSocket ARI establecida para la aplicación '${this.config.appName}'.`);
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          const payload = JSON.parse(data.toString()) as AriEvent;
          for (const handler of this.eventHandlers) {
            try {
              await handler(payload);
            } catch (err: any) {
              telemetry.log('ERROR', `Error en manejador de evento ARI ${payload.type}: ${err.message}`, {
                eventType: payload.type,
                error: err.stack,
              });
            }
          }
        } catch (e: any) {
          telemetry.log('WARN', `Error deserializando mensaje ARI WebSocket: ${e.message}`);
        }
      });

      this.ws.on('error', (err) => {
        telemetry.log('ERROR', `Error en conexión WebSocket ARI: ${err.message}`);
        telemetry.recordAriError('WS_ERROR');
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        telemetry.log('WARN', `Conexión WebSocket ARI cerrada. Código: ${code}, Razón: ${reason}`);
        if (!this.isClosingExplicitly) {
          this.scheduleReconnect();
        }
      });
    } catch (err: any) {
      telemetry.log('ERROR', `Fallo al inicializar WebSocket ARI: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Retroceso exponencial con tope de 30 segundos y variación aleatoria (jitter).
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempt++;
    // 2^attempt * 500ms + random jitter (hasta 1000ms), limitado a 30s
    const baseDelay = Math.min(Math.pow(2, this.reconnectAttempt) * 500, 30000);
    const jitter = Math.floor(Math.random() * 1000);
    const delay = Math.min(baseDelay + jitter, 30000);

    telemetry.log('INFO', `Reintentando reconexión a Asterisk ARI en ${Math.round(delay / 1000)}s (intento #${this.reconnectAttempt})...`);

    this.reconnectTimer = setTimeout(() => {
      this.initiateWebSocketConnection();
    }, delay);
  }

  public async disconnect(): Promise<void> {
    this.isClosingExplicitly = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  // ---------------------------------------------------------------------------
  // OPERACIONES REST ARI CON ASTERISK
  // ---------------------------------------------------------------------------

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/ari${path}`;
    const headers = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      telemetry.recordAriError(`HTTP_${response.status}`);
      throw new Error(`ARI HTTP ${response.status} en ${path}: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  // --- CANALES ---

  public async answerChannel(channelId: string): Promise<void> {
    await this.request(`/channels/${channelId}/answer`, { method: 'POST' });
  }

  public async hangupChannel(channelId: string, reason = 'normal'): Promise<void> {
    await this.request(`/channels/${channelId}?reason=${encodeURIComponent(reason)}`, {
      method: 'DELETE',
    });
  }

  public async createChannel(params: {
    endpoint: string;
    app: string;
    appArgs?: string;
    channelId?: string;
    callerId?: string;
    timeout?: number;
    variables?: Record<string, string>;
  }): Promise<AriChannel> {
    const query = new URLSearchParams({
      endpoint: params.endpoint,
      app: params.app,
      ...(params.appArgs ? { appArgs: params.appArgs } : {}),
      ...(params.channelId ? { channelId: params.channelId } : {}),
      ...(params.callerId ? { callerId: params.callerId } : {}),
      ...(params.timeout ? { timeout: String(params.timeout) } : {}),
    });

    return this.request<AriChannel>(`/channels/create?${query.toString()}`, {
      method: 'POST',
      body: params.variables ? JSON.stringify({ variables: params.variables }) : undefined,
    });
  }

  public async originateChannel(params: {
    endpoint: string;
    extension?: string;
    context?: string;
    priority?: number;
    app?: string;
    appArgs?: string;
    callerId?: string;
    timeout?: number;
    channelId?: string;
    variables?: Record<string, string>;
  }): Promise<AriChannel> {
    const query = new URLSearchParams({
      endpoint: params.endpoint,
      ...(params.extension ? { extension: params.extension } : {}),
      ...(params.context ? { context: params.context } : {}),
      ...(params.priority ? { priority: String(params.priority) } : {}),
      ...(params.app ? { app: params.app } : {}),
      ...(params.appArgs ? { appArgs: params.appArgs } : {}),
      ...(params.callerId ? { callerId: params.callerId } : {}),
      ...(params.timeout ? { timeout: String(params.timeout) } : {}),
      ...(params.channelId ? { channelId: params.channelId } : {}),
    });

    return this.request<AriChannel>(`/channels?${query.toString()}`, {
      method: 'POST',
      body: params.variables ? JSON.stringify({ variables: params.variables }) : undefined,
    });
  }

  public async dialChannel(channelId: string, callerId?: string, timeout = 30): Promise<void> {
    const query = new URLSearchParams({
      timeout: String(timeout),
      ...(callerId ? { caller: callerId } : {}),
    });
    await this.request(`/channels/${channelId}/dial?${query.toString()}`, { method: 'POST' });
  }

  public async holdChannel(channelId: string): Promise<void> {
    await this.request(`/channels/${channelId}/hold`, { method: 'POST' });
  }

  public async unholdChannel(channelId: string): Promise<void> {
    await this.request(`/channels/${channelId}/hold`, { method: 'DELETE' });
  }

  public async startMusicOnHold(channelId: string, mohClass = 'default'): Promise<void> {
    await this.request(`/channels/${channelId}/moh?mohClass=${encodeURIComponent(mohClass)}`, {
      method: 'POST',
    });
  }

  public async stopMusicOnHold(channelId: string): Promise<void> {
    await this.request(`/channels/${channelId}/moh`, { method: 'DELETE' });
  }

  public async playMediaOnChannel(channelId: string, mediaUri: string): Promise<{ id: string }> {
    return this.request(`/channels/${channelId}/play?media=${encodeURIComponent(mediaUri)}`, {
      method: 'POST',
    });
  }

  public async getChannels(): Promise<AriChannel[]> {
    return this.request<AriChannel[]>('/channels');
  }

  // --- PUENTES (BRIDGES) ---

  public async createBridge(type: 'mixing' | 'holding' = 'mixing', name?: string): Promise<AriBridge> {
    const query = new URLSearchParams({
      type,
      ...(name ? { name } : {}),
    });
    return this.request<AriBridge>(`/bridges?${query.toString()}`, { method: 'POST' });
  }

  public async addChannelToBridge(bridgeId: string, channelId: string, role = 'participant'): Promise<void> {
    await this.request(`/bridges/${bridgeId}/addChannel?channel=${channelId}&role=${role}`, {
      method: 'POST',
    });
  }

  public async removeChannelFromBridge(bridgeId: string, channelId: string): Promise<void> {
    await this.request(`/bridges/${bridgeId}/removeChannel?channel=${channelId}`, {
      method: 'POST',
    });
  }

  public async destroyBridge(bridgeId: string): Promise<void> {
    await this.request(`/bridges/${bridgeId}`, { method: 'DELETE' });
  }

  public async getBridges(): Promise<AriBridge[]> {
    return this.request<AriBridge[]>('/bridges');
  }

  // --- GRABACIÓN (RECORDINGS) ---

  public async recordBridge(
    bridgeId: string,
    name: string,
    format = 'wav',
    maxDurationSeconds = 7200
  ): Promise<AriLiveRecording> {
    const query = new URLSearchParams({
      name,
      format,
      maxDurationSeconds: String(maxDurationSeconds),
      ifExists: 'overwrite',
      beep: 'false',
    });
    return this.request<AriLiveRecording>(`/bridges/${bridgeId}/record?${query.toString()}`, {
      method: 'POST',
    });
  }

  public async recordChannel(
    channelId: string,
    params: {
      name: string;
      format?: string;
      maxDurationSeconds?: number;
      maxSilenceSeconds?: number;
      terminateOn?: string;
      beep?: boolean;
    }
  ): Promise<AriLiveRecording> {
    const query = new URLSearchParams({
      name: params.name,
      format: params.format || 'wav',
      maxDurationSeconds: String(params.maxDurationSeconds ?? 120),
      maxSilenceSeconds: String(params.maxSilenceSeconds ?? 5),
      terminateOn: params.terminateOn ?? '#',
      beep: params.beep !== false ? 'true' : 'false',
      ifExists: 'overwrite',
    });
    return this.request<AriLiveRecording>(`/channels/${channelId}/record?${query.toString()}`, {
      method: 'POST',
    });
  }

  public async pauseRecording(recordingName: string): Promise<void> {
    await this.request(`/recordings/live/${recordingName}/pause`, { method: 'POST' });
  }

  public async resumeRecording(recordingName: string): Promise<void> {
    await this.request(`/recordings/live/${recordingName}/pause`, { method: 'DELETE' });
  }

  public async stopRecording(recordingName: string): Promise<void> {
    await this.request(`/recordings/live/${recordingName}/stop`, { method: 'POST' });
  }

  // --- ENDPOINTS PJSIP ---

  public async getEndpoints(): Promise<any[]> {
    return this.request<any[]>('/endpoints/PJSIP');
  }
}
