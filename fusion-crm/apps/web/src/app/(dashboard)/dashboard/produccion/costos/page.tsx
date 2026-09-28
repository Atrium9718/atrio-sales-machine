import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, AlertTriangle, Search, Info } from 'lucide-react';
import { projectsCollection } from '../../../../../lib/projectsStore';
import { quotesCollection } from '../../../../../lib/quotesStore';
import { computeProfitability, summarize, type ProfitabilityRow } from '@/lib/profitability';

const money = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

function useCollection(col: { getAll(): any[]; hydrate(): Promise<unknown>; isHydrated(): boolean }, event: string) {
  const [items, setItems] = useState<any[]>(col.getAll());
  useEffect(() => {
    const refresh = () => setItems([...col.getAll()]);
    window.addEventListener(event, refresh);
    if (!col.isHydrated()) col.hydrate().then(refresh).catch(() => undefined);
    return () => window.removeEventListener(event, refresh);
  }, [col, event]);
  return items;
}

type Filter = 'ALL' | 'WITH_COSTS' | 'OVER' | 'NO_COSTS';

export default function RentabilidadRealPage() {
  const navigate = useNavigate();
  const projects = useCollection(projectsCollection, 'fusion_projects_updated');
  const quotes = useCollection(quotesCollection, 'fusion_quotes_updated');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => computeProfitability(projects, quotes), [projects, quotes]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => filter === 'ALL' || (filter === 'WITH_COSTS' ? r.realCost > 0 : filter === 'NO_COSTS' ? r.realCost === 0 : (r.costDeviation ?? 0) > 0.1))
      .filter((r) => !q || `${r.number} ${r.client} ${r.name}`.toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [rows, filter, query]);

  const totalReal = summary.breakdown.labor + summary.breakdown.material + summary.breakdown.outsourced + summary.breakdown.other;
  const parts = [
    { label: 'Mano de obra', value: summary.breakdown.labor, color: 'bg-sky-500' },
    { label: 'Materiales', value: summary.breakdown.material, color: 'bg-emerald-500' },
    { label: 'Terceros', value: summary.breakdown.outsourced, color: 'bg-amber-500' },
    { label: 'Otros', value: summary.breakdown.other, color: 'bg-slate-400' },
  ];
  const card = 'bg-card border border-border rounded-xl p-5 shadow-sm';

  const marginTone = (r: ProfitabilityRow) =>
    r.realMargin === null ? 'text-muted-foreground' : r.realMargin < 0 ? 'text-destructive' : r.estimatedMargin !== null && r.realMargin < r.estimatedMargin - 0.05 ? 'text-amber-600' : 'text-success';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" /> Rentabilidad por orden
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Venta de la cotización frente al costo que estimó el cotizador y el costo real que registra producción (mano de obra, materiales, terceros y otros).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground mb-1">Órdenes con costos registrados</div>
          <div className="text-2xl font-black">
            {summary.withRealCosts} <span className="text-base text-muted-foreground font-bold">de {summary.orders}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Venta de esas órdenes: {money(summary.sale)}</div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground mb-1">Margen real</div>
          <div className={`text-2xl font-black ${summary.realMargin !== null && summary.realMargin < 0 ? 'text-destructive' : 'text-success'}`}>{pct(summary.realMargin)}</div>
          <div className="text-xs text-muted-foreground mt-1">Costo real {money(summary.realCost)}</div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground mb-1">Margen estimado</div>
          <div className="text-2xl font-black">{pct(summary.estimatedMargin)}</div>
          <div className="text-xs text-muted-foreground mt-1">El que calculó el cotizador para esas órdenes</div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Sobrecosto
          </div>
          <div className={`text-2xl font-black ${summary.overBudget ? 'text-amber-600' : ''}`}>{summary.overBudget}</div>
          <div className="text-xs text-muted-foreground mt-1">Órdenes que gastaron &gt;10% más de lo estimado</div>
        </div>
      </div>

      {totalReal > 0 && (
        <div className={card}>
          <h3 className="font-bold mb-3">¿En qué se va el costo?</h3>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {parts.map((p) => (p.value > 0 ? <div key={p.label} className={p.color} style={{ width: `${(p.value / totalReal) * 100}%` }} title={p.label} /> : null))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {parts.map((p) => (
              <span key={p.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} /> {p.label}: <b>{money(p.value)}</b> <span className="text-muted-foreground">({Math.round((p.value / totalReal) * 100)}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar orden o cliente…" className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background" />
        </div>
        {(
          [
            ['ALL', 'Todas'],
            ['WITH_COSTS', 'Con costos reales'],
            ['OVER', 'Con sobrecosto'],
            ['NO_COSTS', 'Sin costos registrados'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="border border-border bg-card rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Orden</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-right px-4 py-3">Venta (sin IVA)</th>
              <th className="text-right px-4 py-3">Costo estimado</th>
              <th className="text-right px-4 py-3">Costo real</th>
              <th className="text-right px-4 py-3">Margen est.</th>
              <th className="text-right px-4 py-3">Margen real</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {rows.length === 0 ? 'Aún no hay órdenes de producción.' : 'Ninguna orden con este filtro.'}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.projectId} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => navigate('/dashboard/produccion')}>
                <td className="px-4 py-3">
                  <div className="font-bold">{r.number}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.name}
                    {r.completed ? ' · terminada' : ''}
                  </div>
                </td>
                <td className="px-4 py-3">{r.client}</td>
                <td className="px-4 py-3 text-right font-mono">{money(r.sale)}</td>
                <td className="px-4 py-3 text-right font-mono" title={r.estimatedFromMargin ? 'Parte del costo se dedujo del margen usado en el cotizador' : undefined}>
                  {r.estimatedCost === null ? '—' : `${money(r.estimatedCost)}${r.estimatedFromMargin ? '*' : ''}`}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {r.realCost > 0 ? money(r.realCost) : <span className="text-muted-foreground">sin registrar</span>}
                  {(r.costDeviation ?? 0) > 0.1 && <div className="text-[11px] text-amber-600 font-bold">+{Math.round((r.costDeviation ?? 0) * 100)}% vs. estimado</div>}
                </td>
                <td className="px-4 py-3 text-right">{pct(r.estimatedMargin)}</td>
                <td className={`px-4 py-3 text-right font-bold ${marginTone(r)}`}>{pct(r.realMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0" />
        Los costos reales se registran en el Tablero de producción, dentro de cada orden (horas, materiales consumidos del inventario, terceros y otros). * Parte del costo estimado se dedujo del margen
        usado en el cotizador porque el ítem no tenía costo detallado.
      </p>
    </div>
  );
}
