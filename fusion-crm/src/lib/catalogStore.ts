import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';

export interface PricePoint {
  at: string;
  price: number;
  cost?: number;
  by?: string;
}

export interface CatalogProduct {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  defaultPrice: number;
  /** Costo unitario de referencia. */
  cost?: number;
  size?: string;
  inks?: string;
  materials?: string;
  finishes?: string;
  specSheet?: Record<string, unknown>;
  active?: boolean;
  priceHistory?: PricePoint[];
  createdAt?: string;
  updatedAt?: string;
}

/** Catálogo de productos: en el servidor (/api/data/products). Migra lo que el cotizador guardaba en el navegador. */
export const catalogCollection = createServerCollection<CatalogProduct>({
  updatedEvent: 'fusion_catalog_updated',
  legacyStorageKey: 'fusion_custom_catalog',
  fromLegacy: (raw) =>
    raw && typeof raw.id === 'string' && raw.name
      ? { ...raw, defaultPrice: Number(raw.defaultPrice) || 0, cost: Number(raw.cost) || 0, active: true }
      : null,
  adapter: dataApiAdapter('products'),
});

export const newProductId = () => `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Guarda el producto dejando constancia del cambio de precio o costo. */
export function withPriceHistory(next: CatalogProduct, prev: CatalogProduct | undefined, by?: string): CatalogProduct {
  const changed = !prev || prev.defaultPrice !== next.defaultPrice || (prev.cost ?? 0) !== (next.cost ?? 0);
  if (!changed) return next;
  const point: PricePoint = { at: new Date().toISOString(), price: next.defaultPrice, cost: next.cost, by };
  return { ...next, priceHistory: [...(prev?.priceHistory ?? next.priceHistory ?? []), point] };
}

export function searchProducts(products: CatalogProduct[], query: string) {
  const q = query.trim().toLowerCase();
  const list = products.filter((p) => p.active !== false);
  if (!q) return list;
  return list.filter((p) => [p.code, p.name, p.description, p.category, p.size, p.materials, p.finishes].some((f) => (f ?? '').toLowerCase().includes(q)));
}
