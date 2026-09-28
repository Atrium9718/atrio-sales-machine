import { describe, it, expect } from 'vitest';
import { computeCapacity, CapacityInput } from './capacity';

describe('computeCapacity (Etapa 15.3)', () => {
  it('1. Caso saludable típico: 32h productivas de 40h disponibles (80%)', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 35,
      downtimeHours: 2,
      setupHours: 2,
      standardSetupHours: 1, // 1h exceso
      standardHoursEarned: 33,
      presentDays: 5,
    });

    // productivas = 35 - 2 - 1 = 32
    // utilizacion = 32 / 40 = 80%
    // eficiencia = 33 / 35 = 94.3%
    // sin registrar = 40 - 35 = 5
    expect(res.utilizationPercent).toBe(80);
    expect(res.efficiencyPercent).toBe(94.3);
    expect(res.unregisteredHours).toBe(5);
    expect(res.level).toBe('HEALTHY');
    expect(res.explanation[0]).toContain('Usó 32 de 40');
  });

  it('2. Subutilización (< 60%): 20h productivas de 40h disponibles', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 22,
      downtimeHours: 2,
      setupHours: 0,
      standardHoursEarned: 20,
      presentDays: 5,
    });
    // productivas = 20
    // utilizacion = 50%
    expect(res.utilizationPercent).toBe(50);
    expect(res.level).toBe('UNDER');
  });

  it('3. Banda TIGHT (85% a 95%): 36h productivas de 40h disponibles (90%)', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 36,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 35,
      presentDays: 5,
    });
    expect(res.utilizationPercent).toBe(90);
    expect(res.level).toBe('TIGHT');
  });

  it('4. Sobrecarga (> 95%): 39h productivas de 40h disponibles (97.5%)', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 40,
      downtimeHours: 1,
      setupHours: 0,
      standardHoursEarned: 42,
      presentDays: 5,
    });
    expect(res.utilizationPercent).toBe(97.5);
    expect(res.level).toBe('OVERLOADED');
    expect(res.explanation.some((e) => e.includes('Alerta de sobrecarga'))).toBe(true);
  });

  it('5. Paros con razones detalladas en la explicación', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 35,
      downtimeHours: 3.5,
      setupHours: 0,
      standardHoursEarned: 30,
      presentDays: 5,
      downtimeReasons: [
        { reason: 'Falta de material', hours: 2 },
        { reason: 'Mantenimiento imprevisto', hours: 1.5 },
      ],
    });
    expect(res.explanation[1]).toContain('falta de material');
    expect(res.explanation[1]).toContain('3,5');
  });

  it('6. Horas sin registrar especificadas por día y proyecto sugerido', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 34,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 34,
      presentDays: 5,
      unregisteredDaysDetails: [
        { day: 'martes', hours: 6, suggestedProject: 'PROD-0412' },
      ],
    });
    expect(res.unregisteredHours).toBe(6);
    expect(res.explanation[2]).toContain('Quedan 6 horas sin registrar del martes');
    expect(res.explanation[2]).toContain('PROD-0412');
  });

  it('7. Máquina sin uso: 0 horas registradas', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 0,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 0,
      presentDays: 5,
    });
    expect(res.utilizationPercent).toBe(0);
    expect(res.efficiencyPercent).toBe(0);
    expect(res.unregisteredHours).toBe(40);
    expect(res.level).toBe('UNDER');
  });

  it('8. Ausencias reducen las horas disponibles', () => {
    // Semana normal de 40h, pero con 16h de ausencia médica aprobada = 24h disponibles
    const res = computeCapacity({
      availableHours: 24,
      loggedHours: 20,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 22,
      presentDays: 3,
    });
    // utilizacion = 20 / 24 = 83.3%
    expect(res.utilizationPercent).toBe(83.3);
    expect(res.level).toBe('HEALTHY');
  });

  it('9. Festivos colombianos reducen las horas disponibles de la semana a 32h', () => {
    // 4 días laborales = 32h disponibles
    const res = computeCapacity({
      availableHours: 32,
      loggedHours: 28,
      downtimeHours: 2,
      setupHours: 0,
      standardHoursEarned: 27,
      presentDays: 4,
    });
    // productivas = 26
    // utilizacion = 26 / 32 = 81.3%
    expect(res.utilizationPercent).toBe(81.3);
    expect(res.level).toBe('HEALTHY');
  });

  it('10. Empleado nuevo que ingresa a mitad de período (ej. miércoles, 24h disp)', () => {
    const res = computeCapacity({
      availableHours: 24,
      loggedHours: 20,
      downtimeHours: 1,
      setupHours: 0,
      standardHoursEarned: 18,
      presentDays: 3,
    });
    // productivas = 19 / 24 = 79.2%
    expect(res.utilizationPercent).toBe(79.2);
    expect(res.level).toBe('HEALTHY');
  });

  it('11. Alistamiento que excede setup estándar resta de las productivas', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 40,
      downtimeHours: 0,
      setupHours: 6,
      standardSetupHours: 2, // 4h de exceso
      standardHoursEarned: 35,
      presentDays: 5,
    });
    // productivas = 40 - 0 - 4 = 36
    // utilizacion = 36 / 40 = 90%
    expect(res.utilizationPercent).toBe(90);
    expect(res.level).toBe('TIGHT');
    expect(res.explanation[1]).toContain('4 horas de alistamiento en exceso');
  });

  it('12. Alistamiento por debajo o igual al estándar no penaliza', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 35,
      downtimeHours: 0,
      setupHours: 2,
      standardSetupHours: 3, // sin exceso
      standardHoursEarned: 35,
      presentDays: 5,
    });
    // productivas = 35 - 0 - 0 = 35
    // utilizacion = 35 / 40 = 87.5%
    expect(res.utilizationPercent).toBe(87.5);
    expect(res.level).toBe('TIGHT');
  });

  it('13. Umbrales configurables personalizados', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 28,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 28,
      presentDays: 5,
      config: {
        underThreshold: 75, // 70% es UNDER con este umbral
        healthyThreshold: 90,
        tightThreshold: 98,
      },
    });
    // 28 / 40 = 70%
    expect(res.utilizationPercent).toBe(70);
    expect(res.level).toBe('UNDER');
  });

  it('14. Horas sin registrar nunca se suman a la ociosidad', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 20, // 20h sin registrar
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 20,
      presentDays: 5,
    });
    expect(res.unregisteredHours).toBe(20);
    expect(res.explanation[2]).toContain('Quedan 20 horas');
    expect(res.explanation[2]).not.toContain('ociosidad');
  });

  it('15. Alta eficiencia (> 100%): ganó más horas estándar de las registradas', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 30,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 36, // Rendimiento sobre-estándar
      presentDays: 5,
    });
    // eficiencia = 36 / 30 = 120%
    expect(res.efficiencyPercent).toBe(120);
    expect(res.explanation[1]).toContain('120%');
  });

  it('16. Caso de borde: 0 horas disponibles', () => {
    const res = computeCapacity({
      availableHours: 0,
      loggedHours: 0,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 0,
      presentDays: 0,
    });
    expect(res.utilizationPercent).toBe(0);
    expect(res.explanation[0]).toContain('Sin horas disponibles');
  });

  it('17. Sobrecarga exacta al 95.1%', () => {
    const res = computeCapacity({
      availableHours: 100,
      loggedHours: 95.1,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 95,
      presentDays: 5,
    });
    expect(res.level).toBe('OVERLOADED');
  });

  it('18. Límite exacto de 85% es HEALTHY', () => {
    const res = computeCapacity({
      availableHours: 100,
      loggedHours: 85,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 85,
      presentDays: 5,
    });
    expect(res.level).toBe('HEALTHY');
  });

  it('19. Límite exacto de 60% es HEALTHY', () => {
    const res = computeCapacity({
      availableHours: 100,
      loggedHours: 60,
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 60,
      presentDays: 5,
    });
    expect(res.level).toBe('HEALTHY');
  });

  it('20. Caso con horas registradas mayores a disponibles (horas extra)', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 46, // 6 horas extra
      downtimeHours: 0,
      setupHours: 0,
      standardHoursEarned: 48,
      presentDays: 5,
    });
    // utilizacion = 46 / 40 = 115%
    expect(res.utilizationPercent).toBe(115);
    expect(res.unregisteredHours).toBe(0);
    expect(res.level).toBe('OVERLOADED');
  });

  it('21. Múltiples paros identifican el más incidente', () => {
    const res = computeCapacity({
      availableHours: 40,
      loggedHours: 35,
      downtimeHours: 5,
      setupHours: 0,
      standardHoursEarned: 30,
      presentDays: 5,
      downtimeReasons: [
        { reason: 'Falta de archivos de arte', hours: 1 },
        { reason: 'Falla en cabezal de impresión', hours: 4 },
      ],
    });
    expect(res.explanation[1]).toContain('falla en cabezal de impresión');
    expect(res.explanation[1]).toContain('4');
  });
});
