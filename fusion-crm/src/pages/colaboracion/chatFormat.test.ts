import { describe, it, expect } from 'vitest';
import { dayLabel, isContinuation } from './chatFormat';

describe('chat interno: agrupación de mensajes', () => {
  const now = new Date(2026, 8, 26, 15, 0);

  it('etiqueta los días como Hoy / Ayer / fecha', () => {
    expect(dayLabel(new Date(2026, 8, 26, 8, 0).toISOString(), now)).toBe('Hoy');
    expect(dayLabel(new Date(2026, 8, 25, 23, 59).toISOString(), now)).toBe('Ayer');
    expect(dayLabel(new Date(2026, 8, 20, 10, 0).toISOString(), now)).not.toMatch(/Hoy|Ayer/);
  });

  it('agrupa mensajes seguidos del mismo autor en menos de 5 minutos', () => {
    const a = { authorId: 'u1', createdAt: new Date(2026, 8, 26, 10, 0).toISOString() };
    expect(isContinuation(a, { authorId: 'u1', createdAt: new Date(2026, 8, 26, 10, 3).toISOString() })).toBe(true);
    expect(isContinuation(a, { authorId: 'u1', createdAt: new Date(2026, 8, 26, 10, 6).toISOString() })).toBe(false);
    expect(isContinuation(a, { authorId: 'u2', createdAt: new Date(2026, 8, 26, 10, 1).toISOString() })).toBe(false);
    expect(isContinuation(undefined, a)).toBe(false);
  });
});
