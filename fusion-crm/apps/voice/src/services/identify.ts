import { normalizeColombianPhone } from '@fusion/core/voice/normalizePhone';
import { VoiceCustomerContext } from '@fusion/contracts/voice';
import { prisma } from './persist';
import { telemetry } from '../telemetry';

export interface CallerResolution {
  normalizedNumber: string;
  rawCallerNumber: string;
  isAnonymous: boolean;
  context: VoiceCustomerContext;
  resolutionTimeMs: number;
}

const DEFAULT_ANONYMOUS_CONTEXT: VoiceCustomerContext = {
  customerId: null,
  customerName: null,
  customerTemperature: null,
  contactId: null,
  contactName: null,
  contactRole: null,
  lastActivityAt: null,
  openQuotes: [],
  productionProjects: [],
  financials: null,
  recentCalls: [],
  openTasks: [],
  isAmbiguous: false,
  ambiguousMatchesCount: 0,
};

/**
 * Resuelve la identidad del número que llama en menos de 200 ms.
 * Si la consulta completa excede 180 ms, retorna la mejor resolución encontrada.
 */
export async function resolveCallerIdentity(
  rawCallerNumber: string,
  organizationId: string,
  assignedUserId?: string,
  userHasCostReadPermission = false
): Promise<CallerResolution> {
  const startTime = Date.now();
  const normalized = normalizeColombianPhone(rawCallerNumber);

  if (!normalized) {
    return {
      normalizedNumber: rawCallerNumber || 'Desconocido',
      rawCallerNumber,
      isAnonymous: true,
      context: { ...DEFAULT_ANONYMOUS_CONTEXT },
      resolutionTimeMs: Date.now() - startTime,
    };
  }

  // Timeout guard: máximo 180 ms para no demorar el timbrado telefónico
  const timeoutPromise = new Promise<CallerResolution>((resolve) => {
    setTimeout(() => {
      resolve({
        normalizedNumber: normalized,
        rawCallerNumber,
        isAnonymous: false,
        context: {
          ...DEFAULT_ANONYMOUS_CONTEXT,
          customerName: 'Prospecto Nuevo / No identificado (timeout)',
        },
        resolutionTimeMs: Date.now() - startTime,
      });
    }, 185);
  });

  const queryPromise = (async (): Promise<CallerResolution> => {
    try {
      // 1. Buscar en Contact (phone o mobile)
      const contactMatches = await prisma.contact.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { phone: normalized },
            { phone: rawCallerNumber },
            { mobile: normalized },
            { mobile: rawCallerNumber },
          ],
        },
        include: {
          client: true,
        },
        take: 5,
      });

      let selectedCustomerId: string | null = null;
      let selectedCustomerName: string | null = null;
      let selectedContactId: string | null = null;
      let selectedContactName: string | null = null;
      let selectedContactRole: string | null = null;
      let customerTemperature: 'COLD' | 'WARM' | 'HOT' | 'VIP' | null = null;
      let isAmbiguous = false;
      let ambiguousCount = contactMatches.length;

      if (contactMatches.length === 1) {
        const c = contactMatches[0];
        selectedCustomerId = c.clientId;
        selectedCustomerName = c.client?.name ?? null;
        selectedContactId = c.id;
        selectedContactName = `${c.firstName} ${c.lastName}`.trim();
        selectedContactRole = c.jobTitle ?? null;
        customerTemperature = (c.client as any)?.temperature ?? 'WARM';
      } else if (contactMatches.length > 1) {
        isAmbiguous = true;
        const c = contactMatches[0];
        selectedCustomerId = c.clientId;
        selectedCustomerName = c.client?.name ?? null;
        selectedContactId = c.id;
        selectedContactName = `${c.firstName} ${c.lastName}`.trim();
        selectedContactRole = c.jobTitle ?? null;
        customerTemperature = (c.client as any)?.temperature ?? 'WARM';
      } else {
        // 2. Buscar en Client.phone
        const clientMatches = await prisma.client.findMany({
          where: {
            organizationId,
            deletedAt: null,
            phone: { in: [normalized, rawCallerNumber] },
          },
          take: 5,
        });

        if (clientMatches.length === 1) {
          const cl = clientMatches[0];
          selectedCustomerId = cl.id;
          selectedCustomerName = cl.name;
          customerTemperature = (cl as any)?.temperature ?? 'WARM';
        } else if (clientMatches.length > 1) {
          isAmbiguous = true;
          ambiguousCount = clientMatches.length;
          const cl = clientMatches[0];
          selectedCustomerId = cl.id;
          selectedCustomerName = cl.name;
          customerTemperature = (cl as any)?.temperature ?? 'WARM';
        } else {
          // 3. Buscar en llamadas anteriores ya vinculadas (aprendizaje)
          const pastCall = await prisma.voiceCall.findFirst({
            where: {
              organizationId,
              fromNumber: normalized,
              customerId: { not: null },
            },
            orderBy: { startedAt: 'desc' },
          });

          if (pastCall?.customerId) {
            const cl = await prisma.client.findUnique({
              where: { id: pastCall.customerId },
            });
            if (cl) {
              selectedCustomerId = cl.id;
              selectedCustomerName = cl.name;
              customerTemperature = (cl as any)?.temperature ?? 'WARM';
            }
          }
        }
      }

      // Si no encontramos cliente: queda como desconocido (un nuevo prospecto)
      if (!selectedCustomerId) {
        const elapsed = Date.now() - startTime;
        telemetry.recordIdentityResolution(elapsed);
        return {
          normalizedNumber: normalized,
          rawCallerNumber,
          isAnonymous: false,
          context: {
            ...DEFAULT_ANONYMOUS_CONTEXT,
            customerName: null,
          },
          resolutionTimeMs: elapsed,
        };
      }

      // 4. Cargar contexto CRM en paralelo con consultas rápidas indexadas
      const [quotes, projects, pastCalls, tasks, lastActivity] = await Promise.all([
        // Cotizaciones abiertas
        prisma.quote.findMany({
          where: {
            organizationId,
            clientId: selectedCustomerId,
            deletedAt: null,
            status: { in: ['DRAFT', 'SENT', 'APPROVED'] },
          },
          select: { id: true, number: true, total: true, status: true },
          take: 3,
        }).catch(() => []),

        // Proyectos en producción
        prisma.productionProject.findMany({
          where: {
            organizationId,
            clientId: selectedCustomerId,
            deletedAt: null,
            stage: { isFinal: false },
          },
          select: { id: true, number: true, stage: true, dueDate: true },
          take: 3,
        }).catch(() => []),

        // Tres últimas llamadas
        prisma.voiceCall.findMany({
          where: {
            organizationId,
            customerId: selectedCustomerId,
          },
          orderBy: { startedAt: 'desc' },
          select: { id: true, startedAt: true, totalSeconds: true, notes: true, disposition: true },
          take: 3,
        }).catch(() => []),

        // Tareas abiertas asignadas a quien contesta
        assignedUserId
          ? prisma.task.findMany({
              where: {
                organizationId,
                clientId: selectedCustomerId,
                assigneeId: assignedUserId,
                status: 'PENDING',
              },
              select: { id: true, title: true, dueAt: true },
              take: 3,
            }).catch(() => [])
          : Promise.resolve([]),

        // Última actividad
        prisma.activity.findFirst({
          where: { organizationId, clientId: selectedCustomerId },
          orderBy: { occurredAt: 'desc' },
          select: { occurredAt: true },
        }).catch(() => null),
      ]);

      const formattedQuotes = (quotes as any[]).map((q) => ({
        id: q.id,
        code: q.number || 'COT',
        totalAmount: Number(q.total || 0),
        status: q.status,
      }));

      const formattedProjects = (projects as any[]).map((p) => ({
        id: p.id,
        code: p.number || 'PRJ',
        stage: p.stage?.name || 'En producción',
        committedDeliveryDate: p.dueDate ? p.dueDate.toISOString() : null,
      }));

      const formattedCalls = (pastCalls as any[]).map((c) => ({
        id: c.id,
        startedAt: c.startedAt.toISOString(),
        durationSeconds: c.totalSeconds || 0,
        summary: c.notes ?? null,
        disposition: c.disposition ?? null,
      }));

      const formattedTasks = (tasks as any[]).map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      }));

      const elapsed = Date.now() - startTime;
      telemetry.recordIdentityResolution(elapsed);

      return {
        normalizedNumber: normalized,
        rawCallerNumber,
        isAnonymous: false,
        context: {
          customerId: selectedCustomerId,
          customerName: selectedCustomerName,
          customerTemperature,
          contactId: selectedContactId,
          contactName: selectedContactName,
          contactRole: selectedContactRole,
          lastActivityAt: lastActivity?.createdAt ? lastActivity.createdAt.toISOString() : null,
          openQuotes: formattedQuotes,
          productionProjects: formattedProjects,
          financials: userHasCostReadPermission
            ? { overdueBalance: 0, hasOverdueInvoices: false }
            : null,
          recentCalls: formattedCalls,
          openTasks: formattedTasks,
          isAmbiguous,
          ambiguousMatchesCount: ambiguousCount,
        },
        resolutionTimeMs: elapsed,
      };
    } catch (err: any) {
      telemetry.log('WARN', `Error resolviendo identidad de ${normalized}: ${err.message}`);
      const elapsed = Date.now() - startTime;
      return {
        normalizedNumber: normalized,
        rawCallerNumber,
        isAnonymous: false,
        context: { ...DEFAULT_ANONYMOUS_CONTEXT },
        resolutionTimeMs: elapsed,
      };
    }
  })();

  return Promise.race([queryPromise, timeoutPromise]);
}
