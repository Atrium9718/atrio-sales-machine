import React, { useEffect, useState } from 'react';
import { History, Shield, RotateCcw, AlertTriangle, Filter, Search, CheckCircle2 } from 'lucide-react';

export default function AuditoriaConfigPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'settings'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [settingsHistory, setSettingsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/audit-logs').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/settings/history').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([auditData, histData]) => {
      setEvents(Array.isArray(auditData) ? auditData : []);
      setSettingsHistory(Array.isArray(histData) ? histData : []);
      setLoading(false);
    });
  }, []);

  const filteredEvents = events.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.action && e.action.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q))
    );
  });

  const filteredSettings = settingsHistory.filter(h => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (h.key && h.key.toLowerCase().includes(q)) ||
      (h.changedById && h.changedById.toLowerCase().includes(q)) ||
      (h.reason && h.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 h-full flex flex-col bg-background max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="text-primary w-7 h-7" /> Registro de Actividad y Auditoría
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Línea de tiempo inmutable de seguridad, cambios de configuración y trazabilidad del sistema.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-muted p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'events' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Eventos de Seguridad ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'settings' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Historial de Parámetros ({settingsHistory.length})
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por acción, usuario o clave..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content Table */}
      {activeTab === 'events' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
                <th className="px-4 py-3 font-semibold">Acción de Auditoría</th>
                <th className="px-4 py-3 font-semibold">Usuario / Actor</th>
                <th className="px-4 py-3 font-semibold">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando eventos de auditoría...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-semibold text-foreground">Sin registros de auditoría en el período</p>
                    <p className="text-xs mt-1">Los eventos de inicio de sesión, cambios de permisos y operaciones críticas se registrarán aquí.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.timestamp || Date.now()).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{e.userId}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-md truncate">
                      {JSON.stringify(e.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Clave (Key)</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Valor Anterior</th>
                <th className="px-4 py-3 font-semibold">Valor Nuevo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando historial de parámetros...
                  </td>
                </tr>
              ) : filteredSettings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-semibold text-foreground">Sin modificaciones de parámetros registradas</p>
                    <p className="text-xs mt-1">El historial de configuración iniciará su registro cuando se modifiquen los parámetros del sistema.</p>
                  </td>
                </tr>
              ) : (
                filteredSettings.map(h => (
                  <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(h.changedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{h.key}</td>
                    <td className="px-4 py-3 text-xs">{h.changedById}</td>
                    <td className="px-4 py-3 text-xs">{h.reason || <span className="text-muted-foreground italic">Ninguno</span>}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate font-mono text-xs text-red-500 bg-red-500/10 rounded">
                      {JSON.stringify(h.previousValue)}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate font-mono text-xs text-green-500 bg-green-500/10 rounded">
                      {JSON.stringify(h.newValue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
