import React, { useEffect, useState } from 'react';
import { DatabaseBackup, Download, ShieldCheck, ShieldAlert, Clock, Info, Cloud, CloudOff, RefreshCcw } from 'lucide-react';

interface BackupFile {
  id: string;
  date: string;
  sizeBytes: number;
}

interface BackupStatus {
  ok: boolean;
  at: string;
  file?: string;
  error?: string;
  remote?: string;
  remoteOk?: boolean;
}

interface BackupsResponse {
  available: boolean;
  backups: BackupFile[];
  status: BackupStatus | null;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

export default function RespaldosPage() {
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/ops/backups')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('No se pudo consultar el estado de los respaldos.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const latest = data?.backups[0];
  const status = data?.status;
  const stale = latest ? hoursSince(latest.date) > 26 : true;
  const healthy = !!latest && !stale && (status?.ok ?? true);

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DatabaseBackup className="text-primary" /> Respaldos
          </h1>
          <p className="text-muted-foreground mt-1">Copia diaria automática de la base de datos.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-border px-4 py-2 rounded font-medium hover:bg-muted">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}

      {data && !data.available && (
        <div className="mb-6 p-5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm flex gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-bold text-base">El servidor no ve la carpeta de respaldos</h3>
            <p className="mt-1">
              Pasa cuando la aplicación corre fuera de Docker o con una versión anterior del archivo <code>docker-compose</code>. En el servidor, actualiza y vuelve a levantar:{' '}
              <code className="bg-muted px-1 rounded">docker compose -f docker-compose.minimal.yml up -d</code>
            </p>
          </div>
        </div>
      )}

      {data?.available && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div
            className={`col-span-1 md:col-span-2 p-5 rounded-lg flex gap-4 border ${healthy ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}
          >
            {healthy ? <ShieldCheck className="w-8 h-8 shrink-0 mt-1" /> : <ShieldAlert className="w-8 h-8 shrink-0 mt-1" />}
            <div>
              <h3 className="font-bold text-lg">
                {!latest ? 'Todavía no hay respaldos' : status && !status.ok ? 'El último respaldo falló' : stale ? 'El último respaldo tiene más de un día' : 'Respaldos al día'}
              </h3>
              <p className="text-sm mt-1">
                {latest
                  ? `Último: ${new Date(latest.date).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })} (${formatSize(latest.sizeBytes)}). Cada archivo se comprueba al crearlo.`
                  : 'El servicio de respaldo hace el primero al arrancar y luego uno diario.'}
              </p>
              {status && !status.ok && status.error && <p className="text-sm mt-1">{status.error}</p>}
              {(stale || (status && !status.ok)) && (
                <p className="text-xs mt-2 opacity-80">
                  Revisa en el servidor: <code className="bg-muted px-1 rounded">docker compose logs backup</code>
                </p>
              )}
            </div>
          </div>
          <div className="col-span-1 bg-card border border-border p-5 rounded-lg">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              {status?.remote ? status.remoteOk ? <Cloud className="w-4 h-4 text-green-600" /> : <CloudOff className="w-4 h-4 text-destructive" /> : <CloudOff className="w-4 h-4 text-amber-500" />}
              Copia fuera del servidor
            </h3>
            <p className="text-sm text-muted-foreground">
              {status?.remote
                ? status.remoteOk
                  ? `Se copia a ${status.remote} después de cada respaldo.`
                  : `No se pudo copiar a ${status.remote} la última vez.`
                : 'No configurada: si el servidor se daña, los respaldos se pierden con él. Configúrala con BACKUP_RCLONE_REMOTE (ver DEPLOY.md).'}
            </p>
            <p className="text-xs text-muted-foreground mt-3">Se conservan los últimos 14 días (BACKUP_KEEP_DAYS).</p>
          </div>
        </div>
      )}

      {data?.available && data.backups.length > 0 && (
        <div className="border border-border bg-card rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Archivo</th>
                <th className="px-4 py-3 font-semibold text-right">Tamaño</th>
                <th className="px-4 py-3 font-semibold text-right">Descargar</th>
              </tr>
            </thead>
            <tbody>
              {data.backups.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {new Date(b.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{b.id}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatSize(b.sizeBytes)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/ops/backups/${encodeURIComponent(b.id)}/download`}
                      className="text-primary hover:bg-primary/10 p-1.5 rounded inline-flex items-center justify-center"
                      title="Descargar (solo administradores; queda registrado)"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 border border-border bg-card rounded-lg p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <Info className="text-primary w-5 h-5" /> Cómo restaurar un respaldo
        </h3>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Solo en caso de pérdida de datos. En el servidor (SSH), dentro de la carpeta del proyecto:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>
              Ver los respaldos disponibles: <code className="bg-muted px-1 rounded text-xs">./scripts/restore-db.sh</code> (sin nada más)
            </li>
            <li>
              Restaurar el que elijas: <code className="bg-muted px-1 rounded text-xs">./scripts/restore-db.sh fusion-fusion_crm-AAAAMMDD-HHMMSS.dump</code>
            </li>
            <li>El script detiene la aplicación, restaura la base y la vuelve a encender. Pide confirmación antes de borrar nada.</li>
          </ol>
          <p>La guía completa está en DEPLOY.md, sección de respaldos.</p>
        </div>
      </div>
    </div>
  );
}
