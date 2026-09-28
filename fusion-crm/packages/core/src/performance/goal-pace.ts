/**
 * Motor de Ritmo y Cumplimiento de Metas (Etapa 15.3)
 *
 * El expectedValue es estrictamente proporcional a los DÍAS HÁBILES transcurridos
 * (descontando festivos colombianos y fines de semana), nunca a días corridos.
 *
 * Umbrales de Ritmo (paceStatus):
 * - AHEAD: > 105% de lo esperado a la fecha
 * - ON_TRACK: 95% a 105%
 * - AT_RISK: 80% a 95%
 * - BEHIND: < 80%
 */

import { getElapsedBusinessDaysRatio } from '../calendar/colombian-holidays';

export type GoalPaceStatus = 'AHEAD' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

export interface GoalPaceInput {
  targetValue: number;
  actualValue: number;
  periodStart: Date;
  periodEnd: Date;
  asOfDate: Date;
  direction?: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
}

export interface GoalPaceResult {
  expectedValue: number;
  attainmentPercent: number;
  pacePercent: number;
  paceStatus: GoalPaceStatus;
  isCompleted: boolean;
  elapsedBusinessDays: number;
  totalBusinessDays: number;
  businessDayRatio: number;
}

export function calculateGoalPace(input: GoalPaceInput): GoalPaceResult {
  const {
    targetValue,
    actualValue,
    periodStart,
    periodEnd,
    asOfDate,
    direction = 'HIGHER_IS_BETTER',
  } = input;

  const { elapsed, total, ratio } = getElapsedBusinessDaysRatio(
    periodStart,
    periodEnd,
    asOfDate
  );

  // expectedValue proporcional a los días hábiles
  const expectedValue = Math.round(targetValue * ratio * 100) / 100;

  // attainmentPercent = actual / target * 100
  const attainmentPercent =
    targetValue > 0 ? Math.round((actualValue / targetValue) * 1000) / 10 : 0;

  // pacePercent = actual / expected * 100
  let pacePercent = 100;
  if (expectedValue > 0) {
    pacePercent = Math.round((actualValue / expectedValue) * 1000) / 10;
  } else if (actualValue > 0) {
    pacePercent = 150;
  }

  // Si la meta es LOWER_IS_BETTER (ej. desperdicio)
  let paceStatus: GoalPaceStatus = 'ON_TRACK';
  let isCompleted = false;

  if (direction === 'HIGHER_IS_BETTER') {
    isCompleted = actualValue >= targetValue;
    if (pacePercent > 105) {
      paceStatus = 'AHEAD';
    } else if (pacePercent >= 95) {
      paceStatus = 'ON_TRACK';
    } else if (pacePercent >= 80) {
      paceStatus = 'AT_RISK';
    } else {
      paceStatus = 'BEHIND';
    }
  } else {
    // Menor es mejor (ej. % de merma o tiempo de parada)
    isCompleted = actualValue <= targetValue;
    if (pacePercent < 95) {
      paceStatus = 'AHEAD';
    } else if (pacePercent <= 105) {
      paceStatus = 'ON_TRACK';
    } else if (pacePercent <= 120) {
      paceStatus = 'AT_RISK';
    } else {
      paceStatus = 'BEHIND';
    }
  }

  return {
    expectedValue,
    attainmentPercent,
    pacePercent,
    paceStatus,
    isCompleted,
    elapsedBusinessDays: elapsed,
    totalBusinessDays: total,
    businessDayRatio: ratio,
  };
}
