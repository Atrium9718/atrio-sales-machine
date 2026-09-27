import { isWorkingDay } from '../../packages/core/src/calendar/workCalendar';
import { systemConfig } from './systemConfig';

/** ¿Ese día está cerrado según el calendario laboral? Solo cuenta festivos y cierres propios; el horario de la bandeja se configura en Omnicanal. */
export function closedByCalendar(ymd: string): boolean {
  const cal = systemConfig().calendar();
  const exception = cal.exceptions.find((e) => e.date === ymd);
  if (exception) return exception.type === 'CLOSED';
  // Días de la semana: los decide el horario de la bandeja; aquí solo festivos
  return !isWorkingDay(ymd, { ...cal, days: cal.days.map(() => ({ open: true, from: '00:00', to: '23:59' })) });
}
