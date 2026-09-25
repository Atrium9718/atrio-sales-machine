import { Decimal } from 'decimal.js';

export enum OvertimeSurcharge {
  DAY = 0.25,           // 25%
  NIGHT = 0.75,         // 75%
  HOLIDAY = 0.75,       // 75%
  NIGHT_HOLIDAY = 1.50  // 150%
}

/**
 * Calculates the total cost for overtime given the hourly rate, number of hours, 
 * and the specific overtime type based on Colombian law.
 */
export function calculateOvertimeCost(
  hourlyRate: number | string | Decimal, 
  hours: number | string | Decimal, 
  type: keyof typeof OvertimeSurcharge
): { totalCost: number, surchargePercent: number } {
  
  const dHourly = new Decimal(hourlyRate);
  const dHours = new Decimal(hours);
  const surcharge = new Decimal(OvertimeSurcharge[type]);
  
  // Rate = Base + (Base * Surcharge)
  const totalRate = dHourly.times(new Decimal(1).plus(surcharge));
  const totalCost = totalRate.times(dHours).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  
  return {
    totalCost: totalCost.toNumber(),
    surchargePercent: surcharge.toNumber()
  };
}
