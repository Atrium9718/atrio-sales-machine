import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Database, HardDrive, Cpu, GitCommit, AlertTriangle, CheckCircle2, XCircle, RefreshCcw, DatabaseBackup, Bell, Wallet } from 'lucide-react';

const ago = (iso?: string | null) => {
  if (!iso) return 'nunca';
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `hace ${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`;
};
const uptime = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : s < 172800 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} días`);

export default function SaludPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/ops/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('No se pudo consultar la salud del sistema.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const card = 'bg-card border border-border p-4 rounded-lg';
  const lastBackupOld = data?.backups?.last ? Date.now() - new Date(data.backups.last.date).getTime() > 26 * 3_600_000 : true;

  const checks = data
    ? [
        { ok: data.database.ok, label: 'Base de datos', detail: data.database.ok ? `${data.database.message} · ${data.database.latencyMs} ms` : data.database.message, icon: Database },
        {
          ok: data.backups.available && !lastBackupOld && (data.backups.status?.ok ?? true),
          label: 'Respaldos',
          detail: data.backups.available ? `Último ${ago(data.backups.last?.date)}${data.backups.status && !data.backups.status.ok ? ' · el último falló' : ''}` : 'El servidor no ve la carpeta de respaldos',
          icon: DatabaseBackup,
        },
        { ok: data.metrics.errorRate < 0.05, label: 'Errores del servidor', detail: `${data.metrics.errors} en los últimos 15 min (${(data.metrics.errorRate * 100).toFixed(1)}%)`, icon: AlertTriangle },
        { ok: !data.notices.failed, label: 'Avisos a clientes', detail: `${data.notices.scheduled} en cola · ${data.notices.failed} fallidos`, icon: Bell },
        ...(data.aiBudget?.budgetCop
          ? [{ ok: data.aiBudget.level !== 'exceeded', label: 'Tope de IA', detail: `${Math.round((data.aiBudget.percent ?? 0) * 100)}% del mes${data.aiBudget.aiPaused ? ' · IA en pausa' : ''}`, icon: Wallet }]
          : []),
        ...data.disks.map((d: any) => ({ ok: (d.usedPercent ?? 0) < 90, label: `Disco (${d.path})`, detail: `${d.freeGb} GB libres de ${d.totalGb} GB`, icon: HardDrive })),
      ]
    : [];

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> Salud del sistema
          </h1>
          <p className="text-muted-foreground mt-1">Estado real del servidor. Se actualiza cada 30 segundos.</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-md text-sm font-bold hover:bg-muted">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          {data && (
            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <GitCommit className="w-4 h-4" /> v{data.version.version}
              {data.version.commit ? ` · ${data.version.commit}` : ''}
            </div>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {checks.map((c, i) => (
              <div key={i} className={`${card} flex items-start gap-3 ${c.ok ? '' : 'border-destructive/40'}`}>
                {c.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                <div className="min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <c.icon className="w-4 h-4 text-muted-foreground" /> {c.label}
                  </div>
                  <div className="text-xs text-muted-foreground break-words">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={card}>
              <div className="text-sm text-muted-foreground">Peticiones / min</div>
              <div className="text-2xl font-bold">{data.metrics.requestsPerMinute}</div>
              <div className="text-xs text-muted-foreground">p95: {data.metrics.p95Ms ?? '—'} ms</div>
            </div>
            <div className={card}>
              <div className="text-sm text-muted-foreground">Memoria del servidor</div>
              <div className="text-2xl font-bold">{data.process.memoryMb} MB</div>
              <div className="text-xs text-muted-foreground">
                libre en la máquina: {data.process.systemFreeMemoryMb} de {data.process.systemMemoryMb} MB
              </div>
            </div>
            <div className={card}>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Cpu className="w-4 h-4" /> Carga
              </div>
              <div className="text-2xl font-bold">{data.process.loadAverage[0]}</div>
              <div className="text-xs text-muted-foreground">{data.process.cpus} núcleos · 1 / 5 / 15 min: {data.process.loadAverage.join(' / ')}</div>
            </div>
            <div className={card}>
              <div className="text-sm text-muted-foreground">Encendido desde</div>
              <div className="text-2xl font-bold">{uptime(data.process.uptimeSeconds)}</div>
              <div className="text-xs text-muted-foreground">Node {data.process.node} · base: {data.database.backend}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-border bg-card rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border font-bold text-sm">Rutas más lentas (15 min)</div>
              {data.metrics.slowest.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sin actividad todavía.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.metrics.slowest.map((r: any) => (
                      <tr key={r.route} className="border-b border-border/50">
                        <td className="px-4 py-2 font-mono text-xs truncate max-w-[260px]">{r.route}</td>
                        <td className="px-4 py-2 text-right">{r.count}×</td>
                        <td className={`px-4 py-2 text-right font-mono ${r.avgMs > 1000 ? 'text-amber-600' : ''}`}>{r.avgMs} ms</td>
                        <td className="px-4 py-2 text-right text-destructive">{r.errors || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border border-border bg-card rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border font-bold text-sm">Últimos errores del servidor</div>
              {data.metrics.recentErrors.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Ninguno desde el último arranque.</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.metrics.recentErrors.map((e: any, i: number) => (
                    <div key={i} className="px-4 py-2 text-xs flex gap-3">
                      <span className="text-muted-foreground w-24 shrink-0">{ago(e.at)}</span>
                      <span className="font-mono text-destructive">{e.status}</span>
                      <span className="font-mono truncate">
                        {e.method} {e.path}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border">El detalle está en el registro del servidor: docker compose logs app</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
