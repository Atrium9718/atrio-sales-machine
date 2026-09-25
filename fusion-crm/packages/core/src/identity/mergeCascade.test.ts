import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateIdentitiesOnMerge, revertIdentityMigration } from './mergeCascade';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    $transaction: vi.fn(async (cb) => cb(mPrismaClient)),
    contactIdentity: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    identityLinkLog: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    conversation: {
      updateMany: vi.fn(),
    },
    message: {
      updateMany: vi.fn(),
    }
  };
  return { PrismaClient: class { constructor() { return mPrismaClient; } }, IdentityLinkAction: { MERGED: 'MERGED' }, IdentityLinkMethod: { MERGE_CASCADE: 'MERGE_CASCADE' } };
});

const prisma = new PrismaClient();

describe('migrateIdentitiesOnMerge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('migrates identities, logs them and migrates conversations', async () => {
    (prisma.contactIdentity.findMany as any).mockResolvedValue([
      { id: 'id-1', contactId: 'c-1' },
      { id: 'id-2', contactId: 'c-2' }
    ]);

    const count = await migrateIdentitiesOnMerge(prisma, 'org-1', 'survivor-1', 'merged-2', 'actor-x');
    
    expect(count).toBe(2);
    expect(prisma.contactIdentity.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1', clientId: 'merged-2' },
      data: { clientId: 'survivor-1' }
    }));
    expect(prisma.identityLinkLog.createMany).toHaveBeenCalled();
    expect(prisma.conversation.updateMany).toHaveBeenCalled();
    expect(prisma.message.updateMany).toHaveBeenCalled();
  });

  it('reverts identities migration', async () => {
    (prisma.identityLinkLog.findMany as any).mockResolvedValue([
      { identityId: 'id-1' },
      { identityId: 'id-2' }
    ]);
    const count = await revertIdentityMigration(prisma, 'org-1', 'survivor-1', 'merged-2', 'actor-x');
    
    expect(count).toBe(2);
    expect(prisma.contactIdentity.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1', id: { in: ['id-1', 'id-2'] }, clientId: 'survivor-1' },
      data: { clientId: 'merged-2' }
    }));
  });

});
