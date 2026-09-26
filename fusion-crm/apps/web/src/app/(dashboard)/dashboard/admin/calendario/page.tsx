import React, { useState } from 'react';
import { Calendar as CalendarIcon, Info, Save, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CalendarioPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  
  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon className="text-primary" /> Calendario Laboral</h1>
          <p className="text-muted-foreground mt-1">Fuente única de verdad para el cálculo de SLAs, tiempos de entrega y envíos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          <Save className="w-4 h-4" /> Guardar Horarios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horarios base */}
        <div className="lg:col-span-1 border border-border bg-card rounded-lg p-5">
          <h3 className="font-bold text-lg mb-4">Horario Hábil Semanal</h3>
          <div className="space-y-4">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(dia => (
              <div key={dia} className="flex items-center justify-between">
                <span className="font-medium w-20">{dia}</span>
                <div className="flex items-center gap-2">
                  <input type="time" defaultValue="08:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
                  <span className="text-muted-foreground">-</span>
                  <input type="time" defaultValue="18:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium w-20 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary" /> Sábado
              </label>
              <div className="flex items-center gap-2">
                <input type="time" defaultValue="09:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
                <span className="text-muted-foreground">-</span>
                <input type="time" defaultValue="13:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium w-20 cursor-pointer text-muted-foreground">
                <input type="checkbox" className="rounded border-border text-primary" /> Domingo
              </label>
              <div className="flex items-center gap-2 opacity-50 pointer-events-none">
                <input type="time" defaultValue="00:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
                <span className="text-muted-foreground">-</span>
                <input type="time" defaultValue="00:00" className="px-2 py-1 border border-border rounded text-sm bg-background" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-500/10 text-blue-600 p-3 rounded text-xs flex gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <p>Los mensajes automáticos fuera de este horario se encolarán hasta la siguiente franja hábil, a menos que el flujo indique lo contrario.</p>
          </div>
        </div>

        {/* Festivos y Excepciones */}
        <div className="lg:col-span-2 border border-border bg-card rounded-lg p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Festivos y Excepciones ({year})</h3>
            <div className="flex gap-2 items-center">
              <select 
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="px-2 py-1 border border-border rounded text-sm bg-background"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <button className="flex items-center gap-1 bg-secondary text-secondary-foreground border border-border px-3 py-1 rounded text-sm hover:bg-muted">
                <Plus className="w-4 h-4" /> Agregar Excepción
              </button>
            </div>
          </div>
          
          <div className="bg-muted/30 border border-border rounded flex items-center justify-between p-3 mb-4">
             <div className="flex items-center gap-2 text-sm font-medium">
               <CheckCircle2 className="w-4 h-4 text-green-500" />
               18 Festivos de Colombia cargados (Ley Emiliani aplicada)
             </div>
             <button className="text-primary text-xs hover:underline">Ver fórmula de cálculo</button>
          </div>

          <div className="flex-1 overflow-y-auto border border-border rounded">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-semibold">Fecha</th>
                  <th className="px-4 py-2 font-semibold">Motivo</th>
                  <th className="px-4 py-2 font-semibold text-center">Tipo</th>
                  <th className="px-4 py-2 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data */}
                <tr className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">Jue 01 Ene, 2026</td>
                  <td className="px-4 py-2 font-medium">Año Nuevo</td>
                  <td className="px-4 py-2 text-center"><span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Festivo Nacional</span></td>
                  <td className="px-4 py-2 text-right">--</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">Lun 12 Ene, 2026</td>
                  <td className="px-4 py-2 font-medium">Día de los Reyes Magos</td>
                  <td className="px-4 py-2 text-center"><span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Festivo Nacional</span></td>
                  <td className="px-4 py-2 text-right">--</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/20 bg-yellow-500/5">
                  <td className="px-4 py-2 font-mono text-xs">Jue 16 Abr, 2026</td>
                  <td className="px-4 py-2 font-medium text-yellow-600">Día de la Familia (Cierre)</td>
                  <td className="px-4 py-2 text-center"><span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded font-bold uppercase">Excepción Propia</span></td>
                  <td className="px-4 py-2 text-right"><button className="text-red-500 text-xs hover:underline">Eliminar</button></td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/20">
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">... 16 festivos más ...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
