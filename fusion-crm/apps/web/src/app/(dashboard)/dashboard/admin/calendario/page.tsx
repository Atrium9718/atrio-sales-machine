import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Info, Save, Plus, Trash2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { DAY_NAMES, type WorkCalendar } from '../../../../../../../../packages/core/src/calendar/workCalendar';

interface DayRow {
  date: string;
  label: string;
  kind: 'HOLIDAY' | 'CLOSED' | 'OPEN';
}

const KIND: Record<DayRow['kind'], { label: string; cls: string }> = {
  HOLIDAY: { label: 'Festivo', cls: 'bg-red-500/10 text-red-600' },
  CLOSED: { label: 'Cierre propio', cls: 'bg-amber-500/10 text-amber-700' },
  OPEN: { label: 'Se trabaja', cls: 'bg-emerald-500/10 text-emerald-700' },
};

const fmt = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });

export default function CalendarioPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<WorkCalendar | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [meta, setMeta] = useState<{ updatedAt?: string; updatedBy?: string } | undefined>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ date: '', label: '', type: 'CLOSED' as 'CLOSED' | 'OPEN' });

  useEffect(() => {
    fetch(`/api/admin/work-calendar?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        if (!dirty) setCalendar(d.calendar);
        setDays(d.days);
        setMeta(d.meta);
      })
      .catch(() => notify('No se pudo cargar el calendario', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (!calendar) return <div className="p-8 text-muted-foreground">Cargando calendario…</div>;

  const change = (next: WorkCalendar) => {
    setCalendar(next);
    setDirty(true);
    // Vista del año con las excepciones sin guardar
    setDays((prev) => [
      ...prev.filter((d) => d.kind === 'HOLIDAY'),
      ...next.exceptions.filter((e) => e.date.startsWith(`${year}-`)).map((e) => ({ date: e.date, label: e.label, kind: e.type })),
    ].sort((a, b) => a.date.localeCompare(b.date)));
  };
  const setDay = (i: number, patch: Partial<WorkCalendar['days'][number]>) => change({ ...calendar, days: calendar.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  const addException = () => {
    if (!draft.date) return notify('Elige la fecha', 'error');
    if (calendar.exceptions.some((e) => e.date === draft.date)) return notify('Ya hay una excepción ese día', 'error');
    change({ ...calendar, exceptions: [...calendar.exceptions, { date: draft.date, label: draft.label || (draft.type === 'CLOSED' ? 'Cierre' : 'Jornada especial'), type: draft.type }].sort((a, b) => a.date.localeCompare(b.date)) });
    setDraft({ date: '', label: '', type: 'CLOSED' });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/work-calendar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calendar, year }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setCalendar(data.calendar);
      setDays(data.days);
      setDirty(false);
      notify('Calendario guardado', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const order = [1, 2, 3, 4, 5, 6, 0];
  const holidays = days.filter((d) => d.kind === 'HOLIDAY').length;

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-primary" /> Calendario laboral
          </h1>
          <p className="text-muted-foreground mt-1">Días y horario de trabajo. Se usa para la fecha de entrega de las OT ("5 días hábiles") y para saber si hay atención humana en la bandeja.</p>
        </div>
        <button onClick={save} disabled={!dirty || saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0">
          <Save className="w-4 h-4" /> {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-border bg-card rounded-lg p-5 space-y-3">
          <h3 className="font-bold text-lg">Semana de trabajo</h3>
          {order.map((i) => {
            const d = calendar.days[i];
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <label className={`flex items-center gap-2 font-medium w-28 cursor-pointer ${d.open ? '' : 'text-muted-foreground'}`}>
                  <input type="checkbox" checked={d.open} onChange={(e) => setDay(i, { open: e.target.checked })} /> {DAY_NAMES[i]}
                </label>
                <div className={`flex items-center gap-1 ${d.open ? '' : 'opacity-40 pointer-events-none'}`}>
                  <input type="time" value={d.from} onChange={(e) => setDay(i, { from: e.target.value })} className="px-2 py-1 border border-border rounded text-sm bg-background" />
                  <span className="text-muted-foreground">–</span>
                  <input type="time" value={d.to} onChange={(e) => setDay(i, { to: e.target.value })} className="px-2 py-1 border border-border rounded text-sm bg-background" />
                </div>
              </div>
            );
          })}
          <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded text-xs flex gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <p>Los días marcados cuentan como hábiles para calcular entregas. El horario de respuesta de la bandeja se ajusta en Omnicanal → Configuración; los festivos y cierres de aquí también aplican allá.</p>
          </div>
        </div>

        <div className="lg:col-span-2 border border-border bg-card rounded-lg p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg">
              Festivos y excepciones {year}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{holidays} festivos de Colombia (Ley Emiliani), calculados automáticamente</span>
            </h3>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-2 py-1 border border-border rounded text-sm bg-background">
              {[0, 1, 2].map((k) => {
                const y = new Date().getFullYear() - 1 + k;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-end p-3 rounded border border-border bg-muted/20">
            <label className="text-xs font-medium">
              Fecha
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="block mt-1 px-2 py-1 border border-border rounded text-sm bg-background" />
            </label>
            <label className="text-xs font-medium flex-1 min-w-40">
              Motivo
              <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Ej: Día de la familia, inventario, temporada" className="block mt-1 w-full px-2 py-1 border border-border rounded text-sm bg-background" />
            </label>
            <label className="text-xs font-medium">
              Tipo
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as any })} className="block mt-1 px-2 py-1 border border-border rounded text-sm bg-background">
                <option value="CLOSED">No se trabaja</option>
                <option value="OPEN">Se trabaja (aunque sea festivo)</option>
              </select>
            </label>
            <button onClick={addException} className="flex items-center gap-1 bg-secondary text-secondary-foreground border border-border px-3 py-1.5 rounded text-sm hover:bg-muted">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          <div className="border border-border rounded overflow-y-auto max-h-[420px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-semibold">Fecha</th>
                  <th className="px-4 py-2 font-semibold">Motivo</th>
                  <th className="px-4 py-2 font-semibold text-center">Tipo</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={`${d.kind}-${d.date}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{fmt(d.date)}</td>
                    <td className="px-4 py-2">{d.label}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${KIND[d.kind].cls}`}>{KIND[d.kind].label}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {d.kind !== 'HOLIDAY' && (
                        <button onClick={() => change({ ...calendar, exceptions: calendar.exceptions.filter((e) => e.date !== d.date) })} className="text-red-600 hover:bg-red-500/10 p-1 rounded" aria-label="Quitar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Si un festivo se trabaja, agrégalo como "Se trabaja". {meta?.updatedAt ? `Último cambio: ${new Date(meta.updatedAt).toLocaleString('es-CO')} por ${meta.updatedBy}.` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
