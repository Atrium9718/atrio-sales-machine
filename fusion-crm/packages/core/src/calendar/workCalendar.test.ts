import { describe, it, expect } from 'vitest';
import { DEFAULT_WORK_CALENDAR, addWorkingDays, dueDateFor, isOpenAt, isWorkingDay, parseDeliveryTime, sanitizeWorkCalendar, workingDaysBetween, yearOverview } from './workCalendar';

const cal = DEFAULT_WORK_CALENDAR;

describe('calendario laboral', () => {
  it('trae los 18 festivos de Colombia de 2026', () => {
    const days = yearOverview(2026, cal).map((d) => d.date);
    expect(days).toEqual([
      '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15',
      '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
    ]);
  });

  it('festivos, fines de semana y excepciones propias', () => {
    expect(isWorkingDay('2026-03-23', cal)).toBe(false); // San José (lunes festivo)
    expect(isWorkingDay('2026-03-24', cal)).toBe(true);
    expect(isWorkingDay('2026-03-28', cal)).toBe(false); // sábado
    const custom = sanitizeWorkCalendar({ ...cal, exceptions: [{ date: '2026-03-24', label: 'Inventario', type: 'CLOSED' }, { date: '2026-03-23', label: 'Temporada', type: 'OPEN' }] });
    expect(isWorkingDay('2026-03-24', custom)).toBe(false);
    expect(isWorkingDay('2026-03-23', custom)).toBe(true);
  });

  it('suma días hábiles saltando festivos y fines de semana', () => {
    // Viernes 20 mar 2026 + 1 hábil: el lunes 23 es festivo → martes 24
    expect(addWorkingDays('2026-03-20', 1, cal)).toBe('2026-03-24');
    // Semana Santa: miércoles 1 abr + 2 → martes 7 (jueves y viernes santo no cuentan)
    expect(addWorkingDays('2026-04-01', 2, cal)).toBe('2026-04-07');
    expect(workingDaysBetween('2026-03-20', '2026-03-24', cal)).toBe(1);
    expect(workingDaysBetween('2026-03-24', '2026-03-20', cal)).toBe(-1);
    const saturdays = sanitizeWorkCalendar({ days: cal.days.map((d, i) => (i === 6 ? { ...d, open: true } : d)) });
    expect(addWorkingDays('2026-03-20', 1, saturdays)).toBe('2026-03-21');
  });

  it('entiende los tiempos de entrega escritos', () => {
    expect(parseDeliveryTime('3 a 5 días hábiles')).toEqual({ days: 5, business: true });
    expect(parseDeliveryTime('8 días calendario')).toEqual({ days: 8, business: false });
    expect(parseDeliveryTime('2 semanas')).toEqual({ days: 10, business: true });
    expect(parseDeliveryTime('24 horas')).toEqual({ days: 1, business: true });
    expect(parseDeliveryTime('Inmediato')).toBeNull();
    // Hoy viernes 20 mar 2026 (Bogotá) + 5 hábiles → lunes 30 (el 23 es festivo)
    expect(dueDateFor(new Date('2026-03-20T15:00:00Z'), '3 a 5 días hábiles', cal)).toBe('2026-03-30');
    expect(dueDateFor(new Date('2026-03-20T15:00:00Z'), 'Por definir', cal)).toBeNull();
  });

  it('abierto según el horario de Bogotá', () => {
    expect(isOpenAt(new Date('2026-03-24T14:00:00Z'), cal)).toBe(true); // 9:00 a. m.
    expect(isOpenAt(new Date('2026-03-24T23:30:00Z'), cal)).toBe(false); // 6:30 p. m.
    expect(isOpenAt(new Date('2026-03-23T14:00:00Z'), cal)).toBe(false); // festivo
  });
});
