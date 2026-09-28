import Decimal from 'decimal.js';
import { PressQuoteWarning } from './types';

export interface ArtDimensions {
  w: Decimal;
  h: Decimal;
}

/**
 * Calcula las dimensiones del arte considerando el sangrado.
 * REGLA DE NEGOCIO: El sangrado se suma UNA sola vez a cada dimensión (no a cada lado),
 * respetando exactamente el modelo del Excel corporativo.
 */
export function calculateArtDimensions(
  artWidthCm: Decimal | number,
  artHeightCm: Decimal | number,
  applyBleed: boolean,
  bleedCm: Decimal | number
): ArtDimensions {
  const width = new Decimal(artWidthCm);
  const height = new Decimal(artHeightCm);
  const bleed = new Decimal(bleedCm);

  return {
    w: applyBleed ? width.plus(bleed) : width,
    h: applyBleed ? height.plus(bleed) : height,
  };
}

export interface ImpositionResult {
  imposition: number;
  orientationA: number;
  orientationB: number;
  warning?: PressQuoteWarning;
}

/**
 * Calcula la cabida máxima de artes en un pliego / formato útil.
 * sheetW y sheetH deben ser las medidas ÚTILES (después de restar margen de pinza).
 */
export function calculateImposition(
  sheetW: Decimal | number,
  sheetH: Decimal | number,
  artW: Decimal | number,
  artH: Decimal | number
): ImpositionResult {
  const sw = new Decimal(sheetW);
  const sh = new Decimal(sheetH);
  const aw = new Decimal(artW);
  const ah = new Decimal(artH);

  if (aw.lte(0) || ah.lte(0) || sw.lte(0) || sh.lte(0)) {
    return {
      imposition: 0,
      orientationA: 0,
      orientationB: 0,
      warning: {
        code: 'ART_LARGER_THAN_SHEET',
        message: 'Las dimensiones del arte exceden el área imprimible del formato.',
      },
    };
  }

  // Orientación A (horizontal con horizontal, vertical con vertical)
  const a = sw.div(aw).floor().times(sh.div(ah).floor()).toNumber();

  // Orientación B (girado 90 grados)
  const b = sh.div(aw).floor().times(sw.div(ah).floor()).toNumber();

  const maxImp = Math.max(a, b);

  if (maxImp === 0) {
    return {
      imposition: 0,
      orientationA: a,
      orientationB: b,
      warning: {
        code: 'ART_LARGER_THAN_SHEET',
        message: `El arte (${aw.toFixed(2)} x ${ah.toFixed(2)} cm) es más grande que el área útil (${sw.toFixed(2)} x ${sh.toFixed(2)} cm).`,
      },
    };
  }

  return {
    imposition: maxImp,
    orientationA: a,
    orientationB: b,
  };
}
