import { Decimal } from 'decimal.js';

export interface EstimationParams {
  quantity: number;
  setupMinutes: number;
  minutesPerUnit: number;
  machineHourlyCost: number;
  efficiency: number; // 0.0 to 1.0 (OEE performance factor)
}

export interface EstimationResult {
  totalMinutes: number;
  totalHours: number;
  machineCost: number;
}

/**
 * Calculates the estimated time and machine cost for a specific process step.
 * Uses Decimal.js for precise financial and time calculations.
 */
export function estimateProcessTimeAndCost(params: EstimationParams): EstimationResult {
  const { quantity, setupMinutes, minutesPerUnit, machineHourlyCost, efficiency } = params;

  if (quantity < 0 || efficiency <= 0) {
    return { totalMinutes: 0, totalHours: 0, machineCost: 0 };
  }

  const dQuantity = new Decimal(quantity);
  const dSetup = new Decimal(setupMinutes);
  const dMinPerUnit = new Decimal(minutesPerUnit);
  const dEfficiency = new Decimal(efficiency);
  const dHourlyCost = new Decimal(machineHourlyCost);

  // raw minutes = (quantity * minPerUnit) + setup
  const rawMinutes = dQuantity.times(dMinPerUnit).plus(dSetup);
  
  // actual minutes = raw minutes / efficiency
  const actualMinutes = rawMinutes.dividedBy(dEfficiency);
  
  // total hours
  const totalHours = actualMinutes.dividedBy(60);

  // machine cost = total hours * hourly cost
  // Banker's rounding for financial precision
  const machineCost = totalHours.times(dHourlyCost).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

  return {
    totalMinutes: actualMinutes.toNumber(),
    totalHours: totalHours.toNumber(),
    machineCost: machineCost.toNumber(),
  };
}
