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
