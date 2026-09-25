import { describe, it, expect } from 'vitest';
import { calculateGoalPace } from './goal-pace';

describe('calculateGoalPace (Etapa 15.3)', () => {
  const periodStart = new Date('2026-08-01T00:00:00Z');
  const periodEnd = new Date('2026-08-31T23:59:59Z');

  it('Calcula ritmo AHEAD (> 105%) cuando el avance supera los días hábiles transcurridos', () => {
    // A mitad de mes, si meta es 100 y va en 70, está adelantado
    const res = calculateGoalPace({
      targetValue: 100,
      actualValue: 70,
      periodStart,
      periodEnd,
      asOfDate: new Date('2026-08-15T12:00:00Z'),
    });
    expect(res.paceStatus).toBe('AHEAD');
    expect(res.pacePercent).toBeGreaterThan(105);
  });

  it('Calcula ritmo ON_TRACK (95% - 105%)', () => {
    const res = calculateGoalPace({
      targetValue: 100,
      actualValue: 45,
      periodStart,
      periodEnd,
      asOfDate: new Date('2026-08-15T12:00:00Z'),
    });
    // expectedValue ~45 (ratio 9/20 días hábiles) -> 45/45 = 100%
    expect(res.paceStatus).toBe('ON_TRACK');
  });

  it('Calcula ritmo AT_RISK (80% - 95%)', () => {
    const res = calculateGoalPace({
      targetValue: 100,
      actualValue: 42,
      periodStart,
      periodEnd,
      asOfDate: new Date('2026-08-15T12:00:00Z'),
    });
    expect(res.paceStatus).toBe('AT_RISK');
  });

  it('Calcula ritmo BEHIND (< 80%)', () => {
    const res = calculateGoalPace({
      targetValue: 100,
      actualValue: 25,
      periodStart,
      periodEnd,
      asOfDate: new Date('2026-08-15T12:00:00Z'),
    });
    expect(res.paceStatus).toBe('BEHIND');
  });

  it('Detecta meta cumplida (isCompleted: true)', () => {
    const res = calculateGoalPace({
      targetValue: 100,
      actualValue: 105,
      periodStart,
      periodEnd,
      asOfDate: new Date('2026-08-20T12:00:00Z'),
    });
    expect(res.isCompleted).toBe(true);
    expect(res.attainmentPercent).toBe(105);
  });
});
