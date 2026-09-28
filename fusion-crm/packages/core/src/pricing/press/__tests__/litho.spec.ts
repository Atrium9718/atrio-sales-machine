import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateLithoQuote, formatLithoProductionSpec } from '../litho';
import { createBaseQuoteInput, MOCK_TARIFF_SNAPSHOT } from './fixtures';
import { PressQuoteWarning } from '../types';

describe('Motor de Costeo Litográfico (litho.ts)', () => {
  it('prueba 7: caso litográfico completo con 8 planchas, mácula 200 y cabida 4', () => {
    // 4X4 -> 8 planchas
    // Arte 14x21 en corte .1/4 de S70X100 (50x35 -> útil 49x34 -> cabida 4)
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(1000), new Decimal(5000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
        marginPercent: new Decimal(0.3),
        wastageSheets: 200,
      },
      commercial: {
        vatLabel: '19%',
        clientDiscountLabel: 'Ninguno',
        salesCommissionPercent: new Decimal(0),
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateLithoQuote(input, warnings);

    expect(warnings.length).toBe(0);
    expect(results.length).toBe(2);

    const r1000 = results[0];
    expect(r1000.impositionPerSheet).toBe(4);
    expect(r1000.plateCount).toBe(8);

    // Planchas: 8 * 18.000 = 144.000
    const plateLine = r1000.lines.find((l) => l.key === 'plates');
    expect(plateLine?.amount.toNumber()).toBe(144000);

    // sheetsNeeded = ceil(1000 / 4 + 200) = 450 hojas de corte
    // paperSheets = ceil(450 / 4) = 113 pliegos enteros
    // paperCost = 113 * 650 = 73.450
    expect(r1000.paperSheets).toBe(113);
    const paperLine = r1000.lines.find((l) => l.key === 'paper');
    expect(paperLine?.amount.toNumber()).toBe(73450);

    // thousands = ceil( (1000 / 4) / 1000 ) * 8 = 1 * 8 = 8 millares
    // pressCost = 8 * 22.000 = 176.000
    const pressLine = r1000.lines.find((l) => l.key === 'press');
    expect(pressLine?.amount.toNumber()).toBe(176000);

    // Subtotal 1 (costo interno) = 144.000 + 73.450 + 176.000 = 393.450
    expect(r1000.subtotalBeforeMargin.toNumber()).toBe(393450);
    expect(r1000.internalCost.toNumber()).toBe(393450);

    // Margen 30% = 393.450 * 0.3 = 118.035
    expect(r1000.margin.toNumber()).toBe(118035);

    // Subtotal 2 = 393.450 + 118.035 = 511.485
    // IVA 19% = 511.485 * 0.19 = 97.182,15
    // Total redondeado = 608.667
    expect(r1000.total.toNumber()).toBe(608667);
  });

  it('prueba 16: volteo activado divide a la mitad las planchas y ajusta la cabida efectiva', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: true, // Volteo activado
        marginPercent: new Decimal(0.3),
        wastageSheets: 200,
      },
      commercial: {
        vatLabel: 'No gravado',
        clientDiscountLabel: 'Ninguno',
      },
    });

    const [r] = calculateLithoQuote(input, []);
    // 4X4 tiene 8 tintas base -> con volteo = ceil(8 / 2) = 4 planchas
    expect(r.plateCount).toBe(4);
    // Costo planchas: 4 * 18.000 = 72.000
    const plateLine = r.lines.find((l) => l.key === 'plates');
    expect(plateLine?.amount.toNumber()).toBe(72000);
    expect(r.productionSpec).toContain('con volteo');
  });

  it('prueba 17: número manual de planchas prevalece sobre el calculado', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
        manualPlateCount: 2, // Forzado manualmente a 2
        marginPercent: new Decimal(0.3),
      },
    });

    const [r] = calculateLithoQuote(input, []);
    expect(r.plateCount).toBe(2);
    const plateLine = r.lines.find((l) => l.key === 'plates');
    expect(plateLine?.amount.toNumber()).toBe(36000); // 2 * 18.000
  });

  it('prueba 14: papel sin precio en el pliego elegido genera advertencia NO_PAPER_PRICE y detiene cálculo', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      litho: {
        sheetFormat: 'S60X90',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Maule Calibre 12', // No existe en S60X90 en el mock
        plateBacking: false,
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateLithoQuote(input, warnings);

    expect(warnings.some((w) => w.code === 'NO_PAPER_PRICE')).toBe(true);
    expect(results.length).toBe(0);
  });

  it('aplica descuentos comerciales DESPUÉS del margen en flujo litográfico', () => {
    // Subtotal 1 = 393.450
    // Margen 30% = 118.035
    // Subtotal 2 = 511.485
    // Descuento Colegas 10% sobre Subtotal 2 = 51.148,5
    // Subtotal 3 = 511.485 - 51.148,5 = 460.336,5
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
        marginPercent: new Decimal(0.3),
        wastageSheets: 200,
      },
      commercial: {
        vatLabel: 'No gravado',
        clientDiscountLabel: 'Colegas', // 10%
      },
    });

    const [r] = calculateLithoQuote(input, []);
    expect(r.margin.toNumber()).toBe(118035);
    expect(r.discounts.toNumber()).toBe(51148.5);
    expect(r.total.toNumber()).toBe(460337); // redondeado a peso
  });

  it('genera la ficha de producción litográfica con la secuencia y separadores requeridos', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(1000)],
      finishing: {
        cut: { runs: 2, label: 'Corte guillotina' },
      },
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
      },
    });

    const [r] = calculateLithoQuote(input, []);
    expect(r.productionSpec).toContain('Dimensiones: 14 x 21');
    expect(r.productionSpec).toContain('Corte: Corte guillotina');
    expect(r.productionSpec).toContain('Tintas: 4X4');
    expect(r.productionSpec).toContain('Montaje: Pliego de 70*100 con corte de .1/4 a 50x35');
    expect(r.productionSpec).toContain('Planchas: 8');
    expect(r.productionSpec).toContain('Cabida: 4');
  });

  it('omite campos vacíos en la ficha de producción', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
      },
      // Sin acabados
    });

    const [r] = calculateLithoQuote(input, []);
    expect(r.productionSpec).not.toContain('Corte:');
    expect(r.productionSpec).not.toContain('Plastificado:');
    expect(r.productionSpec).not.toContain('Argollado:');
  });
});
