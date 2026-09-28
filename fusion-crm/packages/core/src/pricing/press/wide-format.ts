import Decimal from 'decimal.js';

export type WideFormatClientType = 'FINAL' | 'PEER';

export interface WideFormatCalculationInput {
  linearCm: Decimal | number;
  pricePerMeter: Decimal | number;
  peerDiscountPerMeter?: Decimal | number;
  clientType: WideFormatClientType;
  roundToNearest?: number; // Por defecto 100
}

export interface WideFormatCalculationResult {
  linearCm: Decimal;
  clientType: WideFormatClientType;
  pricePerMeter: Decimal;
  pricePerCm: Decimal;
  rawTotal: Decimal;
  total: Decimal;
}

/**
 * Redondea un valor al múltiplo más cercano (comportamiento de MROUND de Excel, con .5 hacia arriba).
 */
export function mround(value: Decimal | number, multiple: number = 100): Decimal {
  const v = new Decimal(value);
  const m = new Decimal(multiple);
  if (m.isZero()) return v;

  // v / m, redondeo HALF_UP, multiplicado por m
  return v.div(m).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(m);
}

/**
 * Costeo de Gran Formato / UV-DTF por centímetro lineal.
 * Comprobación oficial: 115 cm colega con $68.000 por metro y $10.000 de descuento colega -> $66.700.
 */
export function calculateWideFormat(input: WideFormatCalculationInput): WideFormatCalculationResult {
  const linearCm = new Decimal(input.linearCm);
  const pricePerMeter = new Decimal(input.pricePerMeter);
  const peerDiscount = new Decimal(input.peerDiscountPerMeter ?? 10000);
  const roundToNearest = input.roundToNearest ?? 100;

  let effectiveMeterPrice = pricePerMeter;
  if (input.clientType === 'PEER') {
    effectiveMeterPrice = pricePerMeter.minus(peerDiscount);
  }

  // pricePerCm
  const pricePerCm = effectiveMeterPrice.div(100);

  const rawTotal = linearCm.times(pricePerCm);
  const total = mround(rawTotal, roundToNearest);

  return {
    linearCm,
    clientType: input.clientType,
    pricePerMeter,
    pricePerCm,
    rawTotal,
    total,
  };
}
