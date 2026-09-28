import { describe, it, expect } from 'vitest';
import { lookupChatEntities } from './entityLookup';

const data = {
  quotes: [
    { id: 'q1', number: 'COT-2026-0101', clientName: 'Pinturas Andinas', clientId: 'c1', status: 'Enviada', total: 1500000, date: '2026-09-20', items: [{ description: 'Volantes media carta' }] },
    { id: 'q2', number: 'COT-2026-0102', clientName: 'Colegio San Martín', status: 'Aprobada', total: 800000, date: '2026-09-21', items: [] },
  ],
  projects: [{ id: 'p1', number: 'OT-2026-0101', client: 'Pinturas Andinas', name: 'Volantes', stageId: '3', createdAt: '2026-09-22' }],
  clients: [{ id: 'c1', name: 'Pinturas Andinas', nit: '900123456-1' }],
};

describe('Referencias con # en el chat', () => {
  it('busca en cotizaciones, órdenes y clientes reales', () => {
    const r = lookupChatEntities('andinas', data, { includeAmounts: true });
    expect(r.map((e) => e.type).sort()).toEqual(['CLIENT', 'PRODUCTION_PROJECT', 'QUOTE']);
    expect(r.find((e) => e.type === 'QUOTE')).toMatchObject({ code: 'COT-2026-0101', subtitle: '$ 1.500.000 · Enviada', href: '/dashboard/cotizador?quoteId=q1' });
    expect(r.find((e) => e.type === 'PRODUCTION_PROJECT')).toMatchObject({ code: 'OT-2026-0101', status: 'En producción' });
  });

  it('sin permiso de costos no muestra montos; por código también encuentra', () => {
    const r = lookupChatEntities('#cot-2026-0102', data, { includeAmounts: false });
    expect(r).toHaveLength(1);
    expect(r[0].subtitle).toBe('Aprobada');
    expect(lookupChatEntities('san martin', data, { includeAmounts: false })[0].title).toMatch(/Colegio San Martín/);
  });
});
