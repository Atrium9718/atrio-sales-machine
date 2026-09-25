import Decimal from 'decimal.js';

export interface ManualPlateRow {
  format: '1/8' | '1/4' | '1/2' | 'Pliego' | string;
  unitPrice: number;
  plateCount: number;
}

export interface ManualImpressionRow {
  format: '1/8' | '1/4' | '1/2' | 'Pliego' | string;
  pressPricePerThousand: number;
  plateCount: number;
}

export interface ManualPaperRow {
  paperName: string;
  sheetFormat: 'S70X100' | 'S60X90' | string;
  pricePerSheet: number | null; // null si "No hay precio"
  sheetsPerQty: number[]; // pliegos para qty1, qty2, qty3
}

export interface ManualFinishRow {
  name: string;
  pricesPerQty: number[]; // precio para qty1, qty2, qty3
}

export interface ManualLithoCalculationInput {
  jobDescription?: string;
  quantities: number[]; // [qty1, qty2, qty3]
  plates: ManualPlateRow[];
  impressions: ManualImpressionRow[];
  papers: ManualPaperRow[];
  finishes: ManualFinishRow[];
  utilityPercent?: number; // defecto 70
  commissionPercent?: number; // defecto 10
  vatPercent?: number; // defecto 19
}

export interface ManualLithoQuantityResult {
  quantity: number;
  platesCost: number;
  impressionsCost: number;
  papersCost: number;
  finishesCost: number;
  totalCost: number;
  unitCost: number;
  utilityAmount: number;
  commissionAmount: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  unitPrice: number;
}

export interface ManualLithoCalculationResult {
  jobDescription: string;
  quantities: ManualLithoQuantityResult[];
  platesTotal: number;
  platesSubtotals: number[];
}

/**
 * Motor de cálculo para el Modo Manual Litográfico (Hoja 'Cotización Lito Simple').
 * Lógica pura sin dependencias de red, base de datos ni reloj.
 * 
 * Reglas clave del cierre comercial manual:
 * 1. total_costos = planchas + impresión + papel + acabados
 * 2. costo_unitario = total_costos / cantidad
 * 3. utilidad = costo_unitario × utilidad% (defecto 70%)
 * 4. comisión = (costo_unitario + utilidad) × comisión% (defecto 10%)
 * 5. subtotal = (costo_unitario + utilidad + comisión) × cantidad
 * 6. iva = subtotal × iva% (defecto 19%)
 * 7. total = subtotal + iva
 * 8. precio_unit = total / cantidad
 */
export function calculateManualLitho(input: ManualLithoCalculationInput): ManualLithoCalculationResult {
  const utilityPercent = input.utilityPercent ?? 70;
  const commissionPercent = input.commissionPercent ?? 10;
  const vatPercent = input.vatPercent ?? 19;
  const quantities = input.quantities.length > 0 ? input.quantities : [1000];

  // 1. Planchas: 4 filas (1/8, 1/4, 1/2, Pliego)
  // Subtotal fila = precio_unitario × plateCount
  const platesSubtotals = input.plates.map((row) => {
    return Math.max(0, (row.unitPrice || 0) * (row.plateCount || 0));
  });
  const platesTotal = platesSubtotals.reduce((sum, val) => sum + val, 0);

  // 2. Resultados por cada cantidad
  const quantitiesResults: ManualLithoQuantityResult[] = quantities.map((qty, qIdx) => {
    const validQty = Math.max(1, qty);
    const millares = Math.ceil(validQty / 1000);

    // Impresiones por cantidad:
    // Para cada fila: precio_millar × número_planchas_de_esa_fila × millares(cantidad)
    const impressionsCost = input.impressions.reduce((sum, row) => {
      const rowPlateCount = row.plateCount || 0;
      const rowPricePerThousand = row.pressPricePerThousand || 0;
      const rowCost = rowPricePerThousand * rowPlateCount * millares;
      return sum + Math.max(0, rowCost);
    }, 0);

    // Papeles por cantidad:
    // Para cada fila: costo_pliego × pliegos(cantidad)
    const papersCost = input.papers.reduce((sum, row) => {
      if (row.pricePerSheet === null || row.pricePerSheet === undefined || isNaN(row.pricePerSheet)) {
        return sum; // No hay precio, no suma costo
      }
      const sheets = row.sheetsPerQty[qIdx] || 0;
      const rowCost = row.pricePerSheet * sheets;
      return sum + Math.max(0, rowCost);
    }, 0);

    // Acabados por cantidad:
    // Para cada fila: precio_para_esa_cantidad
    const finishesCost = input.finishes.reduce((sum, row) => {
      const price = row.pricesPerQty[qIdx] || 0;
      return sum + Math.max(0, price);
    }, 0);

    // Cierre comercial
    const totalCost = platesTotal + impressionsCost + papersCost + finishesCost;
    const unitCost = totalCost / validQty;

    // Utilidad sobre costo unitario
    const utilityAmount = unitCost * (utilityPercent / 100);

    // Comisión sobre costo unitario + utilidad
    const commissionAmount = (unitCost + utilityAmount) * (commissionPercent / 100);

    // Subtotal = (costo_unitario + utilidad + comisión) × cantidad
    const subtotal = (unitCost + utilityAmount + commissionAmount) * validQty;

    // IVA = subtotal × iva%
    const vatAmount = subtotal * (vatPercent / 100);

    // Total = subtotal + iva
    const total = subtotal + vatAmount;

    // Precio unitario = total / cantidad
    const unitPrice = total / validQty;

    return {
      quantity: validQty,
      platesCost: platesTotal,
      impressionsCost,
      papersCost,
      finishesCost,
      totalCost: Math.round(totalCost),
      unitCost: Math.round(unitCost * 100) / 100,
      utilityAmount: Math.round(utilityAmount * 100) / 100,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      subtotal: Math.round(subtotal),
      vatAmount: Math.round(vatAmount),
      total: Math.round(total),
      unitPrice: Math.round(unitPrice * 100) / 100,
    };
  });

  return {
    jobDescription: input.jobDescription || 'Trabajo Litográfico Manual',
    quantities: quantitiesResults,
    platesTotal,
    platesSubtotals,
  };
}
