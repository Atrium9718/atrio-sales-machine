import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateArtDimensions,
  calculateImposition,
} from '../imposition';

describe('Motor de Imposición y Cabida (imposition.ts)', () => {
  it('calcula cabida de arte 14×21 en formato carta imprimible 22×32 -> 2', () => {
    const res = calculateImposition(22, 32, 14, 21);
    expect(res.imposition).toBe(2);
    expect(res.warning).toBeUndefined();
  });

  it('calcula cabida de arte 14×21 en un cuarto de 70×100 cortado a .1/4 (49×34) -> 4', () => {
    // 50x35 menos 1.0cm de pinza cada dimensión = 49x34
    const res = calculateImposition(49, 34, 14, 21);
    expect(res.imposition).toBe(4);
    expect(res.warning).toBeUndefined();
  });

  it('calcula cabida con sangrado: 14.6×21.6 en 22×32 -> 2', () => {
    const res = calculateImposition(22, 32, 14.6, 21.6);
    expect(res.imposition).toBe(2);
  });

  it('suma el sangrado UNA sola vez a cada dimensión (no a cada lado, según Excel)', () => {
    const dims = calculateArtDimensions(14, 21, true, 0.6);
    expect(dims.w.toNumber()).toBe(14.6);
    expect(dims.h.toNumber()).toBe(21.6);
  });

  it('no suma sangrado cuando applyBleed es false', () => {
    const dims = calculateArtDimensions(14, 21, false, 0.6);
    expect(dims.w.toNumber()).toBe(14);
    expect(dims.h.toNumber()).toBe(21);
  });

  it('devuelve advertencia ART_LARGER_THAN_SHEET sin lanzar excepción cuando el arte supera el formato', () => {
    const res = calculateImposition(22, 32, 25, 35);
    expect(res.imposition).toBe(0);
    expect(res.warning).toBeDefined();
    expect(res.warning?.code).toBe('ART_LARGER_THAN_SHEET');
  });

  it('devuelve advertencia si el ancho del arte es mayor que ambas dimensiones del formato', () => {
    const res = calculateImposition(20, 20, 25, 10);
    expect(res.imposition).toBe(0);
    expect(res.warning?.code).toBe('ART_LARGER_THAN_SHEET');
  });

  it('devuelve advertencia de forma segura si las dimensiones son cero o negativas', () => {
    const resZero = calculateImposition(0, 30, 10, 10);
    expect(resZero.imposition).toBe(0);
    expect(resZero.warning?.code).toBe('ART_LARGER_THAN_SHEET');

    const resNeg = calculateImposition(20, 30, -5, 10);
    expect(resNeg.imposition).toBe(0);
    expect(resNeg.warning?.code).toBe('ART_LARGER_THAN_SHEET');
  });

  it('selecciona la rotación óptima cuando la orientación apaisada ofrece mayor cabida', () => {
    // 30x20 útil, arte 10x15:
    // a: floor(30/10)*floor(20/15) = 3*1 = 3
    // b: floor(20/10)*floor(30/15) = 2*2 = 4
    const res = calculateImposition(30, 20, 10, 15);
    expect(res.orientationA).toBe(3);
    expect(res.orientationB).toBe(4);
    expect(res.imposition).toBe(4);
  });

  it('calcula correctamente con objetos Decimal', () => {
    const sw = new Decimal(49);
    const sh = new Decimal(34);
    const aw = new Decimal(14);
    const ah = new Decimal(21);
    const res = calculateImposition(sw, sh, aw, ah);
    expect(res.imposition).toBe(4);
  });
});
