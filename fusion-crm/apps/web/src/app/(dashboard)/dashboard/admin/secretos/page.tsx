import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, History, RotateCcw, AlertTriangle, AlertCircle, Ban, Plus } from 'lucide-react';

export default function SecretosPage() {
  const [secrets, setSecrets] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/ops/secrets').then(r => r.json()).then(setSecrets);
  }, []);

  const getStatusColor = (expiresAt: string | null, lastUsedAt: string | null) => {
    if (expiresAt) {
      const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
      if (days < 3) return 'bg-red-500/10 text-red-600 border-red-500/20';
      if (days < 15) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      if (days < 30) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
    if (lastUsedAt) {
      const daysUnused = (Date.now() - new Date(lastUsedAt).getTime()) / 86400000;
      if (daysUnused > 90) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    }
    return 'bg-green-500/10 text-green-600 border-green-500/20';
  };

  const getStatusText = (expiresAt: string | null, lastUsedAt: string | null) => {
    if (expiresAt) {
      const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
      if (days < 0) return 'Vencido';
      if (days < 30) return `Vence en ${Math.floor(days)}d`;
    }
    if (lastUsedAt) {
      const daysUnused = (Date.now() - new Date(lastUsedAt).getTime()) / 86400000;
      if (daysUnused > 90) return 'Sin uso (90+ días)';
    }
    return 'Saludable';
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="text-primary" /> Bóveda de Secretos</h1>
          <p className="text-muted-foreground mt-1">Gestión criptográfica (AES-256-GCM). Ningún endpoint devuelve valores. No existe permiso de lectura.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Nuevo Secreto
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 p-4 rounded-lg flex gap-3 mb-6">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div>
          <h4 className="font-bold">Aviso de Privacidad por Construcción</h4>
          <p className="text-sm">Por diseño de seguridad (Etapa 2), el valor de un secreto nunca abandona el servidor. Para actualizar un secreto, debe reemplazarlo por uno nuevo. Las rotaciones incluyen un período de gracia de 15 minutos para procesos en vuelo.</p>
        </div>
      </div>

      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre / Integración</th>
              <th className="px-4 py-3 font-semibold text-center">Terminación</th>
              <th className="px-4 py-3 font-semibold">Último Uso</th>
              <th className="px-4 py-3 font-semibold text-center">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {secrets.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{s.integration}</span> • <span>Rotado: {s.rotatedAt ? new Date(s.rotatedAt).toLocaleDateString() : 'Nunca'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono">•••• {s.last4}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(s.lastUsedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(s.expiresAt, s.lastUsedAt)}`}>
                    {getStatusText(s.expiresAt, s.lastUsedAt)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 rounded text-blue-500 hover:bg-blue-500/10" title="Rotar (Reemplazar)">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded text-muted-foreground hover:bg-muted" title="Historial de Auditoría">
                      <History className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded text-red-500 hover:bg-red-500/10" title="Revocar Inmediatamente">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
