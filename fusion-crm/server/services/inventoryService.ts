import crypto from 'crypto';
import { documentRepository } from '../repositories/documentStore';
import type { DocumentRepository } from '../repositories/types';
import { getActiveTariff } from './tariffStore';
import type { TariffSnapshot } from '../../packages/core/src/pricing/press/types';
import {
  StockError,
  count,
  issue,
  monthSummary,
  paperItemId,
  paperItemName,
  piecesPerSheet,
  receive,
  transform,
  type PaperSpec,
  type SheetFormat,
  type StockItem,
  type StockMovement,
} from '../../packages/core/src/inventory/stock';
import { pliegosToCut, type PaperPlan } from '../../packages/core/src/inventory/paperPlan';

/**
 * Inventario en el servidor: toda entrada, salida, corte o conteo pasa por aquí, uno a la vez,
 * y deja su movimiento (kárdex). Existencias en `inventory_items`, movimientos en
 * `inventory_movements`.
 */

export interface InventoryDeps {
  items: DocumentRepository<StockItem>;
  movements: DocumentRepository<StockMovement>;
  tariff: () => TariffSnapshot;
  now: () => Date;
}

const fail = (msg: string, status = 400) => Object.assign(new StockError(msg), { status });

/** Ítems guardados antes de este módulo (solo nombre, unidad, disponible y costo). */
export function normalizeItem(raw: any): StockItem {
  return {
    id: String(raw.id),
    name: String(raw.name || raw.id),
    category: String(raw.category || (raw.paper ? 'Papel' : 'Insumo')),
    kind: raw.kind === 'PAPER' || raw.paper ? 'PAPER' : 'SUPPLY',
    unit: String(raw.unit || 'unidad'),
    available: Number(raw.available) || 0,
    reserved: Number(raw.reserved) || 0,
    unitCost: Number(raw.unitCost) || 0,
    lastCost: Number(raw.lastCost ?? raw.unitCost) || 0,
    minStock: Number(raw.minStock) || 0,
    location: raw.location || undefined,
    notes: raw.notes || undefined,
    paper: raw.paper || undefined,
    active: raw.active !== false,
    lastCountedAt: raw.lastCountedAt || undefined,
    createdAt: raw.createdAt || undefined,
    updatedAt: raw.updatedAt || undefined,
  };
}

/** Especificación de papel a partir del tarifario (tamaño del corte según el formato del pliego). */
export function paperSpecFrom(tariff: TariffSnapshot, name: string, sheetFormat: SheetFormat, cutCode = '.1'): PaperSpec {
  const cut = tariff.sheetCuts.find((c) => c.code === cutCode);
  if (!cut) throw fail(`Corte ${cutCode} no existe en el tarifario`);
  const size = cut.sizes.find((s) => s.sheetFormat === sheetFormat);
  if (!size) throw fail(`El corte ${cutCode} no está definido para el pliego ${sheetFormat}`);
  return { name, sheetFormat, cutCode, divisor: cut.divisor, widthCm: Number(size.widthCm), heightCm: Number(size.heightCm) };
}

export function createInventoryService(deps: InventoryDeps) {
  let lock: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.then(fn, fn);
    lock = run.catch(() => undefined);
    return run;
  };
  const ctxFor = (by: string) => {
    const at = deps.now().toISOString();
    return { by, at, id: () => `mov-${at.slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(5).toString('hex')}` };
  };
  const getItem = async (id: string) => {
    const raw = await deps.items.get(String(id || ''));
    if (!raw) throw fail('Material no encontrado', 404);
    return normalizeItem(raw);
  };
  const persist = async (items: StockItem[], movements: StockMovement[]) => {
    for (const i of items) await deps.items.upsert(JSON.parse(JSON.stringify(i)));
    for (const m of movements) await deps.movements.upsert(JSON.parse(JSON.stringify(m)));
  };

  /** Corte sin tomar el turno (lo usan transform y el descargo de papel de una OT). */
  async function transformUnlocked(input: { sourceId: string; targetCutCode: string; sheets: number; wastePieces?: number; note?: string }, by: string) {
    const source = await getItem(input.sourceId);
    if (!source.paper) throw fail('Solo se corta papel');
    const spec = paperSpecFrom(deps.tariff(), source.paper.name, source.paper.sheetFormat, input.targetCutCode);
    if (!piecesPerSheet(source.paper, spec)) throw fail(`${source.paper.cutCode.replace('.', '')} no se puede cortar en ${spec.cutCode.replace('.', '')} exactos`);
    const targetId = paperItemId(spec);
    const target = normalizeItem(
      (await deps.items.get(targetId)) ?? {
        id: targetId,
        name: paperItemName(spec),
        category: 'Papel',
        kind: 'PAPER',
        unit: 'hoja',
        paper: spec,
        location: source.location,
        createdAt: deps.now().toISOString(),
      },
    );
    const ctx = ctxFor(by);
    const r = transform(source, target, input, { ...ctx, groupId: `cut-${crypto.randomBytes(5).toString('hex')}` });
    await persist([r.source, r.target], r.movements);
    return r;
  }

  async function issueUnlocked(input: { itemId: string; quantity: number; type?: 'CONSUMPTION_OUT' | 'DAMAGE_OUT'; projectId?: string; projectNumber?: string; note?: string }, by: string) {
    const r = issue(await getItem(input.itemId), input, ctxFor(by));
    await persist([r.item], [r.movement]);
    return r;
  }

  const reservationMovement = (item: StockItem, type: 'RESERVE' | 'RELEASE', qty: number, project: { id: string; number?: string }, by: string): StockMovement => {
    const ctx = ctxFor(by);
    return {
      id: ctx.id(),
      itemId: item.id,
      itemName: item.name,
      type,
      quantity: qty,
      unitCost: item.unitCost,
      totalCost: 0,
      balanceAfter: item.available,
      avgCostAfter: item.unitCost,
      projectId: project.id,
      projectNumber: project.number,
      note: `${type === 'RESERVE' ? 'Apartados' : 'Liberados'} ${qty} ${item.unit} para ${project.number || project.id}`,
      by,
      at: ctx.at,
    };
  };

  /** Libera lo que una OT tenía apartado. */
  async function releaseUnlocked(project: { id: string; number?: string }, plan: PaperPlan, by: string): Promise<PaperPlan> {
    const lines = [];
    for (const line of plan.lines) {
      const itemId = (line as any).reservedItemId || line.sourceItemId;
      const raw = line.reserved ? await deps.items.get(itemId) : null;
      if (raw && line.reserved) {
        const item = normalizeItem(raw);
        const next = { ...item, reserved: Math.max(0, item.reserved - line.reserved), updatedAt: deps.now().toISOString() };
        await persist([next], [reservationMovement(next, 'RELEASE', line.reserved, project, by)]);
      }
      lines.push({ ...line, reserved: 0 });
    }
    return { ...plan, lines, status: plan.status === 'RESERVADO' ? 'PENDIENTE' : plan.status };
  }

  /** Aparta los pliegos (o, si solo hay cortes en bodega, las hojas cortadas). */
  async function reserveUnlocked(project: { id: string; number?: string }, plan: PaperPlan, by: string): Promise<PaperPlan> {
    const lines = [];
    let any = false;
    for (const line of plan.lines) {
      const source = await deps.items.get(line.sourceItemId);
      const cut = line.divisor > 1 ? await deps.items.get(line.cutItemId) : null;
      const target = source ? normalizeItem(source) : cut ? normalizeItem(cut) : null;
      if (!target) {
        lines.push({ ...line, reserved: 0, inInventory: false });
        continue;
      }
      const qty = source ? line.pliegos : line.cutSheets;
      const next = { ...target, reserved: target.reserved + qty, updatedAt: deps.now().toISOString() };
      await persist([next], [reservationMovement(next, 'RESERVE', qty, project, by)]);
      lines.push({ ...line, reserved: qty, reservedItemId: target.id, inInventory: true } as any);
      any = true;
    }
    return { ...plan, lines, status: any ? 'RESERVADO' : plan.lines.length ? 'PENDIENTE' : 'SIN_PAPEL', reservedAt: any ? deps.now().toISOString() : plan.reservedAt };
  }

  return {
    async list() {
      return (await deps.items.list()).map(normalizeItem).sort((a, b) => a.category.localeCompare(b.category, 'es') || a.name.localeCompare(b.name, 'es'));
    },

    async movements(filter: { itemId?: string; projectId?: string; limit?: number } = {}) {
      const all = await deps.movements.list();
      return all
        .filter((m) => (!filter.itemId || m.itemId === filter.itemId) && (!filter.projectId || m.projectId === filter.projectId))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, Math.min(Math.max(filter.limit ?? 200, 1), 2000));
    },

    async summary() {
      const month = deps.now().toISOString().slice(0, 7);
      return monthSummary(await this.list(), await deps.movements.list(), month);
    },

    /** Crea o edita un material (no cambia existencias: eso va por movimientos). */
    async saveItem(input: any, by: string) {
      return exclusive(async () => {
        const ctx = ctxFor(by);
        let item: StockItem;
        const existing = input.id ? await deps.items.get(String(input.id)) : null;
        if (input.paper) {
          const spec = paperSpecFrom(deps.tariff(), String(input.paper.name || '').trim(), input.paper.sheetFormat, input.paper.cutCode || '.1');
          if (!spec.name) throw fail('Indica el papel');
          const id = existing ? String(input.id) : paperItemId(spec);
          const prev = existing ?? (await deps.items.get(id));
          if (prev && !existing) throw fail(`Ya existe ${paperItemName(spec)}`, 409);
          item = { ...normalizeItem(prev ?? { id }), id, name: paperItemName(spec), category: 'Papel', kind: 'PAPER', unit: spec.divisor === 1 ? 'pliego' : 'hoja', paper: spec };
        } else {
          const name = String(input.name || '').trim();
          if (!name) throw fail('El material necesita un nombre');
          const id = existing ? String(input.id) : `sup-${crypto.randomBytes(6).toString('hex')}`;
          item = { ...normalizeItem(existing ?? { id }), id, name, category: String(input.category || 'Insumo').trim(), kind: 'SUPPLY', unit: String(input.unit || 'unidad').trim() };
        }
        item.minStock = Math.max(0, Number(input.minStock) || 0);
        item.location = input.location ? String(input.location).slice(0, 80) : undefined;
        item.notes = input.notes ? String(input.notes).slice(0, 300) : undefined;
        item.active = input.active !== false;
        item.createdAt ??= ctx.at;
        item.updatedAt = ctx.at;

        const movements: StockMovement[] = [];
        // Saldo inicial al crear (lo que ya hay en bodega hoy)
        const initial = Number(input.initialQuantity) || 0;
        if (!existing && initial > 0) {
          const r = receive(item, { quantity: initial, unitCost: Number(input.initialCost) || 0, type: 'INITIAL', note: 'Saldo inicial' }, ctx);
          item = r.item;
          movements.push(r.movement);
        }
        await persist([item], movements);
        return item;
      });
    },

    async receive(input: { itemId: string; quantity: number; unitCost: number; type?: 'PURCHASE_IN' | 'RETURN_IN'; supplier?: string; document?: string; note?: string; projectId?: string; projectNumber?: string }, by: string) {
      return exclusive(async () => {
        const r = receive(await getItem(input.itemId), input, ctxFor(by));
        if (input.type === 'RETURN_IN') Object.assign(r.movement, { projectId: input.projectId, projectNumber: input.projectNumber });
        await persist([r.item], [r.movement]);
        return r;
      });
    },

    async issue(input: { itemId: string; quantity: number; type?: 'CONSUMPTION_OUT' | 'DAMAGE_OUT'; projectId?: string; projectNumber?: string; note?: string }, by: string) {
      return exclusive(() => issueUnlocked(input, by));
    },

    /** Corta hojas de un papel (pliego o corte) en un corte más pequeño del mismo papel. */
    async transform(input: { sourceId: string; targetCutCode: string; sheets: number; wastePieces?: number; note?: string }, by: string) {
      return exclusive(() => transformUnlocked(input, by));
    },

    /** Reserva el papel de una OT (libera antes lo que tuviera apartado). */
    async reservePlan(project: { id: string; number?: string; paperPlan?: PaperPlan | null }, plan: PaperPlan, by: string) {
      return exclusive(async () => {
        if (project.paperPlan?.status === 'DESCARGADO') throw fail('El papel de esta OT ya se descargó del inventario', 409);
        if (project.paperPlan) await releaseUnlocked(project, project.paperPlan, by);
        return reserveUnlocked(project, plan, by);
      });
    },

    async releasePlan(project: { id: string; number?: string; paperPlan?: PaperPlan | null }, by: string) {
      return exclusive(async () => (project.paperPlan ? releaseUnlocked(project, project.paperPlan, by) : null));
    },

    /**
     * Descarga el papel de la OT: si se imprime en un corte, usa primero las hojas ya cortadas
     * y corta los pliegos que falten; luego carga las hojas a la OT. Si falta papel no descarga
     * nada y dice cuánto falta.
     */
    async dischargePlan(project: { id: string; number?: string; paperPlan?: PaperPlan | null }, by: string) {
      return exclusive(async () => {
        const plan = project.paperPlan;
        if (!plan || !plan.lines.length) throw fail('Esta OT no tiene papel calculado de la cotización');
        if (plan.status === 'DESCARGADO') throw fail('El papel de esta OT ya se descargó', 409);

        const steps = [];
        const shortages: string[] = [];
        for (const line of plan.lines) {
          const source = await deps.items.get(line.sourceItemId).then((r) => (r ? normalizeItem(r) : null));
          if (line.divisor <= 1) {
            if ((source?.available ?? 0) < line.pliegos) shortages.push(`${line.paperName} ${line.sheetFormat}: faltan ${line.pliegos - (source?.available ?? 0)} pliegos`);
            steps.push({ line, toCut: 0 });
            continue;
          }
          const cut = await deps.items.get(line.cutItemId).then((r) => (r ? normalizeItem(r) : null));
          const toCut = pliegosToCut(line, cut?.available ?? 0);
          if (toCut > 0 && (source?.available ?? 0) < toCut) {
            shortages.push(`${line.paperName} ${line.sheetFormat}: se necesitan ${toCut} pliegos para cortar en ${line.cutCode.replace('.', '')} y hay ${source?.available ?? 0}`);
          }
          steps.push({ line, toCut });
        }
        if (shortages.length) throw fail(`Falta papel en bodega. ${shortages.join('; ')}`, 409);

        await releaseUnlocked(project, plan, by);
        const consumed = [];
        const note = `Papel de ${project.number || 'la OT'} calculado de la cotización`;
        for (const { line, toCut } of steps) {
          if (toCut > 0) await transformUnlocked({ sourceId: line.sourceItemId, targetCutCode: line.cutCode, sheets: toCut, note: `Para ${project.number || project.id}` }, by);
          const itemId = line.divisor <= 1 ? line.sourceItemId : line.cutItemId;
          const quantity = line.divisor <= 1 ? line.pliegos : line.cutSheets;
          const r = await issueUnlocked({ itemId, quantity, projectId: project.id, projectNumber: project.number, note }, by);
          consumed.push({
            id: r.movement.id,
            movementId: r.movement.id,
            itemId,
            kind: 'CONSUMO' as const,
            name: r.item.name,
            unit: r.item.unit,
            quantity,
            unitCost: r.movement.unitCost,
            totalCost: r.movement.totalCost,
            note: toCut > 0 ? `${note} (se cortaron ${toCut} pliegos)` : note,
            date: new Date(r.movement.at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
          });
        }
        const done: PaperPlan = {
          ...plan,
          lines: plan.lines.map((l) => ({ ...l, reserved: 0 })),
          status: 'DESCARGADO',
          dischargedAt: deps.now().toISOString(),
          dischargedBy: by,
          discharged: consumed.map((c) => ({ itemName: c.name, quantity: c.quantity, unit: c.unit, cost: c.totalCost })),
        };
        return { plan: done, consumed, total: Math.round(consumed.reduce((sum, c) => sum + c.totalCost, 0) * 100) / 100 };
      });
    },

    /** Conteo físico de varios materiales a la vez. */
    async count(entries: { itemId: string; counted: number }[], by: string, note?: string) {
      return exclusive(async () => {
        const ctx = ctxFor(by);
        const items: StockItem[] = [];
        const movements: StockMovement[] = [];
        for (const e of entries) {
          const r = count(await getItem(e.itemId), e.counted, ctx, note);
          items.push(r.item);
          if (r.movement) movements.push(r.movement);
        }
        await persist(items, movements);
        return { counted: items.length, adjusted: movements.length, movements };
      });
    },
  };
}

export type InventoryService = ReturnType<typeof createInventoryService>;

let instance: InventoryService | null = null;
export function inventoryService(): InventoryService {
  instance ??= createInventoryService({
    items: documentRepository<StockItem>('inventory_items'),
    movements: documentRepository<StockMovement>('inventory_movements'),
    tariff: () => getActiveTariff().snapshot,
    now: () => new Date(),
  });
  return instance;
}

export function __setInventoryService(s: InventoryService | null) {
  instance = s;
}
