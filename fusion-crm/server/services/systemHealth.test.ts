import { describe, it, expect, beforeEach } from 'vitest';
import { __resetMetrics, metricsSnapshot, recordRequest, routeKey, requestMetrics } from './systemHealth';

describe('métricas del servidor', () => {
  beforeEach(() => __resetMetrics());

  it('agrupa rutas sin ids', () => {
    expect(routeKey('/api/data/projects/proj-123?x=1')).toBe('/api/data/projects/:id');
    expect(routeKey('/api/omnichannel/conversations')).toBe('/api/omnichannel/conversations');
  });

  it('calcula p95, tasa de error, rutas lentas y últimos fallos', () => {
    const now = Date.now();
    for (let i = 0; i < 19; i++) recordRequest({ at: now, ms: 10, status: 200, path: '/api/home' });
    recordRequest({ at: now, ms: 900, status: 500, path: '/api/quotes' }, 'POST');
    const m = metricsSnapshot(now);
    expect(m.errors).toBe(1);
    expect(m.errorRate).toBeCloseTo(0.05);
    expect(m.p95Ms).toBe(900);
    expect(m.slowest[0]).toMatchObject({ route: '/api/quotes', avgMs: 900, errors: 1 });
    expect(m.recentErrors[0]).toMatchObject({ status: 500, method: 'POST', path: '/api/quotes' });
  });

  it('el middleware ignora estáticos y el canal en tiempo real', () => {
    const finish: (() => void)[] = [];
    const res = { statusCode: 200, on: (_: string, cb: () => void) => finish.push(cb) };
    requestMetrics({ method: 'GET', url: '/assets/app.js' }, res, () => undefined);
    requestMetrics({ method: 'GET', url: '/api/stream' }, res, () => undefined);
    requestMetrics({ method: 'GET', url: '/api/home' }, res, () => undefined);
    finish.forEach((f) => f());
    expect(metricsSnapshot().slowest.map((r) => r.route)).toEqual(['/api/home']);
  });
});
