import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIdentity } from './resolveIdentity';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    $transaction: vi.fn(async (cb) => cb(mPrismaClient)),
    consentRecord: { create: vi.fn() },
    contactIdentity: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    }
  };
  return { PrismaClient: class { constructor() { return mPrismaClient; } } };
});

const prisma = new PrismaClient();

describe('resolveIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Step 1: Returns existing LINKED identity', async () => {
    (prisma.contactIdentity.findUnique as any).mockResolvedValue({
      id: 'id-1',
      status: 'LINKED',
      contact: { id: 'contact-1' },
      client: { id: 'client-1' }
    });

    const result = await resolveIdentity('org-1', 'WHATSAPP', '3001234567', 'Test User');
    expect(result.identity.id).toBe('id-1');
    expect(result.contact?.id).toBe('contact-1');
  });

  it('Step 2: Links to exact Contact match', async () => {
    (prisma.contactIdentity.findUnique as any).mockResolvedValue(null);
    (prisma.contact.findMany as any).mockResolvedValue([
      { id: 'contact-2', mobile: '3001234567', clientId: 'client-2' }
    ]);
    (prisma.client.findUnique as any).mockResolvedValue({ id: 'client-2' });
    (prisma.contactIdentity.create as any).mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'new-id' }));

    const result = await resolveIdentity('org-1', 'WHATSAPP', '300 123 4567', 'Test User');
    expect(result.identity.status).toBe('LINKED');
    expect(result.identity.confidence).toBe(90);
    expect(result.contact?.id).toBe('contact-2');
  });

  it('Step 3: Links to exact Client match and creates Contact', async () => {
    (prisma.contactIdentity.findUnique as any).mockResolvedValue(null);
    (prisma.contact.findMany as any).mockResolvedValue([]);
    (prisma.client.findMany as any).mockResolvedValue([
      { id: 'client-3', mobile: '3001234567' }
    ]);
    (prisma.contact.create as any).mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'new-contact-3' }));
    (prisma.contactIdentity.create as any).mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'new-id' }));

    const result = await resolveIdentity('org-1', 'WHATSAPP', '3001234567', 'Test User');
    expect(result.identity.status).toBe('LINKED');
    expect(result.identity.confidence).toBe(70);
    expect(result.contact?.id).toBe('new-contact-3');
    expect(result.client?.id).toBe('client-3');
  });

  it('Step 4: Creates UNLINKED identity if no match found', async () => {
    (prisma.contactIdentity.findUnique as any).mockResolvedValue(null);
    (prisma.contact.findMany as any).mockResolvedValue([]);
    (prisma.client.findMany as any).mockResolvedValue([]);
    (prisma.contactIdentity.create as any).mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'new-id' }));

    const result = await resolveIdentity('org-1', 'WHATSAPP', '3001234567', 'Test User');
    expect(result.identity.status).toBe('UNLINKED');
    expect(result.identity.confidence).toBe(0);
    console.log("RESULT", result);
    expect(result.contact).toBeNull();
    expect(result.client).toBeNull();
  });
});
