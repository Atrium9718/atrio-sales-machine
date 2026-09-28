import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateFinishing } from '../finishing';
import { MOCK_TARIFF_SNAPSHOT } from './fixtures';

describe('Motor de Acabados (finishing.ts)', () => {
  it('prueba 8a: plastificado por debajo del mínimo de unidades cobra precio unitario', () => {
    // tarifaMinimo = 65000, unitPrice = 350 -> minUnits = ceil(65000 / 350) = 186 hojas
    // Con sheetsPrinted = 50 (< 186):
    const resBoth = calculateFinishing({
      finishing: {
        lamination: { mode: 'BOTH_FACES' },
      },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      laminationUnitPrice: 350,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    // 50 * 350 = 17.500
    expect(resBoth.totalFinishingCost.toNumber()).toBe(17500);
    expect(resBoth.lines[0].key).toBe('finishing_lamination');
  });

  it('prueba 8b: plastificado una cara de dos por debajo del mínimo', () => {
    // 50 hojas / 2 * 350 = 25 * 350 = 8.750
    const resOne = calculateFinishing({
      finishing: {
        lamination: { mode: 'ONE_FACE_OF_TWO_PRINTED' },
      },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      laminationUnitPrice: 350,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(resOne.totalFinishingCost.toNumber()).toBe(8750);
  });

  it('prueba 8c: plastificado por encima del mínimo de unidades aplica tarifa por m2', () => {
    // format 50x35 = 1750 cm2. sheetsPrinted = 250 (>= 186)
    // area = 1750 * 250 / 10000 = 43.75 m2 -> ceil(43.75) = 44 m2
    // 44 m2 * 3500 = 154.000
    const res = calculateFinishing({
      finishing: {
        lamination: { mode: 'BOTH_FACES' },
      },
      quantity: new Decimal(500),
      quantityIndex: 0,
      sheetsPrinted: 250,
      formatWidthCm: 50,
      formatHeightCm: 35,
      artWidthCm: 14,
      artHeightCm: 21,
      laminationUnitPrice: 350,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(154000);
  });

  it('prueba 8d: si supera minUnits pero el m2 da menos que la tarifa mínima, se cobra el cargo mínimo', () => {
    // Formato muy pequeño: 10x10 = 100 cm2. sheetsPrinted = 200 (>= 186)
    // m2 = ceil(100 * 200 / 10000) = 2 m2
    // 2 * 3500 = 7.000 (menor a 65.000) -> aplica mínimo de 65.000
    const res = calculateFinishing({
      finishing: {
        lamination: { mode: 'BOTH_FACES' },
      },
      quantity: new Decimal(200),
      quantityIndex: 0,
      sheetsPrinted: 200,
      formatWidthCm: 10,
      formatHeightCm: 10,
      artWidthCm: 5,
      artHeightCm: 5,
      laminationUnitPrice: 350,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(65000);
  });

  it('prueba 9a: medio corte por centímetro lineal (PER_LINEAR_CM)', () => {
    // 20 cm lineales * $15/cm * 50 hojas impresas = $15.000
    const res = calculateFinishing({
      finishing: {
        halfCut: { mode: 'PER_LINEAR_CM', linearCm: 20, label: 'Stickers circulares' },
      },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 5,
      artHeightCm: 5,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(15000);
    expect(res.lines[0].key).toBe('finishing_half_cut');
  });

  it('prueba 9b: medio corte por área (PER_CM2)', () => {
    // arte 5x5 cm = 25 cm2. q = 100. price = $15
    // 25 * 100 * 15 = 37.500
    const res = calculateFinishing({
      finishing: {
        halfCut: { mode: 'PER_CM2', label: 'Sticker por área' },
      },
      quantity: new Decimal(100),
      quantityIndex: 0,
      sheetsPrinted: 50,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 5,
      artHeightCm: 5,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(37500);
  });

  it('calcula argollado por loops y cantidad: price * loops * q', () => {
    // 10 loops * 50 pesos * 20 cuadernos = 10.000
    const res = calculateFinishing({
      finishing: {
        binding: { loops: 10, label: 'Anillado doble O' },
      },
      quantity: new Decimal(20),
      quantityIndex: 0,
      sheetsPrinted: 40,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(10000);
  });

  it('calcula corte y despuntado por bajadas / runs', () => {
    const res = calculateFinishing({
      finishing: {
        cut: { runs: 4, label: 'Guillotina 4 cortes' }, // 4 * 2000 = 8000
        trim: { runs: 2, label: 'Despunte 2 esquinas' }, // 2 * 1500 = 3000
      },
      quantity: new Decimal(500),
      quantityIndex: 0,
      sheetsPrinted: 100,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(11000);
    expect(res.lines.length).toBe(2);
  });

  it('incluye troquelado digitado libremente', () => {
    const res = calculateFinishing({
      finishing: {
        dieCut: { price: new Decimal(45000), label: 'Troquel caja' },
      },
      quantity: new Decimal(500),
      quantityIndex: 0,
      sheetsPrinted: 100,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    expect(res.totalFinishingCost.toNumber()).toBe(45000);
    expect(res.lines[0].key).toBe('finishing_die_cut');
  });

  it('incluye líneas de otros acabados correspondientes al quantityIndex', () => {
    const res = calculateFinishing({
      finishing: {
        others: [
          { label: 'Embobinado', prices: [new Decimal(5000), new Decimal(10000), new Decimal(15000)] },
          { label: 'Foil Dorado', prices: [new Decimal(20000), new Decimal(30000), new Decimal(40000)] },
        ],
      },
      quantity: new Decimal(500),
      quantityIndex: 1, // segundo tramo de cantidad
      sheetsPrinted: 100,
      formatWidthCm: 23,
      formatHeightCm: 33,
      artWidthCm: 14,
      artHeightCm: 21,
      tariff: MOCK_TARIFF_SNAPSHOT,
    });

    // 10.000 + 30.000 = 40.000
    expect(res.totalFinishingCost.toNumber()).toBe(40000);
    expect(res.lines.length).toBe(2);
  });
});
