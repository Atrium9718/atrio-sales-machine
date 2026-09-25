import Decimal from 'decimal.js';

export interface PricingInput {
  mode: 'IN_HOUSE' | 'OUTSOURCED' | 'AGENCY';
  quantity: Decimal | number | string;
  rawMaterialCost: Decimal | number | string;
  laborHours: Decimal | number | string;
  laborRatePerHour: Decimal | number | string;
  outsourcedCost: Decimal | number | string;
  otherCosts: Decimal | number | string;
  wastePercent: Decimal | number | string;
  targetMarginPercent?: Decimal | number | string;
  applyVat: boolean;
  vatRate: Decimal | number | string;
}

export interface PricingResult {
  internalCost: Decimal;
  suggestedUnitPrice: Decimal;
  lineSubtotal: Decimal;
  vatAmount: Decimal;
  lineTotal: Decimal;
  marginAmount: Decimal;
  marginPercent: Decimal;
  breakdown: { label: string; amount: Decimal }[];
}

// Configs that would normally come from organization settings
export const DEFAULT_MARGINS = {
  IN_HOUSE: new Decimal(35),
  OUTSOURCED: new Decimal(20),
  AGENCY: new Decimal(15),
};

export function calculatePricing(input: PricingInput): PricingResult {
  const quantity = new Decimal(input.quantity);
  const rawMaterialCost = new Decimal(input.rawMaterialCost);
  const laborHours = new Decimal(input.laborHours);
  const laborRatePerHour = new Decimal(input.laborRatePerHour);
  const outsourcedCost = new Decimal(input.outsourcedCost);
  const otherCosts = new Decimal(input.otherCosts);
  const wastePercent = new Decimal(input.wastePercent);
  const vatRate = new Decimal(input.vatRate);
  
  // 1. Calculate raw material with waste
  const wasteMultiplier = new Decimal(1).plus(wastePercent.dividedBy(100));
  const totalRawMaterial = rawMaterialCost.times(wasteMultiplier);
  
  // 2. Calculate labor
  const totalLabor = laborHours.times(laborRatePerHour);
  
  // 3. Total internal cost per unit
  let unitInternalCost = new Decimal(0);
  const breakdown: { label: string; amount: Decimal }[] = [];
  
  if (input.mode === 'IN_HOUSE') {
    unitInternalCost = totalRawMaterial.plus(totalLabor).plus(otherCosts);
    breakdown.push({ label: 'Materia Prima (con desperdicio)', amount: totalRawMaterial.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN) });
    breakdown.push({ label: 'Mano de Obra', amount: totalLabor.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN) });
    breakdown.push({ label: 'Otros Costos', amount: new Decimal(otherCosts).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN) });
  } else if (input.mode === 'OUTSOURCED' || input.mode === 'AGENCY') {
    unitInternalCost = outsourcedCost.plus(otherCosts);
    breakdown.push({ label: 'Costo Tercerizado/Agencia', amount: new Decimal(outsourcedCost).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN) });
    breakdown.push({ label: 'Otros Costos', amount: new Decimal(otherCosts).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN) });
  }
  
  // 4. Margin
  const targetMargin = input.targetMarginPercent !== undefined 
    ? new Decimal(input.targetMarginPercent) 
    : DEFAULT_MARGINS[input.mode];
    
  let suggestedUnitPrice = new Decimal(0);
  
  if (targetMargin.greaterThanOrEqualTo(100)) {
    // Fallback to markup calculation if margin is >= 100% (which is mathematically invalid for margins)
    suggestedUnitPrice = unitInternalCost.times(new Decimal(1).plus(targetMargin.dividedBy(100)));
  } else {
    // Standard margin formula: Price = Cost / (1 - Margin)
    const marginDivisor = new Decimal(1).minus(targetMargin.dividedBy(100));
    suggestedUnitPrice = unitInternalCost.dividedBy(marginDivisor);
  }

  // 5. Calculate Subtotals (Quantity * Unit Price)
  // Rule: Rounding is applied ONCE at the end per line.
  const lineSubtotal = suggestedUnitPrice.times(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  
  // 6. VAT
  let vatAmount = new Decimal(0);
  if (input.applyVat) {
    vatAmount = lineSubtotal.times(vatRate.dividedBy(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  }
  
  // 7. Total
  const lineTotal = lineSubtotal.plus(vatAmount);
  
  // 8. Margins
  const totalInternalCost = unitInternalCost.times(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  const marginAmount = lineSubtotal.minus(totalInternalCost);
  
  let actualMarginPercent = new Decimal(0);
  if (!lineSubtotal.isZero()) {
    actualMarginPercent = marginAmount.dividedBy(lineSubtotal).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  } else if (marginAmount.isNegative()) {
    actualMarginPercent = new Decimal(-100);
  }

  return {
    internalCost: unitInternalCost.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
    suggestedUnitPrice: suggestedUnitPrice.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
    lineSubtotal,
    vatAmount,
    lineTotal,
    marginAmount,
    marginPercent: actualMarginPercent,
    breakdown
  };
}

export * from './press';
