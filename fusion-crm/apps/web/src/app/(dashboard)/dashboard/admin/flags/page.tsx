import React, { useEffect, useState } from 'react';
import { Shield, Flag, AlertTriangle, Play, Pause } from 'lucide-react';

export default function FlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/flags')
      .then(r => r.json())
      .then(data => {
        setFlags(data);
        setLoading(false);
      });
  }, []);

  const toggleFlag = async (flag: any, newStatus: string) => {
    try {
      const res = await fetch('/api/settings/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...flag, status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setFlags(flags.map(f => f.id === updated.id ? updated : f));
      }
    } catch (e) {
      alert("Error al actualizar la bandera");
    }
  };

  const toggleKillSwitch = async (flag: any) => {
    try {
      const res = await fetch('/api/settings/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...flag, killSwitch: !flag.killSwitch })
      });
      if (res.ok) {
        const updated = await res.json();
        setFlags(flags.map(f => f.id === updated.id ? updated : f));
      }
    } catch (e) {
      alert("Error al actualizar kill switch");
    }
  };

  if (loading) return <div className="p-8">Cargando banderas de función...</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-background">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Flag className="text-primary" /> Banderas de Función (Feature Flags)</h1>
        <p className="text-muted-foreground mt-1">Control de acceso y despliegue progresivo de funcionalidades.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <a href="/dashboard/admin/parametros" className="text-sm text-primary hover:underline">&larr; Volver a Parámetros</a>
      </div>

      <div className="grid gap-4">
        {flags.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            No hay banderas de función creadas.
          </div>
        )}
        
        {flags.map(flag => (
          <div key={flag.id} className={`p-5 rounded-lg border ${flag.killSwitch ? 'border-red-500 bg-red-500/5' : 'border-border bg-card'} flex justify-between items-center`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{flag.name}</h3>
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{flag.key}</span>
                {flag.killSwitch && (
                  <span className="bg-red-500 text-white text-[10px] uppercase px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> EMERGENCIA: APAGADA
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{flag.description}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded border border-border overflow-hidden">
                <button 
                  onClick={() => toggleFlag(flag, 'ON')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${flag.status === 'ON' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                >
                  ON
                </button>
                <button 
                  onClick={() => toggleFlag(flag, 'OFF')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border ${flag.status === 'OFF' ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                >
                  OFF
                </button>
              </div>

              <button 
                onClick={() => toggleKillSwitch(flag)}
                className={`p-2 rounded border ${flag.killSwitch ? 'bg-red-500 text-white border-red-500' : 'bg-background border-red-200 text-red-500 hover:bg-red-50'}`}
                title="Kill Switch (Apagar sin desplegar)"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
