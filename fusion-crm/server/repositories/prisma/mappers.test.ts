import { describe, it, expect } from 'vitest';
import {
  mapQuoteStatus, splitNit, money, percent, intOrNull, dateOrNull, toQuoteItemRow, toQuoteRow, fromQuoteRow,
  resolveStageKey, mapProductType, toProjectRow, stageRowId,
} from './mappers';

describe('mapeos Postgres', () => {
  it('traduce estados en español al enum y conserva el original en appData', () => {
    expect(mapQuoteStatus('Borrador')).toBe('DRAFT');
    expect(mapQuoteStatus('Enviada')).toBe('SENT');
    expect(mapQuoteStatus('ganada')).toBe('APPROVED');
    expect(mapQuoteStatus('Rechazada')).toBe('REJECTED');
    expect(mapQuoteStatus('algo raro')).toBe('DRAFT');
    const row = toQuoteRow({ id: 'q', number: 'COT-1', status: 'Finalizada', items: [] }, { clientId: 'c', ownerId: 'u', revision: 1 });
    expect(row.status).toBe('DRAFT');
    expect(row.appData.status).toBe('Finalizada');
    expect(row.appData.items).toBeUndefined();
  });

  it('separa NIT y dígito de verificación', () => {
    expect(splitNit('900.123.456-1')).toEqual({ number: '900123456', dv: '1' });
    expect(splitNit('Por definir')).toEqual({ number: null, dv: null });
    expect(splitNit('')).toEqual({ number: null, dv: null });
  });

  it('protege las columnas numéricas', () => {
    expect(money('abc')).toBe(0);
    expect(money(12.345)).toBe(12.35);
    expect(percent(5000)).toBe(999.99);
    expect(intOrNull('x')).toBeNull();
    expect(dateOrNull('no es fecha')).toBeNull();
  });

  it('los ids de ítem se vuelven únicos por cotización y el ítem completo va en appData', () => {
    const row = toQuoteItemRow('q1', { id: 'item-1', description: 'X', quantity: 5, unitPrice: 10, assistRunId: 'run_9', printTechnique: 'litho' }, 0);
    expect(row.id).toBe('q1::item-1');
    expect(row.assistRunId).toBeNull();
    expect(row.printTechnique).toBe('LITHO');
    expect(row.appData.assistRunId).toBe('run_9');
    expect(fromQuoteRow({ id: 'q1', appData: { number: 'COT-1' }, items: [{ order: 2, appData: { id: 'b' } }, { order: 1, appData: { id: 'a' } }] }))
      .toEqual({ number: 'COT-1', id: 'q1', items: [{ id: 'a' }, { id: 'b' }] });
  });

  it('mapea etapas y tipos de producto de la interfaz', () => {
    expect(resolveStageKey('1')).toBe('POR_REVISAR');
    expect(resolveStageKey('acabados')).toBe('ACABADOS');
    expect(resolveStageKey('POR_REVISAR')).toBe('POR_REVISAR');
    expect(resolveStageKey(undefined)).toBe('POR_REVISAR');
    expect(mapProductType('Offset')).toBe('LITHOGRAPHY');
    expect(mapProductType('Gran Formato')).toBe('LARGE_FORMAT');
    expect(mapProductType('Impresión Digital')).toBe('DIGITAL');
    expect(toProjectRow({ id: 'p', stageId: '6', isBilled: true }, 'OT-1')).toMatchObject({ stageId: stageRowId('ENTREGADO'), invoiced: true });
  });
});
