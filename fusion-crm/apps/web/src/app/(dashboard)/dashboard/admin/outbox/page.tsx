import React, { useCallback, useEffect, useState } from 'react';
import { Send, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';

interface RecentEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
  errors: string[];
}

const TYPE_LABEL: Record<string, string> = {
  QUOTE_APPROVED: 'Cotización aprobada',
  PROJECT_STAGE_CHANGED: 'Pedido cambió de etapa',
  CLIENT_REQUEST_CREATED: 'Solicitud del portal',
  OMNICHANNEL_CONVERSATION_UPDATED: 'Conversación actualizada',
  AI_BUDGET_ALERT: 'Alerta de gasto de IA',
  EMPLOYEE_CREATED: 'Empleado creado',
  EMPLOYEE_UPDATED: 'Empleado actualizado',
  EMPLOYEE_DEACTIVATED: 'Empleado inactivado',
  SYSTEM_TRANSIENT_DATA_PURGED: 'Purga de datos de prueba',
};

export default function OutboxPage() {
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/ops/events?type=${encodeURIComponent(type)}&errors=${onlyErrors}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setTypes(d.types ?? []);
      })
      .finally(() => setLoading(false));
  }, [type, onlyErrors]);

  useEffect(load, [load]);

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="text-primary" /> Eventos del sistema
          </h1>
          <p className="text-muted-foreground mt-1">Lo que ha pasado desde el último arranque (aprobaciones, cambios de etapa, conversaciones…) y si algún proceso automático falló al atenderlo.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-md text-sm font-bold hover:bg-muted">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background">
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} /> Solo con errores
        </label>
      </div>

      <div className="border border-border bg-card rounded-lg divide-y divide-border">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No hay eventos con este filtro.</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="px-4 py-2 text-sm">
              <button onClick={() => setOpen(open === e.id ? null : e.id)} className="w-full flex items-center gap-3 text-left">
                {e.errors.length ? <XCircle className="w-4 h-4 text-destructive shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span className="text-xs text-muted-foreground w-36 shrink-0">{new Date(e.timestamp).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                <span className="font-medium">{TYPE_LABEL[e.type] ?? e.type}</span>
                {e.errors.length > 0 && <span className="text-xs text-destructive truncate">{e.errors[0]}</span>}
              </button>
              {open === e.id && <pre className="mt-2 ml-7 text-xs bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(e.payload, null, 2)}</pre>}
            </div>
          ))
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Se conservan los últimos 300 eventos en memoria; los reintentos de avisos a clientes se gestionan en Bandeja → Avisos.</p>
    </div>
  );
}
