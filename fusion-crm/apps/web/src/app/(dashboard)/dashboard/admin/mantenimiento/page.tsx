import React, { useState } from 'react';
import { Wrench, HardDrive, Thermometer, Boxes, Send, AlertTriangle, BugPlay } from 'lucide-react';

export default function MantenimientoPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (actionId: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setLoading(actionId);
    try {
      const res = await fetch('/api/ops/maintenance/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId })
      });
      const data = await res.json();
      alert(data.message);
    } catch(e) {
      alert('Error ejecutando tarea.');
    } finally {
      setLoading(null);
    }
  };

  const actions = [
    {
      id: 'clear_cache',
      icon: HardDrive,
      title: 'Limpiar Caché por Dominio',
      desc: 'Invalida la caché de Redis para catálogos, maestros o sesiones. Forzará consultas a la base de datos.',
      confirm: '¿Está seguro de limpiar la caché? Podría generar un pico de carga temporal en la base de datos.'
    },
    {
      id: 'reindex_kb',
      icon: BugPlay,
      title: 'Reindexar Base de Conocimiento',
      desc: 'Regenera todos los embeddings vectoriales de los productos y reglas de negocio para el motor de IA.',
      confirm: 'Esto consumirá presupuesto de la API de IA. ¿Continuar?'
    },
    {
      id: 'recalc_temp',
      icon: Thermometer,
      title: 'Recalcular Temperatura Comercial',
      desc: 'Aplica los parámetros actuales del algoritmo a todo el historial de clientes para ajustar su temperatura.',
      confirm: '¿Recalcular la temperatura de todos los clientes? Esta operación toma varios minutos en segundo plano.'
    },
    {
      id: 'rebuild_stock',
      icon: Boxes,
      title: 'Reconstruir Stock (Kardex)',
      desc: 'Recalcula el saldo actual de cada insumo sumando todos los movimientos históricos (entradas y salidas).',
      confirm: '¿Desea reconstruir los saldos de inventario basados en el historial puro?'
    },
    {
      id: 'retry_outbox',
      icon: Send,
      title: 'Reprocesar Eventos Pendientes',
      desc: 'Fuerza el reintento de todos los mensajes, webhooks y correos en la tabla outbox que estén en estado fallido.',
      confirm: '¿Reintentar envío de todos los eventos fallidos?'
    }
  ];

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="text-primary" /> Mantenimiento y Tareas</h1>
          <p className="text-muted-foreground mt-1">Operaciones idempotentes de corrección y diagnóstico. Quedan registradas en auditoría.</p>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex gap-4">
          <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-red-700 text-lg">Modo Mantenimiento</h3>
            <p className="text-sm text-red-600/80 mt-1">Bloquea el acceso a todos los usuarios no administradores y muestra una pantalla de "Sistema en actualización". Útil para migraciones o restauraciones.</p>
          </div>
        </div>
        <button className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 shrink-0">
          Activar Modo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map(a => (
          <div key={a.id} className="border border-border bg-card rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <a.icon className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-bold">{a.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </div>
            <button 
              onClick={() => handleAction(a.id, a.confirm)}
              disabled={loading !== null}
              className="mt-4 self-start bg-secondary text-secondary-foreground border border-border px-3 py-1.5 rounded text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {loading === a.id ? 'Ejecutando...' : 'Ejecutar Tarea'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Diagnóstico y Soporte</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Genere un paquete seguro con la configuración, logs recientes y métricas (sin incluir secretos) para adjuntar al abrir un ticket de soporte técnico.</p>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          Generar Paquete de Diagnóstico (.zip)
        </button>
      </div>
    </div>
  );
}
