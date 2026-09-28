import { describe, it, expect } from 'vitest';
import { computeTaskCompliance, TaskInputItem, TaskComplianceConfig } from './task-compliance';

describe('computeTaskCompliance (Etapa 15.3)', () => {
  const defaultConfig: TaskComplianceConfig = {
    greenThreshold: 85,
    amberThreshold: 70,
    graceHours: 4,
    excludeAutomationTasks: false,
  };

  const windowStart = new Date('2026-08-01T00:00:00Z');
  const windowEnd = new Date('2026-08-31T23:59:59Z');
  const now = new Date('2026-09-01T12:00:00Z');

  it('1. Sin tareas retorna 100% y GREEN', () => {
    const res = computeTaskCompliance({
      tasks: [],
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(100);
    expect(res.level).toBe('GREEN');
    expect(res.onTime).toBe(0);
    expect(res.explanation[0]).toContain('No hubo tareas');
  });

  it('2. Todas a tiempo retorna 100% y GREEN', () => {
    const tasks: TaskInputItem[] = [
      {
        title: 'Cotización',
        dueAt: new Date('2026-08-10T15:00:00Z'),
        completedAt: new Date('2026-08-10T14:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        title: 'Visita',
        dueAt: new Date('2026-08-12T10:00:00Z'),
        completedAt: new Date('2026-08-12T09:30:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(100);
    expect(res.level).toBe('GREEN');
    expect(res.onTime).toBe(2);
    expect(res.late).toBe(0);
  });

  it('3. Todas vencidas completadas tarde retorna 0% y RED', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: new Date('2026-08-15T10:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-08-11T10:00:00Z'),
        completedAt: new Date('2026-08-14T10:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(0);
    expect(res.level).toBe('RED');
    expect(res.late).toBe(2);
    expect(res.onTime).toBe(0);
  });

  it('4. Tareas canceladas no cuentan', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: null,
        status: 'CANCELLED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-08-12T10:00:00Z'),
        completedAt: new Date('2026-08-12T10:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(100);
    expect(res.onTime).toBe(1);
    expect(res.overdueOpen).toBe(0);
  });

  it('5. Tareas sin dueAt no cuentan', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: null,
        completedAt: new Date('2026-08-10T10:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(100);
    expect(res.onTime).toBe(0);
  });

  it('6. Gracia de 4 horas: cerrada a las 3 horas tarde cuenta como a tiempo', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T18:00:00Z'),
        completedAt: new Date('2026-08-10T21:00:00Z'), // 3 horas después (dentro de 4h)
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, graceHours: 4 },
    });
    expect(res.onTime).toBe(1);
    expect(res.late).toBe(0);
    expect(res.compliancePercent).toBe(100);
  });

  it('7. Gracia justo en el límite exacto (4 horas)', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T18:00:00Z'),
        completedAt: new Date('2026-08-10T22:00:00Z'), // exactamente 4 horas
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, graceHours: 4 },
    });
    expect(res.onTime).toBe(1);
    expect(res.late).toBe(0);
  });

  it('8. Excede la gracia por 1 minuto cuenta como tarde', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T18:00:00Z'),
        completedAt: new Date('2026-08-10T22:01:00Z'), // 4h 1m
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, graceHours: 4 },
    });
    expect(res.onTime).toBe(0);
    expect(res.late).toBe(1);
    expect(res.compliancePercent).toBe(0);
  });

  it('9. Tarea abierta vencida cuenta en el denominador', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: new Date('2026-08-10T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.onTime).toBe(1);
    expect(res.overdueOpen).toBe(1);
    expect(res.compliancePercent).toBe(50);
  });

  it('10. Exclusión de tareas automáticas cuando config.excludeAutomationTasks es true', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: true, // Automática vencida
      },
      {
        dueAt: new Date('2026-08-11T10:00:00Z'),
        completedAt: new Date('2026-08-11T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false, // Humana a tiempo
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, excludeAutomationTasks: true },
    });
    expect(res.onTime).toBe(1);
    expect(res.overdueOpen).toBe(0);
    expect(res.compliancePercent).toBe(100);
  });

  it('11. Inclusión de tareas automáticas cuando config.excludeAutomationTasks es false', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T10:00:00Z'),
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: true,
      },
      {
        dueAt: new Date('2026-08-11T10:00:00Z'),
        completedAt: new Date('2026-08-11T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, excludeAutomationTasks: false },
    });
    expect(res.compliancePercent).toBe(50);
    expect(res.overdueOpen).toBe(1);
  });

  it('12. Umbral AMBER: entre 70% y 84.9%', () => {
    // 3 a tiempo, 1 tarde = 75%
    const tasks: TaskInputItem[] = [
      { dueAt: new Date('2026-08-05T10:00:00Z'), completedAt: new Date('2026-08-05T09:00:00Z'), status: 'COMPLETED', snoozeCount: 0, createdByAutomation: false },
      { dueAt: new Date('2026-08-06T10:00:00Z'), completedAt: new Date('2026-08-06T09:00:00Z'), status: 'COMPLETED', snoozeCount: 0, createdByAutomation: false },
      { dueAt: new Date('2026-08-07T10:00:00Z'), completedAt: new Date('2026-08-07T09:00:00Z'), status: 'COMPLETED', snoozeCount: 0, createdByAutomation: false },
      { dueAt: new Date('2026-08-08T10:00:00Z'), completedAt: new Date('2026-08-12T09:00:00Z'), status: 'COMPLETED', snoozeCount: 0, createdByAutomation: false },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(75);
    expect(res.level).toBe('AMBER');
  });

  it('13. Umbral configurable: si greenThreshold es 90, 85 es AMBER', () => {
    // 85 a tiempo de 100 = 85%
    const tasks: TaskInputItem[] = Array.from({ length: 100 }, (_, i) => ({
      dueAt: new Date('2026-08-05T10:00:00Z'),
      completedAt: i < 85 ? new Date('2026-08-05T09:00:00Z') : new Date('2026-08-10T09:00:00Z'),
      status: 'COMPLETED',
      snoozeCount: 0,
      createdByAutomation: false,
    }));
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, greenThreshold: 90, amberThreshold: 80 },
    });
    expect(res.compliancePercent).toBe(85);
    expect(res.level).toBe('AMBER');
  });

  it('14. Conteo de tareas pospuestas crónicamente (snoozeCount >= 3)', () => {
    const tasks: TaskInputItem[] = [
      {
        title: 'Seguimiento a Ferretería Uribe',
        dueAt: new Date('2026-08-05T10:00:00Z'),
        completedAt: new Date('2026-08-05T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 3,
        createdByAutomation: false,
      },
      {
        title: 'Llamada Cliente',
        dueAt: new Date('2026-08-06T10:00:00Z'),
        completedAt: new Date('2026-08-06T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 4,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.snoozedChronic).toBe(2);
    expect(res.explanation[2]).toContain('Pospuso 3 o más veces');
  });

  it('15. Tarea fuera de la ventana de fechas no se evalúa', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-07-15T10:00:00Z'), // Antes de windowStart
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-09-15T10:00:00Z'), // Después de windowEnd
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.onTime).toBe(0);
    expect(res.late).toBe(0);
    expect(res.overdueOpen).toBe(0);
    expect(res.compliancePercent).toBe(100);
  });

  it('16. Promedio de días de retraso se calcula con precisión', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-01T10:00:00Z'),
        completedAt: new Date('2026-08-03T10:00:00Z'), // 2 días tarde
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-08-01T10:00:00Z'),
        completedAt: new Date('2026-08-05T10:00:00Z'), // 4 días tarde
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.averageDaysLate).toBe(3);
  });

  it('17. Tarea abierta pero cuyo plazo futuro aún no vence no penaliza', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-25T18:00:00Z'),
        completedAt: null,
        status: 'IN_PROGRESS',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    // Evaluar cuando now es anterior al vencimiento
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now: new Date('2026-08-20T10:00:00Z'),
      config: defaultConfig,
    });
    expect(res.overdueOpen).toBe(0);
    expect(res.compliancePercent).toBe(100);
  });

  it('18. Explicación obligatoria en frases en español sin números solos', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-05T10:00:00Z'),
        completedAt: new Date('2026-08-05T09:00:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
      {
        dueAt: new Date('2026-08-06T10:00:00Z'),
        completedAt: null,
        status: 'PENDING',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.explanation.length).toBeGreaterThanOrEqual(2);
    expect(res.explanation[0]).toMatch(/Cerró \d+ de \d+ tareas a tiempo/);
    expect(res.explanation[1]).toMatch(/Tiene \d+ tareas vencidas/);
  });

  it('19. Ventana de 1 solo día funciona correctamente', () => {
    const singleDayStart = new Date('2026-08-10T00:00:00Z');
    const singleDayEnd = new Date('2026-08-10T23:59:59Z');
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T12:00:00Z'),
        completedAt: new Date('2026-08-10T12:30:00Z'),
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart: singleDayStart,
      windowEnd: singleDayEnd,
      now,
      config: defaultConfig,
    });
    expect(res.compliancePercent).toBe(100);
    expect(res.onTime).toBe(1);
  });

  it('20. Caso de borde: 0 horas de gracia', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-10T18:00:00Z'),
        completedAt: new Date('2026-08-10T18:01:00Z'), // 1 minuto tarde sin gracia
        status: 'COMPLETED',
        snoozeCount: 0,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: { ...defaultConfig, graceHours: 0 },
    });
    expect(res.onTime).toBe(0);
    expect(res.late).toBe(1);
    expect(res.compliancePercent).toBe(0);
  });

  it('21. Tarea con estado SNOOZED cuenta como abierta', () => {
    const tasks: TaskInputItem[] = [
      {
        dueAt: new Date('2026-08-01T10:00:00Z'),
        completedAt: null,
        status: 'SNOOZED',
        snoozeCount: 1,
        createdByAutomation: false,
      },
    ];
    const res = computeTaskCompliance({
      tasks,
      windowStart,
      windowEnd,
      now,
      config: defaultConfig,
    });
    expect(res.overdueOpen).toBe(1);
    expect(res.compliancePercent).toBe(0);
  });
});
