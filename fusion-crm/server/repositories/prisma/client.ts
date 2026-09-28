import { PrismaClient, Prisma } from '@prisma/client';
import { ORGANIZATION_ID, PRODUCTION_STAGES, stageRowId } from './mappers';

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) await prisma.$disconnect();
  prisma = null;
}

export type Tx = Prisma.TransactionClient;

export const SYSTEM_USER_ID = 'system';

let baseDataReady: Promise<void> | null = null;

/** Organización, etapas de producción y usuario "Sistema" (idempotente, una vez por proceso). */
export function ensureBaseData(): Promise<void> {
  if (!baseDataReady) {
    baseDataReady = (async () => {
      const db = getPrisma();
      await db.organization.upsert({
        where: { id: ORGANIZATION_ID },
        create: { id: ORGANIZATION_ID, name: 'Fusión Comunicación Gráfica S.A.S.' },
        update: {},
      });
      await db.user.upsert({
        where: { id: SYSTEM_USER_ID },
        create: { id: SYSTEM_USER_ID, organizationId: ORGANIZATION_ID, name: 'Sistema', email: 'sistema@fusion.local' },
        update: {},
      });
      for (const [i, s] of PRODUCTION_STAGES.entries()) {
        await db.productionStage.upsert({
          where: { id: stageRowId(s.key) },
          create: {
            id: stageRowId(s.key),
            organizationId: ORGANIZATION_ID,
            key: s.key,
            name: s.name,
            order: i + 1,
            isFinal: s.isFinal,
            requiresQualityApproval: s.requiresQualityApproval,
            qualityApprovalsRequired: s.approvals || 1,
          },
          update: {},
        });
      }
    })().catch((err) => {
      baseDataReady = null;
      throw err;
    });
  }
  return baseDataReady;
}

/** Usuario responsable de una escritura (se crea/actualiza a partir del empleado con sesión). */
export async function ensureUser(tx: Tx, ctx?: { actorId?: string; actorName?: string; actorEmail?: string }): Promise<string> {
  if (!ctx?.actorId) return SYSTEM_USER_ID;
  await tx.user.upsert({
    where: { id: ctx.actorId },
    create: {
      id: ctx.actorId,
      organizationId: ORGANIZATION_ID,
      name: ctx.actorName || ctx.actorId,
      email: ctx.actorEmail || `${ctx.actorId}@fusion.local`,
    },
    update: ctx.actorName ? { name: ctx.actorName, ...(ctx.actorEmail ? { email: ctx.actorEmail } : {}) } : {},
  });
  return ctx.actorId;
}

/** Siguiente código de cliente CLI-00001… */
export async function nextClientCode(tx: Tx): Promise<string> {
  const count = await tx.client.count({ where: { organizationId: ORGANIZATION_ID } });
  return `CLI-${String(count + 1).padStart(5, '0')}`;
}
