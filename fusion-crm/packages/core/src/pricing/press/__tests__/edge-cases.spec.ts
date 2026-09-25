import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculatePressQuote } from '../index';
import { calculateImposition } from '../imposition';
import { calculateFinishing } from '../finishing';
import { calculateWideFormat, mround } from '../wide-format';
import { createBaseQuoteInput, MOCK_TARIFF_SNAPSHOT } from './fixtures';

describe('Casos de Borde y Escenarios Avanzados (edge-cases.spec.ts)', () => {
  it('multilibro / páginas por unidad en Digital multiplica hojas impresas por pagesPerUnit', () => {
    // 50 folletos de 8 páginas cada uno. Arte 14x21 (cabida 2 en carta útil 22x32)
    // Total páginas = 50 * 8 = 400.
    // sheetsPrinted = ceil(400 / 2) = 200 hojas.
    const input = createBaseQuoteInput({
      quantities: [new Decimal(50)],
      pagesPerUnit: 8,
      digital: {
        formatName: 'Carta',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    expect(item.sheetsPrinted).toBe(200);
  });

  it('multilibro / páginas por unidad en Litografía calcula platesByPages', () => {
    // pagesPerUnit = 16, inkSet = 4X4 (8 tintas), cabida = 4
    // platesByPages = ceil(16 * 8 / 4) = 32 planchas
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      pagesPerUnit: 16,
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
      },
    });

    const res = calculatePressQuote(input);
    const item = res.litho![0];
    expect(item.plateCount).toBe(32);
  });

  it('calcula correctamente con corte de pliego a .1/2', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(20),
      artHeightCm: new Decimal(30),
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/2',
        plateFormatName: '1/2 (74 x 54 cm)',
        inkSetCode: '4X0',
        paperName: 'Propalcote 150g',
        plateBacking: false,
      },
    });

    const res = calculatePressQuote(input);
    expect(res.litho).toBeDefined();
    expect(res.litho![0].plateCount).toBe(4);
    expect(res.litho![0].productionSpec).toContain('.1/2');
  });

  it('calcula correctamente con corte de pliego a .1/8', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      artWidthCm: new Decimal(8),
      artHeightCm: new Decimal(10),
      quantities: [new Decimal(2000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/8',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '1X0',
        paperName: 'Bond 75g',
        plateBacking: false,
      },
    });

    const res = calculatePressQuote(input);
    expect(res.litho).toBeDefined();
    expect(res.litho![0].plateCount).toBe(1);
    expect(res.litho![0].productionSpec).toContain('.1/8');
  });

  it('soporta tintas monócromas 1X0 y 1X1 en litografía', () => {
    const input1x0 = createBaseQuoteInput({
      technique: 'LITHO',
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '1X0',
        paperName: 'Bond 75g',
        plateBacking: false,
      },
    });

    const res1x0 = calculatePressQuote(input1x0);
    expect(res1x0.litho![0].plateCount).toBe(1);

    const input1x1 = createBaseQuoteInput({
      technique: 'LITHO',
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '1X1',
        paperName: 'Bond 75g',
        plateBacking: false,
      },
    });

    const res1x1 = calculatePressQuote(input1x1);
    expect(res1x1.litho![0].plateCount).toBe(2);
  });

  it('aplica mácula personalizada cuando se especifica en el input', () => {
    const inputCustomWastage = createBaseQuoteInput({
      technique: 'LITHO',
      quantities: [new Decimal(1000)],
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
        wastageSheets: 500, // custom wastage
      },
    });

    const res = calculatePressQuote(inputCustomWastage);
    // sheetsNeeded = ceil(1000 / 4 + 500) = 750
    // paperSheets = ceil(750 / 4) = 188 pliegos
    expect(res.litho![0].paperSheets).toBe(188);
  });

  it('maneja múltiples acabados simultáneamente sumando cada concepto al desglose', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(500)],
      finishing: {
        cut: { runs: 2, label: 'Corte perimetral' },
        trim: { runs: 4, label: 'Despunte 4 esquinas' },
        perforation: { count: 2, label: '2 Perforaciones' },
        binding: { loops: 5, label: 'Argollado' },
        lamination: { mode: 'BOTH_FACES' },
        dieCut: { price: new Decimal(25000), label: 'Troquel' },
      },
    });

    const res = calculatePressQuote(input);
    const lines = res.digital![0].lines;
    expect(lines.some((l) => l.key === 'finishing_cut')).toBe(true);
    expect(lines.some((l) => l.key === 'finishing_trim')).toBe(true);
    expect(lines.some((l) => l.key === 'finishing_perforation')).toBe(true);
    expect(lines.some((l) => l.key === 'finishing_binding')).toBe(true);
    expect(lines.some((l) => l.key === 'finishing_lamination')).toBe(true);
    expect(lines.some((l) => l.key === 'finishing_die_cut')).toBe(true);
  });

  it('verifica que unitPriceBeforeTax sea exactamente taxableBase dividido por cantidad', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(200)],
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    const calculatedUnitPriceBeforeTax = item.taxableBase.div(200);
    expect(item.unitPriceBeforeTax.toNumber()).toBeCloseTo(calculatedUnitPriceBeforeTax.toNumber(), 4);
  });

  it('soporta margen de utilidad 0% en litografía', () => {
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
        marginPercent: new Decimal(0),
      },
      commercial: {
        vatLabel: 'No gravado',
      },
    });

    const res = calculatePressQuote(input);
    expect(res.litho![0].margin.toNumber()).toBe(0);
    expect(res.litho![0].total.toNumber()).toBe(res.litho![0].subtotalBeforeMargin.round().toNumber());
  });

  it('soporta margen de utilidad del 50% en litografía', () => {
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
        marginPercent: new Decimal(0.5),
      },
      commercial: {
        vatLabel: 'No gravado',
      },
    });

    const res = calculatePressQuote(input);
    const item = res.litho![0];
    expect(item.margin.toNumber()).toBe(item.subtotalBeforeMargin.times(0.5).toNumber());
  });

  it('aplica otherTaxes y otherDiscountPercent cuando se definen', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        clientDiscountLabel: 'Ninguno',
        otherDiscountPercent: new Decimal(0.05), // 5% extra discount
        otherTaxPercent: new Decimal(0.02), // 2% reteica / other tax
        vatLabel: 'No gravado',
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    expect(item.discounts.toNumber()).toBeGreaterThan(0);
    expect(item.otherTaxes.toNumber()).toBeGreaterThan(0);
    expect(item.lines.some((l) => l.key === 'other_taxes')).toBe(true);
  });

  it('imposición con arte que cabe exactamente una sola vez', () => {
    const res = calculateImposition(22, 32, 22, 32);
    expect(res.imposition).toBe(1);
  });

  it('imposición con arte mínimo cabe múltiples veces (ej. 2x2 en 20x20)', () => {
    const res = calculateImposition(20, 20, 2, 2);
    expect(res.imposition).toBe(100);
  });

  it('mround redondea hacia arriba exactamente en .5 del múltiplo', () => {
    expect(mround(250, 100).toNumber()).toBe(300);
    expect(mround(249.99, 100).toNumber()).toBe(200);
    expect(mround(250.01, 100).toNumber()).toBe(300);
  });

  it('wide-format maneja múltiplos personalizados de redondeo', () => {
    const res = calculateWideFormat({
      linearCm: 10,
      pricePerMeter: 50000,
      clientType: 'FINAL',
      roundToNearest: 1000,
    });
    // 10 cm * 500 = 5.000 -> múltiplo de 1000 es 5000
    expect(res.total.toNumber()).toBe(5000);
  });

  it('acabados ignora líneas nulas o vacías', () => {
    const res = calculateFinishing({
      finishing: undefined,
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(0);
    expect(res.lines.length).toBe(0);
  });

  it('acabado corte con runs = 0 no genera costo ni línea', () => {
    const res = calculateFinishing({
      finishing: { cut: { runs: 0 } },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(0);
    expect(res.lines.length).toBe(0);
  });

  it('acabado plastificado NONE no genera costo ni línea', () => {
    const res = calculateFinishing({
      finishing: { lamination: { mode: 'NONE' } },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(0);
    expect(res.lines.length).toBe(0);
  });

  it('ficha de producción digital omite acabados si no se seleccionaron', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      finishing: undefined,
    });

    const res = calculatePressQuote(input);
    const spec = res.digital![0].productionSpec;
    expect(spec).not.toContain('Corte:');
    expect(spec).toContain('IMPRESIÓN DIGITAL');
  });

  it('calcula 6 tramos de tirajes escalonados simultáneamente [100, 250, 500, 1000, 2500, 5000]', () => {
    const input = createBaseQuoteInput({
      quantities: [
        new Decimal(100),
        new Decimal(250),
        new Decimal(500),
        new Decimal(1000),
        new Decimal(2500),
        new Decimal(5000),
      ],
    });

    const res = calculatePressQuote(input);
    expect(res.digital!.length).toBe(6);
    // Verificar que el precio unitario sea decreciente por economías de escala
    const unitPrices = res.digital!.map((d) => d.unitPrice.toNumber());
    for (let i = 1; i < unitPrices.length; i++) {
      expect(unitPrices[i]).toBeLessThanOrEqual(unitPrices[i - 1]);
    }
  });
});
