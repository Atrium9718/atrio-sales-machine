import React, { useEffect, useState } from 'react';
import { Plus, X, Undo2, Layers, RefreshCw, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { getInventory, inventoryApi, type InventoryItem, type StockMovement } from '../../../../../lib/inventoryStore';
import { MOVEMENT_LABEL, SHEET_FORMAT_LABEL, isReservationMovement } from '../../../../../../../../packages/core/src/inventory/stock';
import { pliegosToCut, type PaperPlan } from '../../../../../../../../packages/core/src/inventory/paperPlan';
import { formatCOP, type ProductionProject } from '../productionModel';

type Consumed = ProductionProject['consumedMaterials'][number];
type Tab = 'CONSUMOS' | 'MERMAS' | 'MOVIMIENTOS';

/**
 * Materiales de una OT: lo que sale de bodega (consumo o merma) se descuenta en el servidor,
 * queda en el kárdex y suma al costo de materiales de la OT. Se puede devolver lo que sobró.
 */
export function ProjectMaterials({ project, onChange }: { project: ProductionProject; onChange: (updater: (p: ProductionProject) => ProductionProject) => void }) {
  const [tab, setTab] = useState<Tab>('CONSUMOS');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState({ itemId: '', quantity: 1, type: 'CONSUMPTION_OUT' as 'CONSUMPTION_OUT' | 'DAMAGE_OUT', note: '' });
  const [busy, setBusy] = useState(false);
  const [movements, setMovements] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    if (open) {
      setItems(getInventory().filter((i) => i.active !== false));
      setForm({ itemId: '', quantity: 1, type: 'CONSUMPTION_OUT', note: '' });
    }
  }, [open]);

  useEffect(() => {
    if (tab !== 'MOVIMIENTOS') return;
    setMovements(null);
    inventoryApi
      .movements({ projectId: project.id })
      .then(setMovements)
      .catch(() => setMovements([]));
  }, [tab, project.id, project.materialCost]);

  const all = project.consumedMaterials || [];
  const kind = (m: Consumed) => (m as any).kind ?? 'CONSUMO';
  const consumptions = all.filter((m) => kind(m) !== 'MERMA');
  const damages = all.filter((m) => kind(m) === 'MERMA');
  const selected = items.find((i) => i.id === form.itemId);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return notify('Selecciona un material', 'error');
    setBusy(true);
    try {
      const { movement } = await inventoryApi.issue({ itemId: selected.id, quantity: form.quantity, type: form.type, projectId: project.id, projectNumber: project.number, note: form.note || undefined });
      const entry = {
        id: movement.id,
        movementId: movement.id,
        itemId: selected.id,
        kind: form.type === 'DAMAGE_OUT' ? 'MERMA' : 'CONSUMO',
        name: selected.name,
        unit: selected.unit,
        quantity: Math.abs(movement.quantity),
        unitCost: movement.unitCost,
        totalCost: movement.totalCost,
        note: form.note || undefined,
        date: new Date(movement.at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      } as Consumed;
      onChange((p) => ({ ...p, materialCost: (p.materialCost || 0) + movement.totalCost, consumedMaterials: [...(p.consumedMaterials || []), entry] }));
      notify(`${form.type === 'DAMAGE_OUT' ? 'Merma' : 'Consumo'} registrado: ${entry.quantity} ${selected.unit} de ${selected.name}`, 'success');
      setOpen(false);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const giveBack = async (m: Consumed) => {
    const itemId = (m as any).itemId;
    if (!itemId) return notify('Este consumo se registró antes del kárdex: ajústalo con un conteo en Inventario', 'error');
    const answer = prompt(`¿Cuánto vuelve a bodega de ${m.name}? (máximo ${m.quantity})`, String(m.quantity));
    const qty = Number(answer);
    if (!answer || !Number.isFinite(qty) || qty <= 0) return;
    if (qty > m.quantity) return notify(`No se puede devolver más de ${m.quantity}`, 'error');
    try {
      const { movement } = await inventoryApi.receive({ itemId, quantity: qty, unitCost: m.unitCost, type: 'RETURN_IN', projectId: project.id, projectNumber: project.number, note: `Devolución de ${project.number}` });
      onChange((p) => ({
        ...p,
        materialCost: Math.max(0, (p.materialCost || 0) - movement.totalCost),
        consumedMaterials: (p.consumedMaterials || [])
          .map((x) => (x.id === m.id ? { ...x, quantity: x.quantity - qty, totalCost: Math.round((x.quantity - qty) * x.unitCost * 100) / 100 } : x))
          .filter((x) => x.quantity > 0),
      }));
      notify(`${qty} devuelto(s) a bodega`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const table = (rows: Consumed[], empty: string, canReturn: boolean) => (
    <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Material</th>
            <th className="px-4 py-3">Cant.</th>
            <th className="px-4 py-3">Costo unit.</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Fecha</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{empty}</td>
            </tr>
          ) : (
            rows.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  {m.name}
                  {(m as any).note && <span className="block text-xs text-muted-foreground">{(m as any).note}</span>}
                </td>
                <td className="px-4 py-3">
                  {m.quantity} {(m as any).unit || ''}
                </td>
                <td className="px-4 py-3">{formatCOP(m.unitCost)}</td>
                <td className="px-4 py-3 font-bold">{formatCOP(m.totalCost)}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.date}</td>
                <td className="px-2">
                  {canReturn && (
                    <button onClick={() => giveBack(m)} className="text-xs text-primary hover:underline flex items-center gap-1" title="Devolver a bodega lo que sobró">
                      <Undo2 className="w-3 h-3" /> Devolver
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const paperSheets = consumptions.filter((m) => /pliego|hoja/.test(String((m as any).unit || ''))).reduce((s, m) => s + m.quantity, 0);

  return (
    <div className="space-y-6">
      <PaperPlanCard project={project} onChange={onChange} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi label="Costo de materiales" value={formatCOP(project.materialCost)} />
        <Kpi label="Papel (pliegos y hojas)" value={String(paperSheets)} />
        <Kpi label="Mermas" value={`${damages.length} · ${formatCOP(damages.reduce((s, m) => s + m.totalCost, 0))}`} warn={damages.length > 0} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {(['CONSUMOS', 'MERMAS', 'MOVIMIENTOS'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap ${tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'CONSUMOS' ? 'Consumos' : t === 'MERMAS' ? 'Mermas' : 'Kárdex de la OT'}
            </button>
          ))}
        </div>
        <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 flex items-center gap-1 shrink-0">
          <Plus className="w-3 h-3" /> Sacar de bodega
        </button>
      </div>

      {tab === 'CONSUMOS' && table(consumptions, 'No hay consumos registrados', true)}
      {tab === 'MERMAS' && table(damages, 'No hay mermas registradas en esta OT', false)}
      {tab === 'MOVIMIENTOS' && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Cant.</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements === null ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin movimientos de bodega para esta OT</td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">{MOVEMENT_LABEL[m.type]}</td>
                    <td className="px-4 py-3">{m.itemName}</td>
                    <td className={`px-4 py-3 font-mono ${isReservationMovement(m.type) ? 'text-muted-foreground' : m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isReservationMovement(m.type) ? `(${m.quantity})` : m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-4 py-3">{formatCOP(m.totalCost)}</td>
                    <td className="px-4 py-3">{m.by}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(m.at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
          <form onSubmit={register} className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-muted/20">
              <h2 className="font-bold text-lg">Sacar de bodega para {project.number}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['CONSUMPTION_OUT', 'Consumo', 'Material que va al trabajo'],
                    ['DAMAGE_OUT', 'Merma / daño', 'Se dañó o se desperdició'],
                  ] as const
                ).map(([k, label, hint]) => (
                  <button type="button" key={k} onClick={() => setForm({ ...form, type: k })} className={`p-2 rounded-lg border text-left ${form.type === k ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                    <div className="text-sm font-bold">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{hint}</div>
                  </button>
                ))}
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-muted-foreground">Material</span>
                <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" required>
                  <option value="">Selecciona un material…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id} disabled={i.available <= 0}>
                      {i.name} — {i.available} {i.unit} disponibles
                    </option>
                  ))}
                </select>
                {items.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No hay materiales. Créalos en <Link to="/dashboard/inventario" className="text-primary underline">Inventario</Link>.
                  </span>
                )}
                {selected?.paper?.divisor === 1 && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 block">Son pliegos enteros. Si se imprime en un corte, primero córtalos en Inventario → Cortar.</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-muted-foreground">Cantidad {selected ? `(${selected.unit})` : ''}</span>
                  <input type="number" step="any" min="0.01" max={selected?.available} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" required />
                </label>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground">Costo</span>
                  <div className="px-3 py-2 border border-border bg-muted/50 rounded-md text-sm font-bold">{formatCOP((selected?.unitCost || 0) * form.quantity)}</div>
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-muted-foreground">Observación (opcional)</span>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={form.type === 'DAMAGE_OUT' ? 'Ej: se manchó en máquina, mal corte' : ''} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
              </label>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-bold rounded-md">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md disabled:opacity-50">
                {busy ? 'Registrando…' : 'Registrar y descontar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`p-4 border rounded-xl shadow-sm ${warn ? 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900' : 'bg-card border-border'}`}>
      <p className={`text-xs font-bold mb-1 ${warn ? 'text-red-600' : 'text-muted-foreground'}`}>{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

const PLAN_BADGE: Record<PaperPlan['status'], { label: string; cls: string }> = {
  PENDIENTE: { label: 'Sin reservar', cls: 'bg-amber-500/10 text-amber-700' },
  RESERVADO: { label: 'Reservado en bodega', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  DESCARGADO: { label: 'Descargado del inventario', cls: 'bg-emerald-500/10 text-emerald-700' },
  SIN_PAPEL: { label: 'Sin papel calculado', cls: 'bg-muted text-muted-foreground' },
};

/** Papel del trabajo según la cotización: lo que hay que sacar, lo apartado y si alcanza. */
export function PaperPlanCard({ project, onChange }: { project: ProductionProject; onChange: (updater: (p: ProductionProject) => ProductionProject) => void }) {
  const [busy, setBusy] = useState<'' | 'plan' | 'discharge'>('');
  const plan = project.paperPlan;
  const stock = getInventory();
  const find = (id: string) => stock.find((i) => i.id === id);

  const apply = (updated: any) =>
    onChange((p) => ({ ...p, paperPlan: updated.paperPlan, consumedMaterials: updated.consumedMaterials ?? p.consumedMaterials, materialCost: updated.materialCost ?? p.materialCost }));

  const recompute = async () => {
    setBusy('plan');
    try {
      const { project: updated } = await inventoryApi.planProject(project.id);
      apply(updated);
      notify(updated.paperPlan?.status === 'RESERVADO' ? 'Papel calculado y reservado' : 'Papel calculado', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const discharge = async () => {
    if (!confirm('Se descuenta el papel de la bodega (cortando los pliegos que haga falta) y se carga a esta OT. ¿Continuar?')) return;
    setBusy('discharge');
    try {
      const { project: updated, total } = await inventoryApi.dischargeProject(project.id);
      apply(updated);
      notify(`Papel descargado: ${formatCOP(total)} cargados a ${project.number}`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  if (!plan) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4" /> Esta OT no tiene el papel calculado (se hizo antes de esta función o sin la Ayuda para cotizar).
        </div>
        <button onClick={recompute} disabled={!!busy} className="px-3 py-1.5 border border-border rounded-md text-xs font-bold hover:bg-muted flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${busy === 'plan' ? 'animate-spin' : ''}`} /> Calcular papel de la cotización
        </button>
      </div>
    );
  }

  const badge = PLAN_BADGE[plan.status];
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Papel del trabajo</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="flex gap-2">
          {plan.status !== 'DESCARGADO' && (
            <button onClick={recompute} disabled={!!busy} className="px-3 py-1.5 border border-border rounded-md text-xs font-bold hover:bg-muted flex items-center gap-1 disabled:opacity-50" title="Vuelve a calcular con la cotización actual y reserva de nuevo">
              <RefreshCw className={`w-3 h-3 ${busy === 'plan' ? 'animate-spin' : ''}`} /> Recalcular
            </button>
          )}
          {plan.lines.length > 0 && plan.status !== 'DESCARGADO' && (
            <button onClick={discharge} disabled={!!busy} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50">
              <PackageCheck className="w-3 h-3" /> {busy === 'discharge' ? 'Descargando…' : 'Descargar del inventario'}
            </button>
          )}
        </div>
      </div>

      {plan.lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-2">Papel</th>
                <th className="px-4 py-2 text-right">Hojas a imprimir</th>
                <th className="px-4 py-2 text-right">Pliegos</th>
                <th className="px-4 py-2">En bodega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.lines.map((l) => {
                const source = find(l.sourceItemId);
                const cut = l.divisor > 1 ? find(l.cutItemId) : undefined;
                const toCut = l.divisor > 1 ? pliegosToCut(l, cut?.available ?? 0) : l.pliegos;
                const enough = (source?.available ?? 0) >= toCut;
                return (
                  <tr key={l.key}>
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {l.paperName} · {SHEET_FORMAT_LABEL[l.sheetFormat]}
                        {l.divisor > 1 ? ` cortado en ${l.cutCode.replace('.', '')}` : ' (pliego entero)'}
                      </div>
                      <div className="text-xs text-muted-foreground">{l.items.join(' · ')}</div>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{l.cutSheets.toLocaleString('es-CO')} {l.divisor > 1 ? `hojas de ${l.cutCode.replace('.', '')}` : 'pliegos'}</td>
                    <td className="px-4 py-2 text-right font-bold">{l.pliegos.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2 text-xs">
                      {plan.status === 'DESCARGADO' ? (
                        <span className="text-emerald-700">Descargado</span>
                      ) : !source && !cut ? (
                        <span className="text-amber-700">No está en el inventario: créalo en Inventario para reservarlo</span>
                      ) : (
                        <span className={enough ? '' : 'text-red-600 font-bold'}>
                          {source ? `${source.available} pliegos` : 'sin pliegos'}
                          {cut ? ` · ${cut.available} hojas ya cortadas` : ''}
                          {l.reserved ? ` · ${l.reserved} apartados` : ''}
                          {!enough && ` · faltan ${toCut - (source?.available ?? 0)} pliegos`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 text-xs text-muted-foreground space-y-1">
        {plan.status === 'DESCARGADO' ? (
          <p>
            Descargado el {plan.dischargedAt ? new Date(plan.dischargedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''} por {plan.dischargedBy}:{' '}
            {(plan.discharged ?? []).map((d) => `${d.quantity} ${d.unit} de ${d.itemName} (${formatCOP(d.cost)})`).join('; ')}.
          </p>
        ) : plan.lines.length > 0 ? (
          <p>Se descarga solo al pasar la OT a "En producción" (o con el botón). Si se imprime en un corte, primero se usan las hojas ya cortadas y se cortan los pliegos que falten.</p>
        ) : null}
        {plan.digital.length > 0 && <p>Digital: {plan.digital.map((d) => `${d.sheets} hojas ${d.format} (${d.description})`).join('; ')}. La cotización no dice el papel: regístralo con "Sacar de bodega".</p>}
        {plan.notes.map((n) => (
          <p key={n} className="text-amber-700">
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}
