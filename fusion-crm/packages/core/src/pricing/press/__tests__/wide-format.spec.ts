import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateWideFormat, mround } from '../wide-format';

describe('Motor de Gran Formato / UV-DTF (wide-format.ts)', () => {
  it('prueba 19: comprobación oficial (115 cm colega con $68.000 por metro y $10.000 descuento colega -> $66.700)', () => {
    const result = calculateWideFormat({
      linearCm: 115,
      pricePerMeter: 68000,
      peerDiscountPerMeter: 10000,
      clientType: 'PEER',
      roundToNearest: 100,
    });

    expect(result.pricePerMeter.toNumber()).toBe(68000);
    expect(result.pricePerCm.toNumber()).toBe(580);
    expect(result.rawTotal.toNumber()).toBe(66700);
    expect(result.total.toNumber()).toBe(66700);
  });

  it('calcula cliente final sin descuento de colega', () => {
    const result = calculateWideFormat({
      linearCm: 115,
      pricePerMeter: 68000,
      clientType: 'FINAL',
      roundToNearest: 100,
    });

    expect(result.pricePerCm.toNumber()).toBe(680);
    expect(result.rawTotal.toNumber()).toBe(78200);
    expect(result.total.toNumber()).toBe(78200);
  });

  it('redondea con mround al múltiplo de 100 más cercano (.5 hacia arriba)', () => {
    expect(mround(66749, 100).toNumber()).toBe(66700);
    expect(mround(66750, 100).toNumber()).toBe(66800);
    expect(mround(66751, 100).toNumber()).toBe(66800);
    expect(mround(66700, 100).toNumber()).toBe(66700);
  });

  it('aplica mround correctamente cuando la longitud tiene decimales', () => {
    // 115.5 cm * $580 = 66.990 -> mround(66990, 100) = 67.000
    const result = calculateWideFormat({
      linearCm: 115.5,
      pricePerMeter: 68000,
      peerDiscountPerMeter: 10000,
      clientType: 'PEER',
      roundToNearest: 100,
    });

    expect(result.rawTotal.toNumber()).toBe(66990);
    expect(result.total.toNumber()).toBe(67000);
  });

  it('maneja 0 cm lineales devolviendo total 0', () => {
    const result = calculateWideFormat({
      linearCm: 0,
      pricePerMeter: 68000,
      clientType: 'FINAL',
    });

    expect(result.total.toNumber()).toBe(0);
  });
});
