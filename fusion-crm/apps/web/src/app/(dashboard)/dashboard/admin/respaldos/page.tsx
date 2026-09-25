import React, { useState, useEffect } from 'react';
import { DatabaseBackup, Download, ShieldCheck, ShieldAlert, Clock, Info, CheckCircle2 } from 'lucide-react';

export default function RespaldosPage() {
  const [backups, setBackups] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/ops/backups').then(r => r.json()).then(setBackups);
  }, []);

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/ops/backups/${id}/download`, { method: 'POST' });
    const data = await res.json();
    alert('Descargando: ' + data.url + '\\n(Este evento ha sido registrado en la auditoría)');
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DatabaseBackup className="text-primary" /> Respaldos y Restauración</h1>
          <p className="text-muted-foreground mt-1">Copias de seguridad automáticas y verificadas en frío.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          Respaldar Ahora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 md:col-span-2 bg-green-500/10 border border-green-500/20 text-green-700 p-5 rounded-lg flex gap-4">
          <ShieldCheck className="w-8 h-8 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg">Restauración Verificada: Exitosa</h3>
            <p className="text-sm mt-1">El trabajo automático semanal restauró el último respaldo en una base temporal y validó las sumas de comprobación sin errores.</p>
            <div className="text-xs font-mono mt-3 opacity-80">Última verificación: Hoy, 03:00 AM</div>
          </div>
        </div>
        <div className="col-span-1 bg-card border border-border p-5 rounded-lg">
          <h3 className="font-bold mb-2">Política de Retención</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 7 respaldos diarios</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 4 respaldos semanales</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 12 respaldos mensuales</li>
          </ul>
        </div>
      </div>

      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
              <th className="px-4 py-3 font-semibold text-center">Tipo</th>
              <th className="px-4 py-3 font-semibold text-right">Tamaño</th>
              <th className="px-4 py-3 font-semibold text-center">Verificación</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {new Date(b.date).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] bg-secondary text-secondary-foreground border border-border px-2 py-0.5 rounded font-bold uppercase">{b.type}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{b.size}</td>
                <td className="px-4 py-3 text-center">
                  {b.verified ? (
                    <span className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">Verificado</span>
                  ) : (
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-2 py-0.5 rounded font-bold uppercase">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDownload(b.id)} className="text-blue-500 hover:bg-blue-500/10 p-1.5 rounded inline-flex items-center justify-center" title="Descargar (Requiere Auditoría)">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 border border-border bg-card rounded-lg p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4"><Info className="text-primary w-5 h-5" /> Procedimiento de Restauración Manual</h3>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Para restaurar un respaldo en el entorno de producción en caso de desastre crítico:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Active el Modo Mantenimiento en <strong>Mantenimiento y Tareas</strong>.</li>
            <li>Descargue el archivo de respaldo usando el botón correspondiente arriba.</li>
            <li>En la consola del servidor (SSH), detenga los contenedores de la aplicación: <code className="bg-muted px-1 rounded text-xs">docker-compose stop api worker</code></li>
            <li>Restaure el volcado de PostgreSQL: <code className="bg-muted px-1 rounded text-xs">pg_restore -d main_db &lt;archivo&gt;</code></li>
            <li>Reinicie los servicios: <code className="bg-muted px-1 rounded text-xs">docker-compose up -d</code></li>
            <li>Desactive el Modo Mantenimiento.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
