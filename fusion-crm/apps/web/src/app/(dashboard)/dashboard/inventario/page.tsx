import * as React from 'react';
import { Search, Package, TrendingDown, AlertTriangle, Plus, Scissors, ClipboardCheck, ShoppingCart, Pencil, History, MinusCircle, Wallet } from 'lucide-react';
import { notify } from '@/lib/notify';
import { getInventory, getInventoryCatalog, getInventorySummary, inventoryApi, inventoryCollection, type InventoryItem, type StockMovement } from '../../../../lib/inventoryStore';
import { MOVEMENT_LABEL, isLowStock } from '../../../../../../../packages/core/src/inventory/stock';
import { CutDialog, MaterialDialog, PurchaseDialog, WriteOffDialog, money } from './InventoryDialogs';

type Tab = 'STOCK' | 'KARDEX' | 'COUNT';
type DialogState = { kind: 'material'; item?: InventoryItem } | { kind: 'purchase' | 'writeoff' | 'cut'; itemId?: string } | null;

export default function InventarioDashboardPage() {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [tab, setTab] = React.useState<Tab>('STOCK');
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [onlyLow, setOnlyLow] = React.useState(false);
  const [showInactive, setShowInactive] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [kardexItem, setKardexItem] = React.useState('');
  const [movements, setMovements] = React.useState<StockMovement[] | null>(null);
  const [counts, setCounts] = React.useState<Record<string, string>>({});
  const [countBusy, setCountBusy] = React.useState(false);

  React.useEffect(() => {
    setInventory(getInventory());
    const refresh = () => setInventory(inventoryCollection.getAll());
    window.addEventListener('fusion_inventory_updated', refresh);
    inventoryCollection.hydrate().then(refresh).catch(() => undefined);
    return () => window.removeEventListener('fusion_inventory_updated', refresh);
  }, []);

  React.useEffect(() => {
    if (tab !== 'KARDEX') return;
    setMovements(null);
    inventoryApi
      .movements({ itemId: kardexItem || undefined, limit: 500 })
      .then(setMovements)
      .catch((err) => {
        notify(err.message, 'error');
        setMovements([]);
      });
  }, [tab, kardexItem, inventory]);

  const summary = getInventorySummary();
  const catalog = getInventoryCatalog();
  const active = inventory.filter((i) => i.active !== false);
  const categories = [...new Set(active.map((i) => i.category))].sort();
  const q = search.trim().toLowerCase();
  const visible = inventory.filter(
    (i) =>
      (showInactive || i.active !== false) &&
      (!category || i.category === category) &&
      (!onlyLow || isLowStock(i)) &&
      (!q || `${i.name} ${i.category} ${i.location ?? ''}`.toLowerCase().includes(q)),
  );
  const low = active.filter(isLowStock);

  const openKardex = (id: string) => {
    setKardexItem(id);
    setTab('KARDEX');
  };

  const countDiffs = active
    .filter((i) => counts[i.id] !== undefined && counts[i.id] !== '' && Number(counts[i.id]) !== i.available)
    .map((i) => ({ item: i, counted: Number(counts[i.id]), diff: Number(counts[i.id]) - i.available }));
  const applyCount = async () => {
    const entries = active.filter((i) => counts[i.id] !== undefined && counts[i.id] !== '').map((i) => ({ itemId: i.id, counted: Number(counts[i.id]) }));
    if (!entries.length) return notify('Escribe al menos una cantidad contada', 'error');
    if (!confirm(`Se registran ${entries.length} conteo(s); ${countDiffs.length} con diferencia se ajustan. ¿Continuar?`)) return;
    setCountBusy(true);
    try {
      const r = await inventoryApi.count(entries, 'Conteo físico');
      notify(`Conteo aplicado: ${r.counted} materiales, ${r.adjusted} ajustados`, 'success');
      setCounts({});
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setCountBusy(false);
    }
  };

  const itemById = (id: string) => inventory.find((i) => i.id === id);

  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full pb-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Inventario y materiales</h1>
          <p className="text-sm text-muted-foreground mt-1">El papel entra en pliegos y se corta; cada movimiento queda en el kárdex con su costo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog({ kind: 'material' })} className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo material
          </button>
          <button onClick={() => setDialog({ kind: 'cut' })} className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Cortar papel
          </button>
          <button onClick={() => setDialog({ kind: 'purchase' })} className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 shadow-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Ingresar compra
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Package} label="Valor en bodega" value={money(summary?.stockValue ?? 0)} hint={`${active.length} materiales`} />
        <Kpi
          icon={AlertTriangle}
          label="Bajo el mínimo"
          value={String(low.length)}
          hint="Agotados, bajo mínimo o sin cubrir lo reservado"
          warn={low.length > 0}
          onClick={() => {
            setOnlyLow(true);
            setTab('STOCK');
          }}
        />
        <Kpi icon={Wallet} label="Compras del mes" value={money(summary?.purchases ?? 0)} hint={`Consumo en OT ${money(summary?.consumption ?? 0)}`} />
        <Kpi icon={TrendingDown} label="Mermas del mes" value={`${summary?.wastePercent ?? 0}%`} hint={`${money(summary?.waste ?? 0)} en daños y ajustes`} warn={(summary?.wastePercent ?? 0) > 5} />
      </div>

      <div className="flex bg-muted p-1 rounded-lg w-fit">
        {(
          [
            ['STOCK', 'Existencias'],
            ['KARDEX', 'Kárdex'],
            ['COUNT', 'Conteo físico'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 text-sm font-bold rounded-md ${tab === k ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'STOCK' && (
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar papel, tinta, ubicación…" className="h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Solo bajo mínimo
            </label>
            <label className="text-sm flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Ver desactivados
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Disponible</th>
                  <th className="px-4 py-3 text-right">Mínimo</th>
                  <th className="px-4 py-3 text-right">Costo prom.</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      {inventory.length === 0 ? 'Todavía no hay materiales. Crea el primero con "Nuevo material" (el papel se elige del tarifario).' : 'Ningún material con este filtro.'}
                    </td>
                  </tr>
                ) : (
                  visible.map((i) => {
                    const lowItem = isLowStock(i);
                    return (
                      <tr key={i.id} className={`hover:bg-muted/30 ${i.active === false ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.category}
                            {i.location ? ` · ${i.location}` : ''}
                            {i.lastCountedAt ? ` · contado ${new Date(i.lastCountedAt).toLocaleDateString('es-CO')}` : ''}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${lowItem ? 'text-red-600' : ''}`}>
                          {i.available.toLocaleString('es-CO')} {i.unit}
                          {i.reserved > 0 && <div className="text-[10px] font-normal text-muted-foreground">{i.reserved} reservados</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{i.minStock || '—'}</td>
                        <td className="px-4 py-3 text-right">{money(i.unitCost)}</td>
                        <td className="px-4 py-3 text-right font-medium">{money(i.available * i.unitCost)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconBtn title="Entrada por compra" onClick={() => setDialog({ kind: 'purchase', itemId: i.id })} icon={ShoppingCart} />
                            {i.paper && i.available > 0 && i.paper.divisor < 64 && <IconBtn title="Cortar" onClick={() => setDialog({ kind: 'cut', itemId: i.id })} icon={Scissors} />}
                            <IconBtn title="Merma o daño" onClick={() => setDialog({ kind: 'writeoff', itemId: i.id })} icon={MinusCircle} />
                            <IconBtn title="Kárdex" onClick={() => openKardex(i.id)} icon={History} />
                            <IconBtn title="Editar" onClick={() => setDialog({ kind: 'material', item: i })} icon={Pencil} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'KARDEX' && (
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <select value={kardexItem} onChange={(e) => setKardexItem(e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm max-w-md">
              <option value="">Todos los materiales</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {kardexItem && itemById(kardexItem) && (
              <span className="text-sm text-muted-foreground">
                Saldo actual: <b className="text-foreground">{itemById(kardexItem)!.available} {itemById(kardexItem)!.unit}</b> · costo promedio {money(itemById(kardexItem)!.unitCost)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Movimiento</th>
                  {!kardexItem && <th className="px-4 py-3">Material</th>}
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Costo unit.</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Quién</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements === null ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">Cargando…</td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">Sin movimientos.</td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(m.at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{MOVEMENT_LABEL[m.type] ?? m.type}</td>
                      {!kardexItem && <td className="px-4 py-2">{m.itemName}</td>}
                      <td className={`px-4 py-2 text-right font-mono ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                      <td className="px-4 py-2 text-right">{money(m.unitCost)}</td>
                      <td className="px-4 py-2 text-right font-medium">{m.balanceAfter}</td>
                      <td className="px-4 py-2 text-xs">{[m.projectNumber && `OT ${m.projectNumber}`, m.supplier, m.document && `Doc. ${m.document}`, m.note].filter(Boolean).join(' · ')}</td>
                      <td className="px-4 py-2 text-xs">{m.by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'COUNT' && (
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 border-b border-border flex flex-wrap justify-between gap-3 items-center">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 shrink-0" /> Escribe lo que contaste en bodega; los que dejes vacíos no cambian. Las diferencias quedan como ajuste en el kárdex.
            </div>
            <button onClick={applyCount} disabled={countBusy} className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-bold disabled:opacity-50">
              {countBusy ? 'Aplicando…' : `Aplicar conteo${countDiffs.length ? ` (${countDiffs.length} diferencias)` : ''}`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Según sistema</th>
                  <th className="px-4 py-3 w-40">Contado</th>
                  <th className="px-4 py-3 text-right">Diferencia</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {active.map((i) => {
                  const v = counts[i.id];
                  const diff = v !== undefined && v !== '' ? Number(v) - i.available : null;
                  return (
                    <tr key={i.id}>
                      <td className="px-4 py-2">
                        {i.name}
                        <span className="block text-xs text-muted-foreground">{i.location}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {i.available} {i.unit}
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} step="any" value={v ?? ''} onChange={(e) => setCounts({ ...counts, [i.id]: e.target.value })} className="w-full px-2 py-1 border border-input rounded bg-background text-sm" />
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${diff === null || diff === 0 ? 'text-muted-foreground' : diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{diff === null ? '' : diff > 0 ? `+${diff}` : diff}</td>
                      <td className="px-4 py-2 text-right">{diff ? money(diff * i.unitCost) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialog?.kind === 'material' && <MaterialDialog item={dialog.item} catalog={catalog} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'purchase' && <PurchaseDialog items={active} preselect={dialog.itemId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'writeoff' && <WriteOffDialog items={active.filter((i) => i.available > 0)} preselect={dialog.itemId} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'cut' && <CutDialog items={active} catalog={catalog} preselect={dialog.itemId} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, warn, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string; warn?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`text-left bg-card rounded-xl border p-5 shadow-sm ${warn ? 'border-amber-500/50' : 'border-border'} ${onClick ? 'hover:bg-muted/30' : 'cursor-default'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${warn ? 'text-amber-600' : 'text-muted-foreground'}`} />
      </div>
      <div className={`text-2xl font-bold ${warn ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </button>
  );
}

function IconBtn({ title, onClick, icon: Icon }: { title: string; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
      <Icon className="w-4 h-4" />
    </button>
  );
}
