/**
 * Cálculo de Cumplimiento de Tareas — Función Pura (Etapa 15.3)
 */

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SNOOZED';

export interface TaskInputItem {
  id?: string;
  title?: string;
  dueAt: Date | null;
  completedAt: Date | null;
  status: TaskStatus;
  snoozeCount: number;
  createdByAutomation: boolean;
}

export interface TaskComplianceConfig {
  greenThreshold: number; // por defecto 85
  amberThreshold: number; // por defecto 70
  graceHours: number; // por defecto 4
  excludeAutomationTasks: boolean; // por defecto true o false según config
}

export interface TaskComplianceInput {
  tasks: TaskInputItem[];
  windowStart: Date;
  windowEnd: Date;
  now: Date;
  config: TaskComplianceConfig;
}

export interface TaskComplianceResult {
  compliancePercent: number;
  onTime: number;
  late: number;
  overdueOpen: number;
  snoozedChronic: number;
  averageDaysLate: number;
  level: 'GREEN' | 'AMBER' | 'RED';
  explanation: string[];
}

export function computeTaskCompliance(input: TaskComplianceInput): TaskComplianceResult {
  const { tasks, windowStart, windowEnd, now, config } = input;
  const graceMs = config.graceHours * 60 * 60 * 1000;

  let onTime = 0;
  let late = 0;
  let overdueOpen = 0;
  let snoozedChronic = 0;
  let totalDaysLate = 0;
  let maxDaysLate = 0;
  let mostSnoozedTaskTitle: string | null = null;
  let maxSnoozeCount = 0;

  // Filtrar tareas no elegibles
  const eligibleTasks = tasks.filter((t) => {
    // Las canceladas no cuentan
    if (t.status === 'CANCELLED') return false;
    // Las que no tienen dueAt no cuentan
    if (!t.dueAt) return false;
    // Si se excluyen tareas automáticas
    if (config.excludeAutomationTasks && t.createdByAutomation) return false;

    // Verificar ventana de tiempo: vencimiento dentro de la ventana, o completada dentro de la ventana
    const dueTime = new Date(t.dueAt).getTime();
    const wStart = new Date(windowStart).getTime();
    const wEnd = new Date(windowEnd).getTime();

    return dueTime >= wStart && dueTime <= wEnd;
  });

  const nowTime = new Date(now).getTime();

  for (const task of eligibleTasks) {
    const dueTime = new Date(task.dueAt!).getTime();
    const isCompleted = task.status === 'COMPLETED' && task.completedAt !== null;

    if (task.snoozeCount >= 3) {
      snoozedChronic++;
      if (task.snoozeCount > maxSnoozeCount) {
        maxSnoozeCount = task.snoozeCount;
        mostSnoozedTaskTitle = task.title || 'seguimiento';
      }
    }

    if (isCompleted) {
      const completedTime = new Date(task.completedAt!).getTime();
      // Si se completó dentro del tiempo de vencimiento + horas de gracia
      if (completedTime <= dueTime + graceMs) {
        onTime++;
      } else {
        late++;
        const daysLate = Math.max(0, (completedTime - dueTime) / (1000 * 60 * 60 * 24));
        totalDaysLate += daysLate;
      }
    } else {
      // Tarea abierta: verificar si ya venció con horas de gracia respecto a `now`
      if (nowTime > dueTime + graceMs) {
        overdueOpen++;
        const daysLate = Math.max(0, (nowTime - dueTime) / (1000 * 60 * 60 * 24));
        totalDaysLate += daysLate;
        if (daysLate > maxDaysLate) {
          maxDaysLate = daysLate;
        }
      }
      // Si la tarea aún no vence (está dentro del plazo futuro), no penaliza todavía
    }
  }

  const denominator = onTime + late + overdueOpen;
  const compliancePercent =
    denominator === 0 ? 100 : Math.round((onTime / denominator) * 1000) / 10;

  const lateDenominator = late + overdueOpen;
  const averageDaysLate =
    lateDenominator === 0
      ? 0
      : Math.round((totalDaysLate / lateDenominator) * 10) / 10;

  // Determinar nivel semafórico
  let level: 'GREEN' | 'AMBER' | 'RED' = 'RED';
  if (compliancePercent >= config.greenThreshold) {
    level = 'GREEN';
  } else if (compliancePercent >= config.amberThreshold) {
    level = 'AMBER';
  }

  // Generar explicaciones en frases en español
  const windowDays = Math.max(
    1,
    Math.round(
      (new Date(windowEnd).getTime() - new Date(windowStart).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const explanation: string[] = [];

  if (denominator === 0) {
    explanation.push(
      `No hubo tareas con vencimiento programado en los últimos ${windowDays} días.`
    );
  } else {
    explanation.push(
      `Cerró ${onTime} de ${denominator} tareas a tiempo en los últimos ${windowDays} días (${compliancePercent}% de cumplimiento).`
    );
  }

  if (overdueOpen > 0) {
    explanation.push(
      `Tiene ${overdueOpen} tareas vencidas abiertas; la más antigua lleva ${Math.ceil(
        maxDaysLate
      )} días de retraso.`
    );
  } else {
    explanation.push(`No tiene tareas vencidas abiertas al corte actual.`);
  }

  if (snoozedChronic > 0) {
    explanation.push(
      `Pospuso 3 o más veces ${snoozedChronic} tareas${
        mostSnoozedTaskTitle ? ` (ej. ${mostSnoozedTaskTitle})` : ''
      }.`
    );
  }

  return {
    compliancePercent,
    onTime,
    late,
    overdueOpen,
    snoozedChronic,
    averageDaysLate,
    level,
    explanation,
  };
}
