import { describe, it, expect } from 'vitest';
import { searchProducts, withPriceHistory, type CatalogProduct } from './catalogStore';

const p = (over: Partial<CatalogProduct>): CatalogProduct => ({ id: 'x', name: 'Caja', defaultPrice: 1000, ...over });

describe('catálogo', () => {
  it('registra el historial solo cuando cambia precio o costo', () => {
    const first = withPriceHistory(p({ cost: 600 }), undefined, 'Ana');
    expect(first.priceHistory).toHaveLength(1);
    expect(withPriceHistory({ ...first, name: 'Caja grande' }, first).priceHistory).toHaveLength(1);
    const raised = withPriceHistory({ ...first, defaultPrice: 1200 }, first, 'Luis');
    expect(raised.priceHistory!.map((h) => h.price)).toEqual([1000, 1200]);
    expect(raised.priceHistory![1].by).toBe('Luis');
  });

  it('busca por código, nombre o especificación y oculta archivados', () => {
    const list = [p({ id: '1', code: 'CJ-01', name: 'Caja plegadiza', materials: 'Propalcote' }), p({ id: '2', name: 'Etiqueta', size: '10x5' }), p({ id: '3', name: 'Caja vieja', active: false })];
    expect(searchProducts(list, 'cj-01').map((x) => x.id)).toEqual(['1']);
    expect(searchProducts(list, 'propal').map((x) => x.id)).toEqual(['1']);
    expect(searchProducts(list, 'caja').map((x) => x.id)).toEqual(['1']);
    expect(searchProducts(list, '').map((x) => x.id)).toEqual(['1', '2']);
  });
});
