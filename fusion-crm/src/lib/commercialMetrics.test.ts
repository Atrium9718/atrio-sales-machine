import { describe, it, expect } from 'vitest';
import { computeCommercialMetrics, change, periodRange } from './commercialMetrics';

const NOW = new Date('2026-09-20T15:00:00');

const quotes = [
  { id: 'a', status: 'Aprobada', total: 10_000_000, clientName: 'Pintuco', advisorName: 'Ana', date: '2026-09-05' },
  { id: 'b', status: 'Aprobada', total: '$ 2.000.000', clientName: 'Alpina', advisorName: 'Luis', date: '2026-09-10' },
  { id: 'c', status: 'Rechazada', total: 5_000_000, clientName: 'Alpina', advisorName: 'Luis', date: '2026-09-11' },
  { id: 'd', status: 'Enviada', total: 7_000_000, clientName: 'Nutresa', advisorName: 'Ana', date: '2026-09-01', sentAt: '2026-09-02T10:00:00' },
  { id: 'e', status: 'Aprobada', total: 4_000_000, clientName: 'Pintuco', advisorName: 'Ana', date: '2026-08-10' },
  { id: 'f', status: 'Aprobada', total: 9_000_000, clientName: 'Familia', advisorName: 'Ana', date: '2026-04-01' },
  { id: 'g', status: 'Borrador', total: 1_000_000, clientName: 'X', isPreQuote: true, date: '2026-09-12' },
];

describe('métricas comerciales', () => {
  const m = computeCommercialMetrics({ quotes, period: 'MONTH', now: NOW, opportunities: [{ stageId: 's1', amount: 3 }, { stageId: 's1', amount: 2 }, { stageId: 's4', amount: 10 }] });

  it('totales del mes (sin precotizaciones)', () => {
    expect(m.current).toMatchObject({ quotedCount: 4, quotedValue: 24_000_000, wonCount: 2, wonValue: 12_000_000, lostCount: 1, avgTicket: 6_000_000 });
    expect(m.current.closeRate).toBeCloseTo(2 / 3);
  });

  it('compara con el mismo tramo del mes anterior', () => {
    expect(m.previous.wonValue).toBe(4_000_000);
    expect(change(12, 4)).toBe(2);
    expect(change(5, 0)).toBeNull();
  });

  it('ranking por valor aprobado y concentración de clientes', () => {
    expect(m.ranking.map((r) => r.name)).toEqual(['Ana', 'Luis']);
    expect(m.concentration[0]).toMatchObject({ name: 'Pintuco', value: 10_000_000 });
    expect(m.concentration[0].share).toBeCloseTo(10 / 12);
  });

  it('alertas: cotizaciones sin respuesta y clientes que dejaron de comprar', () => {
    expect(m.quotesAtRisk).toEqual([expect.objectContaining({ id: 'd', days: 18 })]);
    expect(m.clientsAtRisk.map((c) => c.name)).toEqual(['Familia']);
  });

  it('tendencia de 6 meses y embudo del pipeline', () => {
    expect(m.trend).toHaveLength(6);
    expect(m.trend.at(-1)).toMatchObject({ month: 'sep 26', aprobado: 12_000_000 });
    expect(m.funnel[0]).toMatchObject({ count: 2, amount: 5 });
    expect(m.funnel[3]).toMatchObject({ count: 1, amount: 10 });
  });

  it('filtra por asesor', () => {
    const luis = computeCommercialMetrics({ quotes, period: 'MONTH', now: NOW, advisor: 'Luis' });
    expect(luis.current.quotedCount).toBe(2);
  });

  it('rangos de trimestre y año', () => {
    expect(periodRange('QUARTER', NOW).from.getMonth()).toBe(6);
    expect(periodRange('YEAR', NOW).from.getMonth()).toBe(0);
  });
});
