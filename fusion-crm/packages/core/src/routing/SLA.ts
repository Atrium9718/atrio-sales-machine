import { addMinutes, addDays, getDay, isBefore, isAfter, parse, set, format, addHours, differenceInMinutes, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Simple implementation of calculating SLA with Colombian holidays
// In production, we'd use a robust holiday library like date-holidays or a DB table for Colombian holidays

const COLOMBIA_HOLIDAYS_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Reyes Magos
  '2026-03-23', // Día de San José
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión
  '2026-06-08', // Corpus Christi
  '2026-06-15', // Sagrado Corazón
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-20', // Día de la Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción
  '2026-10-12', // Día de la Raza
  '2026-11-02', // Todos los Santos
  '2026-11-16', // Independencia de Cartagena
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

export interface ScheduleRange {
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
}

export interface WeekSchedule {
  monday?: ScheduleRange[];
  tuesday?: ScheduleRange[];
  wednesday?: ScheduleRange[];
  thursday?: ScheduleRange[];
  friday?: ScheduleRange[];
  saturday?: ScheduleRange[];
  sunday?: ScheduleRange[];
}

export const SLACalculator = {
  isHoliday(date: Date, calendar: 'COLOMBIA' | 'NONE'): boolean {
    if (calendar === 'NONE') return false;
    // For simplicity, we match the YYYY-MM-DD
    const dateString = format(date, 'yyyy-MM-dd');
    return COLOMBIA_HOLIDAYS_2026.includes(dateString);
  },

  getDayOfWeekString(date: Date): keyof WeekSchedule {
    const days: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[getDay(date)];
  },

  // Calculate the actual deadline taking into account business hours
  // A pure function in packages/core
  calculateDeadline(
    createdAt: Date,
    slaMinutes: number,
    schedule: WeekSchedule,
    timezone: string = 'America/Bogota',
    holidayCalendar: 'COLOMBIA' | 'NONE' = 'COLOMBIA'
  ): Date {
    // 1. Convert to local timezone
    let currentZoned = toZonedTime(createdAt, timezone);
    let remainingMinutes = slaMinutes;
    
    // Safety break to prevent infinite loops (max 30 days)
    let iterations = 0;
    
    while (remainingMinutes > 0 && iterations < 30) {
      iterations++;
      const dayString = this.getDayOfWeekString(currentZoned);
      
      // Check if it's a holiday
      if (this.isHoliday(currentZoned, holidayCalendar)) {
        // Move to next day at 00:00
        currentZoned = startOfDay(addDays(currentZoned, 1));
        continue;
      }
      
      const ranges = schedule[dayString];
      if (!ranges || ranges.length === 0) {
        // No working hours today, move to next day
        currentZoned = startOfDay(addDays(currentZoned, 1));
        continue;
      }

      let minuteConsumedInDay = false;

      for (const range of ranges) {
        if (remainingMinutes <= 0) break;
        
        const [startH, startM] = range.start.split(':').map(Number);
        const [endH, endM] = range.end.split(':').map(Number);
        
        const rangeStart = set(currentZoned, { hours: startH, minutes: startM, seconds: 0, milliseconds: 0 });
        const rangeEnd = set(currentZoned, { hours: endH, minutes: endM, seconds: 0, milliseconds: 0 });
        
        // If current time is after this range, continue to next range
        if (isAfter(currentZoned, rangeEnd) || isSameDay(currentZoned, rangeEnd) && currentZoned.getTime() === rangeEnd.getTime()) {
          continue;
        }
        
        // If current time is before this range, jump to the start of the range
        if (isBefore(currentZoned, rangeStart)) {
          currentZoned = rangeStart;
        }
        
        // Calculate minutes available in this range from current time
        const availableMinutes = differenceInMinutes(rangeEnd, currentZoned);
        
        if (remainingMinutes <= availableMinutes) {
          // We can finish within this range
          currentZoned = addMinutes(currentZoned, remainingMinutes);
          remainingMinutes = 0;
          minuteConsumedInDay = true;
          break;
        } else {
          // We consume all available minutes in this range
          remainingMinutes -= availableMinutes;
          currentZoned = rangeEnd;
          minuteConsumedInDay = true;
        }
      }
      
      if (remainingMinutes > 0) {
         // Move to next day
         currentZoned = startOfDay(addDays(currentZoned, 1));
      }
    }
    
    // Convert back to UTC
    return fromZonedTime(currentZoned, timezone);
  }
};
