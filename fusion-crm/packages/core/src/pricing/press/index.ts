import Decimal from 'decimal.js';
import {
  PressQuoteInput,
  PressQuoteResult,
  PressQuoteWarning,
  QuantityResult,
} from './types';
import { calculateDigitalQuote } from './digital';
import { calculateLithoQuote } from './litho';

export * from './types';
export * from './imposition';
export * from './digital';
export * from './litho';
export * from './finishing';
export * from './wide-format';
export * from './defaultTariff';
export * from './manual-litho';
export * from './assistInput';

/**
 * MOTOR DE CÁLCULO LITOGRÁFICO Y DIGITAL (FUNCIÓN PURA)
 * Versión de motor: press-1.0.0
 * Sin Prisma, sin red, sin Date.now().
 * Recibe insumos y snapshot del tarifario; devuelve el resultado con desglose completo.
 */
export function calculatePressQuote(input: PressQuoteInput): PressQuoteResult {
  const warnings: PressQuoteWarning[] = [];
  let digitalResults: QuantityResult[] | undefined;
  let lithoResults: QuantityResult[] | undefined;

  if (input.technique === 'DIGITAL' || input.technique === 'BOTH') {
    if (input.digital) {
      digitalResults = calculateDigitalQuote(input, warnings);
    } else {
      warnings.push({
        code: 'MISSING_DIGITAL_CONFIG',
        message: 'Se solicitó técnica DIGITAL pero no se enviaron parámetros de configuración digital.',
      });
    }
  }

  if (input.technique === 'LITHO' || input.technique === 'BOTH') {
    if (input.litho) {
      lithoResults = calculateLithoQuote(input, warnings);
    } else {
      warnings.push({
        code: 'MISSING_LITHO_CONFIG',
        message: 'Se solicitó técnica LITHO pero no se enviaron parámetros de configuración litográfica.',
      });
    }
  }

  // Determinar la técnica recomendada (la más barata por cantidad)
  let recommended: 'DIGITAL' | 'LITHO' | null = null;

  const hasDigital = digitalResults && digitalResults.length > 0;
  const hasLitho = lithoResults && lithoResults.length > 0;

  if (hasDigital && hasLitho) {
    // Comparar primer tramo de cantidad disponible
    const d0 = digitalResults[0];
    const l0 = lithoResults[0];
    if (d0.total.lte(l0.total)) {
      recommended = 'DIGITAL';
    } else {
      recommended = 'LITHO';
    }
  } else if (hasDigital) {
    recommended = 'DIGITAL';
  } else if (hasLitho) {
    recommended = 'LITHO';
  }

  return {
    engineVersion: 'press-1.0.0',
    digital: digitalResults,
    litho: lithoResults,
    recommended,
    warnings,
  };
}
