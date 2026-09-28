import Decimal from 'decimal.js';
import {
  CostLine,
  LithoFormatTariffSnapshot,
  PaperTariffItemSnapshot,
  PressLithoInput,
  PressQuoteInput,
  PressQuoteWarning,
  QuantityResult,
  SheetCutSnapshot,
  SheetCutSizeSnapshot,
  TariffSnapshot,
} from './types';
import { calculateArtDimensions, calculateImposition } from './imposition';
import { calculateFinishing } from './finishing';
import { resolveClientDiscountRate, resolveVatRate } from './digital';

export function formatLithoProductionSpec(
  input: PressQuoteInput,
  cutSize: SheetCutSizeSnapshot,
  plateCount: number,
  paperSheets: number,
  imposition: number
): string {
  const parts: string[] = [];
  const litho = input.litho!;

  parts.push(`Dimensiones: ${input.artWidthCm} x ${input.artHeightCm}`);

  if (input.finishing?.cut && input.finishing.cut.runs > 0) {
    parts.push(`Corte: ${input.finishing.cut.label || 'Guillotina'}`);
  }
  if (input.finishing?.trim && input.finishing.trim.runs > 0) {
    parts.push(`Despuntado: ${input.finishing.trim.label || 'Esquinas'}`);
  }
  if (input.finishing?.perforation && input.finishing.perforation.count > 0) {
    parts.push(`Perforado: ${input.finishing.perforation.label || 'Huecos'}`);
  }
  if (input.finishing?.binding && input.finishing.binding.loops > 0) {
    parts.push(`Argollado: ${input.finishing.binding.label || 'Doble O'}`);
  }
  if (input.finishing?.lamination && input.finishing.lamination.mode !== 'NONE') {
    parts.push(
      `Plastificado: ${input.finishing.lamination.mode === 'BOTH_FACES' ? '2 Caras' : '1 Cara'}`
    );
  }
  if (input.finishing?.halfCut) {
    parts.push(`Medio corte: ${input.finishing.halfCut.label || 'Trazado'}`);
  }
  if (input.finishing?.dieCut && new Decimal(input.finishing.dieCut.price).gt(0)) {
    parts.push(`Troquelado: ${input.finishing.dieCut.label || 'Troquel'}`);
  }
  if (input.finishing?.others && input.finishing.others.length > 0) {
    const otherLabels = input.finishing.others
      .map((o) => o.label)
      .filter(Boolean)
      .join(', ');
    if (otherLabels) {
      parts.push(`Otros acabados: ${otherLabels}`);
    }
  }

  parts.push(`Tintas: ${litho.inkSetCode}`);

  const sheetNameFormatted = litho.sheetFormat === 'S70X100' ? '70*100' : '60*90';
  parts.push(
    `Montaje: Pliego de ${sheetNameFormatted} con corte de ${litho.sheetCutCode} a ${cutSize.widthCm}x${cutSize.heightCm}`
  );

  const backingStr = litho.plateBacking ? ' con volteo' : '';
  parts.push(`Plancha: ${litho.plateFormatName}${backingStr}`);
  parts.push(`Planchas: ${plateCount}`);

  // Formato de pliegos con separador de miles
  const sheetsFormatted = paperSheets
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  parts.push(`Pliegos: ${sheetsFormatted}`);
  parts.push(`Cabida: ${imposition}`);

  return parts.join(' | ');
}

export function calculateLithoQuote(
  input: PressQuoteInput,
  warnings: PressQuoteWarning[]
): QuantityResult[] {
  const results: QuantityResult[] = [];
  if (!input.litho) {
    return results;
  }

  const { tariff } = input;
  const litho = input.litho;

  // 1. Validar formato de plancha
  const plateFormat = tariff.lithoFormats.find(
    (f) => f.plateFormatName.toLowerCase() === litho.plateFormatName.toLowerCase()
  );
  if (!plateFormat) {
    warnings.push({
      code: 'LITHO_FORMAT_NOT_FOUND',
      message: `El formato de plancha "${litho.plateFormatName}" no se encuentra en el tarifario.`,
    });
    return results;
  }

  // 2. Validar corte de pliego
  const sheetCut = tariff.sheetCuts.find((c) => c.code === litho.sheetCutCode);
  if (!sheetCut) {
    warnings.push({
      code: 'SHEET_CUT_NOT_FOUND',
      message: `El corte de pliego "${litho.sheetCutCode}" no está configurado.`,
    });
    return results;
  }

  const cutSize = sheetCut.sizes.find((s) => s.sheetFormat === litho.sheetFormat);
  if (!cutSize) {
    warnings.push({
      code: 'SHEET_CUT_SIZE_NOT_FOUND',
      message: `No hay medidas definidas para el corte "${litho.sheetCutCode}" en pliego ${litho.sheetFormat}.`,
    });
    return results;
  }

  // 3. Validar papel y precio
  const paper = tariff.papers.find(
    (p) =>
      p.name.toLowerCase() === litho.paperName.toLowerCase() &&
      p.sheetFormat === litho.sheetFormat
  );
  if (!paper || new Decimal(paper.pricePerSheet).lte(0)) {
    warnings.push({
      code: 'NO_PAPER_PRICE',
      message: `No hay precio de papel para "${litho.paperName}" en formato ${litho.sheetFormat}.`,
    });
    return results;
  }

  // 4. Determinar tintas y planchas
  const inkSet = tariff.inkSets.find((i) => i.code.toUpperCase() === litho.inkSetCode.toUpperCase());
  const platesByInk = inkSet ? inkSet.plates : 4;

  // 5. Dimensiones de arte y cabida
  const { w: artW, h: artH } = calculateArtDimensions(
    input.artWidthCm,
    input.artHeightCm,
    input.applyBleed,
    tariff.bleedCm
  );

  const grip = new Decimal(tariff.gripMarginCm);
  const cutUsefulW = new Decimal(cutSize.widthCm).minus(grip);
  const cutUsefulH = new Decimal(cutSize.heightCm).minus(grip);

  const impResult = calculateImposition(cutUsefulW, cutUsefulH, artW, artH);
  if (impResult.warning) {
    warnings.push(impResult.warning);
    return results;
  }
  const imposition = impResult.imposition;
  if (imposition <= 0) {
    return results;
  }

  // 6. Cálculo de planchas
  const pages = input.pagesPerUnit;
  const platesByPages = pages ? Math.ceil((pages * platesByInk) / imposition) : 0;

  let calculatedPlateCount: number;
  if (pages) {
    calculatedPlateCount = platesByPages;
  } else {
    calculatedPlateCount = Math.ceil(litho.plateBacking ? platesByInk / 2 : platesByInk);
  }

  const plateCount = litho.manualPlateCount !== null && litho.manualPlateCount !== undefined
    ? litho.manualPlateCount
    : calculatedPlateCount;

  const plateCost = new Decimal(plateCount).times(plateFormat.plateUnitPrice);

  // 7. Mácula (wastage)
  // wastage = wastageSheets * ( plateCount / platesByInk )
  const wastageSheets = litho.wastageSheets ?? tariff.defaultWastageSheets ?? 200;
  const wastageFactor = platesByInk > 0 ? plateCount / platesByInk : 1;
  const wastage = wastageSheets * wastageFactor;

  // 8. Cálculo por cada cantidad
  input.quantities.forEach((rawQty, qtyIdx) => {
    if (rawQty === null || rawQty === undefined) return;
    const q = new Decimal(rawQty);
    if (q.lte(0)) return;

    if (!q.isInteger()) {
      warnings.push({
        code: 'INVALID_QUANTITY_DECIMAL',
        message: `La cantidad ${q.toString()} tiene decimales y ha sido rechazada.`,
        quantityIndex: qtyIdx,
      });
      return;
    }

    // sheetsNeeded(q) = ceil( ( pagesPerUnit ? q * pagesPerUnit : q ) / imposition + wastage )
    const baseItems = pages ? q.times(pages) : q;
    const sheetsNeeded = baseItems.div(imposition).plus(wastage).ceil().toNumber();

    // thousands(q) = ceil( ( q / ( plateBacking ? imposition / 2 : imposition ) ) / 1000 ) * plateCount
    const effectiveImposition = litho.plateBacking ? imposition / 2 : imposition;
    const thousands = Math.ceil(q.div(effectiveImposition).div(1000).toNumber()) * plateCount;
    const pressCost = new Decimal(thousands).times(plateFormat.pressPricePerThousand);

    // paperSheets(q) = ceil( sheetsNeeded(q) / SheetCut.divisor )
    const paperSheets = Math.ceil(sheetsNeeded / sheetCut.divisor);
    const paperCost = new Decimal(paperSheets).times(paper.pricePerSheet);

    // Acabados
    const finishingResult = calculateFinishing({
      finishing: input.finishing,
      quantity: q,
      quantityIndex: qtyIdx,
      sheetsPrinted: sheetsNeeded,
      formatWidthCm: cutSize.widthCm,
      formatHeightCm: cutSize.heightCm,
      artWidthCm: input.artWidthCm,
      artHeightCm: input.artHeightCm,
      tariff,
    });

    // SUBTOTAL_1 = acabados(q) + plateCost + pressCost(q) + paperCost(q)
    const subtotal1 = finishingResult.totalFinishingCost
      .plus(plateCost)
      .plus(pressCost)
      .plus(paperCost);

    // Margen / Utilidad
    const marginPercent = new Decimal(litho.marginPercent ?? tariff.defaultLithoMarginPercent ?? 0.3);
    const margin = subtotal1.times(marginPercent);

    // SUBTOTAL_2 = SUBTOTAL_1 + margin
    const subtotal2 = subtotal1.plus(margin);

    // Descuentos (en litografía se aplican DESPUÉS del margen y sobre SUBTOTAL_2)
    const clientDiscountPercent = resolveClientDiscountRate(input.commercial.clientDiscountLabel);
    const otherDiscountPercent = new Decimal(input.commercial.otherDiscountPercent ?? 0);

    const clientDiscount = subtotal2.times(clientDiscountPercent);
    const otherDiscount = subtotal2.times(otherDiscountPercent);
    const totalDiscounts = clientDiscount.plus(otherDiscount);

    // SUBTOTAL_3 = SUBTOTAL_2 - clientDiscount - otherDiscount
    const subtotal3 = subtotal2.minus(totalDiscounts);

    // Comisión comercial
    const commissionPercent = new Decimal(input.commercial.salesCommissionPercent ?? 0);
    const commission = subtotal3.times(commissionPercent);

    // SUBTOTAL_F = SUBTOTAL_3 + commission
    const subtotalF = subtotal3.plus(commission);

    // Impuestos
    const vatRate = resolveVatRate(input.commercial.vatLabel);
    const vat = subtotalF.times(vatRate);

    const otherTaxRate = new Decimal(input.commercial.otherTaxPercent ?? 0);
    const otherTaxes = subtotalF.times(otherTaxRate);

    // TOTAL = SUBTOTAL_F + vat + otherTaxes
    const rawTotal = subtotalF.plus(vat).plus(otherTaxes);
    const finalTotal = rawTotal.round(); // Redondeo a peso una sola vez al final
    const unitPrice = finalTotal.div(q).round();
    const unitPriceBeforeTax = subtotalF.div(q);

    // Costo interno lito = SUBTOTAL_1
    const internalCost = subtotal1;
    const realMarginPercent = internalCost.gt(0) ? margin.div(internalCost) : new Decimal(0);

    const lines: CostLine[] = [
      {
        key: 'plates',
        label: `Planchas CTP (${plateCount} planchas - ${plateFormat.plateFormatName})`,
        amount: plateCost,
      },
      {
        key: 'paper',
        label: `Papel (${paperSheets} pliegos de ${paper.name} ${litho.sheetFormat})`,
        amount: paperCost,
      },
      {
        key: 'press',
        label: `Tiro de Prensa (${thousands} millares/golpes)`,
        amount: pressCost,
      },
      ...finishingResult.lines,
      {
        key: 'margin',
        label: `Margen / Utilidad (${marginPercent.times(100).toFixed(1)}%)`,
        amount: margin,
      },
    ];

    if (totalDiscounts.gt(0)) {
      lines.push({
        key: 'discounts',
        label: `Descuentos (${input.commercial.clientDiscountLabel || 'Comercial'})`,
        amount: totalDiscounts.negated(),
      });
    }
    if (commission.gt(0)) {
      lines.push({
        key: 'commission',
        label: `Comisión de ventas (${commissionPercent.times(100).toFixed(1)}%)`,
        amount: commission,
      });
    }
    if (vat.gt(0)) {
      lines.push({
        key: 'vat',
        label: `IVA (${input.commercial.vatLabel})`,
        amount: vat,
      });
    }
    if (otherTaxes.gt(0)) {
      lines.push({
        key: 'other_taxes',
        label: 'Otros impuestos',
        amount: otherTaxes,
      });
    }

    const productionSpec = formatLithoProductionSpec(
      input,
      cutSize,
      plateCount,
      paperSheets,
      imposition
    );

    results.push({
      quantity: q,
      impositionPerSheet: imposition,
      sheetsPrinted: sheetsNeeded,
      plateCount,
      paperSheets,
      lines,
      subtotalBeforeMargin: subtotal1,
      margin,
      discounts: totalDiscounts,
      commission,
      taxableBase: subtotalF,
      vat,
      otherTaxes,
      total: finalTotal,
      unitPrice,
      unitPriceBeforeTax,
      internalCost,
      marginPercent: realMarginPercent,
      productionSpec,
    });
  });

  return results;
}
