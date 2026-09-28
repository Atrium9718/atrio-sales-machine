import Decimal from 'decimal.js';

export function parseNumericInput(text: string): Decimal {
  if (!text) return new Decimal(0);
  const cleaned = text.replace(/\./g, '').replace(/\s/g, '');
  const standardized = cleaned.replace(',', '.');
  try {
    const val = new Decimal(standardized || 0);
    if (val.isNaN()) return new Decimal(0);
    return val;
  } catch (e) {
    return new Decimal(0);
  }
}

export function formatCurrencyDisplay(value: Decimal): string {
  if (!value || value.isNaN()) return "0";
  return value.toNumber().toLocaleString("es-CO");
}
