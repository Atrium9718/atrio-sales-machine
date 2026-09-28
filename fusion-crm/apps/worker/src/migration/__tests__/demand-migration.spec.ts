import { describe, it, expect } from 'vitest';
import {
  mapHistoricalStatus,
  calculateStringSimilarity,
  migrateHistoricalDemandRows,
  generateRowHash,
  type RawHistoricalRow,
  type ClientTarget,
} from '../demand-migration';

describe('Migración del Histórico de Impresión por Demanda (Etapa 18.6 Bloque D)', () => {
  it('mapea correctamente todos los estados requeridos', () => {
    expect(mapHistoricalStatus('Pagado')).toBe('COMPLETED');
    expect(mapHistoricalStatus('Entregado')).toBe('DELIVERED');
    expect(mapHistoricalStatus('Listo para entregar')).toBe('READY');
    expect(mapHistoricalStatus('Facturación')).toBe('AWAITING_ARTWORK');
    expect(mapHistoricalStatus('Trabajando en ello')).toBe('IN_PRODUCTION');
  });

  it('calcula coincidencia difusa con umbral 0.9', () => {
    // Coincidencia casi idéntica
    const simHigh = calculateStringSimilarity('Industrias Alimentos S.A.S.', 'Industrias Alimentos SAS');
    expect(simHigh).toBeGreaterThanOrEqual(0.9);

    // Coincidencia lejana (< 0.9)
    const simLow = calculateStringSimilarity('Distribuidora Bogotá', 'Librería Central');
    expect(simLow).toBeLessThan(0.9);
  });

  it('enlaza solo clientes >= 0.9 y lista los demás en informe sin crear clientes', () => {
    const clients: ClientTarget[] = [
      { id: 'cli-1', name: 'Editorial Planeta Colombia' },
      { id: 'cli-2', name: 'Graficas San Martin SAS' },
    ];

    const rows: RawHistoricalRow[] = [
      {
        sheetName: 'Por demanda',
        rowNumber: 10,
        customerNameRaw: 'Editorial Planeta Col.',
        responsibleRaw: 'Andres S.',
        description: 'Libros pasta blanda',
        amount: 450000,
        statusRaw: 'Pagado',
      },
      {
        sheetName: 'UV-DTF',
        rowNumber: 42,
        customerNameRaw: 'Cliente Desconocido 123',
        responsibleRaw: 'Carlos M.',
        description: 'Stickers UV-DTF 50cm',
        amount: 29000,
        statusRaw: 'Listo para entregar',
      },
    ];

    const { results, report } = migrateHistoricalDemandRows(rows, clients);

    expect(report.totalProcessed).toBe(2);
    expect(report.totalLinked).toBe(1);
    expect(report.totalUnlinked).toBe(1);

    // El primer cliente se enlaza con cli-1
    expect(results[0].matchedClientId).toBe('cli-1');
    expect(results[0].status).toBe('COMPLETED');
    expect(results[0].isLinked).toBe(true);

    // El segundo cliente queda sin enlazar
    expect(results[1].matchedClientId).toBeNull();
    expect(results[1].status).toBe('READY');
    expect(results[1].isLinked).toBe(false);

    // Aparece en la lista de desvinculados del informe
    expect(report.unlinkedItems.length).toBe(1);
    expect(report.unlinkedItems[0].customerNameRaw).toBe('Cliente Desconocido 123');
  });

  it('es idempotente por hash de fila', () => {
    const clients: ClientTarget[] = [{ id: 'cli-1', name: 'Cliente Frecuente' }];
    const row: RawHistoricalRow = {
      sheetName: '2024',
      rowNumber: 100,
      customerNameRaw: 'Cliente Frecuente',
      description: 'Pendones 2x1',
      amount: 120000,
      statusRaw: 'Entregado',
    };

    const existingHashes = new Set<string>();
    const run1 = migrateHistoricalDemandRows([row], clients, existingHashes);
    expect(run1.report.totalProcessed).toBe(1);
    expect(run1.report.totalSkippedDuplicates).toBe(0);

    // Segunda corrida con el mismo hash
    const run2 = migrateHistoricalDemandRows([row], clients, existingHashes);
    expect(run2.report.totalProcessed).toBe(0);
    expect(run2.report.totalSkippedDuplicates).toBe(1);
  });
});
