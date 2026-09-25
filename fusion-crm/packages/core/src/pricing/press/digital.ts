import Decimal from 'decimal.js';
import {
  CostLine,
  DigitalFormatTariffSnapshot,
  DigitalVolumeTierSnapshot,
  PressDigitalInput,
  PressQuoteInput,
  PressQuoteWarning,
  QuantityResult,
  TariffSnapshot,
} from './types';
import { calculateArtDimensions, calculateImposition } from './imposition';
import { calculateFinishing } from './finishing';

export function resolveVatRate(vatLabel: string): Decimal {
  if (!vatLabel) return new Decimal(0);
  const clean = vatLabel.trim().toLowerCase();
  if (clean.includes('no gravado') || clean.includes('exento') || clean === '0%') {
    return new Decimal(0);
  }
  if (clean.includes('no incluido') || clean.includes('19%') || clean.includes('19 %')) {
    return new Decimal(0.19);
  }
  if (clean.includes('iva incluido')) {
    return new Decimal(0);
  }
  const match = clean.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) {
    return new Decimal(match[1]).div(100);
  }
  return new Decimal(0);
}

export function resolveClientDiscountRate(discountLabel: string): Decimal {
  if (!discountLabel) return new Decimal(0);
  const clean = discountLabel.trim().toLowerCase();
  if (clean.includes('colegas') || clean.includes('colega')) {
    return new Decimal(0.10);
  }
  if (clean.includes('estudiantes') || clean.includes('estudiante')) {
    return new Decimal(0.05);
  }
  if (clean.includes('ninguno') || clean === '0%') {
    return new Decimal(0);
  }
  const match = clean.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) {
    return new Decimal(match[1]).div(100);
  }
  return new Decimal(0);
}

export function findVolumeTier(
  tiers: DigitalVolumeTierSnapshot[] | undefined,
  sheetsPrinted: number
): DigitalVolumeTierSnapshot | undefined {
  if (!tiers || tiers.length === 0) return undefined;
  return tiers.find((tier) => {
    const min = tier.minSheets;
    const max = tier.maxSheets;
    if (sheetsPrinted < min) return false;
    if (max !== null && max !== undefined && sheetsPrinted > max) return false;
    return true;
  });
}

export function formatDigitalProductionSpec(
  input: PressQuoteInput,
  format: DigitalFormatTariffSnapshot,
  imposition: number,
  sheetsPrinted: number
): string {
  const parts: string[] = [];

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
    parts.push(`Medio corte: ${input.finishing.halfCut.label || 'Stickers'}`);
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

  parts.push(`Formato: ${format.formatName}`);
  parts.push(`Tintas: ${input.digital?.inkMode || 'COLOR'}`);
  parts.push(`Cabida: ${imposition}`);
  parts.push(`Hojas impresas: ${sheetsPrinted}`);
  parts.push(`IMPRESIÓN DIGITAL`);

  return parts.join(' | ');
}

export function calculateDigitalQuote(
  input: PressQuoteInput,
  warnings: PressQuoteWarning[]
): QuantityResult[] {
  const results: QuantityResult[] = [];
  if (!input.digital) {
    return results;
  }

  const { tariff } = input;
  const format = tariff.digitalFormats.find(
    (f) => f.formatName.toLowerCase() === input.digital!.formatName.toLowerCase()
  );

  if (!format) {
    warnings.push({
      code: 'DIGITAL_FORMAT_NOT_FOUND',
      message: `El formato digital "${input.digital.formatName}" no se encuentra en el tarifario.`,
    });
    return results;
  }

  // Dimensiones del arte con sangrado
  const { w: artW, h: artH } = calculateArtDimensions(
    input.artWidthCm,
    input.artHeightCm,
    input.applyBleed,
    tariff.bleedCm
  );

  // Dimensiones útiles del formato digital (menos margen de pinza)
  const grip = new Decimal(tariff.gripMarginCm);
  const sheetW = new Decimal(format.widthCm).minus(grip);
  const sheetH = new Decimal(format.heightCm).minus(grip);

  const impResult = calculateImposition(sheetW, sheetH, artW, artH);
  if (impResult.warning) {
    warnings.push(impResult.warning);
    return results;
  }
  const imposition = impResult.imposition;
  if (imposition <= 0) {
    return results;
  }

  const sidesFactor = input.digital.inkMode.includes('BOTH_SIDES') ? 2 : 1;

  input.quantities.forEach((rawQty, qtyIdx) => {
    if (rawQty === null || rawQty === undefined) return;
    const q = new Decimal(rawQty);
    if (q.lte(0)) return;

    if (!q.isInteger()) {
      warnings.push({
        code: 'INVALID_QUANTITY_DECIMAL',
        message: `La cantidad ${q.toString()} tiene decimales y ha sido omitida. Las cantidades deben ser enteras.`,
        quantityIndex: qtyIdx,
      });
      return;
    }

    // sheetsPrinted(q) = ceil( ( pagesPerUnit ? q * pagesPerUnit : q ) / imposition * sidesFactor )
    const totalPages = input.pagesPerUnit ? q.times(input.pagesPerUnit) : q;
    const sheetsPrinted = totalPages.div(imposition).times(sidesFactor).ceil().toNumber();

    // Buscar tramo de escala de volumen
    let unitSheetPrice: Decimal;
    const tier = findVolumeTier(format.volumeTiers, sheetsPrinted);

    if (tier) {
      unitSheetPrice = new Decimal(tier.unitPrice);
    } else {
      if (!format.volumeTiers || format.volumeTiers.length === 0) {
        warnings.push({
          code: 'NO_VOLUME_TIER',
          message: `El formato digital ${format.formatName} no tiene tramos de escala configurados. Se utiliza precio de lista base.`,
          quantityIndex: qtyIdx,
        });
      }
      // Precio de respaldo nunca cero
      unitSheetPrice = new Decimal(format.price4x0 || format.price1x0 || 1500);
    }

    const printing = unitSheetPrice.times(sheetsPrinted);

    // Acabados
    const finishingResult = calculateFinishing({
      finishing: input.finishing,
      quantity: q,
      quantityIndex: qtyIdx,
      sheetsPrinted,
      formatWidthCm: format.widthCm,
      formatHeightCm: format.heightCm,
      artWidthCm: input.artWidthCm,
      artHeightCm: input.artHeightCm,
      laminationUnitPrice: format.laminationUnitPrice,
      tariff,
    });

    // Descuentos comerciales (se aplican ANTES de acabados y sobre la impresión)
    const clientDiscountPercent = resolveClientDiscountRate(input.commercial.clientDiscountLabel);
    const otherDiscountPercent = new Decimal(input.commercial.otherDiscountPercent ?? 0);

    const clientDiscount = printing.times(clientDiscountPercent);
    const otherDiscount = printing.times(otherDiscountPercent);
    const totalDiscounts = clientDiscount.plus(otherDiscount);

    // SUBTOTAL_1 = printing - clientDiscount - otherDiscount
    const subtotal1 = printing.minus(totalDiscounts);

    // SUBTOTAL_2 = SUBTOTAL_1 + acabados(q)
    const subtotal2 = subtotal1.plus(finishingResult.totalFinishingCost);

    // commission = SUBTOTAL_2 * salesCommissionPercent
    const commissionPercent = new Decimal(input.commercial.salesCommissionPercent ?? 0);
    const commission = subtotal2.times(commissionPercent);

    // SUBTOTAL_3 = SUBTOTAL_2 + commission
    const subtotal3 = subtotal2.plus(commission);

    // Impuestos
    const vatRate = resolveVatRate(input.commercial.vatLabel);
    const vat = subtotal3.times(vatRate);

    const otherTaxRate = new Decimal(input.commercial.otherTaxPercent ?? 0);
    const otherTaxes = subtotal3.times(otherTaxRate);

    // TOTAL = SUBTOTAL_3 + vat + otherTaxes
    const rawTotal = subtotal3.plus(vat).plus(otherTaxes);
    const finalTotal = rawTotal.round(); // Redondeo a peso una sola vez al final
    const unitPrice = finalTotal.div(q).round();
    const unitPriceBeforeTax = subtotal3.div(q);

    // Costo interno digital = printing + acabados (sin comisión ni impuestos)
    const internalCost = printing.plus(finishingResult.totalFinishingCost);

    const lines: CostLine[] = [
      {
        key: 'printing_digital',
        label: `Impresión Digital (${format.formatName} - ${sheetsPrinted} bajadas)`,
        amount: printing,
      },
      ...finishingResult.lines,
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

    const productionSpec = formatDigitalProductionSpec(input, format, imposition, sheetsPrinted);

    results.push({
      quantity: q,
      impositionPerSheet: imposition,
      sheetsPrinted,
      plateCount: null,
      paperSheets: null,
      lines,
      subtotalBeforeMargin: printing.plus(finishingResult.totalFinishingCost),
      margin: new Decimal(0),
      discounts: totalDiscounts,
      commission,
      taxableBase: subtotal3,
      vat,
      otherTaxes,
      total: finalTotal,
      unitPrice,
      unitPriceBeforeTax,
      internalCost,
      marginPercent: new Decimal(0),
      productionSpec,
    });
  });

  return results;
}
