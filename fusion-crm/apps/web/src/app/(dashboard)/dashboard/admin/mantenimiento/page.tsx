import React, { useState } from 'react';
import { Wrench, Send, Save, Wallet, PlugZap, AlertTriangle, Trash2 } from 'lucide-react';
import { notify } from '@/lib/notify';

const ACTIONS = [
  { id: 'process_notices', icon: Send, title: 'Enviar avisos pendientes', desc: 'Envía ya los avisos de cambio de etapa que estén en cola (normalmente salen solos cada 5 minutos y dentro de la franja de envío).' },
  { id: 'test_integrations', icon: PlugZap, title: 'Probar todas las conexiones', desc: 'Comprueba la base de datos, Firebase, Gemini, WhatsApp y Messenger con las credenciales actuales.' },
  { id: 'save_state', icon: Save, title: 'Guardar estado ahora', desc: 'Fuerza el guardado del chat interno, anuncios y llamadas (se guarda solo un segundo después de cada cambio). Útil antes de reiniciar el servidor.' },
  { id: 'check_budget', icon: Wallet, title: 'Revisar tope de gasto de IA', desc: 'Recalcula el gasto del mes y, si corresponde, avisa o pausa la IA según la configuración.' },
];

export default function MantenimientoPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const run = async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch('/api/ops/maintenance/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: id }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setResults((r) => ({ ...r, [id]: data.message }));
      notify(data.message, 'success');
    } catch (err: any) {
      notify(err.message || 'La tarea falló', 'error');
    } finally {
      setLoading(null);
    }
  };

  const purge = async () => {
    const answer = prompt('Esto BORRA cotizaciones, proyectos, chat, anuncios y demás datos de prueba (empleados, clientes, roles y configuración se conservan). Úsalo solo antes de empezar a trabajar en serio.\n\nEscribe BORRAR para continuar:');
    if (answer !== 'BORRAR') return;
    setLoading('purge');
    try {
      const res = await fetch('/api/admin/system/purge-transient-data', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      notify(`Datos de prueba borrados: ${data.summary.totalRecordsDeleted} registros.`, 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo borrar', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="text-primary" /> Mantenimiento
        </h1>
        <p className="text-muted-foreground mt-1">Tareas que se pueden repetir sin riesgo. Cada ejecución queda en el registro del servidor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACTIONS.map((a) => (
          <div key={a.id} className="border border-border bg-card rounded-lg p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <a.icon className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-bold">{a.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </div>
            {results[a.id] && <p className="text-xs bg-muted/40 rounded p-2">{results[a.id]}</p>}
            <button onClick={() => run(a.id)} disabled={loading !== null} className="self-start border border-border px-3 py-1.5 rounded text-sm font-medium hover:bg-muted disabled:opacity-50">
              {loading === a.id ? 'Ejecutando…' : 'Ejecutar'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4">
          <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400 text-lg">Borrar datos de prueba</h3>
            <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-1">
              Para empezar en limpio después de las pruebas: borra cotizaciones, proyectos, chat y anuncios. Conserva empleados, roles, clientes, maestros, tarifario y configuración. Haz un
              respaldo antes.
            </p>
          </div>
        </div>
        <button onClick={purge} disabled={loading !== null} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 shrink-0 disabled:opacity-50">
          <Trash2 className="w-4 h-4" /> {loading === 'purge' ? 'Borrando…' : 'Borrar datos de prueba'}
        </button>
      </div>
    </div>
  );
}
