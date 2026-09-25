import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculatePressQuote } from '../index';
import { createBaseQuoteInput } from './fixtures';

describe('Motor Principal de Cotización Gráfica (index.ts / calculatePressQuote)', () => {
  it('ejecuta con versión de motor fija "press-1.0.0"', () => {
    const input = createBaseQuoteInput();
    const result = calculatePressQuote(input);
    expect(result.engineVersion).toBe('press-1.0.0');
  });

  it('prueba 18: determinismo estricto (mismos insumos -> mismo resultado 1000 veces)', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100), new Decimal(500)],
      finishing: { cut: { runs: 2 } },
    });

    const firstRun = calculatePressQuote(input);
    const expectedTotal0 = firstRun.digital![0].total.toNumber();
    const expectedTotal1 = firstRun.digital![1].total.toNumber();

    for (let i = 0; i < 1000; i++) {
      const run = calculatePressQuote(input);
      expect(run.digital![0].total.toNumber()).toBe(expectedTotal0);
      expect(run.digital![1].total.toNumber()).toBe(expectedTotal1);
    }
  });

  it('prueba 13a: cotiza cantidad unitaria extrema q = 1 sin errores ni divisiones por cero', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(1)],
    });

    const result = calculatePressQuote(input);
    expect(result.warnings.length).toBe(0);
    expect(result.digital!.length).toBe(1);
    expect(result.digital![0].total.toNumber()).toBeGreaterThan(0);
  });

  it('prueba 13b: cotiza cantidad de gran escala q = 100.000 de forma precisa', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100000)],
    });

    const result = calculatePressQuote(input);
    expect(result.warnings.length).toBe(0);
    expect(result.digital!.length).toBe(1);
    expect(result.digital![0].total.toNumber()).toBeGreaterThan(0);
  });

  it('prueba 13c: rechaza cantidades con decimales y omite del resultado', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(50.25), new Decimal(200)],
    });

    const result = calculatePressQuote(input);
    expect(result.warnings.some((w) => w.code === 'INVALID_QUANTITY_DECIMAL')).toBe(true);
    expect(result.digital!.length).toBe(1);
    expect(result.digital![0].quantity.toNumber()).toBe(200);
  });

  it('prueba 10a: IVA no incluido agrega el 19% exacto', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        vatLabel: 'IVA no incluido',
        clientDiscountLabel: 'Ninguno',
        otherTaxPercent: new Decimal(0),
        otherDiscountPercent: new Decimal(0),
        salesCommissionPercent: new Decimal(0),
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    const expectedVat = item.taxableBase.times(0.19);
    expect(item.vat.toNumber()).toBeCloseTo(expectedVat.toNumber(), 2);
    expect(item.total.toNumber()).toBe(item.taxableBase.plus(item.vat).round().toNumber());
  });

  it('prueba 10b: IVA incluido no adiciona porcentaje al subtotal gravable', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        vatLabel: 'IVA incluido',
        clientDiscountLabel: 'Ninguno',
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    expect(item.vat.toNumber()).toBe(0);
    expect(item.total.toNumber()).toBe(item.taxableBase.toNumber());
  });

  it('prueba 10c: IVA no gravado no cobra IVA', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        vatLabel: 'No gravado',
        clientDiscountLabel: 'Ninguno',
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    expect(item.vat.toNumber()).toBe(0);
    expect(item.total.toNumber()).toBe(item.taxableBase.toNumber());
  });

  it('prueba 10d: IVA 19% explícito agrega el 19%', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        vatLabel: '19 %',
        clientDiscountLabel: 'Ninguno',
      },
    });

    const res = calculatePressQuote(input);
    const item = res.digital![0];
    expect(item.vat.toNumber()).toBeGreaterThan(0);
  });

  it('prueba 11: descuento de colegas 10% y de estudiantes 5% sobre base de impresión digital', () => {
    const inputColegas = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        clientDiscountLabel: 'Colegas',
        vatLabel: 'No gravado',
      },
    });
    const resColegas = calculatePressQuote(inputColegas);
    const itemColegas = resColegas.digital![0];

    const inputEstudiantes = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        clientDiscountLabel: 'Estudiantes',
        vatLabel: 'No gravado',
      },
    });
    const resEstudiantes = calculatePressQuote(inputEstudiantes);
    const itemEstudiantes = resEstudiantes.digital![0];

    // Colegas (10%) debe dar mayor descuento que Estudiantes (5%)
    expect(itemColegas.discounts.toNumber()).toBeGreaterThan(itemEstudiantes.discounts.toNumber());
    expect(itemColegas.discounts.toNumber()).toBeCloseTo(itemEstudiantes.discounts.times(2).toNumber(), 1);
  });

  it('prueba 12: comisión comercial 0% y 10%', () => {
    const input0 = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        salesCommissionPercent: new Decimal(0),
        vatLabel: 'No gravado',
      },
    });
    const res0 = calculatePressQuote(input0);
    expect(res0.digital![0].commission.toNumber()).toBe(0);

    const input10 = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      commercial: {
        salesCommissionPercent: new Decimal(0.10),
        vatLabel: 'No gravado',
      },
    });
    const res10 = calculatePressQuote(input10);
    expect(res10.digital![0].commission.toNumber()).toBeGreaterThan(0);
    expect(res10.digital![0].total.toNumber()).toBeGreaterThan(res0.digital![0].total.toNumber());
  });

  it('técnica BOTH cotiza digital y litográfico simultáneamente y recomienda la más económica', () => {
    // Para tiraje corto (ej. 50 volantes), digital suele ser más económico que lito por el costo de planchas
    const input = createBaseQuoteInput({
      technique: 'BOTH',
      quantities: [new Decimal(50)],
      digital: {
        formatName: 'Carta',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
      litho: {
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        paperName: 'Propalcote 150g',
        plateBacking: false,
      },
      commercial: {
        vatLabel: '19%',
      },
    });

    const result = calculatePressQuote(input);
    expect(result.digital).toBeDefined();
    expect(result.litho).toBeDefined();
    expect(result.digital!.length).toBe(1);
    expect(result.litho!.length).toBe(1);

    // Con 50 unidades, el costo digital debe ser menor que lito (8 planchas = $144.000)
    expect(result.digital![0].total.toNumber()).toBeLessThan(result.litho![0].total.toNumber());
    expect(result.recommended).toBe('DIGITAL');
  });

  it('recomienda LITHO para tirajes masivos donde el costo unitario de planchas se diluye', () => {
    // 50.000 volantes
    const input = createBaseQuoteInput({
      technique: 'BOTH',
      quantities: [new Decimal(50000)],
      digital: {
        formatName: 'Carta',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
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

    const result = calculatePressQuote(input);
    expect(result.recommended).toBe('LITHO');
  });

  it('maneja técnica DIGITAL sin configuración digital añadiendo advertencia MISSING_DIGITAL_CONFIG', () => {
    const input = createBaseQuoteInput({
      technique: 'DIGITAL',
      digital: undefined,
    });

    const result = calculatePressQuote(input);
    expect(result.warnings.some((w) => w.code === 'MISSING_DIGITAL_CONFIG')).toBe(true);
    expect(result.digital).toBeUndefined();
    expect(result.recommended).toBeNull();
  });

  it('maneja técnica LITHO sin configuración litográfica añadiendo advertencia MISSING_LITHO_CONFIG', () => {
    const input = createBaseQuoteInput({
      technique: 'LITHO',
      litho: undefined,
    });

    const result = calculatePressQuote(input);
    expect(result.warnings.some((w) => w.code === 'MISSING_LITHO_CONFIG')).toBe(true);
    expect(result.litho).toBeUndefined();
    expect(result.recommended).toBeNull();
  });
});
