import React, { useState } from 'react';
import { Send, Filter, CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';

export default function OutboxPage() {
  const [filter, setFilter] = useState('ALL');
  
  const events = [
    { id: 'evt_1', type: 'secreto.rotado', status: 'PROCESSED', date: new Date().toISOString(), error: null, payload: { name: 'Odoo Token' } },
    { id: 'evt_2', type: 'cotizacion.enviada', status: 'FAILED', date: new Date(Date.now() - 3600000).toISOString(), error: 'Timeout connecting to SMTP server', payload: { to: 'cliente@ejemplo.com' } },
    { id: 'evt_3', type: 'integracion.fallida', status: 'PROCESSED', date: new Date(Date.now() - 7200000).toISOString(), error: null, payload: { integration: 'Meta WA' } },
    { id: 'evt_4', type: 'webhook.entrante', status: 'PENDING', date: new Date(Date.now() - 10000).toISOString(), error: null, payload: { source: 'Drive' } }
  ];

  const filteredEvents = filter === 'ALL' ? events : events.filter(e => e.status === filter);

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="text-primary" /> Eventos del Bus (Outbox)</h1>
          <p className="text-muted-foreground mt-1">Consola de auditoría para automatizaciones, webhooks y reglas de negocio.</p>
        </div>
        <button className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2 rounded font-medium hover:bg-muted">
          <RefreshCcw className="w-4 h-4" /> Reprocesar Fallidos
        </button>
      </div>

      <div className="border border-border bg-card rounded-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex gap-2">
          {['ALL', 'PENDING', 'PROCESSED', 'FAILED'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:bg-muted'}`}
            >
              {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendientes' : f === 'PROCESSED' ? 'Procesados' : 'Fallidos'}
            </button>
          ))}
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-muted/10 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
              <th className="px-4 py-3 font-semibold">Tipo de Evento</th>
              <th className="px-4 py-3 font-semibold">Payload / Error</th>
              <th className="px-4 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map(evt => (
              <tr key={evt.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-4 py-3">
                  {evt.status === 'PROCESSED' && <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase"><CheckCircle2 className="w-4 h-4" /> Listo</span>}
                  {evt.status === 'FAILED' && <span className="flex items-center gap-1 text-red-600 text-[10px] font-bold uppercase"><XCircle className="w-4 h-4" /> Error</span>}
                  {evt.status === 'PENDING' && <span className="flex items-center gap-1 text-yellow-600 text-[10px] font-bold uppercase"><Clock className="w-4 h-4" /> Cola</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{new Date(evt.date).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{evt.type}</td>
                <td className="px-4 py-3">
                  <div className="font-mono text-[10px] bg-muted p-1 rounded overflow-hidden text-ellipsis whitespace-nowrap max-w-[250px]">
                    {JSON.stringify(evt.payload)}
                  </div>
                  {evt.error && <div className="text-red-500 text-xs mt-1">{evt.error}</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  {evt.status === 'FAILED' && (
                    <button className="text-blue-500 hover:underline text-xs">Reintentar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
