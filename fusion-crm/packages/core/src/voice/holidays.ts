/**
 * FUSION CRM — CÁLCULO OFICIAL DE FESTIVOS DE COLOMBIA (LEY 51 DE 1983 - LEY EMILIANI)
 *
 * Determina todos los festivos nacionales del año para cálculo de horarios comerciales,
 * SLA y desvío automático de llamadas telefónicas a buzón o agente de IA fuera de horario.
 */

export interface ColombianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'FIXED' | 'EMILIANI' | 'EASTER';
}

/**
 * Calcula el Domingo de Pascua para un año dado usando el algoritmo de Butcher / Meeus
 */
function getEasterSunday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed: 2=March, 3=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month, day));
}

/**
 * Aplica la Ley Emiliani: si no cae en lunes, se traslada al lunes siguiente
 */
function moveToNextMonday(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday
  if (dayOfWeek === 1) {
    return date;
  }
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna todos los días festivos de Colombia para un año específico
 */
export function getColombianHolidays(year: number): ColombianHoliday[] {
  const holidays: ColombianHoliday[] = [];

  // 1. Festivos Fijos (invariables)
  const fixedHolidays = [
    { month: 0, day: 1, name: 'Año Nuevo' },
    { month: 4, day: 1, name: 'Día del Trabajo' },
    { month: 6, day: 20, name: 'Día de la Independencia' },
    { month: 7, day: 7, name: 'Batalla de Boyacá' },
    { month: 11, day: 8, name: 'Inmaculada Concepción' },
    { month: 11, day: 25, name: 'Navidad' },
  ];

  for (const h of fixedHolidays) {
    const d = new Date(Date.UTC(year, h.month, h.day));
    holidays.push({
      date: formatDate(d),
      name: h.name,
      type: 'FIXED',
    });
  }

  // 2. Festivos sujetos a Ley Emiliani (traslado al lunes siguiente)
  const emilianiHolidays = [
    { month: 0, day: 6, name: 'Reyes Magos' },
    { month: 2, day: 19, name: 'Día de San José' },
    { month: 5, day: 29, name: 'San Pedro y San Pablo' },
    { month: 7, day: 15, name: 'Asunción de la Virgen' },
    { month: 9, day: 12, name: 'Día de la Raza' },
    { month: 10, day: 1, name: 'Todos los Santos' },
    { month: 10, day: 11, name: 'Independencia de Cartagena' },
  ];

  for (const h of emilianiHolidays) {
    const rawDate = new Date(Date.UTC(year, h.month, h.day));
    const movedDate = moveToNextMonday(rawDate);
    holidays.push({
      date: formatDate(movedDate),
      name: h.name,
      type: 'EMILIANI',
    });
  }

  // 3. Festivos dependientes de la Pascua
  const easter = getEasterSunday(year);

  // Jueves Santo (Pascua - 3 días)
  const juevesSanto = new Date(easter);
  juevesSanto.setUTCDate(easter.getUTCDate() - 3);
  holidays.push({ date: formatDate(juevesSanto), name: 'Jueves Santo', type: 'EASTER' });

  // Viernes Santo (Pascua - 2 días)
  const viernesSanto = new Date(easter);
  viernesSanto.setUTCDate(easter.getUTCDate() - 2);
  holidays.push({ date: formatDate(viernesSanto), name: 'Viernes Santo', type: 'EASTER' });

  // Ascensión del Señor (Pascua + 40 días -> traslada al lunes siguiente = Pascua + 43 días)
  const ascension = new Date(easter);
  ascension.setUTCDate(easter.getUTCDate() + 43);
  holidays.push({ date: formatDate(ascension), name: 'Ascensión del Señor', type: 'EASTER' });

  // Corpus Christi (Pascua + 61 días -> traslada al lunes siguiente = Pascua + 64 días)
  const corpus = new Date(easter);
  corpus.setUTCDate(easter.getUTCDate() + 64);
  holidays.push({ date: formatDate(corpus), name: 'Corpus Christi', type: 'EASTER' });

  // Sagrado Corazón de Jesús (Pascua + 68 días -> traslada al lunes siguiente = Pascua + 71 días)
  const sagradoCorazon = new Date(easter);
  sagradoCorazon.setUTCDate(easter.getUTCDate() + 71);
  holidays.push({ date: formatDate(sagradoCorazon), name: 'Sagrado Corazón de Jesús', type: 'EASTER' });

  // Ordenar cronológicamente
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}

/**
 * Obtiene el próximo festivo colombiano a partir de una fecha de referencia
 */
export function getNextColombianHoliday(refDate = new Date()): ColombianHoliday {
  const year = refDate.getFullYear();
  const todayStr = refDate.toISOString().split('T')[0];

  const thisYearHolidays = getColombianHolidays(year);
  const nextInYear = thisYearHolidays.find((h) => h.date >= todayStr);

  if (nextInYear) {
    return nextInYear;
  }

  // Si no hay más en el año corriente, buscar en el siguiente
  const nextYearHolidays = getColombianHolidays(year + 1);
  return nextYearHolidays[0];
}

/**
 * Verifica si una fecha y hora cae en día festivo en Colombia
 */
export function isColombianHoliday(date = new Date()): boolean {
  const dateStr = date.toISOString().split('T')[0];
  const holidays = getColombianHolidays(date.getFullYear());
  return holidays.some((h) => h.date === dateStr);
}

/**
 * Determina el estado actual de operación según zona horaria de Bogotá (America/Bogota)
 */
export function getCurrentBogotaStatus(rules?: any): {
  isOpen: boolean;
  currentTimeBogota: string;
  isHolidayToday: boolean;
  holidayTodayName?: string;
  nextHoliday: ColombianHoliday;
} {
  // Obtener fecha y hora en zona horaria America/Bogota
  const bogotaDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  // Formato recibido: MM/DD/YYYY, HH:MM:SS
  const [datePart, timePart] = bogotaDateStr.split(', ');
  const [mm, dd, yyyy] = datePart.split('/');
  const [hh, min] = timePart.split(':');
  const currentMinutes = parseInt(hh, 10) * 60 + parseInt(min, 10);
  const isoBogotaDate = `${yyyy}-${mm}-${dd}`;

  // Verificar festivo hoy
  const holidays = getColombianHolidays(parseInt(yyyy, 10));
  const holidayToday = holidays.find((h) => h.date === isoBogotaDate);
  const isHolidayToday = Boolean(holidayToday);

  // Calcular día de la semana (1 = Lunes, ..., 7 = Domingo)
  const bogotaDateObj = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
  const dayOfWeek = bogotaDateObj.getUTCDay(); // 0 = Domingo
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

  let isOpen = false;

  // Si hoy es festivo en Colombia y se respetan festivos (por defecto sí), la empresa está cerrada
  if (isHolidayToday) {
    isOpen = false;
  } else if (isoDay >= 1 && isoDay <= 5) {
    // Lunes a Viernes: 8:00 AM (480 min) a 5:30 PM (1050 min)
    isOpen = currentMinutes >= 480 && currentMinutes < 1050;
  } else if (isoDay === 6) {
    // Sábado: 8:00 AM a 1:00 PM (780 min)
    isOpen = currentMinutes >= 480 && currentMinutes < 780;
  } else {
    // Domingo: Cerrado
    isOpen = false;
  }

  return {
    isOpen,
    currentTimeBogota: `${hh}:${min}`,
    isHolidayToday,
    holidayTodayName: holidayToday?.name,
    nextHoliday: getNextColombianHoliday(new Date()),
  };
}
