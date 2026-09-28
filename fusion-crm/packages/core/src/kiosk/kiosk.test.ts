import { describe, it, expect } from 'vitest';
import { DEFAULT_KIOSK_CONFIG, buildKioskItems, kioskCatalog, matchKioskClient, normalizeKioskConfig } from './kiosk';

const products = [
  { id: 'p1', name: 'Tarjetas', category: 'Papelería', defaultPrice: 100, size: '9x5', materials: 'Propalcote 300', active: true },
  { id: 'p2', name: 'Pendón', category: 'Gran formato', defaultPrice: 50000, active: true },
  { id: 'p3', name: 'Viejo', defaultPrice: 10, active: false },
];

describe('kiosco', () => {
  it('normaliza la configuración y acota los segundos de inactividad', () => {
    const c = normalizeKioskConfig({ title: '  ', idleSeconds: 5, productIds: ['p1', 'p1', 3] });
    expect(c.title).toBe(DEFAULT_KIOSK_CONFIG.title);
    expect(c.idleSeconds).toBe(30);
    expect(c.productIds).toEqual(['p1']);
  });

  it('muestra solo productos activos, los elegidos y sin precio si no se configuró', () => {
    const all = kioskCatalog(DEFAULT_KIOSK_CONFIG, products);
    expect(all.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(all.every((p) => p.price === null)).toBe(true);
    const chosen = kioskCatalog({ ...DEFAULT_KIOSK_CONFIG, productIds: ['p1'], showPrices: true }, products);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].price).toBe(100);
  });

  it('arma los ítems con precio del catálogo solo si se muestran precios', () => {
    const noPrice = buildKioskItems([{ productId: 'p1', quantity: 500, notes: 'dos caras' }], DEFAULT_KIOSK_CONFIG, products);
    expect(noPrice.ok && noPrice.items[0].unitPrice).toBe(0);
    const priced = buildKioskItems([{ productId: 'p1', quantity: 500 }], { ...DEFAULT_KIOSK_CONFIG, showPrices: true }, products);
    if ('error' in priced) throw new Error(priced.error);
    expect(priced.items[0]).toMatchObject({ description: 'Tarjetas', material: 'Propalcote 300', subtotal: 50000, vatAmount: 9500, total: 59500 });
    if (noPrice.ok) expect(noPrice.items[0].description).toBe('Tarjetas — dos caras');
  });

  it('rechaza productos no ofrecidos y pedidos libres si están apagados', () => {
    const cfg = { ...DEFAULT_KIOSK_CONFIG, productIds: ['p1'] };
    expect(buildKioskItems([{ productId: 'p2', quantity: 1 }], cfg, products).ok).toBe(false);
    expect(buildKioskItems([{ productId: 'p3', quantity: 1 }], DEFAULT_KIOSK_CONFIG, products).ok).toBe(false);
    expect(buildKioskItems([{ description: 'Stickers troquelados', quantity: 100 }], cfg, products).ok).toBe(true);
    expect(buildKioskItems([{ description: 'Stickers', quantity: 100 }], { ...cfg, allowCustomRequest: false }, products).ok).toBe(false);
    expect(buildKioskItems([{ productId: 'p1', quantity: 0 }], cfg, products).ok).toBe(false);
    expect(buildKioskItems([], cfg, products).ok).toBe(false);
  });

  it('reconoce al cliente por NIT o por celular', () => {
    const clients = [
      { id: 'c1', name: 'Acme', nit: '900.123.456-7' },
      { id: 'c2', name: 'Pedro', phone: '+57 310 555 1234' },
    ];
    expect(matchKioskClient(clients, { nit: '900123456-7' })?.id).toBe('c1');
    expect(matchKioskClient(clients, { phone: '3105551234' })?.id).toBe('c2');
    expect(matchKioskClient(clients, { phone: '3000000000' })).toBeNull();
  });
});
