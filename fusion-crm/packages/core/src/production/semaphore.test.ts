import { computeDeliverySemaphore } from './semaphore';
import { describe, it, expect } from 'vitest';

describe('computeDeliverySemaphore', () => {
  const now = new Date('2026-09-15T12:00:00Z');

  it('debería retornar GREEN si completedAt existe (entregado a tiempo antes de la fecha)', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-16T12:00:00Z'),
      completedAt: new Date('2026-09-14T12:00:00Z'),
      now
    });
    expect(res).toEqual({ color: 'GREEN', label: 'A tiempo' });
  });

  it('debería retornar GREEN si completedAt existe incluso si ya pasó la fecha (entregado atrasado, pero entregado)', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-10T12:00:00Z'),
      completedAt: new Date('2026-09-11T12:00:00Z'),
      now
    });
    expect(res).toEqual({ color: 'GREEN', label: 'A tiempo' });
  });

  it('debería retornar NONE si no hay dueDate', () => {
    const res = computeDeliverySemaphore({
      dueDate: null,
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'NONE', label: '' });
  });

  it('debería retornar RED si la fecha dueDate ya pasó y no está completado', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-14T12:00:00Z'),
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'RED', label: 'Vencido' });
  });

  it('debería retornar YELLOW si faltan menos de 48 horas', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-16T12:00:00Z'), // 24 horas después
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'YELLOW', label: 'Próximo' });
  });

  it('debería retornar YELLOW si faltan exactamente 47 horas', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-17T11:00:00Z'), // 47 horas
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'YELLOW', label: 'Próximo' });
  });

  it('debería retornar GREEN si faltan más de 48 horas', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-18T12:00:00Z'), // 72 horas
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'GREEN', label: 'A tiempo' });
  });

  it('debería retornar GREEN si faltan exactamente 48 horas (borde)', () => {
    const res = computeDeliverySemaphore({
      dueDate: new Date('2026-09-17T12:00:00Z'), // 48 horas
      completedAt: null,
      now
    });
    expect(res).toEqual({ color: 'GREEN', label: 'A tiempo' });
  });
});
