import { PrismaClient } from '@prisma/client';
import { ActiveCall } from '../state/registry';
import { CallMachineSnapshot } from '@fusion/core/voice/callMachine';
import { telemetry } from '../telemetry';

// Instancia de Prisma dedicada para el servicio de voz
const prisma = new PrismaClient();

interface PersistTask {
  id: string;
  name: string;
  execute: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

class VoicePersistenceService {
  private queue: PersistTask[] = [];
  private isProcessing = false;
  private consecutiveFailures = 0;

  constructor() {
    // Monitoreo periódico de fallos persistentes en cola
    setInterval(() => {
      if (this.consecutiveFailures >= 5) {
        telemetry.log('ERROR', 'ALERTA CRÍTICA: Persistencia de llamadas con fallos consecutivos hacia PostgreSQL', {
          consecutiveFailures: this.consecutiveFailures,
          queueLength: this.queue.length,
        });
      }
    }, 15000);
  }

  private enqueue(name: string, execute: () => Promise<void>, maxRetries = 3): void {
    const task: PersistTask = {
      id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      execute,
      retries: 0,
      maxRetries,
    };
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];
      try {
        await task.execute();
        this.queue.shift(); // Éxito: remover
        this.consecutiveFailures = 0;
      } catch (err: any) {
        task.retries++;
        this.consecutiveFailures++;
        telemetry.log('WARN', `Error en tarea de persistencia ${task.name} (intento ${task.retries}/${task.maxRetries})`, {
          error: err.message,
          taskId: task.id,
        });

        if (task.retries >= task.maxRetries) {
          // Descartar tras agotar reintentos y alertar
          this.queue.shift();
          telemetry.log('ERROR', `Fallo definitivo en persistencia de voz: ${task.name}`, {
            taskId: task.id,
            error: err.message,
          });
        } else {
          // Esperar brevemente antes de reintentar
          await new Promise((r) => setTimeout(r, 200 * task.retries));
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Persiste la llamada recién creada en estado inicial (RINGING/CREATED)
   */
  public persistCallCreation(call: ActiveCall): void {
    this.enqueue(`create-call-${call.callId}`, async () => {
      await prisma.voiceCall.create({
        data: {
          id: call.callId,
          organizationId: call.organizationId,
          channelId: call.channelId,
          direction: call.direction as any,
          fromNumber: call.fromNumber,
          toNumber: call.toNumber,
          didId: call.didId,
          trunkId: call.trunkId,
          status: 'RINGING',
          startedAt: call.startedAt,
          customerId: call.context?.customerId ?? null,
          contactId: call.context?.contactId ?? null,
          handledByUserId: call.handledByUserId ?? null,
          extensionId: call.extensionId ?? null,
          queueId: call.queueId ?? null,
          ivrFlowId: call.ivrFlowId ?? null,
        },
      });

      // Registrar primer evento CREATED
      await prisma.voiceCallEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          type: 'CREATED',
          payload: {
            direction: call.direction,
            from: call.fromNumber,
            to: call.toNumber,
            channelId: call.channelId,
            correlationId: call.correlationId,
          },
        },
      });
    });
  }

  /**
   * Persiste cada transición y su evento en VoiceCallEvent (SIN EXCEPCIÓN)
   */
  public persistCallTransition(
    callId: string,
    organizationId: string,
    event: { type: string; from: string; to: string; at: Date; actorUserId?: string; payload: Record<string, unknown> },
    snapshot: CallMachineSnapshot
  ): void {
    this.enqueue(`transition-${callId}-${event.to}`, async () => {
      // 1. Crear evento inmutable de auditoría
      await prisma.voiceCallEvent.create({
        data: {
          organizationId,
          callId,
          at: event.at,
          type: (event.type as any) || 'DTMF',
          actorUserId: event.actorUserId ?? null,
          payload: {
            fromState: event.from,
            toState: event.to,
            ...event.payload,
          } as any,
        },
      });

      // 2. Actualizar estado y métricas agregadas de la llamada
      await prisma.voiceCall.update({
        where: { id: callId },
        data: {
          status: snapshot.state as any,
          answeredAt: snapshot.answeredAt,
          endedAt: snapshot.endedAt,
          waitSeconds: snapshot.waitSeconds,
          talkSeconds: snapshot.talkSeconds,
          holdSeconds: snapshot.holdSeconds,
          totalSeconds: snapshot.totalSeconds,
        },
      });
    });
  }

  /**
   * Cierra la llamada en base de datos con su disposition final, causas y duraciones.
   */
  public persistCallCompletion(
    call: ActiveCall,
    disposition: 'ANSWERED' | 'MISSED' | 'ABANDONED_IN_QUEUE' | 'VOICEMAIL_LEFT' | 'HANDLED_BY_AI' | 'FAILED',
    hangupCause?: string,
    hangupBy: 'CALLER' | 'AGENT' | 'SYSTEM' | 'UNKNOWN' = 'UNKNOWN'
  ): void {
    this.enqueue(`complete-call-${call.callId}`, async () => {
      const endedAt = new Date();
      const totalSecs = Math.max(0, Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000));
      const talkSecs = call.answeredAt
        ? Math.max(0, Math.floor((endedAt.getTime() - call.answeredAt.getTime()) / 1000) - (call.machine.holdSeconds || 0))
        : 0;

      await prisma.voiceCall.update({
        where: { id: call.callId },
        data: {
          status: 'COMPLETED',
          disposition: disposition as any,
          endedAt,
          totalSeconds: totalSecs,
          talkSeconds: talkSecs,
          hangupCause: hangupCause ?? 'NORMAL_CLEARING',
          hangupBy: hangupBy as any,
          bridgeId: call.bridgeId ?? null,
          recordingId: call.recordingId ?? null,
        },
      });

      // Evento de cierre
      await prisma.voiceCallEvent.create({
        data: {
          organizationId: call.organizationId,
          callId: call.callId,
          at: endedAt,
          type: 'HANGUP',
          payload: {
            disposition,
            totalSeconds: totalSecs,
            talkSeconds: talkSecs,
            hangupCause,
            hangupBy,
          },
        },
      });

      // Crear Activity de Etapa 6 si la llamada fue atendida y asociada a un cliente
      if (disposition === 'ANSWERED' && call.context?.customerId) {
        await this.createCallActivity(call, totalSecs);
      }

      // Si nadie contestó (MISSED): crear tarea de devolución en 2 horas hábiles
      if (disposition === 'MISSED') {
        await this.createCallbackTask(call);
      }
    });
  }

  /**
   * Registra una actividad de llamada (Activity Etapa 6) en el historial del cliente
   */
  private async createCallActivity(call: ActiveCall, durationSeconds: number): Promise<void> {
    try {
      const minutes = Math.ceil(durationSeconds / 60);
      await prisma.activity.create({
        data: {
          organizationId: call.organizationId,
          clientId: call.context?.customerId ?? null,
          contactId: call.context?.contactId ?? null,
          userId: call.handledByUserId ?? null,
          type: 'CALL' as any,
          subject: `Llamada ${call.direction === 'INBOUND' ? 'entrante' : 'saliente'} (${minutes} min)`,
          body: `Llamada telefónica registrada desde el número ${call.fromNumber} hacia ${call.toNumber}. Duración: ${durationSeconds} segundos.`,
          durationMinutes: minutes,
          occurredAt: new Date(),
        },
      });
    } catch (err: any) {
      telemetry.log('WARN', 'No se pudo crear Activity para la llamada completada', {
        callId: call.callId,
        error: err.message,
      });
    }
  }

  /**
   * Crea una tarea de devolución para una llamada perdida (Bloque E regla 8)
   */
  private async createCallbackTask(call: ActiveCall): Promise<void> {
    try {
      // 2 horas hábiles (120 minutos)
      const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await prisma.task.create({
        data: {
          organizationId: call.organizationId,
          code: `TASK-CALL-${Date.now()}`,
          clientId: call.context?.customerId ?? null,
          assigneeId: call.handledByUserId ?? null,
          title: `Devolver llamada perdida: ${call.fromNumber}`,
          description: `El cliente o prospecto llamó el ${call.startedAt.toLocaleString('es-CO')} pero nadie contestó. Devolver la llamada con prioridad comercial.`,
          priority: 'HIGH' as any,
          status: 'PENDING' as any,
          dueAt,
        },
      });
      telemetry.log('INFO', `Tarea de devolución de llamada creada para ${call.fromNumber}`, {
        callId: call.callId,
        dueAt: dueAt.toISOString(),
      });
    } catch (err: any) {
      telemetry.log('ERROR', 'Error creando tarea de devolución de llamada perdida', {
        callId: call.callId,
        error: err.message,
      });
    }
  }
}

export const persistence = new VoicePersistenceService();
export { prisma };
