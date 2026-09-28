import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canSend } from './index';

const mockPrisma = {
  contact: {
    findUnique: vi.fn()
  },
  consentRecord: {
    findMany: vi.fn()
  }
} as any;

describe('canSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects if contact does not exist', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue(null);
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'TRANSACTIONAL');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('no encontrado');
  });

  it('rejects TRANSACTIONAL if no commercial relationship (clientId is null)', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: null });
    mockPrisma.consentRecord.findMany.mockResolvedValue([]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'TRANSACTIONAL');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No hay relación comercial');
  });

  it('allows TRANSACTIONAL if commercial relationship exists and no WITHDRAWN', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'TRANSACTIONAL');
    expect(result.allowed).toBe(true);
  });

  it('rejects TRANSACTIONAL if explicit WITHDRAWN for channel and purpose', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([
      { id: 'r1', channelType: 'EMAIL', purpose: 'TRANSACTIONAL', status: 'WITHDRAWN' }
    ]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'TRANSACTIONAL');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('ha revocado el consentimiento para el propósito TRANSACTIONAL');
  });

  it('rejects ALL if WITHDRAWN for ALL channels', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([
      { id: 'r1', channelType: 'ALL', purpose: 'MARKETING', status: 'WITHDRAWN' }
    ]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'WHATSAPP', 'TRANSACTIONAL');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('para todos los canales');
  });

  it('rejects MARKETING if no explicit GRANTED record', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'MARKETING');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No existe consentimiento explícito vigente');
  });

  it('allows MARKETING if explicit GRANTED record', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([
      { id: 'r1', channelType: 'EMAIL', purpose: 'MARKETING', status: 'GRANTED', expiresAt: null }
    ]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'MARKETING');
    expect(result.allowed).toBe(true);
  });

  it('rejects MARKETING if GRANTED record is expired', async () => {
    mockPrisma.contact.findUnique.mockResolvedValue({ id: 'c1', clientId: 'client1' });
    mockPrisma.consentRecord.findMany.mockResolvedValue([
      { id: 'r1', channelType: 'EMAIL', purpose: 'MARKETING', status: 'GRANTED', expiresAt: new Date(Date.now() - 10000) }
    ]);
    
    const result = await canSend(mockPrisma, 'org1', 'c1', 'EMAIL', 'MARKETING');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('expirado');
  });
});
