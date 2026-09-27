

// --- PRICING LOGIC ---
export function calcularCostoInterno(input: {
  laborHours: number;
  laborRatePerHour: number;
  dailyDivisor: number;
  rawMaterialCost: number;
  marginPercent: number;
}) {
  const { laborHours, laborRatePerHour, dailyDivisor, rawMaterialCost, marginPercent } = input;
  
  const laborCost = dailyDivisor > 0 ? (laborHours * laborRatePerHour) / dailyDivisor : 0;
  const base = laborCost + rawMaterialCost;
  const marginAmount = base * (marginPercent / 100);
  const suggestedUnitPrice = Math.round(base + marginAmount);
  
  return {
    base,
    suggestedUnitPrice,
    breakdown: { laborCost, rawMaterialCost, marginAmount }
  };
}

export function resolverDesdeCampoEditado(
  valores: { quantity: number, unitPrice: number, subtotal?: number, total?: number, lineSubtotal?: number, lineTotal?: number },
  campoEditado: 'quantity' | 'unitPrice' | 'lineSubtotal' | 'lineTotal',
  vatRate: number,
  applyVat: boolean
) {
  let quantity = valores.quantity;
  let unitPrice = valores.unitPrice;
  let subtotal = valores.subtotal !== undefined ? valores.subtotal : (valores.lineSubtotal ?? 0);
  let total = valores.total !== undefined ? valores.total : (valores.lineTotal ?? 0);
  
  if (campoEditado === 'quantity') {
    subtotal = quantity * unitPrice;
  } else if (campoEditado === 'unitPrice') {
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    subtotal = quantity * unitPrice;
  } else if (campoEditado === 'lineSubtotal') {
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    unitPrice = subtotal / quantity;
  } else if (campoEditado === 'lineTotal') {
    subtotal = applyVat ? total / (1 + vatRate) : total;
    if (quantity <= 0 || isNaN(quantity)) quantity = 1;
    unitPrice = subtotal / quantity;
  }

  const vatAmount = applyVat ? subtotal * vatRate : 0;
  total = subtotal + vatAmount;

  const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedVat = Math.round(vatAmount * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;
  
  return { 
    quantity, 
    unitPrice: roundedUnitPrice, 
    subtotal: roundedSubtotal, 
    lineSubtotal: roundedSubtotal, 
    vatAmount: roundedVat, 
    total: roundedTotal,
    lineTotal: roundedTotal
  };
}
// --- END PRICING LOGIC ---

export type ProductionMode = 'IN_HOUSE' | 'OUTSOURCED' | 'AGENCY';

export interface QuoteItem {
  id: string;
  order: number;
  description: string;
  productionMode: ProductionMode;
  size: string;
  inks: string;
  material: string;
  finishes: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  applyVat: boolean;
  /** Tasa de IVA del ítem (0,19 si no se indica). */
  vatRate?: number;
  vatAmount: number;
  total: number;
  
  showCalcPanel: boolean;
  laborHours: number;
  rawMaterialCost: number;
  marginPercent: number;
  isManuallyAdjusted: boolean;
  lastEditedField: 'quantity' | 'unitPrice' | 'lineSubtotal' | 'lineTotal';

  // Campos técnicos asistidos (Etapa 18.5)
  reference?: string;
  unit?: string;
  lineSubtotal?: number;
  lineTotal?: number;
  printTechnique?: 'DIGITAL' | 'LITHO';
  materials?: string;
  outsourcedCost?: number;
  otherCost?: number;
  internalCost?: number;
  suggestedUnitPrice?: number;
  manualAdjustedPrice?: number;
  paperTypeId?: string | null;
  paperSheets?: number | null;
  wastePercent?: number;
  plateCount?: number | null;
  sheetsNeeded?: number;
  impositionPerSheet?: number;
  productionSpec?: string;
  assistRunId?: string;
  assistInput?: any;
  assistResult?: any;
}

export const CONFIG = {
  tarifaHoraMO: 90404,
  divisorJornada: 6,
  vatRate: 0.19,
  margins: {
    IN_HOUSE: 35,
    OUTSOURCED: 20,
    AGENCY: 15
  }
};

export const formatCurrency = (val: number) => `$ ${val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const parseCurrency = (val: string) => Number(val.replace(/[^0-9.-]+/g,""));
