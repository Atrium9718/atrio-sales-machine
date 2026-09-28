import { recalculateQuoteTotals } from '../pricing/quoteReview';
import { normalizeNit } from '../portal/clientProgress';
import { phonesOf } from '../voice/identifyCaller';

/**
 * Kiosco de pedidos: una pantalla pública (tablet o equipo en el mostrador) donde el cliente
 * elige productos del catálogo, deja sus datos y el pedido llega al CRM como pre-cotización.
 */

export interface KioskConfig {
  enabled: boolean;
  title: string;
  welcomeText: string;
  /** Productos del catálogo que se muestran; vacío = todos los activos. */
  productIds: string[];
  /** Permite pedir algo que no está en el catálogo, describiéndolo. */
  allowCustomRequest: boolean;
  /** Muestra el precio del catálogo y el valor estimado del pedido. */
  showPrices: boolean;
  allowFiles: boolean;
  requireEmail: boolean;
  askNit: boolean;
  thankYouText: string;
  /** Segundos sin uso tras los que el kiosco vuelve al inicio y borra lo digitado. */
  idleSeconds: number;
  updatedAt: string | null;
  updatedByName: string | null;
}

export const DEFAULT_KIOSK_CONFIG: KioskConfig = {
  enabled: true,
  title: 'Haz tu pedido',
  welcomeText: 'Elige lo que necesitas, déjanos tus datos y un asesor te confirma el valor y la entrega.',
  productIds: [],
  allowCustomRequest: true,
  showPrices: false,
  allowFiles: true,
  requireEmail: false,
  askNit: true,
  thankYouText: 'Recibimos tu pedido. Un asesor te contactará pronto para confirmar el valor y la fecha de entrega.',
  idleSeconds: 90,
  updatedAt: null,
  updatedByName: null,
};

const text = (v: unknown, fallback: string, max: number) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s || fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

export function normalizeKioskConfig(raw: any): KioskConfig {
  const d = DEFAULT_KIOSK_CONFIG;
  const idle = Math.round(Number(raw?.idleSeconds));
  return {
    enabled: bool(raw?.enabled, d.enabled),
    title: text(raw?.title, d.title, 80),
    welcomeText: text(raw?.welcomeText, d.welcomeText, 400),
    productIds: Array.isArray(raw?.productIds) ? [...new Set(raw.productIds.filter((x: unknown) => typeof x === 'string' && x))].slice(0, 200) as string[] : [],
    allowCustomRequest: bool(raw?.allowCustomRequest, d.allowCustomRequest),
    showPrices: bool(raw?.showPrices, d.showPrices),
    allowFiles: bool(raw?.allowFiles, d.allowFiles),
    requireEmail: bool(raw?.requireEmail, d.requireEmail),
    askNit: bool(raw?.askNit, d.askNit),
    thankYouText: text(raw?.thankYouText, d.thankYouText, 400),
    idleSeconds: Number.isFinite(idle) ? Math.min(600, Math.max(30, idle)) : d.idleSeconds,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
    updatedByName: typeof raw?.updatedByName === 'string' ? raw.updatedByName : null,
  };
}

export interface KioskProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  size: string;
  /** Precio antes de IVA; null si el kiosco no muestra precios o el producto no tiene. */
  price: number | null;
}

/** Productos que ve el cliente: activos, con nombre y, si se eligieron, solo esos. */
export function kioskCatalog(config: KioskConfig, products: any[]): KioskProduct[] {
  const chosen = new Set(config.productIds);
  return (Array.isArray(products) ? products : [])
    .filter((p) => p && typeof p.id === 'string' && p.name && p.active !== false)
    .filter((p) => chosen.size === 0 || chosen.has(p.id))
    .map((p) => {
      const price = Number(p.defaultPrice);
      return {
        id: p.id,
        name: String(p.name),
        description: String(p.description ?? ''),
        category: String(p.category ?? '').trim() || 'Otros',
        unit: String(p.unit ?? '').trim() || 'unidades',
        size: String(p.size ?? ''),
        price: config.showPrices && Number.isFinite(price) && price > 0 ? price : null,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category, 'es') || a.name.localeCompare(b.name, 'es'));
}

export interface KioskOrderItemInput {
  productId?: string | null;
  description?: string | null;
  quantity: number;
  notes?: string | null;
}

/** Arma los ítems de la pre-cotización; rechaza productos que el kiosco no ofrece. */
export function buildKioskItems(
  input: KioskOrderItemInput[],
  config: KioskConfig,
  products: any[],
  now = Date.now(),
): { ok: true; items: any[] } | { ok: false; error: string } {
  const catalog = new Map(kioskCatalog({ ...config, showPrices: true }, products).map((p) => [p.id, p]));
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'Agrega al menos un producto.' };
  const items: any[] = [];
  for (const [index, it] of input.entries()) {
    const quantity = Math.round(Number(it?.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) return { ok: false, error: 'Revisa las cantidades.' };
    const notes = String(it?.notes ?? '').trim();
    const base = {
      id: `it-${now}-${index + 1}`,
      order: index + 1,
      productionMode: 'IN_HOUSE',
      inks: '',
      finishes: '',
      quantity,
      applyVat: true,
      laborHours: 0,
      rawMaterialCost: 0,
      marginPercent: 30,
      showCalcPanel: false,
      isManuallyAdjusted: false,
      lastEditedField: 'quantity',
      notes,
    };
    if (it?.productId) {
      const product = catalog.get(String(it.productId));
      if (!product) return { ok: false, error: 'Uno de los productos ya no está disponible.' };
      const source = products.find((p) => p?.id === product.id) ?? {};
      items.push({
        ...base,
        productId: product.id,
        description: notes ? `${product.name} — ${notes}` : product.name,
        size: product.size,
        material: String(source.materials ?? ''),
        finishes: String(source.finishes ?? ''),
        inks: String(source.inks ?? ''),
        // El precio del catálogo se toma como punto de partida; el asesor lo confirma
        unitPrice: config.showPrices && product.price ? product.price : 0,
      });
    } else {
      if (!config.allowCustomRequest) return { ok: false, error: 'Elige un producto del catálogo.' };
      const description = String(it?.description ?? '').trim();
      if (description.length < 3) return { ok: false, error: 'Describe lo que necesitas.' };
      items.push({ ...base, description: `Por definir: ${description.slice(0, 500)}`, size: '', material: '', unitPrice: 0 });
    }
  }
  return { ok: true, items: recalculateQuoteTotals(items).items };
}

/** Cliente del CRM con el mismo NIT o el mismo celular (últimos 10 dígitos). */
export function matchKioskClient(clients: any[], customer: { phone?: string; nit?: string }): any | null {
  const nit = normalizeNit(customer.nit);
  const phone = String(customer.phone ?? '').replace(/\D/g, '').slice(-10);
  for (const c of Array.isArray(clients) ? clients : []) {
    if (nit && normalizeNit(c?.nit ?? c?.taxId) === nit) return c;
  }
  if (phone.length >= 7) {
    for (const c of Array.isArray(clients) ? clients : []) {
      if (phonesOf(c).some((p) => p.phone.replace(/\D/g, '').slice(-10) === phone)) return c;
    }
  }
  return null;
}
