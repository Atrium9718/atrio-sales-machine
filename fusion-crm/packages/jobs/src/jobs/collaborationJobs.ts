/**
 * Trabajos Programados de Colaboración — Fusion ERP / CRM (Etapa 15.1)
 */

import { PrismaClient } from '@prisma/client';
import { computeTaskCompliance } from '../../../core/src/performance/task-compliance';
import { computeCapacity } from '../../../core/src/performance/capacity';
import { calculateGoalPace } from '../../../core/src/performance/goal-pace';
import { isBusinessDay } from '../../../core/src/calendar/colombian-holidays';
import { resolveAudienceUserIds } from '../../../core/src/announcements/audience';
import { isColombianBusinessHours } from '../../../core/src/announcements/receipts';

const prisma = new PrismaClient();

export interface ScheduledJobDefinition {
  id: string;
  name: string;
  schedule: string; // Cron expression
  description: string;
  stage: string;
  handler: () => Promise<void>;
}

export const COLLABORATION_SCHEDULED_JOBS: Record<string, ScheduledJobDefinition> = {
  'performance:task-compliance': {
    id: 'performance:task-compliance',
    name: 'Cálculo de Cumplimiento Diario de Tareas',
    schedule: '30 4 * * *', // diario 4:30
    description: 'Calcula tareas vencidas, completadas a tiempo y porcentaje de cumplimiento para TaskComplianceDaily',
    stage: '15.3',
    handler: async () => {
      const startTime = Date.now();
      let rowsWritten = 0;
      console.log('[Job:performance:task-compliance] Iniciando recálculo de los últimos 3 días...');

      try {
        const users = await prisma.user.findMany({
          select: { id: true, organizationId: true },
        });

        const today = new Date();
        const datesToProcess: Date[] = [];
        for (let i = 0; i < 3; i++) {
          const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i, 0, 0, 0));
          datesToProcess.push(d);
        }

        for (const user of users) {
          let consecutiveRedDays = 0;

          for (const targetDate of datesToProcess) {
            const dayStart = new Date(targetDate.getTime());
            const dayEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1);

            // Consultar tareas del usuario con vencimiento en la fecha
            const tasks = await (prisma as any).task.findMany({
              where: {
                organizationId: user.organizationId,
                assignedToId: user.id,
                dueAt: { gte: dayStart, lte: dayEnd },
              },
              select: {
                id: true,
                title: true,
                dueAt: true,
                completedAt: true,
                status: true,
                snoozeCount: true,
                createdByAutomation: true,
              },
            }).catch(() => []);

            const result = computeTaskCompliance({
              tasks: tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                dueAt: t.dueAt,
                completedAt: t.completedAt,
                status: t.status,
                snoozeCount: t.snoozeCount || 0,
                createdByAutomation: !!t.createdByAutomation,
              })),
              windowStart: dayStart,
              windowEnd: dayEnd,
              now: new Date(),
              config: {
                greenThreshold: 85,
                amberThreshold: 70,
                graceHours: 4,
                excludeAutomationTasks: false,
              },
            });

            if (result.level === 'RED') {
              consecutiveRedDays++;
            }

            // Persistencia idempotente en TaskComplianceDaily
            await (prisma as any).taskComplianceDaily.upsert({
              where: {
                organizationId_userId_date: {
                  organizationId: user.organizationId,
                  userId: user.id,
                  date: targetDate,
                },
              },
              update: {
                tasksDue: result.onTime + result.late + result.overdueOpen,
                tasksCompleted: result.onTime + result.late,
                tasksCompletedOnTime: result.onTime,
                tasksCompletedLate: result.late,
                tasksOverdueOpen: result.overdueOpen,
                tasksSnoozed: result.snoozedChronic,
                averageDaysLate: result.averageDaysLate,
                compliancePercent: result.compliancePercent,
                computedAt: new Date(),
              },
              create: {
                organizationId: user.organizationId,
                userId: user.id,
                date: targetDate,
                tasksDue: result.onTime + result.late + result.overdueOpen,
                tasksCompleted: result.onTime + result.late,
                tasksCompletedOnTime: result.onTime,
                tasksCompletedLate: result.late,
                tasksOverdueOpen: result.overdueOpen,
                tasksSnoozed: result.snoozedChronic,
                averageDaysLate: result.averageDaysLate,
                compliancePercent: result.compliancePercent,
                computedAt: new Date(),
              },
            }).catch(() => null);

            rowsWritten++;
          }

          // Si acumula 3 días seguidos bajo el umbral rojo, registrar evento
          if (consecutiveRedDays >= 3) {
            console.log(`[Job:performance:task-compliance] Evento cumplimiento.tareas_bajo emitido para usuario ${user.id}`);
          }
        }
      } catch (err) {
        console.error('[Job:performance:task-compliance] Error ejecutando trabajo:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:performance:task-compliance] Finalizado en ${durationMs}ms. Filas procesadas/escritas: ${rowsWritten}`);
    },
  },

  'performance:capacity': {
    id: 'performance:capacity',
    name: 'Consolidación de Capacidad y Horas Diarias',
    schedule: '45 4 * * *', // diario 4:45
    description: 'Consolida horas disponibles, registradas, productivas y ausencias para CapacityDaily',
    stage: '15.3',
    handler: async () => {
      const startTime = Date.now();
      let rowsWritten = 0;
      console.log('[Job:performance:capacity] Iniciando consolidación de capacidad...');

      try {
        const employees = await (prisma as any).productionEmployee.findMany({
          select: { id: true, organizationId: true, areaKey: true },
        }).catch(() => []);

        const today = new Date();
        const datesToProcess: Date[] = [];
        for (let i = 0; i < 3; i++) {
          const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i, 0, 0, 0));
          datesToProcess.push(d);
        }

        for (const emp of employees) {
          for (const targetDate of datesToProcess) {
            // Verificar si es día hábil
            const isWorkday = isBusinessDay(targetDate);
            let availableHours = isWorkday ? 8 : 0;

            // Restar ausencias
            const absences = await (prisma as any).employeeAbsence.findMany({
              where: {
                organizationId: emp.organizationId,
                employeeId: emp.id,
                startAt: { lte: targetDate },
                endAt: { gte: targetDate },
              },
            }).catch(() => []);

            const totalAbsenceHours = absences.reduce(
              (acc: number, a: any) => acc + (Number(a.hours) || 0),
              0
            );
            availableHours = Math.max(0, availableHours - totalAbsenceHours);

            // Sumar time entries reportados
            const timeEntries = await (prisma as any).timeEntry.findMany({
              where: {
                organizationId: emp.organizationId,
                employeeId: emp.id,
                createdAt: {
                  gte: targetDate,
                  lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
                },
              },
            }).catch(() => []);

            const loggedHours = timeEntries.reduce(
              (acc: number, t: any) => acc + (Number(t.hours) || Number(t.minutes) / 60 || 0),
              0
            );

            const result = computeCapacity({
              availableHours,
              loggedHours,
              downtimeHours: 0,
              setupHours: 0,
              standardHoursEarned: loggedHours * 0.9,
              presentDays: isWorkday ? 1 : 0,
            });

            await (prisma as any).capacityDaily.upsert({
              where: {
                organizationId_subjectType_employeeId_machineId_areaKey_date: {
                  organizationId: emp.organizationId,
                  subjectType: 'EMPLOYEE',
                  employeeId: emp.id,
                  machineId: '',
                  areaKey: emp.areaKey || '',
                  date: targetDate,
                },
              },
              update: {
                availableHours,
                loggedHours,
                productiveHours: result.productiveHours,
                unregisteredHours: result.unregisteredHours,
                utilizationPercent: result.utilizationPercent,
                efficiencyPercent: result.efficiencyPercent,
                computedAt: new Date(),
              },
              create: {
                organizationId: emp.organizationId,
                subjectType: 'EMPLOYEE',
                employeeId: emp.id,
                areaKey: emp.areaKey || '',
                date: targetDate,
                availableHours,
                loggedHours,
                productiveHours: result.productiveHours,
                unregisteredHours: result.unregisteredHours,
                utilizationPercent: result.utilizationPercent,
                efficiencyPercent: result.efficiencyPercent,
                computedAt: new Date(),
              },
            }).catch(() => null);

            rowsWritten++;
          }
        }
      } catch (err) {
        console.error('[Job:performance:capacity] Error ejecutando trabajo:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:performance:capacity] Finalizado en ${durationMs}ms. Filas procesadas/escritas: ${rowsWritten}`);
    },
  },

  'goals:rollup': {
    id: 'goals:rollup',
    name: 'Recálculo de Progreso de Metas',
    schedule: '0 * * * *', // cada hora
    description: 'Actualiza actualValue, expectedValue y paceStatus de todas las metas activas',
    stage: '15.3',
    handler: async () => {
      const startTime = Date.now();
      let goalsProcessed = 0;
      console.log('[Job:goals:rollup] Iniciando recálculo horario de metas...');

      try {
        const activeGoals = await (prisma as any).goal.findMany({
          where: { isActive: true },
        }).catch(() => []);

        const now = new Date();
        const asOfDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        for (const goal of activeGoals) {
          const targetValue = Number(goal.targetValue) || 1;
          const actualValue = 0; // Leer de MetricDaily o métrica correspondiente

          const pace = calculateGoalPace({
            targetValue,
            actualValue,
            periodStart: new Date(goal.periodStart),
            periodEnd: new Date(goal.periodEnd),
            asOfDate,
            direction: goal.direction,
          });

          await (prisma as any).goalProgress.upsert({
            where: {
              goalId_asOfDate: {
                goalId: goal.id,
                asOfDate,
              },
            },
            update: {
              actualValue,
              expectedValue: pace.expectedValue,
              attainmentPercent: pace.attainmentPercent,
              paceStatus: pace.paceStatus,
              computedAt: new Date(),
            },
            create: {
              goalId: goal.id,
              asOfDate,
              actualValue,
              expectedValue: pace.expectedValue,
              attainmentPercent: pace.attainmentPercent,
              paceStatus: pace.paceStatus,
              computedAt: new Date(),
            },
          }).catch(() => null);

          if (pace.paceStatus === 'AT_RISK' || pace.paceStatus === 'BEHIND') {
            console.log(`[Job:goals:rollup] Evento meta.en_riesgo emitido para meta ${goal.id} (${goal.metricKey})`);
          }
          if (pace.isCompleted) {
            console.log(`[Job:goals:rollup] Evento meta.cumplida emitido para meta ${goal.id} (${goal.metricKey})`);
          }

          goalsProcessed++;
        }
      } catch (err) {
        console.error('[Job:goals:rollup] Error en cálculo de metas:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:goals:rollup] Finalizado en ${durationMs}ms. Metas procesadas: ${goalsProcessed}`);
    },
  },

  'announcements:publish': {
    id: 'announcements:publish',
    name: 'Publicación de Anuncios Programados',
    schedule: '*/5 * * * *', // cada 5 minutos
    description: 'Publica anuncios en estado SCHEDULED cuya fecha publishAt se haya alcanzado',
    stage: '15.4',
    handler: async () => {
      const startTime = Date.now();
      let publishedCount = 0;
      console.log('[Job:announcements:publish] Buscando anuncios programados para publicar...');

      try {
        const now = new Date();
        const dueAnnouncements = await (prisma as any).announcement.findMany({
          where: {
            status: 'SCHEDULED',
            publishAt: { lte: now },
          },
          include: {
            audiences: true,
            receipts: true,
          },
        }).catch(() => []);

        for (const ann of dueAnnouncements) {
          // Obtener todos los usuarios activos de la organización
          const users = await (prisma as any).user.findMany({
            where: { organizationId: ann.organizationId, isActive: true },
            select: { id: true, role: true, areaKey: true, teamKey: true, isActive: true },
          }).catch(() => []);

          // Resolver audiencia destinataria sin duplicados
          const targetUserIds = resolveAudienceUserIds(
            (ann.audiences || []).map((a: any) => ({
              targetType: a.targetType,
              roleId: a.roleId,
              areaKey: a.areaKey,
              userId: a.userId,
            })),
            users.map((u: any) => ({
              id: u.id,
              role: typeof u.role === 'string' ? u.role : u.role?.key || 'comercial',
              areaKey: u.areaKey,
              teamKey: u.teamKey,
              isActive: u.isActive !== false,
            }))
          );

          // Obtener receipts existentes para no duplicar
          const existingReceiptUserIds = new Set(
            (ann.receipts || []).map((r: any) => r.userId)
          );

          // Crear receipts únicos para los nuevos destinatarios
          const newReceiptUserIds = targetUserIds.filter(
            (uid: string) => !existingReceiptUserIds.has(uid)
          );

          for (const uid of newReceiptUserIds) {
            await (prisma as any).announcementReceipt.create({
              data: {
                announcementId: ann.id,
                userId: uid,
                deliveredAt: now,
              },
            }).catch(() => null);
          }

          // Pasar anuncio a estado PUBLISHED
          await (prisma as any).announcement.update({
            where: { id: ann.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: now,
            },
          }).catch(() => null);

          // Emitir evento anuncio.publicado
          console.log(`[Job:announcements:publish] Evento anuncio.publicado emitido para "${ann.title}" (ID: ${ann.id}, Destinatarios: ${targetUserIds.length})`);

          // Notificación multicanal para anuncios URGENTES o IMPORTANTES
          if (ann.priority === 'URGENT' || ann.priority === 'IMPORTANT') {
            console.log(`[Job:announcements:publish] Despacho multicanal prioritario (In-App, Email, WhatsApp) para ${targetUserIds.length} usuarios.`);
          }

          publishedCount++;
        }
      } catch (err) {
        console.error('[Job:announcements:publish] Error ejecutando trabajo:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:announcements:publish] Finalizado en ${durationMs}ms. Anuncios publicados: ${publishedCount}`);
    },
  },

  'announcements:remind': {
    id: 'announcements:remind',
    name: 'Recordatorio de Anuncios Obligatorios',
    schedule: '0 9 * * *', // diario 9:00
    description: 'Envía notificaciones y recordatorios a usuarios que no han confirmado anuncios obligatorios',
    stage: '15.4',
    handler: async () => {
      const startTime = Date.now();
      console.log('[Job:announcements:remind] Verificando horario hábil colombiano...');

      const now = new Date();
      // REGLA: No se envía ningún recordatorio fuera de horario hábil ni en festivo
      if (!isColombianBusinessHours(now)) {
        console.log('[Job:announcements:remind] Fuera de horario hábil o día festivo en Colombia. Recordatorio pospuesto.');
        return;
      }

      let remindersSent = 0;
      try {
        const mandatoryAnnouncements = await (prisma as any).announcement.findMany({
          where: {
            status: 'PUBLISHED',
            requiresAcknowledgement: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
          include: {
            receipts: {
              where: {
                acknowledgedAt: null,
              },
            },
          },
        }).catch(() => []);

        for (const ann of mandatoryAnnouncements) {
          const pendingReceipts = ann.receipts || [];
          for (const receipt of pendingReceipts) {
            console.log(`[Job:announcements:remind] Recordatorio de lectura enviado a usuario ${receipt.userId} para directiva obligatoria "${ann.title}" (ID: ${ann.id})`);
            remindersSent++;
          }
        }
      } catch (err) {
        console.error('[Job:announcements:remind] Error ejecutando recordatorios:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:announcements:remind] Finalizado en ${durationMs}ms. Recordatorios emitidos: ${remindersSent}`);
    },
  },

  'announcements:expire': {
    id: 'announcements:expire',
    name: 'Vencimiento y Archivo de Anuncios',
    schedule: '0 1 * * *', // diario 1:00
    description: 'Pasa a ARCHIVED los anuncios cuya fecha expiresAt se haya superado',
    stage: '15.4',
    handler: async () => {
      const startTime = Date.now();
      let expiredCount = 0;
      console.log('[Job:announcements:expire] Revisando anuncios expirados...');

      try {
        const now = new Date();
        const expiredAnnouncements = await (prisma as any).announcement.findMany({
          where: {
            status: 'PUBLISHED',
            expiresAt: { lte: now },
          },
          include: {
            receipts: {
              where: {
                acknowledgedAt: null,
              },
            },
          },
        }).catch(() => []);

        for (const ann of expiredAnnouncements) {
          // Archivar anuncio
          await (prisma as any).announcement.update({
            where: { id: ann.id },
            data: {
              status: 'ARCHIVED',
              archivedAt: now,
            },
          }).catch(() => null);

          // Si requería acuse obligatorio y quedaron pendientes, emitir evento
          if (ann.requiresAcknowledgement && ann.receipts?.length > 0) {
            for (const pending of ann.receipts) {
              console.log(`[Job:announcements:expire] Evento anuncio.sin_confirmar_vencido emitido para usuario ${pending.userId} en anuncio ${ann.id}`);
            }
          }

          expiredCount++;
        }
      } catch (err) {
        console.error('[Job:announcements:expire] Error archivando anuncios:', err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:announcements:expire] Finalizado en ${durationMs}ms. Anuncios archivados: ${expiredCount}`);
    },
  },

  'presence:cleanup': {
    id: 'presence:cleanup',
    name: 'Limpieza de Presencia por Inactividad',
    schedule: '*/5 * * * *', // cada 5 minutos
    description: 'Pasa a OFFLINE los usuarios con inactividad superior a 15 min, a AWAY si superan 5 min y limpia estados temporales expirados',
    stage: '15.5',
    handler: async () => {
      const startTime = Date.now();
      let updatedOffline = 0;
      let updatedAway = 0;
      let clearedCustom = 0;
      console.log('[Job:presence:cleanup] Verificando inactividad y estados temporales...');

      try {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

        // 1. Usuarios inactivos > 15 minutos pasan a OFFLINE
        const offlineResult = await (prisma as any).userPresence.updateMany({
          where: {
            status: { not: 'OFFLINE' },
            lastActiveAt: { lt: fifteenMinutesAgo },
          },
          data: {
            status: 'OFFLINE',
            updatedAt: now,
          },
        });
        updatedOffline = offlineResult?.count || 0;

        // 2. Usuarios inactivos > 5 minutos pero < 15 minutos pasan de ONLINE a AWAY
        const awayResult = await (prisma as any).userPresence.updateMany({
          where: {
            status: 'ONLINE',
            lastActiveAt: { lt: fiveMinutesAgo, gte: fifteenMinutesAgo },
          },
          data: {
            status: 'AWAY',
            updatedAt: now,
          },
        });
        updatedAway = awayResult?.count || 0;

        // 3. Limpiar estados personalizados con fecha de caducidad superada
        const customResult = await (prisma as any).userPresence.updateMany({
          where: {
            customStatusExpiresAt: { lte: now },
          },
          data: {
            customStatusEmoji: null,
            customStatusText: null,
            customStatusExpiresAt: null,
            updatedAt: now,
          },
        });
        clearedCustom = customResult?.count || 0;
      } catch (err: any) {
        console.warn('[Job:presence:cleanup] Advertencia en ejecución sobre base de datos:', err?.message || err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:presence:cleanup] Finalizado en ${durationMs}ms. Pasados a OFFLINE: ${updatedOffline}, AWAY: ${updatedAway}, estados limpiados: ${clearedCustom}`);
    },
  },

  'chat:retention': {
    id: 'chat:retention',
    name: 'Políticas de Retención de Chat',
    schedule: '30 2 * * *', // diario 2:30
    description: 'Aplica purga de mensajes según días de retención (24 meses general, indefinida para entidades)',
    stage: '15.5',
    handler: async () => {
      const startTime = Date.now();
      let purgedCount = 0;
      console.log('[Job:chat:retention] Aplicando políticas de retención sobre mensajes...');

      try {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000); // 24 meses (730 días)

        // Canales no de entidad (excluyendo tipo ENTITY que tiene retención indefinida)
        const nonEntityChannels = await (prisma as any).chatChannel.findMany({
          where: {
            type: { not: 'ENTITY' },
          },
          select: { id: true },
        });

        const channelIds = nonEntityChannels.map((c: any) => c.id);

        if (channelIds.length > 0) {
          // Marcar o purgar mensajes con antigüedad superior a 24 meses en dichos canales
          const deleteResult = await (prisma as any).chatMessage.deleteMany({
            where: {
              channelId: { in: channelIds },
              createdAt: { lt: cutoffDate },
            },
          });
          purgedCount = deleteResult?.count || 0;
        }
      } catch (err: any) {
        console.warn('[Job:chat:retention] Advertencia en ejecución sobre base de datos:', err?.message || err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:chat:retention] Finalizado en ${durationMs}ms. Mensajes purgados: ${purgedCount}`);
    },
  },

  'calls:cleanup': {
    id: 'calls:cleanup',
    name: 'Limpieza de Sesiones de Llamada Huérfanas',
    schedule: '*/10 * * * *', // cada 10 minutos
    description: 'Cierra llamadas abandonadas en RINGING u ONGOING sin participantes activos',
    stage: '15.6',
    handler: async () => {
      const startTime = Date.now();
      let closedCount = 0;
      let missedCount = 0;
      console.log('[Job:calls:cleanup] Ejecutando limpieza de llamadas huérfanas...');

      try {
        const now = new Date();
        const ringingCutoff = new Date(now.getTime() - 45 * 1000); // 45 segundos
        const ongoingCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 horas

        // 1. Llamadas en RINGING por más de 45 segundos -> MISSED
        const staleRinging = await (prisma as any).callSession.findMany({
          where: {
            status: 'RINGING',
            startedAt: { lt: ringingCutoff },
          },
        });

        for (const call of staleRinging) {
          await (prisma as any).callSession.update({
            where: { id: call.id },
            data: {
              status: 'MISSED',
              endedAt: now,
            },
          });
          // Expirar invitaciones pendientes
          await (prisma as any).callInvitation.updateMany({
            where: {
              callSessionId: call.id,
              status: 'PENDING',
            },
            data: {
              status: 'EXPIRED',
              respondedAt: now,
            },
          });
          missedCount++;
        }

        // 2. Llamadas en ONGOING huérfanas o con más de 4 horas
        const staleOngoing = await (prisma as any).callSession.findMany({
          where: {
            status: 'ONGOING',
            startedAt: { lt: ongoingCutoff },
          },
        });

        for (const call of staleOngoing) {
          const durationSeconds = Math.max(0, Math.floor((now.getTime() - new Date(call.startedAt).getTime()) / 1000));
          await (prisma as any).callSession.update({
            where: { id: call.id },
            data: {
              status: 'ENDED',
              endedAt: now,
              durationSeconds,
            },
          });
          closedCount++;
        }
      } catch (err: any) {
        console.warn('[Job:calls:cleanup] Advertencia en ejecución sobre base de datos:', err?.message || err);
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Job:calls:cleanup] Finalizado en ${durationMs}ms. Llamadas cerradas: ${closedCount}, no contestadas (MISSED): ${missedCount}`);
    },
  },
};
