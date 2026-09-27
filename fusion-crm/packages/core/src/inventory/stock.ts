/**
 * Inventario de materiales. El papel llega en pliegos (70×100 o 60×90) y se transforma en
 * cortes (1/2, 1/4, 1/8…) antes de imprimir; cada formato es un ítem con su propia existencia
 * y costo promedio. Aquí solo hay cálculo puro: el servidor aplica y guarda los movimientos.
 */

export type SheetFormat = 'S70X100' | 'S60X90';

export const SHEET_FORMAT_LABEL: Record<SheetFormat, string> = { S70X100: '70×100', S60X90: '60×90' };

export interface PaperSpec {
  /** Nombre del papel como en el tarifario (p. ej. "Propalcote 150g"). */
  name: string;
  sheetFormat: SheetFormat;
  /** Código de corte del tarifario: ".1" es el pliego entero, ".1/4" un cuarto… */
  cutCode: string;
  /** Piezas que salen de un pliego (1 para el pliego entero). */
  divisor: number;
  widthCm: number;
  heightCm: number;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  kind: 'PAPER' | 'SUPPLY';
  unit: string;
  available: number;
  reserved: number;
  /** Costo promedio ponderado por unidad. */
  unitCost: number;
  lastCost: number;
  minStock: number;
  location?: string;
  notes?: string;
  paper?: PaperSpec;
  active: boolean;
  lastCountedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MovementType =
  | 'INITIAL' // saldo inicial
  | 'PURCHASE_IN' // compra
  | 'RETURN_IN' // devolución de producción
  | 'CONSUMPTION_OUT' // salida a una OT
  | 'DAMAGE_OUT' // merma o daño
  | 'TRANSFORM_OUT' // pliegos que entran a corte
  | 'TRANSFORM_IN' // cortes que salen de la guillotina
  | 'COUNT_ADJUST'; // ajuste por conteo físico

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  INITIAL: 'Saldo inicial',
  PURCHASE_IN: 'Compra',
  RETURN_IN: 'Devolución',
  CONSUMPTION_OUT: 'Consumo en OT',
  DAMAGE_OUT: 'Merma / daño',
  TRANSFORM_OUT: 'Corte (sale)',
  TRANSFORM_IN: 'Corte (entra)',
  COUNT_ADJUST: 'Ajuste por conteo',
};

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  /** Con signo: positivo entra, negativo sale. */
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceAfter: number;
  avgCostAfter: number;
  projectId?: string;
  projectNumber?: string;
  supplier?: string;
  document?: string;
  note?: string;
  /** Une las dos mitades de un corte. */
  groupId?: string;
  by: string;
  at: string;
}

export class StockError extends Error {
  status = 400;
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const positive = (n: unknown, what: string) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) throw new StockError(`${what} debe ser mayor que cero`);
  return v;
};

/** Costo promedio ponderado al recibir `qty` unidades a `cost` cada una. */
export function weightedAverage(currentQty: number, currentCost: number, qty: number, cost: number): number {
  const base = Math.max(0, currentQty);
  const total = base + qty;
  return total > 0 ? round((base * currentCost + qty * cost) / total) : cost;
}

interface Ctx {
  by: string;
  at: string;
  id: () => string;
}

function movement(item: StockItem, type: MovementType, quantity: number, unitCost: number, ctx: Ctx, extra: Partial<StockMovement> = {}): StockMovement {
  return {
    id: ctx.id(),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity: round(quantity),
    unitCost: round(unitCost),
    totalCost: round(Math.abs(quantity) * unitCost, 2),
    balanceAfter: round(item.available),
    avgCostAfter: round(item.unitCost),
    by: ctx.by,
    at: ctx.at,
    ...extra,
  };
}

/** Entrada (compra, devolución o saldo inicial): suma existencia y recalcula el costo promedio. */
export function receive(item: StockItem, input: { quantity: number; unitCost: number; type?: 'PURCHASE_IN' | 'RETURN_IN' | 'INITIAL'; supplier?: string; document?: string; note?: string }, ctx: Ctx) {
  const qty = positive(input.quantity, 'La cantidad');
  const cost = Number(input.unitCost);
  if (!Number.isFinite(cost) || cost < 0) throw new StockError('El costo unitario no es válido');
  const type = input.type ?? 'PURCHASE_IN';
  // Una devolución vuelve al costo promedio actual
  const unitCost = type === 'RETURN_IN' ? item.unitCost : cost;
  const next: StockItem = {
    ...item,
    unitCost: weightedAverage(item.available, item.unitCost, qty, unitCost),
    lastCost: type === 'RETURN_IN' ? item.lastCost : unitCost,
    available: round(item.available + qty),
    updatedAt: ctx.at,
  };
  return { item: next, movement: movement(next, type, qty, unitCost, ctx, { supplier: input.supplier, document: input.document, note: input.note }) };
}

/** Salida a una OT o por merma: descuenta al costo promedio. No deja existencias negativas. */
export function issue(item: StockItem, input: { quantity: number; type?: 'CONSUMPTION_OUT' | 'DAMAGE_OUT'; projectId?: string; projectNumber?: string; note?: string }, ctx: Ctx) {
  const qty = positive(input.quantity, 'La cantidad');
  if (qty > item.available + 1e-9) {
    throw new StockError(`No hay suficiente ${item.name}: disponible ${round(item.available, 2)} ${item.unit}, se pidieron ${qty}`);
  }
  const next: StockItem = { ...item, available: round(item.available - qty), updatedAt: ctx.at };
  const type = input.type ?? 'CONSUMPTION_OUT';
  if (type === 'CONSUMPTION_OUT' && !input.projectId) throw new StockError('Indica la OT a la que se carga el consumo');
  return {
    item: next,
    movement: movement(next, type, -qty, item.unitCost, ctx, { projectId: input.projectId, projectNumber: input.projectNumber, note: input.note }),
  };
}

/** Conteo físico: ajusta la existencia a lo contado (al costo promedio). Null si no hay diferencia. */
export function count(item: StockItem, counted: number, ctx: Ctx, note?: string) {
  const c = Number(counted);
  if (!Number.isFinite(c) || c < 0) throw new StockError(`Conteo inválido para ${item.name}`);
  const diff = round(c - item.available);
  const next: StockItem = { ...item, available: round(c), lastCountedAt: ctx.at, updatedAt: ctx.at };
  if (diff === 0) return { item: next, movement: null };
  return { item: next, movement: movement(next, 'COUNT_ADJUST', diff, item.unitCost, ctx, { note: note || `Contado: ${c} ${item.unit}` }) };
}

/** Piezas que salen de cada hoja del formato origen al cortarlo en el formato destino (0 si no se puede). */
export function piecesPerSheet(source: PaperSpec, target: PaperSpec): number {
  if (source.name !== target.name || source.sheetFormat !== target.sheetFormat) return 0;
  if (target.divisor <= source.divisor || target.divisor % source.divisor !== 0) return 0;
  return target.divisor / source.divisor;
}

/**
 * Corte en guillotina: salen `sheets` hojas del origen y entran (hojas × piezas − desperdicio)
 * piezas al destino. El costo de lo cortado se reparte entre las piezas buenas, así el
 * desperdicio queda dentro del costo de cada corte.
 */
export function transform(source: StockItem, target: StockItem, input: { sheets: number; wastePieces?: number; note?: string }, ctx: Ctx & { groupId: string }) {
  if (!source.paper || !target.paper) throw new StockError('Solo se transforma papel');
  const per = piecesPerSheet(source.paper, target.paper);
  if (!per) throw new StockError(`No se puede cortar ${source.name} en ${target.name}`);
  const sheets = positive(input.sheets, 'La cantidad de hojas');
  if (!Number.isInteger(sheets)) throw new StockError('Las hojas a cortar deben ser un número entero');
  const waste = Math.max(0, Math.floor(Number(input.wastePieces) || 0));
  const produced = sheets * per - waste;
  if (produced <= 0) throw new StockError('El desperdicio no puede ser igual o mayor que lo producido');

  // Se descuenta como una salida sin OT; abajo se marca como corte
  const out = issue(source, { quantity: sheets, type: 'DAMAGE_OUT', note: input.note }, ctx);
  const sourceCost = sheets * source.unitCost;
  const pieceCost = sourceCost / produced;
  const inRes = receive(target, { quantity: produced, unitCost: pieceCost, type: 'PURCHASE_IN' }, ctx);
  const noteText = `${sheets} × ${per} = ${sheets * per} piezas${waste ? `, ${waste} de desperdicio` : ''}${input.note ? ` · ${input.note}` : ''}`;
  return {
    source: out.item,
    target: inRes.item,
    produced,
    waste,
    pieceCost: round(pieceCost),
    movements: [
      { ...out.movement, type: 'TRANSFORM_OUT' as const, note: `Cortado a ${target.name}: ${noteText}`, groupId: ctx.groupId },
      { ...inRes.movement, type: 'TRANSFORM_IN' as const, note: `Desde ${source.name}: ${noteText}`, groupId: ctx.groupId, supplier: undefined },
    ],
  };
}

export const isLowStock = (i: StockItem) => i.active !== false && (i.available <= 0 ? i.minStock > 0 || i.reserved > 0 : i.available < i.minStock || i.available < i.reserved);

/** Nombre del ítem de papel: "Propalcote 150g · pliego 70×100" o "… · 1/4 de 70×100 (50×35 cm)". */
export function paperItemName(p: PaperSpec): string {
  const fmt = SHEET_FORMAT_LABEL[p.sheetFormat];
  if (p.divisor === 1) return `${p.name} · pliego ${fmt}`;
  return `${p.name} · ${p.cutCode.replace(/^\./, '')} de ${fmt} (${Number(p.widthCm)}×${Number(p.heightCm)} cm)`;
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Id estable del ítem de papel (un corte se crea solo la primera vez que se transforma). */
export const paperItemId = (p: Pick<PaperSpec, 'name' | 'sheetFormat' | 'cutCode'>) => `paper-${slug(p.name)}-${p.sheetFormat.toLowerCase()}-${slug(p.cutCode) || '1'}`;

/** Resumen del mes: valor en bodega, mermas y consumo. */
export function monthSummary(items: StockItem[], movements: StockMovement[], monthPrefix: string) {
  const inMonth = movements.filter((m) => m.at.startsWith(monthPrefix));
  const consumption = inMonth.filter((m) => m.type === 'CONSUMPTION_OUT').reduce((s, m) => s + m.totalCost, 0);
  const damage = inMonth.filter((m) => m.type === 'DAMAGE_OUT').reduce((s, m) => s + m.totalCost, 0);
  const countLoss = inMonth.filter((m) => m.type === 'COUNT_ADJUST' && m.quantity < 0).reduce((s, m) => s + m.totalCost, 0);
  const purchases = inMonth.filter((m) => m.type === 'PURCHASE_IN').reduce((s, m) => s + m.totalCost, 0);
  const used = consumption + damage + countLoss;
  return {
    stockValue: round(items.filter((i) => i.active !== false).reduce((s, i) => s + Math.max(0, i.available) * i.unitCost, 0), 2),
    lowStock: items.filter(isLowStock).length,
    purchases: round(purchases, 2),
    consumption: round(consumption, 2),
    waste: round(damage + countLoss, 2),
    wastePercent: used > 0 ? round(((damage + countLoss) / used) * 100, 1) : 0,
  };
}
