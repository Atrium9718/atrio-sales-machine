import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, LogOut, AlertTriangle, MonitorSmartphone, Save, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
import { notify } from '@/lib/notify';

interface Policy {
  sessionDays: number;
  allowedDomains: string[];
  reviewEveryDays: number;
}
interface Session {
  id: string;
  name: string;
  email: string;
  device: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}
interface SecEvent {
  id: string;
  at: string;
  type: string;
  email?: string;
  name?: string;
  detail: string;
  ip?: string;
}
interface Data {
  policy: Policy;
  meta?: { updatedAt?: string; updatedBy?: string };
  sessions: Session[];
  events: SecEvent[];
  alerts: { denied24h: number; repeated: { key: string; count: number }[] };
}

const EVENT_LABEL: Record<string, string> = {
  LOGIN_OK: 'Ingreso',
  LOGIN_DENIED: 'Ingreso rechazado',
  SESSION_REVOKED: 'Sesión cerrada',
  POLICY_CHANGED: 'Cambio de política',
  ACCESS_REVIEW: 'Revisión de accesos',
};

const ago = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 2) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
};

export default function SeguridadPage() {
  const [data, setData] = useState<Data | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [domains, setDomains] = useState('');
  const [saving, setSaving] = useState(false);
  const [onlyDenied, setOnlyDenied] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/security')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setData(d);
        setPolicy(d.policy);
        setDomains(d.policy.allowedDomains.join(', '));
      })
      .catch((err) => notify(err.message || 'No se pudo cargar la seguridad', 'error'));
  }, []);
  useEffect(load, [load]);

  if (!data || !policy) return <div className="p-8 text-muted-foreground">Cargando política de seguridad…</div>;

  const save = async () => {
    const list = domains.split(/[,\s]+/).map((d) => d.trim().replace(/^@/, '')).filter(Boolean);
    const me = data.sessions.find((s) => s.current)?.email?.split('@')[1];
    if (list.length && me && !list.includes(me.toLowerCase()) && !confirm(`Tu correo (@${me}) no está en la lista: al vencer tu sesión no podrás volver a entrar. ¿Continuar?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/security', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policy: { ...policy, allowedDomains: list } }) });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || `HTTP ${res.status}`);
      notify('Política guardada', 'success');
      load();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (body: Record<string, unknown>, question: string) => {
    if (!confirm(question)) return;
    const res = await fetch('/api/admin/sessions/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.success) return notify(d.error || 'No se pudo cerrar la sesión', 'error');
    notify(`${d.closed} sesión(es) cerrada(s)`, 'success');
    load();
  };

  const events = onlyDenied ? data.events.filter((e) => e.type === 'LOGIN_DENIED') : data.events;
  const input = 'mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm';

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-primary" /> Política de seguridad
          </h1>
          <p className="text-muted-foreground mt-1">Quién puede entrar, por cuánto tiempo, quién está conectado y qué intentos de acceso hubo.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-md text-sm font-bold hover:bg-muted">
          <RefreshCcw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {data.alerts.denied24h > 0 && (
        <div className="border rounded-lg bg-red-500/5 border-red-500/20 p-4 flex gap-3">
          <AlertTriangle className="text-red-600 shrink-0" />
          <div className="text-sm">
            <b>{data.alerts.denied24h} ingreso(s) rechazado(s) en las últimas 24 h.</b>
            {data.alerts.repeated.length > 0 && <span> Intentos repetidos: {data.alerts.repeated.map((r) => `${r.key} (${r.count})`).join(', ')}.</span>}
            <span className="text-muted-foreground"> Si es alguien del equipo, revisa que su correo esté bien escrito en Empleados y que esté activo.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <h3 className="font-bold">Reglas de acceso</h3>
          <p className="text-xs text-muted-foreground">Siempre se entra con Google y solo si el correo corresponde a un colaborador activo.</p>
          <label className="text-sm font-medium block">
            Duración de la sesión (días)
            <input type="number" min={1} max={14} value={policy.sessionDays} onChange={(e) => setPolicy({ ...policy, sessionDays: Number(e.target.value) })} className={input} />
            <span className="text-xs text-muted-foreground font-normal">Después hay que volver a entrar con Google. Aplica a los ingresos nuevos.</span>
          </label>
          <label className="text-sm font-medium block">
            Dominios de correo permitidos
            <input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="Ej: miempresa.com (vacío = cualquiera)" className={input} />
            <span className="text-xs text-muted-foreground font-normal">Si pones dominios, solo esos correos pueden entrar y las sesiones de otros correos se cierran.</span>
          </label>
          <label className="text-sm font-medium block">
            Revisar accesos cada (días)
            <input type="number" min={30} max={365} value={policy.reviewEveryDays} onChange={(e) => setPolicy({ ...policy, reviewEveryDays: Number(e.target.value) })} className={input} />
          </label>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar reglas'}
          </button>
          {data.meta?.updatedAt && <p className="text-[11px] text-muted-foreground">Último cambio: {new Date(data.meta.updatedAt).toLocaleString('es-CO')} por {data.meta.updatedBy}</p>}
        </div>

        <div className="lg:col-span-2 border border-border rounded-lg bg-card p-5">
          <div className="flex justify-between items-center mb-3 gap-2">
            <h3 className="font-bold flex items-center gap-2">
              <MonitorSmartphone className="text-primary" /> Sesiones abiertas ({data.sessions.length})
            </h3>
            {data.sessions.length > 1 && (
              <button onClick={() => revoke({ allOthers: true }, '¿Cerrar todas las sesiones menos la tuya? Todos tendrán que volver a entrar.')} className="text-xs font-medium text-red-600 border border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded">
                Cerrar todas las demás
              </button>
            )}
          </div>
          <div className="divide-y divide-border">
            {data.sessions.length === 0 && <p className="text-sm text-muted-foreground py-4">No hay sesiones registradas todavía.</p>}
            {data.sessions.map((s) => (
              <div key={s.id} className="py-2 flex justify-between items-center gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {s.name} <span className="text-xs text-muted-foreground font-normal">{s.email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.device} · IP {s.ip || '—'} · activo {ago(s.lastSeenAt)} · entró {new Date(s.createdAt).toLocaleDateString('es-CO')}
                  </div>
                </div>
                {s.current ? (
                  <span className="text-[10px] bg-green-500/10 text-green-600 font-bold px-2 py-0.5 rounded uppercase shrink-0">Tu sesión</span>
                ) : (
                  <button onClick={() => revoke({ id: s.id }, `¿Cerrar la sesión de ${s.name} (${s.device})?`)} className="text-red-600 hover:bg-red-500/10 p-1.5 rounded shrink-0" title="Cerrar sesión" aria-label="Cerrar sesión">
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Registro de accesos</h3>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={onlyDenied} onChange={(e) => setOnlyDenied(e.target.checked)} /> Solo rechazados
          </label>
        </div>
        <div className="divide-y divide-border text-sm">
          {events.length === 0 && <p className="text-muted-foreground py-4">Sin eventos.</p>}
          {events.map((e) => (
            <div key={e.id} className="py-2 flex items-start gap-3">
              {e.type === 'LOGIN_DENIED' ? <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
              <span className="text-xs text-muted-foreground w-32 shrink-0">{new Date(e.at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="font-medium w-36 shrink-0">{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="min-w-0">
                {e.name || e.email ? <b>{e.name || e.email}: </b> : null}
                {e.detail}
                {e.ip ? <span className="text-xs text-muted-foreground"> · IP {e.ip}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
