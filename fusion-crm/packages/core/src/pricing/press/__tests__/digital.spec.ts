import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateDigitalQuote, findVolumeTier, resolveClientDiscountRate, resolveVatRate } from '../digital';
import { createBaseQuoteInput, MOCK_TARIFF_SNAPSHOT } from './fixtures';
import { PressQuoteWarning } from '../types';

describe('Motor de Costeo Digital (digital.ts)', () => {
  it('prueba 5: 20 unidades doble cara en negro, carta: 40 formatos, tramo 21-50 a 1.500, impresión 60.000', () => {
    // Arte grande para cabida 1 (ej. 20 x 30 cm en hoja carta útil 22 x 32)
    const input = createBaseQuoteInput({
      artWidthCm: new Decimal(20),
      artHeightCm: new Decimal(30),
      quantities: [new Decimal(20)],
      digital: {
        formatName: 'Carta',
        inkMode: 'BOTH_SIDES_BLACK', // sidesFactor = 2
        onDemand: false,
      },
      commercial: {
        vatLabel: 'No gravado',
        otherTaxPercent: new Decimal(0),
        clientDiscountLabel: 'Ninguno',
        otherDiscountPercent: new Decimal(0),
        salesCommissionPercent: new Decimal(0),
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateDigitalQuote(input, warnings);

    expect(warnings.length).toBe(0);
    expect(results.length).toBe(1);

    const r = results[0];
    expect(r.impositionPerSheet).toBe(1);
    expect(r.sheetsPrinted).toBe(40); // 20 / 1 * 2 = 40
    // En tramo 21-50 el precio unitario es 1.500
    // Impresión = 40 * 1500 = 60.000
    const printingLine = r.lines.find((l) => l.key === 'printing_digital');
    expect(printingLine).toBeDefined();
    expect(printingLine!.amount.toNumber()).toBe(60000);
    expect(r.total.toNumber()).toBe(60000);
  });

  it('prueba 6: tramo exacto en los bordes 20, 21, 50, 51, 100, 101, 150, 151', () => {
    const tiers = MOCK_TARIFF_SNAPSHOT.digitalFormats[0].volumeTiers;

    expect(new Decimal(findVolumeTier(tiers, 20)?.unitPrice ?? 0).toNumber()).toBe(2000);
    expect(new Decimal(findVolumeTier(tiers, 21)?.unitPrice ?? 0).toNumber()).toBe(1500);
    expect(new Decimal(findVolumeTier(tiers, 50)?.unitPrice ?? 0).toNumber()).toBe(1500);
    expect(new Decimal(findVolumeTier(tiers, 51)?.unitPrice ?? 0).toNumber()).toBe(1200);
    expect(new Decimal(findVolumeTier(tiers, 100)?.unitPrice ?? 0).toNumber()).toBe(1200);
    expect(new Decimal(findVolumeTier(tiers, 101)?.unitPrice ?? 0).toNumber()).toBe(1000);
    expect(new Decimal(findVolumeTier(tiers, 150)?.unitPrice ?? 0).toNumber()).toBe(1000);
    expect(new Decimal(findVolumeTier(tiers, 151)?.unitPrice ?? 0).toNumber()).toBe(800);
    expect(new Decimal(findVolumeTier(tiers, 500)?.unitPrice ?? 0).toNumber()).toBe(800);
  });

  it('prueba 15: formato digital sin escala -> advertencia NO_VOLUME_TIER y precio de lista, nunca cero', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(10)],
      digital: {
        formatName: 'Sin Escala',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateDigitalQuote(input, warnings);

    expect(warnings.some((w) => w.code === 'NO_VOLUME_TIER')).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].total.toNumber()).toBeGreaterThan(0);
    // price4x0 del formato 'Sin Escala' es 2200
    expect(results[0].lines[0].amount.toNumber()).toBeGreaterThanOrEqual(2200);
  });

  it('aplica descuento de colegas del 10% y de estudiantes del 5%', () => {
    expect(resolveClientDiscountRate('Colegas').toNumber()).toBe(0.10);
    expect(resolveClientDiscountRate('Estudiantes').toNumber()).toBe(0.05);
    expect(resolveClientDiscountRate('Ninguno').toNumber()).toBe(0);
    expect(resolveClientDiscountRate('15%').toNumber()).toBe(0.15);
  });

  it('resuelve tasas de IVA correctamente: no gravado, 19%, no incluido e incluido', () => {
    expect(resolveVatRate('No gravado').toNumber()).toBe(0);
    expect(resolveVatRate('Exento').toNumber()).toBe(0);
    expect(resolveVatRate('0%').toNumber()).toBe(0);
    expect(resolveVatRate('No incluido').toNumber()).toBe(0.19);
    expect(resolveVatRate('19%').toNumber()).toBe(0.19);
    expect(resolveVatRate('IVA incluido').toNumber()).toBe(0);
  });

  it('aplica descuento ANTES de los acabados en flujo digital', () => {
    // 100 unidades, arte 14x21 (cabida 2 en carta útil 22x32 -> 50 hojas)
    // 50 hojas en tramo 21-50 -> $1.500/hoja -> $75.000 impresión
    // Descuento colegas 10% -> -$7.500
    // Acabado corte 2 bajadas -> $4.000
    // Subtotal 2 = (75.000 - 7.500) + 4.000 = 71.500
    const input = createBaseQuoteInput({
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(100)],
      digital: {
        formatName: 'Carta',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
      commercial: {
        clientDiscountLabel: 'Colegas',
        otherDiscountPercent: new Decimal(0),
        salesCommissionPercent: new Decimal(0),
        vatLabel: 'No gravado',
        otherTaxPercent: new Decimal(0),
      },
      finishing: {
        cut: { runs: 2, label: 'Corte recto' },
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const [r] = calculateDigitalQuote(input, warnings);

    expect(r.impositionPerSheet).toBe(2);
    expect(r.sheetsPrinted).toBe(50);
    expect(r.discounts.toNumber()).toBe(7500);
    expect(r.taxableBase.toNumber()).toBe(71500);
    expect(r.total.toNumber()).toBe(71500);
  });

  it('calcula comisión comercial sobre Subtotal 2 (después de acabados)', () => {
    // Subtotal 2 = 71.500
    // Comisión 10% = 7.150
    // Subtotal 3 = 78.650
    const input = createBaseQuoteInput({
      artWidthCm: new Decimal(14),
      artHeightCm: new Decimal(21),
      quantities: [new Decimal(100)],
      commercial: {
        clientDiscountLabel: 'Colegas',
        salesCommissionPercent: new Decimal(0.10),
        vatLabel: 'No gravado',
      },
      finishing: {
        cut: { runs: 2 },
      },
    });

    const [r] = calculateDigitalQuote(input, []);
    expect(r.commission.toNumber()).toBe(7150);
    expect(r.taxableBase.toNumber()).toBe(78650);
    expect(r.total.toNumber()).toBe(78650);
  });

  it('costo interno digital equivale a impresión + acabados (sin comisión ni IVA)', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100)],
      finishing: { cut: { runs: 2 } },
      commercial: {
        clientDiscountLabel: 'Colegas',
        salesCommissionPercent: new Decimal(0.10),
        vatLabel: '19%',
      },
    });

    const [r] = calculateDigitalQuote(input, []);
    // Impresión: 75.000, Corte: 4.000 -> Internal Cost = 79.000
    expect(r.internalCost.toNumber()).toBe(79000);
    expect(r.marginPercent.toNumber()).toBe(0);
  });

  it('rechaza cantidades con decimales y genera advertencia INVALID_QUANTITY_DECIMAL', () => {
    const input = createBaseQuoteInput({
      quantities: [new Decimal(100.5), new Decimal(200)],
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateDigitalQuote(input, warnings);

    expect(warnings.some((w) => w.code === 'INVALID_QUANTITY_DECIMAL')).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].quantity.toNumber()).toBe(200);
  });

  it('devuelve advertencia DIGITAL_FORMAT_NOT_FOUND si el formato no existe en tarifario', () => {
    const input = createBaseQuoteInput({
      digital: {
        formatName: 'Formato Fantasma Inexistente',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
    });

    const warnings: PressQuoteWarning[] = [];
    const results = calculateDigitalQuote(input, warnings);

    expect(warnings.some((w) => w.code === 'DIGITAL_FORMAT_NOT_FOUND')).toBe(true);
    expect(results.length).toBe(0);
  });
});
