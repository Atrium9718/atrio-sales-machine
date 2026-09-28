/**
 * Costos reales de una orden de producción (lo que alimenta «Rentabilidad por orden»).
 * Funciones puras: se prueban en projectCosts.test.ts.
 */

export type CostType = 'MANO_OBRA' | 'MATERIALES' | 'TERCEROS' | 'OTROS';

export interface CostEntry {
  id: string;
  source: 'MANUAL' | 'SYSTEM_AUTO';
  description: string;
  hours: number;
  costType: CostType | null;
  costAmount: number;
  taskId: string | null;
  createdAt: string;
  registeredByName: string;
}

interface CostFields {
  timeEntries: CostEntry[];
  totalRealHours: number;
  laborCost: number;
  materialCost: number;
  outsourcedCost: number;
  otherCost: number;
}

const FIELD: Record<CostType, keyof Pick<CostFields, 'laborCost' | 'materialCost' | 'outsourcedCost' | 'otherCost'>> = {
  MANO_OBRA: 'laborCost',
  MATERIALES: 'materialCost',
  TERCEROS: 'outsourcedCost',
  OTROS: 'otherCost',
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Arma el registro: la mano de obra se calcula con horas × tarifa; el resto es un monto. */
export function buildCostEntry(input: { costType: CostType; hours?: number; rate?: number; amount?: number; description?: string; taskId?: string | null; by: string; now?: Date; id?: string }): CostEntry {
  const isLabor = input.costType === 'MANO_OBRA';
  const hours = isLabor ? Math.max(0, n(input.hours)) : 0;
  return {
    id: input.id ?? `te-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    source: 'MANUAL',
    description: input.description ?? '',
    hours,
    costType: input.costType,
    costAmount: Math.max(0, isLabor ? hours * n(input.rate) : n(input.amount)),
    taskId: input.taskId || null,
    createdAt: (input.now ?? new Date()).toISOString(),
    registeredByName: input.by,
  };
}

/** Suma el registro a la orden (tolera órdenes antiguas sin los campos de costo). */
export function applyCostEntry<P extends Partial<CostFields>>(project: P, entry: CostEntry): P & CostFields {
  const base = normalize(project);
  const field = entry.costType ? FIELD[entry.costType] : null;
  return {
    ...base,
    timeEntries: [entry, ...base.timeEntries],
    totalRealHours: base.totalRealHours + entry.hours,
    ...(field ? { [field]: base[field] + entry.costAmount } : {}),
  };
}

/** Quita un registro y descuenta su costo. */
export function removeCostEntry<P extends Partial<CostFields>>(project: P, entryId: string): P & CostFields {
  const base = normalize(project);
  const entry = base.timeEntries.find((e) => e.id === entryId);
  if (!entry) return base;
  const field = entry.costType ? FIELD[entry.costType] : null;
  return {
    ...base,
    timeEntries: base.timeEntries.filter((e) => e.id !== entryId),
    totalRealHours: Math.max(0, base.totalRealHours - entry.hours),
    ...(field ? { [field]: Math.max(0, base[field] - entry.costAmount) } : {}),
  };
}

function normalize<P extends Partial<CostFields>>(p: P): P & CostFields {
  return {
    ...p,
    timeEntries: p.timeEntries ?? [],
    totalRealHours: n(p.totalRealHours),
    laborCost: n(p.laborCost),
    materialCost: n(p.materialCost),
    outsourcedCost: n(p.outsourcedCost),
    otherCost: n(p.otherCost),
  };
}
