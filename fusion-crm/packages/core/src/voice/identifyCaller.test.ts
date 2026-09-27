import { describe, it, expect } from 'vitest';
import { identifyCaller } from './identifyCaller';

const data = {
  clients: [
    { id: 'c1', name: 'Pinturas Andinas', nit: '900.123.456-1', phone1: '604 444 1200', temp: 'HOT', contacts: [{ name: 'Claudia Restrepo', mobile: '310 555 9876' }] },
    { id: 'c2', name: 'Colegio San Martín', phone2: '3001234567' },
  ],
  quotes: [
    { id: 'q1', clientId: 'c1', number: 'COT-1045', status: 'Aprobada', total: 100, date: '2026-09-10' },
    { id: 'q2', clientNit: '9001234561', number: 'COT-1060', status: 'Enviada', total: 640000, date: '2026-09-18' },
  ],
  projects: [
    { id: 'p1', quoteId: 'q1', number: 'OT-1045', name: 'Letreros', stageId: '3', dueDate: '2026-10-03' },
    { id: 'p0', quoteId: 'q1', number: 'OT-0998', name: 'Catálogo', stageId: '6', dueDate: '2026-09-01' },
  ],
};

describe('quién llama', () => {
  it('reconoce el contacto del cliente con cualquier formato de número', () => {
    const r = identifyCaller('+573105559876', data, { includeAmounts: true });
    expect(r).toMatchObject({ customerId: 'c1', customerName: 'Pinturas Andinas', contactName: 'Claudia Restrepo', temperature: 'HOT', matches: 1 });
    expect(r.openQuote).toEqual({ id: 'q2', number: 'COT-1060', status: 'Enviada', total: 640000, date: '2026-09-18' });
    expect(r.activeProject).toMatchObject({ number: 'OT-1045', stageName: 'En producción' });
  });

  it('fijo con indicativo y sin montos si no puede ver costos', () => {
    const r = identifyCaller('6044441200', data);
    expect(r.customerId).toBe('c1');
    expect(r.openQuote?.total).toBeNull();
  });

  it('número desconocido o anónimo', () => {
    expect(identifyCaller('3009998877', data)).toMatchObject({ customerId: null, isAnonymous: false, matches: 0 });
    expect(identifyCaller('anonymous', data)).toMatchObject({ isAnonymous: true, number: null });
  });
});
