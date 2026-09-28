import { describe, it, expect } from 'vitest';
import {
  resolveStageIndex,
  computeClientPercent,
  toClientProjectView,
  normalizeNit,
  normalizeClientName,
  projectBelongsToClient,
} from './clientProgress';

describe('resolveStageIndex', () => {
  it('acepta ids numéricos, claves y valores vacíos', () => {
    expect(resolveStageIndex('1')).toBe(0);
    expect(resolveStageIndex('3')).toBe(2);
    expect(resolveStageIndex('ACABADOS')).toBe(3);
    expect(resolveStageIndex('POR_REVISAR')).toBe(0);
    expect(resolveStageIndex(undefined)).toBe(0);
    expect(resolveStageIndex('99')).toBe(0);
  });
});

describe('computeClientPercent', () => {
  it('avanza por etapas y llega a 100 al entregar', () => {
    expect(computeClientPercent(0)).toBe(17);
    expect(computeClientPercent(2)).toBe(50);
    expect(computeClientPercent(5)).toBe(100);
  });
});

describe('toClientProjectView', () => {
  const project = {
    id: 'proj-1',
    number: 'OT-1045',
    name: 'Volantes',
    quoteNumber: 'COT-1045',
    stageId: '3',
    itemsDetail: [{ id: 'a', name: 'Volante carta', quantity: 1000, material: 'Propalcote' }],
    laborCost: 50000,
    materialCost: 20000,
    timeEntries: [{ hours: 2 }],
    systemComments: ['nota interna'],
    assignments: [{ role: 'REVISION' }],
    dueDate: '2026-10-01',
  };

  it('muestra el paso actual y el estado de cada paso', () => {
    const view = toClientProjectView(project);
    expect(view.percent).toBe(50);
    expect(view.currentStep.label).toBe('En producción');
    expect(view.steps.map((s) => s.status)).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending']);
    expect(view.isDelivered).toBe(false);
  });

  it('no expone costos, tiempos ni comentarios internos', () => {
    const json = JSON.stringify(toClientProjectView(project));
    for (const internal of ['laborCost', 'materialCost', 'timeEntries', 'systemComments', 'assignments', 'Propalcote', 'nota interna']) {
      expect(json).not.toContain(internal);
    }
    expect(toClientProjectView(project).items).toEqual([{ name: 'Volante carta', quantity: 1000 }]);
  });

  it('marca todo como hecho al entregar', () => {
    const view = toClientProjectView({ ...project, stageId: '6' });
    expect(view.isDelivered).toBe(true);
    expect(view.steps.every((s) => s.status === 'done')).toBe(true);
  });
});

describe('identidad del cliente', () => {
  it('normaliza NIT y nombre', () => {
    expect(normalizeNit('900.123.456-1')).toBe('900123456');
    expect(normalizeNit('900123456')).toBe('900123456');
    expect(normalizeClientName('Almacenes Éxito S.A.')).toBe('almacenes exito');
    expect(normalizeClientName('ALMACENES EXITO SAS')).toBe('almacenes exito');
  });

  it('decide por NIT cuando ambos lo tienen', () => {
    const quote = { clientNit: '900.123.456-1', clientName: 'Otro nombre' };
    expect(projectBelongsToClient({}, quote, { nit: '900123456-1', name: 'Pintuco' })).toBe(true);
    expect(projectBelongsToClient({ client: 'Pintuco' }, { clientNit: '800' }, { nit: '900123456', name: 'Pintuco' })).toBe(false);
  });

  it('usa el nombre exacto normalizado cuando falta el NIT', () => {
    expect(projectBelongsToClient({ client: 'Almacenes Éxito S.A.' }, undefined, { name: 'almacenes exito' })).toBe(true);
    expect(projectBelongsToClient({ client: 'Almacenes Éxito Norte' }, undefined, { name: 'Almacenes Éxito' })).toBe(false);
    expect(projectBelongsToClient({ client: 'X' }, undefined, { name: '' })).toBe(false);
  });
});
