import { ActiveCallInfo, CallQualityMetrics, SoftphoneState } from './types';

export type TabMessage =
  | { type: 'HEARTBEAT'; tabId: string; timestamp: number }
  | { type: 'CLAIM_MASTER'; tabId: string; timestamp: number }
  | { type: 'MASTER_ACK'; masterTabId: string }
  | { type: 'MASTER_RESIGNING'; tabId: string }
  | {
      type: 'SYNC_STATE';
      tabId: string;
      softphoneState: SoftphoneState;
      activeCall: ActiveCallInfo | null;
      metrics: CallQualityMetrics | null;
    }
  | {
      type: 'COMMAND';
      fromTabId: string;
      command: 'ANSWER' | 'REJECT' | 'HANGUP' | 'HOLD' | 'UNHOLD' | 'MUTE' | 'DTMF' | 'TRANSFER' | 'MAKE_CALL';
      payload?: any;
    };

export interface MultiTabListener {
  onMasterChange: (isMaster: boolean) => void;
  onStateSync: (softphoneState: SoftphoneState, activeCall: ActiveCallInfo | null, metrics: CallQualityMetrics | null) => void;
  onCommandReceived: (command: string, payload?: any) => void;
}

export class TabCoordinator {
  public readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private isMaster = false;
  private currentMasterTabId: string | null = null;
  private lastMasterHeartbeat = 0;
  private heartbeatInterval: any = null;
  private checkInterval: any = null;
  private listeners: MultiTabListener[] = [];
  private isDestroyed = false;

  constructor() {
    this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('fusion_softphone_tab_coordinator');
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch (err) {
        console.warn('BroadcastChannel no disponible para softphone multi-pestaña', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.handleUnload());
    }

    this.startElectionProcess();
  }

  public subscribe(listener: MultiTabListener): () => void {
    this.listeners.push(listener);
    // Disparar estado inicial
    listener.onMasterChange(this.isMaster);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getIsMaster(): boolean {
    return this.isMaster;
  }

  /**
   * Envía comando desde pestaña espejo a pestaña maestra
   */
  public sendCommandToMaster(command: 'ANSWER' | 'REJECT' | 'HANGUP' | 'HOLD' | 'UNHOLD' | 'MUTE' | 'DTMF' | 'TRANSFER' | 'MAKE_CALL', payload?: any): void {
    if (this.isMaster) {
      // Si soy maestro, ejecutar directamente
      this.listeners.forEach((l) => l.onCommandReceived(command, payload));
      return;
    }

    this.postMessage({
      type: 'COMMAND',
      fromTabId: this.tabId,
      command,
      payload,
    });
  }

  /**
   * Pestaña maestra transmite su estado a todas las demás pestañas
   */
  public broadcastState(softphoneState: SoftphoneState, activeCall: ActiveCallInfo | null, metrics: CallQualityMetrics | null): void {
    if (!this.isMaster) return;

    this.postMessage({
      type: 'SYNC_STATE',
      tabId: this.tabId,
      softphoneState,
      activeCall,
      metrics,
    });
  }

  private startElectionProcess(): void {
    // Si no hay BroadcastChannel, esta pestaña es automáticamente la maestra
    if (!this.channel) {
      this.promoteToMaster();
      return;
    }

    // Intervalo de comprobación de latido del maestro
    this.checkInterval = setInterval(() => {
      if (this.isDestroyed) return;

      const now = Date.now();
      if (!this.isMaster) {
        // Si no ha habido latido en 2.2 segundos, reclamar maestro
        if (now - this.lastMasterHeartbeat > 2200) {
          this.claimMaster();
        }
      }
    }, 1000);

    // Intentar reclamar maestro tras pequeño jitter aleatorio (50-250ms)
    setTimeout(() => {
      if (!this.currentMasterTabId) {
        this.claimMaster();
      }
    }, 50 + Math.random() * 200);
  }

  private claimMaster(): void {
    if (this.isMaster) return;
    this.postMessage({
      type: 'CLAIM_MASTER',
      tabId: this.tabId,
      timestamp: Date.now(),
    });

    // Si nadie responde en 300ms reclamando tener prioridad, nos declaramos maestro
    setTimeout(() => {
      if (!this.isMaster && (!this.currentMasterTabId || this.currentMasterTabId === this.tabId)) {
        this.promoteToMaster();
      }
    }, 300);
  }

  private promoteToMaster(): void {
    this.isMaster = true;
    this.currentMasterTabId = this.tabId;
    this.lastMasterHeartbeat = Date.now();

    // Comenzar latidos cada 1000ms
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      this.postMessage({
        type: 'HEARTBEAT',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    }, 1000);

    this.postMessage({
      type: 'MASTER_ACK',
      masterTabId: this.tabId,
    });

    this.listeners.forEach((l) => l.onMasterChange(true));
  }

  private demoteToMirror(masterId: string): void {
    const wasMaster = this.isMaster;
    this.isMaster = false;
    this.currentMasterTabId = masterId;
    this.lastMasterHeartbeat = Date.now();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (wasMaster) {
      this.listeners.forEach((l) => l.onMasterChange(false));
    }
  }

  private handleMessage(data: TabMessage): void {
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'HEARTBEAT':
        if (data.tabId !== this.tabId) {
          this.lastMasterHeartbeat = Date.now();
          if (this.isMaster) {
            // Conflicto de dos maestros: romper empate por orden lexicográfico de tabId
            if (data.tabId < this.tabId) {
              this.demoteToMirror(data.tabId);
            }
          } else {
            this.currentMasterTabId = data.tabId;
          }
        }
        break;

      case 'MASTER_ACK':
        if (data.masterTabId !== this.tabId) {
          this.demoteToMirror(data.masterTabId);
        }
        break;

      case 'CLAIM_MASTER':
        if (this.isMaster) {
          // Responder inmediatamente para notificar que ya hay un maestro activo
          this.postMessage({
            type: 'MASTER_ACK',
            masterTabId: this.tabId,
          });
        } else if (data.tabId < this.tabId) {
          this.currentMasterTabId = data.tabId;
        }
        break;

      case 'MASTER_RESIGNING':
        if (data.tabId === this.currentMasterTabId) {
          this.currentMasterTabId = null;
          this.lastMasterHeartbeat = 0;
          // Elección inmediata en < 100ms
          setTimeout(() => this.claimMaster(), Math.random() * 80);
        }
        break;

      case 'SYNC_STATE':
        if (!this.isMaster) {
          this.listeners.forEach((l) => l.onStateSync(data.softphoneState, data.activeCall, data.metrics));
        }
        break;

      case 'COMMAND':
        if (this.isMaster) {
          this.listeners.forEach((l) => l.onCommandReceived(data.command, data.payload));
        }
        break;
    }
  }

  private postMessage(msg: TabMessage): void {
    try {
      this.channel?.postMessage(msg);
    } catch {}
  }

  private handleUnload(): void {
    if (this.isMaster) {
      this.postMessage({
        type: 'MASTER_RESIGNING',
        tabId: this.tabId,
      });
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
    }
  }
}
