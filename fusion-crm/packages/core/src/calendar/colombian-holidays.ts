/**
 * Calendario de Festivos de Colombia (Ley 51 de 1983 - Ley Emiliani)
 * y cálculo de días hábiles.
 */

// Algoritmo para calcular el Domingo de Pascua (Meeus/Jones/Butcher)
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Si la fecha cae en fin de semana o entre semana y debe trasladarse al siguiente lunes (Ley Emiliani)
export function moveToNextMonday(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  if (dayOfWeek === 1) return date; // Ya es lunes
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function formatYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getColombianHolidays(year: number): string[] {
  const holidays: Date[] = [];

  // Festivos Fijos
  holidays.push(new Date(Date.UTC(year, 0, 1, 12, 0, 0))); // 1 Ene - Año Nuevo
  holidays.push(new Date(Date.UTC(year, 4, 1, 12, 0, 0))); // 1 May - Día del Trabajo
  holidays.push(new Date(Date.UTC(year, 6, 20, 12, 0, 0))); // 20 Jul - Independencia
  holidays.push(new Date(Date.UTC(year, 7, 7, 12, 0, 0))); // 7 Ago - Batalla de Boyacá
  holidays.push(new Date(Date.UTC(year, 11, 8, 12, 0, 0))); // 8 Dic - Inmaculada Concepción
  holidays.push(new Date(Date.UTC(year, 11, 25, 12, 0, 0))); // 25 Dic - Navidad

  // Festivos Ley Emiliani (Se trasladan al siguiente lunes)
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 0, 6, 12, 0, 0)))); // Reyes Magos
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 2, 19, 12, 0, 0)))); // San José
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 5, 29, 12, 0, 0)))); // San Pedro y San Pablo
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 7, 15, 12, 0, 0)))); // Asunción de la Virgen
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 9, 12, 12, 0, 0)))); // Día de la Raza
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 10, 1, 12, 0, 0)))); // Todos los Santos
  holidays.push(moveToNextMonday(new Date(Date.UTC(year, 10, 11, 12, 0, 0)))); // Independencia Cartagena

  // Festivos basados en Pascua
  const easter = getEasterSunday(year);
  holidays.push(addDays(easter, -3)); // Jueves Santo
  holidays.push(addDays(easter, -2)); // Viernes Santo
  holidays.push(moveToNextMonday(addDays(easter, 43))); // Ascensión del Señor
  holidays.push(moveToNextMonday(addDays(easter, 64))); // Corpus Christi
  holidays.push(moveToNextMonday(addDays(easter, 71))); // Sagrado Corazón de Jesús

  return holidays.map(formatYMD);
}

export function isColombianHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const list = getColombianHolidays(year);
  return list.includes(formatYMD(date));
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  // 0 = Domingo, 6 = Sábado
  if (day === 0 || day === 6) return false;
  return !isColombianHoliday(date);
}

export function countBusinessDays(startDate: Date, endDate: Date): number {
  const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 12, 0, 0));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 12, 0, 0));

  if (current > end) return 0;

  let count = 0;
  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

export function getElapsedBusinessDaysRatio(
  periodStart: Date,
  periodEnd: Date,
  asOfDate: Date
): { elapsed: number; total: number; ratio: number } {
  const total = countBusinessDays(periodStart, periodEnd);
  if (total === 0) return { elapsed: 0, total: 0, ratio: 1 };

  const effectiveAsOf = asOfDate < periodStart ? periodStart : asOfDate > periodEnd ? periodEnd : asOfDate;
  const elapsed = countBusinessDays(periodStart, effectiveAsOf);

  return {
    elapsed,
    total,
    ratio: Math.min(Math.max(elapsed / total, 0), 1),
  };
}
