import { describe, it, expect } from 'vitest';
import { buildQuotePdfModel, formatQuoteDate } from './quotePdfModel';

describe('contenido del PDF de la cotización', () => {
  const quote = {
    number: 'COT-00012',
    date: '2026-09-15T15:00:00.000Z',
    clientName: 'Alpina',
    clientData: { name: 'Alpina Productos Alimenticios', nit: '860.025.900-2', phone: '3001234567' },
    items: [
      { description: 'Plegadiza yogurt\nTroquel propio', size: '12x8x20 cm', material: 'Propalcote 300', inks: '4x0', finishes: 'UV', quantity: 1000, unitPrice: 500, subtotal: 500000, applyVat: true, vatRate: 0.19, vatAmount: 95000, total: 595000 },
      { description: 'Etiqueta', quantity: 2000, unitPrice: 100, subtotal: 200000, applyVat: true, vatRate: 0.05, vatAmount: 10000, total: 210000 },
      { description: 'Diseño', quantity: 1, unitPrice: 300000, subtotal: 300000, applyVat: false, vatAmount: 0, total: 300000 },
    ],
    subtotal: 1000000,
    vatAmount: 105000,
    total: 1105000,
    deliveryTime: '8 días hábiles',
    paymentTerms: '',
    notes: '  Incluye prueba de color  ',
    advisorName: 'Carolina Ruiz',
    advisorEmail: 'carolina@fusion.co',
  };

  it('muestra especificaciones, IVA por tarifa y condiciones', () => {
    const m = buildQuotePdfModel(quote);
    expect(m.number).toBe('COT-00012');
    expect(m.client).toMatchObject({ name: 'Alpina Productos Alimenticios', nit: '860.025.900-2', phone: '3001234567' });
    expect(m.rows[0]).toMatchObject({
      title: 'Plegadiza yogurt',
      specs: ['Tamaño: 12x8x20 cm · Material: Propalcote 300 · Tintas: 4x0 · Acabados: UV', 'Troquel propio'],
      vatLabel: '19%',
      total: 595000,
    });
    expect(m.rows[1].vatLabel).toBe('5%');
    expect(m.rows[2]).toMatchObject({ vatLabel: 'Exento', specs: [] });
    expect(m.vatLines).toEqual([
      { label: 'IVA 19%', amount: 95000 },
      { label: 'IVA 5%', amount: 10000 },
    ]);
    expect(m).toMatchObject({ subtotal: 1000000, vatTotal: 105000, total: 1105000, showTotals: true });
    expect(m.conditions).toEqual([
      { label: 'Tiempo de entrega', value: '8 días hábiles' },
      { label: 'Observaciones', value: 'Incluye prueba de color' },
    ]);
    expect(m.advisor).toEqual(['Carolina Ruiz', 'carolina@fusion.co']);
  });

  it('fecha legible en hora de Bogotá y totales ocultables', () => {
    expect(formatQuoteDate('2026-09-01T02:00:00.000Z')).toMatch(/31 de agosto de 2026/);
    const m = buildQuotePdfModel({ items: [{ description: 'Volantes', quantity: 10, unitPrice: 100 }], sumTotals: false });
    expect(m.showTotals).toBe(false);
    expect(m.number).toBe('Borrador');
    expect(m.rows[0]).toMatchObject({ subtotal: 1000, vatLabel: '19%', total: 1190 });
    expect(m.total).toBe(1190);
  });
});
