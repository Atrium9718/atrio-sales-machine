import { EventEmitter } from 'events';
import { Employee } from '../services/employeeService';

/**
 * Catálogo canónico y estricto de eventos de dominio y sus payloads tipados
 */
export interface DomainEventPayloadMap {
  EMPLOYEE_CREATED: {
    employee: Employee;
  };
  EMPLOYEE_UPDATED: {
    employee: Employee;
    previousState?: Partial<Employee>;
  };
  EMPLOYEE_DEACTIVATED: {
    employeeId: string;
    timestamp: string;
  };
  PROJECT_STAGE_CHANGED: {
    projectId: string;
    fromStage: string;
    toStage: string;
  };
  QUOTE_APPROVED: {
    quoteId: string;
    totalValue: number;
  };
  CLIENT_REQUEST_CREATED: {
    requestId: string;
    clientName: string;
    preview: string;
    attachmentCount: number;
    createdAt: string;
  };
  OMNICHANNEL_CONVERSATION_UPDATED: {
    conversationId: string;
    channel: string;
    contactName: string;
    needsHuman: boolean;
    awaitingApproval: boolean;
    handoffReason: string | null;
    preview: string;
  };
  INTEGRATION_CHECK_FAILED: {
    integration: string;
    name: string;
    message: string;
  };
  AI_BUDGET_ALERT: {
    month: string;
    level: string;
    spentCop: number;
    budgetCop: number | null;
    percent: number | null;
    aiPaused: boolean;
  };
  SYSTEM_TRANSIENT_DATA_PURGED: {
    purgedCollections: string[];
    recordsDeleted: number;
    timestamp: string;
  };
}

export type DomainEventType = keyof DomainEventPayloadMap;

export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  type: T;
  payload: DomainEventPayloadMap[T];
  timestamp: string;
}

export type DomainEventListener<T extends DomainEventType> = (
  payload: DomainEventPayloadMap[T],
  event: DomainEvent<T>
) => void | Promise<void>;

export interface RecentEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
  /** Errores de los suscriptores al procesarlo. */
  errors: string[];
}

/**
 * Bus de eventos de dominio en memoria desacoplado (Singleton basado en EventEmitter).
 * Garantiza comunicación asíncrona y reactiva entre módulos sin acoplamiento directo.
 */
class DomainEventBus {
  private static instance: DomainEventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Permite múltiples suscriptores sin advertencias de memory leak
  }

  /** Últimos eventos (en memoria, para la consola de eventos). */
  private recent: RecentEvent[] = [];
  private seq = 0;
  private remember(e: RecentEvent) {
    this.recent.unshift(e);
    if (this.recent.length > 300) this.recent.length = 300;
  }
  public getRecent(): RecentEvent[] {
    return this.recent;
  }

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  /**
   * Publica un evento de dominio tipado a todos los suscriptores registrados.
   */
  public publish<T extends DomainEventType>(type: T, payload: DomainEventPayloadMap[T]): DomainEvent<T> {
    const event: DomainEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    console.log(`[DomainEventBus] ⚡ [${type}] @ ${event.timestamp}:`, JSON.stringify(payload));
    this.remember({ id: `${event.timestamp}-${++this.seq}`, type, timestamp: event.timestamp, payload, errors: [] });
    this.emitter.emit(type, payload, event);
    this.emitter.emit('*', event);

    return event;
  }

  /**
   * Suscribe un handler tipado a un tipo de evento específico.
   * Retorna una función para cancelar la suscripción (unsubscribe).
   */
  public subscribe<T extends DomainEventType>(
    type: T,
    listener: DomainEventListener<T>
  ): () => void {
    const handler = async (payload: DomainEventPayloadMap[T], event: DomainEvent<T>) => {
      try {
        await listener(payload, event);
      } catch (error) {
        console.error(`[DomainEventBus] Error procesando evento [${type}]:`, error);
        const rec = this.recent.find((r) => r.timestamp === event.timestamp && r.type === type);
        if (rec) rec.errors.push(String((error as Error)?.message || error).slice(0, 300));
      }
    };

    this.emitter.on(type, handler);

    return () => {
      this.emitter.off(type, handler);
    };
  }

  /**
   * Suscripción comodín para monitoreo global, métricas y auditoría.
   */
  public subscribeAll(listener: (event: DomainEvent) => void): () => void {
    this.emitter.on('*', listener);
    return () => {
      this.emitter.off('*', listener);
    };
  }

  /**
   * Limpia todos los suscriptores (útil para pruebas unitarias)
   */
  public reset(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = DomainEventBus.getInstance();
export default eventBus;
