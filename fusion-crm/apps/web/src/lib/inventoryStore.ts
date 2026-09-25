import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  available: number;
  reserved: number;
  unit: string;
  unitCost: number;
}

export const INITIAL_INVENTORY: InventoryItem[] = [];

/** Inventario: fuente de verdad en el servidor (/api/data/inventory), caché en memoria. */
export const inventoryCollection = createServerCollection<InventoryItem>({
  updatedEvent: 'fusion_inventory_updated',
  legacyStorageKey: 'fusion_inventory',
  adapter: dataApiAdapter('inventory'),
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

export const deductInventory = (itemId: string, quantity: number) => {
  const item = getInventory().find((i) => i.id === itemId);
  if (!item) return;
  inventoryCollection
    .save({ ...item, available: Math.max(0, item.available - quantity) })
    .catch((err) => console.warn('No se pudo descontar inventario en el servidor:', err));
};
