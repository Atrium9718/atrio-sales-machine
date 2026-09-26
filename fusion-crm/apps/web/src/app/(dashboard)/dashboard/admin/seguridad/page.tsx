import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, AlertTriangle, MonitorSmartphone } from 'lucide-react';

export default function SeguridadPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data.filter((s: any) => s.domain === 'SECURITY'));
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Cargando políticas de seguridad...</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-background">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="text-primary" /> Política de Seguridad</h1>
          <p className="text-muted-foreground mt-1">Configuración global de accesos, MFA y control de sesiones.</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/admin/parametros" className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded text-sm font-medium">Ver Todo (Parámetros)</a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Settings Column */}
        <div className="lg:col-span-2 overflow-y-auto space-y-4 pr-2">
          {settings.map(setting => (
            <div key={setting.key} className="p-5 border border-border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{setting.label}</h3>
                {setting.dangerLevel === 'DANGEROUS' && <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Peligroso" />}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{setting.description}</p>
              
              {setting.valueType === 'BOOLEAN' && (
                <div className="font-mono text-sm bg-muted/50 w-fit px-3 py-1.5 rounded text-primary font-bold">
                  {setting.value ? 'ACTIVO' : 'INACTIVO'}
                </div>
              )}
              {setting.valueType === 'NUMBER' && (
                <div className="font-mono text-sm bg-muted/50 w-fit px-3 py-1.5 rounded">
                  {setting.value} {setting.unit}
                </div>
              )}
              {setting.valueType === 'STRING' && (
                <div className="font-mono text-sm bg-muted/50 w-fit px-3 py-1.5 rounded max-w-full overflow-x-auto">
                  {setting.value || <span className="text-muted-foreground italic">Vacío</span>}
                </div>
              )}
              {setting.helpText && <div className="mt-3 text-xs text-muted-foreground border-l-2 border-primary pl-2">{setting.helpText}</div>}
            </div>
          ))}
        </div>

        {/* Sessions & Alerts */}
        <div className="space-y-6 flex flex-col">
          <div className="border border-border rounded-lg bg-card p-5">
            <h3 className="font-bold flex items-center gap-2 mb-4"><MonitorSmartphone className="text-primary" /> Sesiones Activas</h3>
            <div className="space-y-3">
              <div className="text-sm flex justify-between items-center border-b border-border pb-2">
                <div>
                  <div className="font-medium">Andres Sepulveda</div>
                  <div className="text-xs text-muted-foreground">Bogotá, CO • Mac OS / Chrome</div>
                </div>
                <div className="text-[10px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded uppercase">Actual</div>
              </div>
              <div className="text-sm flex justify-between items-center pb-2">
                <div>
                  <div className="font-medium">Vendedor 1</div>
                  <div className="text-xs text-muted-foreground">Medellín, CO • iOS / Safari</div>
                </div>
                <button className="text-red-500 hover:bg-red-500/10 p-1.5 rounded" aria-label="Cerrar sesión"><LogOut className="w-4 h-4" /></button>
              </div>
            </div>
            <button className="w-full mt-4 text-xs font-medium text-red-500 border border-red-500/20 hover:bg-red-500/5 py-2 rounded">
              Cerrar todas las sesiones
            </button>
          </div>

          <div className="border border-border rounded-lg bg-red-500/5 border-red-500/20 p-5">
            <h3 className="font-bold text-red-500 flex items-center gap-2 mb-2"><AlertTriangle /> Alertas de Seguridad</h3>
            <p className="text-sm text-muted-foreground mb-3">No se detectan patrones anómalos o intentos fallidos masivos en las últimas 24 horas.</p>
            <a href="/dashboard/admin/auditoria?tipo=acceso" className="text-xs font-medium text-primary hover:underline">Ver registro de accesos &rarr;</a>
          </div>
        </div>
      </div>
    </div>
  );
}
