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

export const getInventory = (): InventoryItem[] => {
  if (typeof window === 'undefined') return INITIAL_INVENTORY;
  const stored = localStorage.getItem('fusion_inventory');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  }
  return INITIAL_INVENTORY;
};

export const deductInventory = (itemId: string, quantity: number) => {
  const inventory = getInventory();
  const updated = inventory.map(item => {
    if (item.id === itemId) {
      return { ...item, available: Math.max(0, item.available - quantity) };
    }
    return item;
  });
  localStorage.setItem('fusion_inventory', JSON.stringify(updated));
  window.dispatchEvent(new Event('fusion_inventory_updated'));
};
