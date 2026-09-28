import { getColombianHolidays, type ColombianHoliday } from '../voice/holidays';

/**
 * Calendario laboral de la empresa: qué días se trabaja, en qué horario, festivos de Colombia
 * y excepciones propias (cierres o jornadas especiales). Lo usan el cálculo de fechas de
 * entrega de las OT y el horario de atención humana de la bandeja.
 */

export interface WorkDay {
  open: boolean;
  from: string; // HH:MM
  to: string;
}

export interface CalendarException {
  date: string; // YYYY-MM-DD
  label: string;
  /** CLOSED: no se trabaja (aunque sea día hábil). OPEN: se trabaja (aunque sea festivo o fin de semana). */
  type: 'CLOSED' | 'OPEN';
}

export interface WorkCalendar {
  /** Índice 0 = domingo … 6 = sábado. */
  days: WorkDay[];
  exceptions: CalendarException[];
}

export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
  days: [
    { open: false, from: '08:00', to: '12:00' },
    { open: true, from: '08:00', to: '18:00' },
    { open: true, from: '08:00', to: '18:00' },
    { open: true, from: '08:00', to: '18:00' },
    { open: true, from: '08:00', to: '18:00' },
    { open: true, from: '08:00', to: '18:00' },
    { open: false, from: '08:00', to: '12:00' },
  ],
  exceptions: [],
};

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeWorkCalendar(input: any): WorkCalendar {
  const days = DEFAULT_WORK_CALENDAR.days.map((def, i) => {
    const d = input?.days?.[i] ?? {};
    const from = HHMM.test(d.from) ? d.from : def.from;
    const to = HHMM.test(d.to) ? d.to : def.to;
    return { open: typeof d.open === 'boolean' ? d.open : def.open, from, to: to > from ? to : def.to > from ? def.to : '23:59' };
  });
  const seen = new Set<string>();
  const exceptions = (Array.isArray(input?.exceptions) ? input.exceptions : [])
    .filter((e: any) => YMD.test(e?.date) && !Number.isNaN(Date.parse(e.date)))
    .map((e: any) => ({ date: e.date, label: String(e.label || '').trim().slice(0, 80) || 'Excepción', type: e.type === 'OPEN' ? 'OPEN' : 'CLOSED' }) as CalendarException)
    .filter((e: CalendarException) => (seen.has(e.date) ? false : (seen.add(e.date), true)))
    .sort((a: CalendarException, b: CalendarException) => a.date.localeCompare(b.date));
  return { days, exceptions };
}

const holidayCache = new Map<number, ColombianHoliday[]>();
export function holidaysOf(year: number): ColombianHoliday[] {
  if (!holidayCache.has(year)) holidayCache.set(year, getColombianHolidays(year));
  return holidayCache.get(year)!;
}

/** Fecha YYYY-MM-DD en Bogotá (UTC-5, sin horario de verano). */
export const bogotaYmd = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);

const weekday = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/** ¿Se trabaja ese día? (horario semanal, festivos y excepciones propias). */
export function isWorkingDay(ymd: string, cal: WorkCalendar): boolean {
  const exception = cal.exceptions.find((e) => e.date === ymd);
  if (exception) return exception.type === 'OPEN';
  if (holidaysOf(Number(ymd.slice(0, 4))).some((h) => h.date === ymd)) return false;
  return !!cal.days[weekday(ymd)]?.open;
}

/** Horario de ese día, o null si no se trabaja. */
export function hoursOn(ymd: string, cal: WorkCalendar): { from: string; to: string } | null {
  if (!isWorkingDay(ymd, cal)) return null;
  const d = cal.days[weekday(ymd)];
  // Un día abierto por excepción (p. ej. sábado de temporada) usa su horario o el de un día normal
  return d?.open ? { from: d.from, to: d.to } : { from: cal.days[1].from, to: cal.days[1].to };
}

/** ¿Está abierto en este instante? */
export function isOpenAt(now: Date, cal: WorkCalendar): boolean {
  const ymd = bogotaYmd(now);
  const h = hoursOn(ymd, cal);
  if (!h) return false;
  const b = new Date(now.getTime() - 5 * 3600_000);
  const hm = `${String(b.getUTCHours()).padStart(2, '0')}:${String(b.getUTCMinutes()).padStart(2, '0')}`;
  return hm >= h.from && hm < h.to;
}

const shift = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Suma N días hábiles a una fecha (no cuenta el día de inicio). */
export function addWorkingDays(startYmd: string, n: number, cal: WorkCalendar): string {
  if (!cal.days.some((d) => d.open)) return shift(startYmd, n);
  let date = startYmd;
  let left = Math.max(0, Math.round(n));
  for (let guard = 0; left > 0 && guard < 3700; guard++) {
    date = shift(date, 1);
    if (isWorkingDay(date, cal)) left--;
  }
  return date;
}

/** Días hábiles entre dos fechas (sin contar la inicial, contando la final). Negativo si ya pasó. */
export function workingDaysBetween(fromYmd: string, toYmd: string, cal: WorkCalendar): number {
  if (fromYmd === toYmd) return 0;
  const sign = toYmd > fromYmd ? 1 : -1;
  let [a, b] = sign > 0 ? [fromYmd, toYmd] : [toYmd, fromYmd];
  let count = 0;
  for (let guard = 0; a < b && guard < 3700; guard++) {
    a = shift(a, 1);
    if (isWorkingDay(a, cal)) count++;
  }
  return sign * count;
}

/**
 * Lee un tiempo de entrega escrito ("3 a 5 días hábiles", "8 días", "2 semanas", "24 horas")
 * y devuelve el plazo máximo. Null si no se entiende.
 */
export function parseDeliveryTime(text: unknown): { days: number; business: boolean } | null {
  const t = String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nums = [...t.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (!nums.length) return null;
  const max = Math.max(...nums);
  if (/semana/.test(t)) return { days: max * 5, business: true };
  if (/hora/.test(t)) return { days: Math.max(1, Math.ceil(max / 24)), business: true };
  if (/dia|dias/.test(t)) return { days: max, business: !/calendario|corrido|calendar/.test(t) };
  return null;
}

/** Fecha de entrega (YYYY-MM-DD) a partir de hoy y el tiempo de entrega escrito. */
export function dueDateFor(start: Date, deliveryText: unknown, cal: WorkCalendar): string | null {
  const parsed = parseDeliveryTime(deliveryText);
  if (!parsed) return null;
  const from = bogotaYmd(start);
  return parsed.business ? addWorkingDays(from, parsed.days, cal) : shift(from, parsed.days);
}

/** Festivos y excepciones de un año, para mostrar. */
export function yearOverview(year: number, cal: WorkCalendar) {
  const holidays = holidaysOf(year).map((h) => ({ date: h.date, label: h.name, kind: 'HOLIDAY' as const }));
  const own = cal.exceptions.filter((e) => e.date.startsWith(`${year}-`)).map((e) => ({ date: e.date, label: e.label, kind: e.type }));
  return [...holidays, ...own].sort((a, b) => a.date.localeCompare(b.date));
}

export type BusinessStatus = 'abierto' | 'cerrado' | 'festivo';

/**
 * Estado de atención (lo usa el nodo Horario del menú telefónico): abierto según el calendario,
 * festivo si es festivo de Colombia sin excepción que lo abra, y si no, cerrado.
 * `closedUntil` es el cierre de emergencia ("Cerrar ahora") hasta esa hora.
 */
export function businessStatusAt(now: Date, calendarValue: unknown, closedUntil?: string | null): BusinessStatus {
  const cal = sanitizeWorkCalendar(calendarValue ?? {});
  if (closedUntil && Date.parse(closedUntil) > now.getTime()) return 'cerrado';
  if (isOpenAt(now, cal)) return 'abierto';
  const ymd = bogotaYmd(now);
  const openByException = cal.exceptions.some((e) => e.date === ymd && e.type === 'OPEN');
  const holiday = holidaysOf(Number(ymd.slice(0, 4))).some((h) => h.date === ymd);
  return holiday && !openByException ? 'festivo' : 'cerrado';
}
