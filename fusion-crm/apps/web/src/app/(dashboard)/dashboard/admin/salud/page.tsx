import React, { useState, useEffect } from 'react';
import { Activity, Database, HardDrive, Cpu, DollarSign, GitCommit, AlertTriangle, Play } from 'lucide-react';

export default function SaludPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ops/health').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-6">Cargando métricas...</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="text-primary" /> Salud del Sistema</h1>
          <p className="text-muted-foreground mt-1">Métricas, colas y trabajos programados.</p>
        </div>
        <div className="flex flex-col items-end text-sm">
          <div className="flex items-center gap-1 font-mono text-muted-foreground"><GitCommit className="w-4 h-4" /> {data.system.commit} (v{data.system.version})</div>
          <div className="text-xs text-muted-foreground">Desplegado: {new Date(data.system.deployedAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Tarjetas Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Peticiones / min</div>
            <div className="text-2xl font-bold mt-1">{data.metrics.rpm}</div>
            <div className="text-xs text-muted-foreground mt-1">p95: {data.metrics.p95}ms • err: {(data.metrics.errorRate * 100).toFixed(1)}%</div>
          </div>
          <Activity className="w-8 h-8 text-muted-foreground/30" />
        </div>
        
        <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Almacenamiento (DB)</div>
            <div className="text-2xl font-bold mt-1">{data.storage.dbSizeGB} GB</div>
            <div className="text-xs text-muted-foreground mt-1">Libre en disco: {data.storage.diskFreeGB} GB</div>
          </div>
          <Database className="w-8 h-8 text-muted-foreground/30" />
        </div>

        <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Colas Activas</div>
            <div className="text-2xl font-bold mt-1">{data.queues.reduce((a:any, b:any) => a + b.active, 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Pendientes: {data.queues.reduce((a:any, b:any) => a + b.pending, 0)}</div>
          </div>
          <Cpu className="w-8 h-8 text-muted-foreground/30" />
        </div>

        <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Consumo IA (Mes)</div>
            <div className="text-2xl font-bold mt-1">${data.aiCost.currentMonth.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Presupuesto: ${data.aiCost.budget}</div>
          </div>
          <DollarSign className="w-8 h-8 text-muted-foreground/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Componentes */}
        <div className="border border-border bg-card rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 font-bold">Estado de Componentes</div>
          <table className="w-full text-sm text-left">
            <tbody>
              {data.cards.map((c: any, i: number) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.detail}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${c.status === 'OK' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BullMQ */}
        <div className="border border-border bg-card rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 font-bold">Colas (BullMQ)</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/10 border-b border-border text-xs">
              <tr>
                <th className="px-4 py-2">Cola</th>
                <th className="px-2 py-2 text-center">Activos</th>
                <th className="px-2 py-2 text-center">Pendientes</th>
                <th className="px-4 py-2 text-center">Fallidos</th>
              </tr>
            </thead>
            <tbody>
              {data.queues.map((q: any, i: number) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 font-mono text-xs">{q.name}</td>
                  <td className="px-2 py-3 text-center text-blue-600">{q.active}</td>
                  <td className="px-2 py-3 text-center">{q.pending}</td>
                  <td className="px-4 py-3 text-center">
                    {q.failed > 0 ? (
                      <span className="flex items-center justify-center gap-1 text-red-500 font-bold">
                        <AlertTriangle className="w-3 h-3" /> {q.failed}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Trabajos Programados */}
        <div className="border border-border bg-card rounded-lg overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-border bg-muted/20 font-bold">Trabajos Programados (Cron)</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/10 border-b border-border text-xs">
              <tr>
                <th className="px-4 py-2">Trabajo</th>
                <th className="px-4 py-2">Última Ejecución</th>
                <th className="px-4 py-2">Duración</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.cron.map((c: any, i: number) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.lastRun).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(c.duration / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-center">
                    {c.failed ? (
                      <span className="text-[10px] bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">Fallido</span>
                    ) : (
                      <span className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">Éxito</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-secondary-foreground hover:bg-muted px-2 py-1 rounded text-xs font-medium border border-border inline-flex items-center gap-1">
                      <Play className="w-3 h-3" /> Ejecutar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
