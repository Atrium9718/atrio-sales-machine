import { describe, it, expect } from 'vitest';
import { calcularCostoInterno, resolverDesdeCampoEditado, CONFIG } from './quoteModel';

describe('lógica de precios del cotizador', () => {
  it('costo interno: mano de obra por jornada + material + margen', () => {
    const r = calcularCostoInterno({ laborHours: 6, laborRatePerHour: 90000, dailyDivisor: 6, rawMaterialCost: 10000, marginPercent: 35 });
    expect(r.base).toBe(100000);
    expect(r.suggestedUnitPrice).toBe(135000);
    expect(r.breakdown).toEqual({ laborCost: 90000, rawMaterialCost: 10000, marginAmount: 35000 });
    expect(calcularCostoInterno({ laborHours: 5, laborRatePerHour: 1, dailyDivisor: 0, rawMaterialCost: 0, marginPercent: 0 }).base).toBe(0);
  });

  it('recalcula la línea según el campo editado', () => {
    expect(resolverDesdeCampoEditado({ quantity: 10, unitPrice: 1000 }, 'quantity', 0.19, true)).toMatchObject({ subtotal: 10000, vatAmount: 1900, total: 11900 });
    expect(resolverDesdeCampoEditado({ quantity: 4, unitPrice: 0, subtotal: 1000 }, 'lineSubtotal', 0.19, false)).toMatchObject({ unitPrice: 250, total: 1000 });
    // Desde el total con IVA se deduce el precio unitario
    const r = resolverDesdeCampoEditado({ quantity: 2, unitPrice: 0, total: 2380 }, 'lineTotal', 0.19, true);
    expect(r).toMatchObject({ subtotal: 2000, unitPrice: 1000, vatAmount: 380, total: 2380 });
    // Cantidad inválida al editar el precio pasa a 1
    expect(resolverDesdeCampoEditado({ quantity: 0, unitPrice: 500 }, 'unitPrice', 0.19, false)).toMatchObject({ quantity: 1, subtotal: 500 });
  });

  it('configuración por defecto', () => {
    expect(CONFIG.vatRate).toBe(0.19);
    expect(CONFIG.margins.IN_HOUSE).toBeGreaterThan(CONFIG.margins.AGENCY);
  });
});
