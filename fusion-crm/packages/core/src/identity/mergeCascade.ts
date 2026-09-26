import { PrismaClient, IdentityLinkAction, IdentityLinkMethod } from '@prisma/client';
import { emitIdentityEvent } from '../events/identityEvents';

export async function migrateIdentitiesOnMerge(
  prisma: PrismaClient,
  organizationId: string,
  survivingClientId: string,
  mergedClientId: string,
  actorId: string | null = null
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find all identities belonging to the merged client
    const identitiesToMigrate = await tx.contactIdentity.findMany({
      where: {
        organizationId,
        clientId: mergedClientId
      }
    });

    if (identitiesToMigrate.length === 0) return 0;

    // 2. Update their clientId
    await tx.contactIdentity.updateMany({
      where: {
        organizationId,
        clientId: mergedClientId
      },
      data: {
        clientId: survivingClientId
      }
    });

    // 3. Log the migration for each identity
    const logs = identitiesToMigrate.map(identity => ({
      organizationId,
      identityId: identity.id,
      fromContactId: identity.contactId, // usually we link by client or contact, if we merge clients, we just log the identity shift
      action: IdentityLinkAction.MERGED,
      method: IdentityLinkMethod.MERGE_CASCADE,
      actorId,
      reason: `Client ${mergedClientId} merged into ${survivingClientId}`
    }));

    await tx.identityLinkLog.createMany({
      data: logs
    });

    try {
      await (tx as any).conversation.updateMany({
        where: {
          organizationId,
          clientId: mergedClientId
        },
        data: {
          clientId: survivingClientId
        }
      });
    } catch (e) {
      console.log('Conversation update error or not applicable', e);
    }

    try {
      await (tx as any).message.updateMany({
        where: {
          organizationId,
          clientId: mergedClientId
        },
        data: {
          clientId: survivingClientId
        }
      });
    } catch (e) {
      console.log('Message update error or not applicable', e);
    }

    for (const identity of identitiesToMigrate) {
       emitIdentityEvent('identidad.migrada_por_fusion', {
         identityId: identity.id,
         survivingClientId,
         mergedClientId
       });
    }

    return identitiesToMigrate.length;
  });
}

export async function revertIdentityMigration(
  prisma: PrismaClient,
  organizationId: string,
  survivingClientId: string,
  mergedClientId: string,
  actorId: string | null = null
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the migration logs
    const logs = await tx.identityLinkLog.findMany({
      where: {
        organizationId,
        method: 'MERGE_CASCADE',
        reason: `Client ${mergedClientId} merged into ${survivingClientId}`
      }
    });

    if (logs.length === 0) return 0;

    const identityIds = logs.map(l => l.identityId);

    // 2. Revert their clientId
    await tx.contactIdentity.updateMany({
      where: {
        organizationId,
        id: { in: identityIds },
        clientId: survivingClientId
      },
      data: {
        clientId: mergedClientId
      }
    });

    // We don't revert conversations here automatically because they might have new messages.
    // In a real system we'd need more complex logic.

    return identityIds.length;
  });
}
