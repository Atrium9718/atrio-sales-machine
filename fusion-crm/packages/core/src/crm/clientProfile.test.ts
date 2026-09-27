import { describe, it, expect } from 'vitest';
import { clientProfile } from './clientProfile';

describe('ficha del cliente', () => {
  it('reúne cotizaciones por id o NIT, OT y el cierre sobre las decididas', () => {
    const p = clientProfile(
      { id: 'c1', nit: '900.123.456-1' },
      [
        { id: 'q1', clientId: 'c1', number: 'COT-1', status: 'Aprobada', total: 1_000_000, date: '2026-09-01' },
        { id: 'q2', clientNit: '900123456', number: 'COT-2', status: 'Rechazada', total: 500_000, date: '2026-09-05' },
        { id: 'q3', clientId: 'c1', number: 'COT-3', status: 'Enviada', total: '$ 200.000', date: '2026-09-20' },
        { id: 'qx', clientId: 'c2', number: 'COT-9', status: 'Aprobada', total: 9 },
      ],
      [
        { id: 'p1', quoteId: 'q1', number: 'OT-1', name: 'Volantes', stageId: '3', createdAt: '2026-09-02' },
        { id: 'p2', clientId: 'c1', number: 'OT-0', name: 'Viejo', stageId: '6', createdAt: '2026-08-01' },
      ],
    );
    expect(p.quotes.map((q) => q.number)).toEqual(['COT-3', 'COT-2', 'COT-1']);
    expect(p.stats).toEqual({ wonValue: 1_000_000, quotesCount: 3, approvedCount: 1, closeRate: 50, openProjects: 1, lastQuoteAt: '2026-09-20' });
    expect(p.projects[0]).toMatchObject({ number: 'OT-1', stageName: 'En producción', quoteNumber: 'COT-1', delivered: false });
    expect(p.quotes[0].total).toBe(200000);
  });
});
