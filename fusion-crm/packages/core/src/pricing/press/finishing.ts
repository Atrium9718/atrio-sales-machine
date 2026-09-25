import Decimal from 'decimal.js';
import {
  CostLine,
  FinishingTariffSnapshot,
  PressFinishingInput,
  TariffSnapshot,
} from './types';

export interface FinishingCalculationInput {
  finishing?: PressFinishingInput;
  quantity: Decimal;
  quantityIndex: number;
  sheetsPrinted: number;
  formatWidthCm: Decimal | number;
  formatHeightCm: Decimal | number;
  artWidthCm: Decimal | number;
  artHeightCm: Decimal | number;
  laminationUnitPrice?: Decimal | number;
  tariff: TariffSnapshot;
}

export interface FinishingCalculationResult {
  totalFinishingCost: Decimal;
  lines: CostLine[];
}

export function calculateFinishing(input: FinishingCalculationInput): FinishingCalculationResult {
  const {
    finishing,
    quantity,
    quantityIndex,
    sheetsPrinted,
    formatWidthCm,
    formatHeightCm,
    artWidthCm,
    artHeightCm,
    laminationUnitPrice,
    tariff,
  } = input;

  const lines: CostLine[] = [];
  let total = new Decimal(0);

  if (!finishing) {
    return { totalFinishingCost: total, lines };
  }

  const findTariff = (service: string): FinishingTariffSnapshot | undefined => {
    return tariff.finishings?.find((f) => f.service.toUpperCase() === service.toUpperCase());
  };

  const thousandsOfUnits = Math.ceil(new Decimal(quantity).div(1000).toNumber());

  // 1. CORTE (GUILLOTINA)
  if (finishing.cut && finishing.cut.runs > 0) {
    const t = findTariff('CORTE');
    const price = new Decimal(t?.price ?? 2000);
    const mode = t?.mode ?? 'PER_RUN';
    let cost = new Decimal(0);

    if (mode === 'PER_RUN') {
      cost = price.times(finishing.cut.runs);
    } else if (mode === 'MINIMUM') {
      cost = price;
    } else if (mode === 'PER_THOUSAND') {
      cost = price.times(thousandsOfUnits);
    }

    if (cost.gt(0)) {
      total = total.plus(cost);
      lines.push({
        key: 'finishing_cut',
        label: `Corte (${finishing.cut.label || 'Guillotina'} - ${finishing.cut.runs} bajadas)`,
        amount: cost,
      });
    }
  }

  // 2. DESPUNTE / TRIM
  if (finishing.trim && finishing.trim.runs > 0) {
    const t = findTariff('DESPUNTE');
    const price = new Decimal(t?.price ?? 1500);
    const mode = t?.mode ?? 'PER_RUN';
    let cost = new Decimal(0);

    if (mode === 'PER_RUN') {
      cost = price.times(finishing.trim.runs);
    } else if (mode === 'MINIMUM') {
      cost = price;
    } else if (mode === 'PER_THOUSAND') {
      cost = price.times(thousandsOfUnits);
    }

    if (cost.gt(0)) {
      total = total.plus(cost);
      lines.push({
        key: 'finishing_trim',
        label: `Despuntado (${finishing.trim.label || 'Esquinas'})`,
        amount: cost,
      });
    }
  }

  // 3. PERFORADO
  if (finishing.perforation && finishing.perforation.count > 0) {
    const t = findTariff('PERFORADO');
    const price = new Decimal(t?.price ?? 1500);
    const mode = t?.mode ?? 'PER_RUN';
    let cost = new Decimal(0);

    if (mode === 'PER_RUN') {
      cost = price.times(finishing.perforation.count);
    } else if (mode === 'MINIMUM') {
      cost = price;
    } else if (mode === 'PER_THOUSAND') {
      cost = price.times(thousandsOfUnits);
    }

    if (cost.gt(0)) {
      total = total.plus(cost);
      lines.push({
        key: 'finishing_perforation',
        label: `Perforado (${finishing.perforation.label || 'Huecos'})`,
        amount: cost,
      });
    }
  }

  // 4. ARGOLLADO (BINDING)
  if (finishing.binding && finishing.binding.loops > 0) {
    const t = findTariff('ARGOLLADO');
    const price = new Decimal(t?.price ?? 50); // Precio por anillo/anilla
    const cost = price.times(finishing.binding.loops).times(quantity);

    if (cost.gt(0)) {
      total = total.plus(cost);
      lines.push({
        key: 'finishing_binding',
        label: `Argollado (${finishing.binding.label || 'Doble O'} - ${finishing.binding.loops} pasos)`,
        amount: cost,
      });
    }
  }

  // 5. PLASTIFICADO / LAMINATION
  const lamMode = finishing.lamination?.mode ?? 'NONE';
  if (lamMode !== 'NONE') {
    const tLam = findTariff('PLASTIFICADO');
    const minCharge = new Decimal(tariff.laminationMinCharge ?? tLam?.minimumCharge ?? 65000);
    const ratePerM2 = new Decimal(tariff.laminationPricePerM2 ?? tLam?.pricePerM2 ?? 3500);

    // Precio unitario por bajada/hoja
    const uPrice = new Decimal(laminationUnitPrice ?? tLam?.price ?? 350);

    // Unidades mínimas para tarifa por m2
    const minUnits = uPrice.gt(0) ? minCharge.div(uPrice).ceil().toNumber() : 0;

    // Área en m2
    const formatAreaCm2 = new Decimal(formatWidthCm).times(new Decimal(formatHeightCm));
    const m2 = formatAreaCm2.times(sheetsPrinted).div(10000).ceil();
    const byM2 = m2.times(ratePerM2);

    let lamCost = new Decimal(0);

    if (lamMode === 'BOTH_FACES') {
      if (sheetsPrinted < minUnits) {
        lamCost = new Decimal(sheetsPrinted).times(uPrice);
      } else {
        lamCost = byM2;
      }
    } else if (lamMode === 'ONE_FACE_OF_TWO_PRINTED') {
      if (sheetsPrinted < minUnits) {
        lamCost = new Decimal(sheetsPrinted).div(2).times(uPrice);
      } else {
        lamCost = byM2.div(2);
      }
    }

    // Regla transversal: si el resultado es menor que el cargo mínimo y la cantidad supera minUnits, se cobra el mínimo
    if (sheetsPrinted >= minUnits && lamCost.lt(minCharge)) {
      lamCost = minCharge;
    }

    if (lamCost.gt(0)) {
      total = total.plus(lamCost);
      lines.push({
        key: 'finishing_lamination',
        label: `Plastificado (${lamMode === 'BOTH_FACES' ? '2 Caras' : '1 Cara'})`,
        amount: lamCost,
      });
    }
  }

  // 6. MEDIO CORTE (HALF CUT / STICKERS)
  if (finishing.halfCut) {
    const tHalf = findTariff('MEDIO_CORTE');
    const price = new Decimal(tHalf?.price ?? 15);
    const mode = finishing.halfCut.mode ?? tHalf?.mode ?? 'PER_LINEAR_CM';
    let halfCost = new Decimal(0);

    if (mode === 'PER_LINEAR_CM') {
      const linear = new Decimal(finishing.halfCut.linearCm ?? 0);
      halfCost = linear.times(price).times(sheetsPrinted);
    } else if (mode === 'PER_CM2') {
      const artArea = new Decimal(artWidthCm).times(new Decimal(artHeightCm));
      halfCost = artArea.times(quantity).times(price);
    }

    if (halfCost.gt(0)) {
      total = total.plus(halfCost);
      lines.push({
        key: 'finishing_half_cut',
        label: `Medio Corte (${finishing.halfCut.label || 'Trazado'})`,
        amount: halfCost,
      });
    }
  }

  // 7. TROQUELADO (DIE CUT)
  if (finishing.dieCut && new Decimal(finishing.dieCut.price).gt(0)) {
    const dieCost = new Decimal(finishing.dieCut.price);
    total = total.plus(dieCost);
    lines.push({
      key: 'finishing_die_cut',
      label: `Troquelado (${finishing.dieCut.label || 'Troquel personalizado'})`,
      amount: dieCost,
    });
  }

  // 8. OTROS ACABADOS (3 LÍNEAS LIBRES)
  if (finishing.others && Array.isArray(finishing.others)) {
    finishing.others.slice(0, 3).forEach((other, idx) => {
      const priceForQty = other.prices?.[quantityIndex];
      if (priceForQty !== undefined && priceForQty !== null) {
        const otherCost = new Decimal(priceForQty);
        if (otherCost.gt(0)) {
          total = total.plus(otherCost);
          lines.push({
            key: `finishing_other_${idx + 1}`,
            label: other.label || `Otro acabado ${idx + 1}`,
            amount: otherCost,
          });
        }
      }
    });
  }

  return {
    totalFinishingCost: total,
    lines,
  };
}
