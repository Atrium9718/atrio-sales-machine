/**
 * Cálculo de Capacidad Instalada, Utilización y Eficiencia — Función Pura (Etapa 15.3)
 *
 * DEFINICIONES OPERATIVAS:
 * - horasDisponibles: jornada contratada del período - festivos colombianos - ausencias aprobadas.
 *                     (Para máquinas: turnos configurados - mantenimiento programado).
 * - horasRegistradas: suma de TimeEntry reportados en el período.
 * - horasProductivas: horasRegistradas - paros (downtime) - alistamiento que exceda el setupMinutes estándar.
 * - horasEstándar ganadas: suma de estimatedHours de las ProductionTask completadas en el período.
 * - utilizacion %: horasProductivas / horasDisponibles.
 * - eficiencia %: horasEstándar ganadas / horasRegistradas.
 * - horasSinRegistrar: horasDisponibles - horasRegistradas, cuando la persona estuvo presente.
 *                      Es un HUECO DE REGISTRO, NUNCA ociosidad: se muestra por separado.
 *
 * BIFURCACIÓN POR ROL:
 * - Producción / Planta: Capacidad medida en horas efectivas (utilización y eficiencia de máquina o puesto).
 * - Comercial: La capacidad representa la cuota activa y avance hacia las metas (Goal) asignadas.
 */

export interface CapacityConfig {
  underThreshold?: number; // por defecto 60%
  healthyThreshold?: number; // por defecto 85%
  tightThreshold?: number; // por defecto 95%
}

export interface CapacityInput {
  availableHours: number;
  loggedHours: number;
  downtimeHours: number;
  setupHours: number;
  standardSetupHours?: number;
  excessSetupHours?: number;
  standardHoursEarned: number;
  presentDays: number;
  downtimeReasons?: { reason: string; hours: number }[];
  unregisteredDaysDetails?: { day: string; hours: number; suggestedProject?: string }[];
  config?: CapacityConfig;
}

export type CapacityLevel = 'UNDER' | 'HEALTHY' | 'TIGHT' | 'OVERLOADED';

export interface CapacityResult {
  utilizationPercent: number;
  efficiencyPercent: number;
  unregisteredHours: number;
  productiveHours: number;
  level: CapacityLevel;
  explanation: string[];
}

export function computeCapacity(input: CapacityInput): CapacityResult {
  const {
    availableHours,
    loggedHours,
    downtimeHours,
    setupHours,
    standardSetupHours = 0,
    standardHoursEarned,
    downtimeReasons = [],
    unregisteredDaysDetails = [],
    config = {},
  } = input;

  const underThreshold = config.underThreshold ?? 60;
  const healthyThreshold = config.healthyThreshold ?? 85;
  const tightThreshold = config.tightThreshold ?? 95;

  // Alistamiento en exceso sobre el estándar
  const calculatedExcessSetup =
    input.excessSetupHours !== undefined
      ? input.excessSetupHours
      : Math.max(0, setupHours - standardSetupHours);

  // horasProductivas = horasRegistradas - paros - alistamiento en exceso
  const productiveHours = Math.max(
    0,
    loggedHours - downtimeHours - calculatedExcessSetup
  );

  // Utilización: productivas / disponibles
  const utilizationPercent =
    availableHours > 0
      ? Math.round((productiveHours / availableHours) * 1000) / 10
      : 0;

  // Eficiencia: horas estándar ganadas / horas registradas
  const efficiencyPercent =
    loggedHours > 0
      ? Math.round((standardHoursEarned / loggedHours) * 1000) / 10
      : 0;

  // Horas sin registrar: hueco de registro
  const rawUnregistered = Math.max(0, availableHours - loggedHours);
  const unregisteredHours = Math.round(rawUnregistered * 10) / 10;

  // Clasificación en Bandas
  let level: CapacityLevel;
  if (utilizationPercent < underThreshold) {
    level = 'UNDER';
  } else if (utilizationPercent <= healthyThreshold) {
    level = 'HEALTHY';
  } else if (utilizationPercent <= tightThreshold) {
    level = 'TIGHT';
  } else {
    // > 95%: SOBRECARGA NO ES UN LOGRO (induce reprocesos y retrasos)
    level = 'OVERLOADED';
  }

  // Frases de explicación en español
  const explanation: string[] = [];

  // Frase 1: Utilización
  const roundProd = Math.round(productiveHours * 10) / 10;
  const roundAvail = Math.round(availableHours * 10) / 10;
  if (availableHours <= 0) {
    explanation.push('Sin horas disponibles programadas en el período analizado.');
  } else {
    explanation.push(
      `Usó ${roundProd.toLocaleString('es-CO')} de ${roundAvail.toLocaleString(
        'es-CO'
      )} horas disponibles esta semana (${utilizationPercent}%).`
    );
  }

  // Frase 2: Paros o Eficiencia
  if (downtimeHours > 0) {
    let reasonText = '';
    if (downtimeReasons.length > 0) {
      const topReason = downtimeReasons.reduce((prev, curr) =>
        curr.hours > prev.hours ? curr : prev
      );
      reasonText = `: ${topReason.hours.toLocaleString('es-CO')} por ${topReason.reason.toLowerCase()}`;
    }
    explanation.push(
      `Se le fueron ${downtimeHours.toLocaleString('es-CO')} horas en paros${reasonText}.`
    );
  } else if (calculatedExcessSetup > 0) {
    explanation.push(
      `Registró ${calculatedExcessSetup.toLocaleString(
        'es-CO'
      )} horas de alistamiento en exceso sobre el estándar del proceso.`
    );
  } else {
    explanation.push(
      `Registró una eficiencia técnica del ${efficiencyPercent}% sobre las tareas ganadas.`
    );
  }

  // Frase 3: Horas sin registrar (Hueco de registro) o aviso de Sobrecarga
  if (unregisteredHours > 0) {
    const detail = unregisteredDaysDetails[0];
    if (detail) {
      const projText = detail.suggestedProject
        ? ` para que el costo del proyecto ${detail.suggestedProject} quede completo`
        : '';
      explanation.push(
        `Quedan ${detail.hours.toLocaleString('es-CO')} horas sin registrar del ${
          detail.day
        }. Regístrelas${projText}.`
      );
    } else {
      explanation.push(
        `Quedan ${unregisteredHours.toLocaleString(
          'es-CO'
        )} horas de jornada sin registrar en el período.`
      );
    }
  } else if (level === 'OVERLOADED') {
    explanation.push(
      'Alerta de sobrecarga (>95%): riesgo inminente de reprocesos y demoras en entregas.'
    );
  }

  return {
    utilizationPercent,
    efficiencyPercent,
    unregisteredHours,
    productiveHours: roundProd,
    level,
    explanation,
  };
}
