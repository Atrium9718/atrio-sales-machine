import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X, CheckCircle2, Lock, TrendingUp, TrendingDown, ChevronDown, Info } from 'lucide-react';
import type { TariffSnapshot } from '../../../../../packages/core/src/pricing/press/types';
import { buildRevision, isLockedQuote, ITEM_STATUS_LABEL, recalculateQuote, type QuoteRecalc } from './recalculate';
import { notify } from '@/lib/notify';

interface MassRecalculateModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: any[];
  onApplyRevisions: (updatedQuotes: any[]) => void;
}

interface TariffVersion {
  id: string;
  code?: string;
  name?: string;
}

interface Row {
  quote: any;
  recalc: QuoteRecalc;
  locked: boolean;
  selected: boolean;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/**
 * Recalcula las cotizaciones abiertas con el tarifario vigente y, para las que se elijan,
 * crea una nueva revisión (la original no se toca). Las aprobadas no se recalculan.
 */
export const MassRecalculateModal: React.FC<MassRecalculateModalProps> = ({ isOpen, onClose, quotes, onApplyRevisions }) => {
  const [tariff, setTariff] = useState<{ version: TariffVersion; snapshot: TariffSnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [applied, setApplied] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setApplied(null);
    setError(null);
    fetch('/api/tariff/snapshot')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.snapshot) throw new Error(d.error || 'Sin tarifario vigente');
        setTariff({ version: d.version, snapshot: d.snapshot });
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el tarifario vigente'));
  }, [isOpen]);

  // El cálculo es local y rápido: se hace al abrir, sin colas
  useEffect(() => {
    if (!tariff) return;
    setRows(
      quotes
        .filter((q) => String(q.status || '').toLowerCase() !== 'rechazada' && Array.isArray(q.items) && q.items.length)
        .map((q) => {
          const locked = isLockedQuote(q);
          const recalc = recalculateQuote(q, tariff.snapshot);
          return { quote: q, recalc, locked, selected: !locked && recalc.recalculated > 0 && Math.abs(recalc.diffAmount) >= 1 };
        }),
    );
  }, [tariff, quotes]);

  const visible = useMemo(() => (onlyChanges ? rows.filter((r) => r.recalc.recalculated > 0 && Math.abs(r.recalc.diffAmount) >= 1) : rows), [rows, onlyChanges]);
  const selected = rows.filter((r) => r.selected && !r.locked);

  if (!isOpen) return null;

  const apply = () => {
    if (!tariff || !selected.length) return notify('No hay cotizaciones seleccionadas', 'error');
    const revisions = selected.map((r) => buildRevision(r.quote, r.recalc, tariff.version));
    onApplyRevisions(revisions);
    setApplied(revisions.length);
  };

  const withoutSheet = rows.reduce((n, r) => n + r.recalc.items.filter((i) => i.status === 'NO_SHEET').length, 0);

  return (
    <div className="fixed inset-0 z-[75] bg-black/75 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground">Recalcular con el tarifario vigente</h3>
              <p className="text-xs text-muted-foreground">
                {tariff ? `${tariff.version.name || tariff.version.code || tariff.version.id}` : error ? 'Sin tarifario' : 'Cargando tarifario…'} · se crea una revisión nueva; la cotización original no cambia
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-6 text-sm text-destructive">{error}</div>}

        {applied !== null ? (
          <div className="p-12 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            <h4 className="text-lg font-bold">{applied} revisión(es) creadas</h4>
            <p className="text-xs text-muted-foreground max-w-md">Quedan en borrador con el tarifario vigente. Revísalas y envíalas al cliente; las anteriores siguen en el historial.</p>
            <button type="button" onClick={onClose} className="mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              Cerrar
            </button>
          </div>
        ) : (
          tariff && (
            <>
              <div className="px-6 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} /> Solo las que cambian de precio
                </label>
                <span className="text-muted-foreground">
                  {rows.length} cotizaciones revisadas · <strong className="text-foreground">{selected.length}</strong> seleccionadas
                </span>
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Las aprobadas no se tocan
                </span>
              </div>
              {withoutSheet > 0 && (
                <div className="mx-6 mt-3 p-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    {withoutSheet} ítem(s) no se hicieron con la Ayuda para cotizar: no hay con qué recalcularlos, así que conservan su precio.
                  </span>
                </div>
              )}

              <div className="overflow-y-auto flex-1 p-6 pt-3">
                {visible.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Ninguna cotización cambia de precio con el tarifario vigente.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-[11px] font-bold uppercase">
                        <th className="py-2 px-2 w-8" />
                        <th className="py-2 px-2">Cotización</th>
                        <th className="py-2 px-2">Cliente</th>
                        <th className="py-2 px-2 text-right">Antes</th>
                        <th className="py-2 px-2 text-right">Ahora</th>
                        <th className="py-2 px-2 text-right">Variación</th>
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {visible.map((r) => {
                        const up = r.recalc.diffAmount > 0;
                        const open = expanded === r.quote.id;
                        return (
                          <React.Fragment key={r.quote.id}>
                            <tr className={r.locked ? 'opacity-60' : r.selected ? 'bg-primary/5' : ''}>
                              <td className="py-2.5 px-2">
                                {r.locked ? (
                                  <Lock className="w-4 h-4 text-muted-foreground" aria-label="Aprobada" />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={r.selected}
                                    disabled={r.recalc.recalculated === 0}
                                    onChange={() => setRows((rs) => rs.map((x) => (x.quote.id === r.quote.id ? { ...x, selected: !x.selected } : x)))}
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="font-bold font-mono">{r.quote.number}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {r.quote.status || 'Borrador'} · {r.recalc.recalculated}/{r.recalc.items.length} ítems recalculables
                                </div>
                              </td>
                              <td className="py-2.5 px-2 truncate max-w-[180px]">{r.quote.clientData?.name || r.quote.clientName || '—'}</td>
                              <td className="py-2.5 px-2 text-right font-mono text-muted-foreground">{money(r.recalc.oldTotal)}</td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold">{money(r.recalc.newTotal)}</td>
                              <td className="py-2.5 px-2 text-right font-mono">
                                {Math.abs(r.recalc.diffAmount) < 1 ? (
                                  <span className="text-muted-foreground">Sin cambio</span>
                                ) : (
                                  <span className={`inline-flex items-center gap-0.5 font-bold ${up ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {up ? '+' : ''}
                                    {r.recalc.diffPercent.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                              <td>
                                <button type="button" onClick={() => setExpanded(open ? null : r.quote.id)} className="p-1 rounded hover:bg-muted" aria-label="Ver ítems">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                            </tr>
                            {open && (
                              <tr>
                                <td colSpan={7} className="bg-muted/20 px-4 py-2">
                                  {r.recalc.items.map((it, i) => (
                                    <div key={i} className="flex justify-between gap-3 py-1 border-b border-border/40 last:border-0">
                                      <span className="truncate">
                                        {(it.item.description || it.item.name || 'Ítem').split('\n')[0]} · {Number(it.item.quantity || 0).toLocaleString('es-CO')} un.
                                        <span className="block text-[10px] text-muted-foreground">{ITEM_STATUS_LABEL[it.status]}</span>
                                      </span>
                                      <span className="font-mono shrink-0">
                                        {money(it.oldTotal)} → <b>{money(it.newTotal)}</b>
                                      </span>
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold">
                  Cancelar
                </button>
                <button type="button" onClick={apply} disabled={!selected.length} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 disabled:opacity-50">
                  <CheckCircle2 className="w-4 h-4" /> Crear {selected.length} revisión(es)
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};
