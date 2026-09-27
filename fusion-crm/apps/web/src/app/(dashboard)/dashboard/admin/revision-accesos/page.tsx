import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck, AlertTriangle, CheckCircle2, Play, Printer } from 'lucide-react';
import { notify } from '@/lib/notify';

type Decision = 'KEEP' | 'REMOVE' | 'CHANGE_ROLE';
interface Row {
  employeeId: string;
  name: string;
  email: string;
  roleName: string;
  jobTitle: string;
  lastActivityAt: string | null;
  flags: string[];
  decision: Decision | null;
  note: string;
}
interface Review {
  id: string;
  status: 'OPEN' | 'COMPLETED';
  startedAt: string;
  startedBy: string;
  completedAt?: string;
  completedBy?: string;
  rows: Row[];
  summary?: { kept: number; removed: number; roleChanges: number };
}

const FLAG: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: 'Administrador', cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  NEVER_USED: { label: 'Nunca ha entrado', cls: 'bg-amber-500/10 text-amber-700' },
  IDLE: { label: 'Sin uso en 45+ días', cls: 'bg-amber-500/10 text-amber-700' },
  CUSTOM_PERMISSIONS: { label: 'Permisos especiales', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  DOMAIN_NOT_ALLOWED: { label: 'Dominio no permitido', cls: 'bg-red-500/10 text-red-600' },
};
const DECISIONS: { key: Decision; label: string; cls: string }[] = [
  { key: 'KEEP', label: 'Mantener', cls: 'bg-emerald-600 text-white' },
  { key: 'CHANGE_ROLE', label: 'Cambiar rol', cls: 'bg-blue-600 text-white' },
  { key: 'REMOVE', label: 'Quitar acceso', cls: 'bg-red-600 text-white' },
];
const DECISION_LABEL: Record<Decision, string> = { KEEP: 'Mantener', CHANGE_ROLE: 'Cambiar rol', REMOVE: 'Quitar acceso' };

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca');

export default function RevisionAccesosPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [current, setCurrent] = useState<Row[]>([]);
  const [daysUntilNext, setDaysUntilNext] = useState<number | null>(null);
  const [everyDays, setEveryDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/access-reviews')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setReviews(d.reviews);
        setCurrent(d.current);
        setDaysUntilNext(d.daysUntilNext);
        setEveryDays(d.everyDays);
      })
      .catch((err) => notify(err.message || 'No se pudieron cargar las revisiones', 'error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.success) throw new Error(d.error || `HTTP ${res.status}`);
    return d;
  };

  const open = reviews.find((r) => r.status === 'OPEN');
  const done = reviews.filter((r) => r.status === 'COMPLETED');

  const start = async () => {
    setBusy(true);
    try {
      await call('/api/admin/access-reviews', 'POST');
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (row: Row, decision: Decision | null, note?: string) => {
    if (!open) return;
    try {
      const d = await call(`/api/admin/access-reviews/${open.id}`, 'PATCH', { employeeId: row.employeeId, decision, note });
      setReviews((rs) => rs.map((r) => (r.id === open.id ? d.review : r)));
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const complete = async () => {
    if (!open) return;
    const removed = open.rows.filter((r) => r.decision === 'REMOVE');
    const msg = removed.length
      ? `Se quitará el acceso a ${removed.map((r) => r.name).join(', ')} (quedan inactivos y se cierran sus sesiones). ¿Cerrar la revisión?`
      : '¿Cerrar la revisión? No se quita el acceso a nadie.';
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const d = await call(`/api/admin/access-reviews/${open.id}/complete`, 'POST');
      notify(d.notApplied?.length ? `Revisión cerrada. No se pudo inactivar a: ${d.notApplied.join(', ')}` : 'Revisión cerrada', d.notApplied?.length ? 'error' : 'success');
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Cargando revisiones…</div>;

  const flagged = current.filter((r) => r.flags.some((f) => f !== 'ADMIN')).length;
  const admins = current.filter((r) => r.flags.includes('ADMIN')).length;
  const pending = open ? open.rows.filter((r) => !r.decision).length : 0;

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6 print:p-0">
      <div className="flex justify-between items-start gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="text-primary" /> Revisión de accesos
          </h1>
          <p className="text-muted-foreground mt-1">Cada cierto tiempo, confirmar quién debe seguir entrando al sistema y con qué rol.</p>
        </div>
        {!open && (
          <button onClick={start} disabled={busy} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0">
            <Play className="w-4 h-4" /> Iniciar revisión
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <Stat label="Con acceso" value={current.length} />
        <Stat label="Administradores" value={admins} />
        <Stat label="Con alertas" value={flagged} warn={flagged > 0} />
        <Stat
          label="Próxima revisión"
          value={daysUntilNext === null ? 'Nunca se ha hecho' : daysUntilNext < 0 ? `Vencida hace ${-daysUntilNext} días` : `En ${daysUntilNext} días`}
          warn={daysUntilNext === null || daysUntilNext < 0}
          hint={`Cada ${everyDays} días (se cambia en Política de seguridad)`}
        />
      </div>

      {open ? (
        <div className="border border-border bg-card rounded-lg">
          <div className="p-4 border-b border-border flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h3 className="font-bold">Revisión en curso</h3>
              <p className="text-xs text-muted-foreground">
                Iniciada el {fmtDate(open.startedAt)} por {open.startedBy} · {pending ? `faltan ${pending} por decidir` : 'todo decidido'}
              </p>
            </div>
            <button onClick={complete} disabled={busy || pending > 0} className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              Cerrar revisión
            </button>
          </div>
          <div className="divide-y divide-border">
            {open.rows.map((r) => (
              <div key={r.employeeId} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {r.name} <span className="text-xs text-muted-foreground font-normal">{r.email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.roleName}
                    {r.jobTitle ? ` · ${r.jobTitle}` : ''} · último uso: {fmtDate(r.lastActivityAt)}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.flags.map((f) => (
                      <span key={f} className={`text-[10px] px-2 py-0.5 rounded font-bold ${FLAG[f]?.cls ?? 'bg-muted'}`}>
                        {FLAG[f]?.label ?? f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:w-80">
                  <div className="flex gap-1">
                    {DECISIONS.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => decide(r, r.decision === d.key ? null : d.key)}
                        className={`flex-1 px-2 py-1 rounded text-xs font-bold border ${r.decision === d.key ? `${d.cls} border-transparent` : 'border-border hover:bg-muted'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <input
                    defaultValue={r.note}
                    onBlur={(e) => e.target.value !== r.note && decide(r, r.decision, e.target.value)}
                    placeholder={r.decision === 'CHANGE_ROLE' ? '¿A qué rol? (se cambia en Empleados)' : 'Nota (opcional)'}
                    className="px-2 py-1 border border-border rounded text-xs bg-background"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg print:hidden">
          No hay una revisión abierta. Al iniciarla se toma una foto de quién tiene acceso hoy y se decide persona por persona.
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold print:hidden">Revisiones anteriores</h3>
        {done.length === 0 && <p className="text-sm text-muted-foreground print:hidden">Todavía no se ha cerrado ninguna.</p>}
        {done.map((r) => (
          <div key={r.id} className={`border border-border bg-card rounded-lg p-4 ${openHistory && openHistory !== r.id ? 'print:hidden' : ''}`}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Revisión del {fmtDate(r.completedAt ?? r.startedAt)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cerrada por {r.completedBy} · {r.summary?.kept ?? 0} se mantienen · {r.summary?.removed ?? 0} sin acceso · {r.summary?.roleChanges ?? 0} cambio de rol
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => setOpenHistory(openHistory === r.id ? null : r.id)} className="text-xs text-primary hover:underline">
                  {openHistory === r.id ? 'Ocultar' : 'Ver detalle'}
                </button>
                {openHistory === r.id && (
                  <button onClick={() => window.print()} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Printer className="w-3 h-3" /> Imprimir / PDF
                  </button>
                )}
              </div>
            </div>
            {openHistory === r.id && (
              <table className="w-full text-xs mt-3">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1">Persona</th>
                    <th>Rol</th>
                    <th>Último uso</th>
                    <th>Decisión</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.employeeId} className="border-t border-border">
                      <td className="py-1">{row.name}</td>
                      <td>{row.roleName}</td>
                      <td>{fmtDate(row.lastActivityAt)}</td>
                      <td className={row.decision === 'REMOVE' ? 'text-red-600 font-bold' : ''}>{row.decision ? DECISION_LABEL[row.decision] : '—'}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
      {flagged > 0 && !open && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 print:hidden">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Hay {flagged} persona(s) con alertas: conviene iniciar una revisión.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, warn, hint }: { label: string; value: React.ReactNode; warn?: boolean; hint?: string }) {
  return (
    <div className={`border rounded-lg p-3 bg-card ${warn ? 'border-amber-500/40' : 'border-border'}`} title={hint}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${warn ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</div>
    </div>
  );
}
