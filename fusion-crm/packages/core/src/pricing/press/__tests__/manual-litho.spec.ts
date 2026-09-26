import { describe, it, expect } from 'vitest';
import { calculateManualLitho } from '../manual-litho';

describe('Manual Litho Calculation (Etapa 18.6 Bloque A)', () => {
  it('calcula correctamente planchas, impresión, papel, acabados y cierre con fórmulas de Excel', () => {
    const result = calculateManualLitho({
      jobDescription: 'Volantes 1/4 pliego 4x4',
      quantities: [1000, 2000, 5000],
      plates: [
        { format: '1/8', unitPrice: 10000, plateCount: 0 },
        { format: '1/4', unitPrice: 12500, plateCount: 4 }, // Subtotal: 50.000
        { format: '1/2', unitPrice: 32000, plateCount: 0 },
        { format: 'Pliego', unitPrice: 58000, plateCount: 0 },
      ],
      impressions: [
        { format: '1/8', pressPricePerThousand: 14000, plateCount: 0 },
        { format: '1/4', pressPricePerThousand: 22000, plateCount: 4 }, // 22.000 * 4 = 88.000 por millar
        { format: '1/2', pressPricePerThousand: 38000, plateCount: 0 },
        { format: 'Pliego', pressPricePerThousand: 65000, plateCount: 0 },
      ],
      papers: [
        {
          paperName: 'Propalcote 150g',
          sheetFormat: 'S70X100',
          pricePerSheet: 620,
          sheetsPerQty: [250, 500, 1250],
        },
      ],
      finishes: [
        {
          name: 'Corte y empaque',
          pricesPerQty: [15000, 20000, 35000],
        },
      ],
      utilityPercent: 70,
      commissionPercent: 10,
      vatPercent: 19,
    });

    expect(result.platesTotal).toBe(50000);

    // Qty 1000:
    // Planchas = 50.000
    // Impresión = 22.000 * 4 * ceil(1000/1000) = 88.000
    // Papel = 620 * 250 = 155.000
    // Acabados = 15.000
    // Total costos = 50.000 + 88.000 + 155.000 + 15.000 = 308.000
    // Costo unitario = 308.000 / 1000 = 308
    // Utilidad = 308 * 0.70 = 215.60
    // Comisión = (308 + 215.60) * 0.10 = 523.60 * 0.10 = 52.36
    // Subtotal = (308 + 215.60 + 52.36) * 1000 = 575.96 * 1000 = 575.960
    // IVA = 575.960 * 0.19 = 109.432.4 -> 109.432
    // Total = 575.960 + 109.432 = 685.392
    // Precio unit = 685.392 / 1000 = 685.39
    const q1 = result.quantities[0];
    expect(q1.platesCost).toBe(50000);
    expect(q1.impressionsCost).toBe(88000);
    expect(q1.papersCost).toBe(155000);
    expect(q1.finishesCost).toBe(15000);
    expect(q1.totalCost).toBe(308000);
    expect(q1.unitCost).toBe(308);
    expect(q1.utilityAmount).toBe(215.6);
    expect(q1.commissionAmount).toBe(52.36);
    expect(q1.subtotal).toBe(575960);
    expect(q1.vatAmount).toBe(109432);
    expect(q1.total).toBe(685392);
    expect(q1.unitPrice).toBe(685.39);

    // Qty 2000:
    // Planchas = 50.000
    // Impresión = 22.000 * 4 * ceil(2000/1000) = 88.000 * 2 = 176.000
    // Papel = 620 * 500 = 310.000
    // Acabados = 20.000
    // Total costos = 50.000 + 176.000 + 310.000 + 20.000 = 556.000
    // Costo unitario = 556.000 / 2000 = 278
    const q2 = result.quantities[1];
    expect(q2.platesCost).toBe(50000);
    expect(q2.impressionsCost).toBe(176000);
    expect(q2.papersCost).toBe(310000);
    expect(q2.finishesCost).toBe(20000);
    expect(q2.totalCost).toBe(556000);
    expect(q2.unitCost).toBe(278);
  });

  it('ignora papel si precio es null ("No hay precio")', () => {
    const result = calculateManualLitho({
      quantities: [1000],
      plates: [],
      impressions: [],
      papers: [
        {
          paperName: 'Papel Inexistente',
          sheetFormat: 'S60X90',
          pricePerSheet: null,
          sheetsPerQty: [100],
        },
      ],
      finishes: [],
    });

    expect(result.quantities[0].papersCost).toBe(0);
    expect(result.quantities[0].totalCost).toBe(0);
  });
});
