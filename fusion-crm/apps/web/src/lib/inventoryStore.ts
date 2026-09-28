import { createServerCollection } from '@/lib/serverCollection';
import type { StockItem, StockMovement } from '../../../../packages/core/src/inventory/stock';

export type InventoryItem = StockItem;
export type { StockMovement };

export interface InventoryCatalog {
  papers: { name: string; sheetFormats: ('S70X100' | 'S60X90')[]; prices: Record<string, number> }[];
  cuts: { code: string; divisor: number; sizes: { sheetFormat: 'S70X100' | 'S60X90'; widthCm: number; heightCm: number }[] }[];
}

export interface InventorySummary {
  stockValue: number;
  lowStock: number;
  purchases: number;
  consumption: number;
  waste: number;
  wastePercent: number;
}

export const INITIAL_INVENTORY: InventoryItem[] = [];

let lastSummary: InventorySummary | null = null;
let lastCatalog: InventoryCatalog | null = null;

async function call<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/inventory${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Inventario: el servidor aplica cada movimiento (/api/inventory) y guarda el kárdex; aquí
 * solo hay una caché para mostrar. Las existencias no se editan directamente.
 */
export const inventoryCollection = createServerCollection<InventoryItem>({
  updatedEvent: 'fusion_inventory_updated',
  adapter: {
    async list() {
      const data = await call('');
      lastSummary = data.summary;
      lastCatalog = data.catalog;
      return data.items;
    },
    async save() {
      throw new Error('El inventario cambia con entradas, salidas, cortes o conteos');
    },
    async remove() {
      throw new Error('Los materiales no se borran: se desactivan');
    },
  },
});

let autoHydrationRequested = false;

export const getInventory = (): InventoryItem[] => {
  if (typeof window === 'undefined') return INITIAL_INVENTORY;
  if (!inventoryCollection.isHydrated() && !autoHydrationRequested) {
    autoHydrationRequested = true;
    inventoryCollection.hydrate().catch((err) => console.warn('No se pudo cargar el inventario:', err));
  }
  return inventoryCollection.getAll();
};

export const getInventorySummary = () => lastSummary;
export const getInventoryCatalog = () => lastCatalog;

const refresh = <T>(result: T) => {
  inventoryCollection.hydrate().catch(() => undefined);
  return result;
};

export const inventoryApi = {
  saveItem: (input: Record<string, unknown>) => call<{ item: InventoryItem }>('/items', input).then(refresh),
  receive: (input: { itemId: string; quantity: number; unitCost: number; type?: 'PURCHASE_IN' | 'RETURN_IN'; supplier?: string; document?: string; note?: string; projectId?: string; projectNumber?: string }) =>
    call<{ item: InventoryItem; movement: StockMovement }>('/receive', input).then(refresh),
  issue: (input: { itemId: string; quantity: number; type?: 'CONSUMPTION_OUT' | 'DAMAGE_OUT'; projectId?: string; projectNumber?: string; note?: string }) =>
    call<{ item: InventoryItem; movement: StockMovement }>('/issue', input).then(refresh),
  transform: (input: { sourceId: string; targetCutCode: string; sheets: number; wastePieces?: number; note?: string }) =>
    call<{ source: InventoryItem; target: InventoryItem; produced: number; waste: number; pieceCost: number }>('/transform', input).then(refresh),
  count: (entries: { itemId: string; counted: number }[], note?: string) => call<{ counted: number; adjusted: number }>('/count', { entries, note }).then(refresh),
  /** Papel de una OT: recalcular y reservar, descargar del inventario o liberar. Devuelven la OT actualizada. */
  planProject: (projectId: string) => call<{ project: any }>(`/projects/${encodeURIComponent(projectId)}/plan`, {}).then(refresh),
  dischargeProject: (projectId: string) => call<{ project: any; total: number }>(`/projects/${encodeURIComponent(projectId)}/discharge`, {}).then(refresh),
  releaseProject: (projectId: string) => call<{ project: any }>(`/projects/${encodeURIComponent(projectId)}/release`, {}).then(refresh),
  movements: (filter: { itemId?: string; projectId?: string; limit?: number } = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return fetch(`/api/inventory/movements?${q}`)
      .then((r) => r.json())
      .then((d) => (d.success ? (d.movements as StockMovement[]) : Promise.reject(new Error(d.error))));
  },
};
