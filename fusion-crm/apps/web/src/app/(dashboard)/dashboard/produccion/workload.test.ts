import { describe, it, expect } from 'vitest';
import { DEFAULT_WORK_CALENDAR } from '../../../../../../../packages/core/src/calendar/workCalendar';
import { INITIAL_STAGES } from './productionModel';
import { buildWorkload, dueYmd } from './workload';

describe('carga y entregas de producción', () => {
  // Martes 24 mar 2026
  const today = '2026-03-24';
  const projects = [
    { id: 'a', number: 'OT-1', stageId: '3', dueDate: '2026-03-20' },
    { id: 'b', number: 'OT-2', stageId: '1', dueDate: '2026-03-24' },
    { id: 'c', number: 'OT-3', stageId: 'ACABADOS', dueDate: '2026-03-30T00:00:00.000Z' },
    { id: 'd', number: 'OT-4', stageId: '2', dueDate: '2026-04-20' },
    { id: 'e', number: 'OT-5', stageId: null, dueDate: '3 a 5 días hábiles' },
    { id: 'f', number: 'OT-6', stageId: '6', dueDate: '2026-03-01' }, // entregada
  ];

  it('agrupa por vencimiento en días hábiles y omite las entregadas', () => {
    const { byBucket, rows } = buildWorkload(projects, INITIAL_STAGES, DEFAULT_WORK_CALENDAR, today);
    const ids = Object.fromEntries(byBucket.map((b) => [b.bucket, b.rows.map((r) => r.project.id)]));
    expect(ids).toEqual({ OVERDUE: ['a'], TODAY: ['b'], SOON: ['c'], LATER: ['d'], NO_DATE: ['e'] });
    expect(rows.find((r) => r.project.id === 'a')!.workingDaysLeft).toBe(-1); // el lunes 23 fue festivo
    expect(rows.find((r) => r.project.id === 'c')!.workingDaysLeft).toBe(4);
    expect(rows.find((r) => r.project.id === 'e')!.stage?.key).toBe('POR_REVISAR');
  });

  it('cuenta la carga por etapa', () => {
    const { byStage } = buildWorkload(projects, INITIAL_STAGES, DEFAULT_WORK_CALENDAR, today);
    const map = Object.fromEntries(byStage.map((s) => [s.stage.key, [s.total, s.overdue]]));
    expect(map).toMatchObject({ POR_REVISAR: [2, 0], PRODUCCION_PROGRAMADA: [1, 0], EN_PRODUCCION: [1, 1], ACABADOS: [1, 0] });
    expect(map.ENTREGADO).toBeUndefined();
  });

  it('solo toma fechas reales', () => {
    expect(dueYmd('2026-03-30')).toBe('2026-03-30');
    expect(dueYmd('5 días hábiles')).toBeNull();
    expect(dueYmd(null)).toBeNull();
  });
});
