import React, { useEffect, useMemo, useState } from 'react';
import { Package, Search, Plus, X, Save, Trash2, History, Archive } from 'lucide-react';
import { notify } from '@/lib/notify';
import { getCurrentUserName } from '@/lib/currentUser';
import { catalogCollection, newProductId, searchProducts, withPriceHistory, type CatalogProduct } from '@/lib/catalogStore';

const money = (v?: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

function useCatalog() {
  const [items, setItems] = useState<CatalogProduct[]>(catalogCollection.getAll());
  const [loading, setLoading] = useState(!catalogCollection.isHydrated());
  useEffect(() => {
    const refresh = () => setItems([...catalogCollection.getAll()]);
    window.addEventListener('fusion_catalog_updated', refresh);
    catalogCollection
      .hydrate()
      .catch(() => notify('No se pudo cargar el catálogo.', 'error'))
      .finally(() => setLoading(false));
    return () => window.removeEventListener('fusion_catalog_updated', refresh);
  }, []);
  return { items, loading };
}

export default function CatalogoPage() {
  const { items, loading } = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);

  const categories = useMemo(() => [...new Set(items.map((p) => p.category).filter(Boolean))].sort() as string[], [items]);
  const visible = useMemo(() => {
    const base = showArchived ? items.filter((p) => p.active === false) : items;
    return (showArchived ? base : searchProducts(base, query))
      .filter((p) => !category || p.category === category)
      .filter((p) => !showArchived || !query || p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query, category, showArchived]);

  const blank = (): CatalogProduct => ({ id: newProductId(), name: '', defaultPrice: 0, cost: 0, unit: 'Unidades', active: true });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Catálogo de productos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Productos frecuentes con su precio y ficha técnica. Se usan desde el cotizador con el botón «Catálogo».</p>
        </div>
        <button onClick={() => setEditing(blank())} className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 text-sm">
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background" placeholder="Buscar por código, nombre, tamaño o material…" />
        </div>
        {categories.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" /> Ver archivados
        </label>
      </div>

      <div className="border border-border bg-card rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Cargando…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{items.length === 0 ? 'No hay productos. Crea uno o guarda un ítem desde el cotizador.' : 'Ningún producto coincide.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Especificación</th>
                <th className="text-right px-4 py-3">Precio</th>
                <th className="text-right px-4 py-3">Costo ref.</th>
                <th className="text-right px-4 py-3">Margen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const margin = p.defaultPrice > 0 && p.cost ? (p.defaultPrice - p.cost) / p.defaultPrice : null;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setEditing(p)}>
                    <td className="px-4 py-3">
                      <div className="font-bold">
                        {p.code && <span className="font-mono text-muted-foreground mr-2">{p.code}</span>}
                        {p.name}
                      </div>
                      {p.category && <div className="text-xs text-muted-foreground">{p.category}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px] truncate">{[p.size, p.materials, p.inks, p.finishes].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {money(p.defaultPrice)}
                      <span className="text-[10px] text-muted-foreground"> /{p.unit || 'und'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{p.cost ? money(p.cost) : '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${margin !== null && margin < 0.15 ? 'text-amber-600' : ''}`}>{margin === null ? '—' : `${Math.round(margin * 100)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && <ProductEditor product={editing} existing={items.find((p) => p.id === editing.id)} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductEditor({ product, existing, categories, onClose }: { product: CatalogProduct; existing?: CatalogProduct; categories: string[]; onClose: () => void }) {
  const [form, setForm] = useState<CatalogProduct>(product);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CatalogProduct>(k: K, v: CatalogProduct[K]) => setForm((f) => ({ ...f, [k]: v }));
  const input = 'w-full px-3 py-2 border border-input rounded-md text-sm bg-background';
  const label = 'text-xs font-bold text-muted-foreground';

  const save = async (patch: Partial<CatalogProduct> = {}) => {
    const next = { ...form, ...patch, name: form.name.trim() };
    if (!next.name) return notify('Escribe el nombre del producto.', 'error');
    setSaving(true);
    try {
      await catalogCollection.save(withPriceHistory(next, existing, getCurrentUserName()));
      notify(existing ? 'Producto actualizado.' : 'Producto creado.', 'success');
      onClose();
    } catch {
      notify('No se pudo guardar el producto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-lg">{existing ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className={label}>Nombre</label>
            <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} className={input} placeholder="Ej. Caja plegadiza 20x15x8" />
          </div>
          <div className="space-y-1">
            <label className={label}>Código (opcional)</label>
            <input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Categoría</label>
            <input list="catalog-categories" value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} className={input} placeholder="Cajas, etiquetas, POP…" />
            <datalist id="catalog-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className={label}>Precio de venta (sin IVA)</label>
            <input type="number" min={0} value={form.defaultPrice || ''} onChange={(e) => set('defaultPrice', Number(e.target.value) || 0)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Costo unitario de referencia</label>
            <input type="number" min={0} value={form.cost || ''} onChange={(e) => set('cost', Number(e.target.value) || 0)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Unidad</label>
            <input value={form.unit ?? ''} onChange={(e) => set('unit', e.target.value)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Tamaño</label>
            <input value={form.size ?? ''} onChange={(e) => set('size', e.target.value)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Materiales</label>
            <input value={form.materials ?? ''} onChange={(e) => set('materials', e.target.value)} className={input} />
          </div>
          <div className="space-y-1">
            <label className={label}>Tintas</label>
            <input value={form.inks ?? ''} onChange={(e) => set('inks', e.target.value)} className={input} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className={label}>Acabados</label>
            <input value={form.finishes ?? ''} onChange={(e) => set('finishes', e.target.value)} className={input} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className={label}>Descripción para la cotización</label>
            <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} className={`${input} min-h-[80px] resize-none`} />
          </div>

          {(existing?.priceHistory?.length ?? 0) > 0 && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                <History className="w-4 h-4" /> Historial de precios
              </h3>
              <div className="border border-border rounded-md divide-y divide-border text-xs">
                {[...(existing!.priceHistory ?? [])].reverse().map((h, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {new Date(h.at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                      {h.by ? ` · ${h.by}` : ''}
                    </span>
                    <span>
                      Precio <b>{money(h.price)}</b>
                      {h.cost ? ` · costo ${money(h.cost)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-between gap-3">
          <div className="flex gap-2">
            {existing && (
              <>
                <button onClick={() => save({ active: existing.active === false })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-md">
                  <Archive className="w-4 h-4" /> {existing.active === false ? 'Reactivar' : 'Archivar'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar el producto? Las cotizaciones que ya lo usan no cambian.')) return;
                    await catalogCollection.remove(existing.id);
                    notify('Producto eliminado.');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-md"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground">
              Cancelar
            </button>
            <button onClick={() => save()} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-bold rounded-md text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
