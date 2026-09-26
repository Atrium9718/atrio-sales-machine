import React, { useState, useEffect } from 'react';
import { Target, Thermometer, Save, Play, ArrowRight } from 'lucide-react';

export default function ComercialParamsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data.filter((s: any) => s.domain === 'COMMERCIAL' && s.key.includes('temperature')));
      });
  }, []);

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="text-primary" /> Parámetros Comerciales y Temperatura</h1>
          <p className="text-muted-foreground mt-1">Configuración del algoritmo propietario de calificación de leads.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          <Save className="w-4 h-4" /> Guardar Algoritmo
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="border border-border bg-card rounded-lg p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Thermometer className="text-orange-500" /> Variables del Algoritmo</h3>
          
          <div className="space-y-4">
            {settings.map(s => (
              <div key={s.key} className="flex justify-between items-center border-b border-border pb-3 last:border-0">
                <div>
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
                <input type="number" defaultValue={s.value} className="w-20 px-2 py-1 border border-border rounded bg-background text-sm text-center font-mono" />
              </div>
            ))}
            
            {/* Si faltan, mock manual para demostración */}
            {settings.length === 0 && (
              <div className="text-sm text-muted-foreground italic">Cargando variables...</div>
            )}
          </div>
        </div>

        {/* Simulator */}
        <div className="border border-border bg-card rounded-lg flex flex-col overflow-hidden">
          <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-bold">Simulador de Impacto</h3>
              <p className="text-xs text-muted-foreground mt-1">Recalcula la temperatura de clientes recientes para ver el efecto antes de guardar.</p>
            </div>
            <button className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 border border-border rounded text-sm font-medium hover:bg-muted">
              <Play className="w-4 h-4" /> Correr Simulación
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
             <table className="w-full text-sm text-left">
               <thead className="bg-muted/20 border-b border-border">
                 <tr>
                   <th className="px-4 py-2 font-semibold">Cliente</th>
                   <th className="px-4 py-2 font-semibold text-center">Temp. Actual</th>
                   <th className="px-4 py-2 font-semibold text-center">Temp. Simulada</th>
                   <th className="px-4 py-2 font-semibold text-center">Variación</th>
                 </tr>
               </thead>
               <tbody>
                 <tr className="border-b border-border hover:bg-muted/10">
                   <td className="px-4 py-3">
                     <div className="font-medium">Acme Corp</div>
                     <div className="text-xs text-muted-foreground">3 notas, 1 llamada (Hace 2 días)</div>
                   </td>
                   <td className="px-4 py-3 text-center"><span className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded font-bold font-mono">75°</span></td>
                   <td className="px-4 py-3 text-center"><span className="bg-red-500/10 text-red-600 px-2 py-1 rounded font-bold font-mono">82°</span></td>
                   <td className="px-4 py-3 text-center text-green-500 flex items-center justify-center gap-1"><ArrowRight className="w-3 h-3 -rotate-45" /> +7</td>
                 </tr>
                 <tr className="border-b border-border hover:bg-muted/10">
                   <td className="px-4 py-3">
                     <div className="font-medium">Industrias XYZ</div>
                     <div className="text-xs text-muted-foreground">1 cotización (Hace 15 días, sin contacto)</div>
                   </td>
                   <td className="px-4 py-3 text-center"><span className="bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded font-bold font-mono">45°</span></td>
                   <td className="px-4 py-3 text-center"><span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded font-bold font-mono">25°</span></td>
                   <td className="px-4 py-3 text-center text-red-500 flex items-center justify-center gap-1"><ArrowRight className="w-3 h-3 rotate-45" /> -20</td>
                 </tr>
                 <tr className="hover:bg-muted/10">
                   <td className="px-4 py-3">
                     <div className="font-medium">Global Tech</div>
                     <div className="text-xs text-muted-foreground">Reunión ayer</div>
                   </td>
                   <td className="px-4 py-3 text-center"><span className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded font-bold font-mono">68°</span></td>
                   <td className="px-4 py-3 text-center"><span className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded font-bold font-mono">68°</span></td>
                   <td className="px-4 py-3 text-center text-muted-foreground">0</td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}
