'use client';
import { useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp, DollarSign, MessageCircle, Bot, Users, Calendar, Filter } from 'lucide-react';

export default function CostosOmnicanalPage() {
  const [period, setPeriod] = useState('Mes Actual');

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
         <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Control de Costos Omnicanal</h1>
         </div>
         <div className="flex gap-2">
            <select className="h-9 px-3 border border-input bg-background rounded-md text-sm font-medium" value={period} onChange={(e) => setPeriod(e.target.value)}>
               <option>Hoy</option>
               <option>Esta Semana</option>
               <option>Mes Actual</option>
               <option>Trimestre</option>
            </select>
            <button className="h-9 px-4 bg-muted text-foreground font-bold rounded-md hover:bg-muted/80 text-sm flex items-center gap-2"><Filter className="w-4 h-4"/> Exportar</button>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
         <div className="max-w-6xl mx-auto space-y-6">

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between mb-2">Costo Total (Canales + IA + Humano)</div>
                  <div className="text-3xl font-black text-foreground">$0 <span className="text-sm font-medium text-muted-foreground">COP</span></div>
                  <div className="mt-2 text-[10px] font-bold text-muted-foreground">Sin consumos en el período</div>
               </div>
               
               <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between mb-2">Costo x Conversación (CAC Bruto)</div>
                  <div className="text-3xl font-black text-foreground">$0 <span className="text-sm font-medium text-muted-foreground">COP</span></div>
                  <div className="mt-2 text-[10px] font-bold text-muted-foreground">Esperando interacciones iniciales</div>
               </div>

               <div className="bg-card border-2 border-emerald-500/20 bg-emerald-50/30 p-5 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="w-16 h-16"/></div>
                  <div className="text-xs font-bold text-emerald-800 uppercase flex items-center justify-between mb-2">Costo x Cotización (Lead Qual.)</div>
                  <div className="text-3xl font-black text-emerald-700">$0 <span className="text-sm font-medium">COP</span></div>
                  <div className="mt-2 text-[10px] font-bold text-emerald-600">Meta: &lt; $3,000 COP</div>
               </div>

               <div className="bg-card border-2 border-indigo-500/20 bg-indigo-50/30 p-5 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="w-16 h-16"/></div>
                  <div className="text-xs font-bold text-indigo-800 uppercase flex items-center justify-between mb-2">Costo x Oportunidad Ganada</div>
                  <div className="text-3xl font-black text-indigo-700">$0 <span className="text-sm font-medium">COP</span></div>
                  <div className="mt-2 text-[10px] font-bold text-indigo-600">Período inicial limpio</div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
               {/* Distribución del Gasto */}
               <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                  <h3 className="font-bold border-b border-border pb-2 mb-4">Distribución del Gasto</h3>
                  <div className="space-y-4">
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500"/> Infra. Canales (Meta, Twilio)</span> <span>$0</span></div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-emerald-500" style={{width: '0%'}}></div>
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-amber-500"/> Tiempo Humano (Salario base prorrateado)</span> <span>$0</span></div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-amber-500" style={{width: '0%'}}></div>
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-500"/> IA (Tokens & Transcripción)</span> <span>$0</span></div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-indigo-500" style={{width: '0%'}}></div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Eficiencia */}
               <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col justify-center text-center p-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <h3 className="font-bold text-foreground">Eficiencia de Resolución en Tiempo Real</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                     A medida que ingresen llamadas y chats procesados por agentes IA y humanos, la comparativa de costo por conversación se calculará automáticamente.
                  </p>
               </div>

            </div>

            {/* Listado de Tarifas */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                  <h3 className="font-bold">Tarifario Activo (Configuración)</h3>
                  <button className="text-xs bg-muted text-foreground px-3 py-1.5 rounded font-bold hover:bg-muted/80">Editar Tarifas</button>
               </div>
               <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
                     <tr>
                        <th className="p-4">Componente</th>
                        <th className="p-4">Unidad</th>
                        <th className="p-4">Costo Unitario</th>
                        <th className="p-4">Vigencia</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                     <tr>
                        <td className="p-4 font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500"/> Meta WhatsApp (Marketing)</td>
                        <td className="p-4 text-xs">Por conversación (24h)</td>
                        <td className="p-4 font-bold">$0.0400 USD</td>
                        <td className="p-4 text-xs text-muted-foreground">01 Jun 2026 - Presente</td>
                     </tr>
                     <tr>
                        <td className="p-4 font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500"/> Meta WhatsApp (Service)</td>
                        <td className="p-4 text-xs">Por conversación (24h)</td>
                        <td className="p-4 font-bold">$0.0150 USD</td>
                        <td className="p-4 text-xs text-muted-foreground">01 Jun 2026 - Presente</td>
                     </tr>
                     <tr>
                        <td className="p-4 font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-500"/> Gemini 1.5 Flash</td>
                        <td className="p-4 text-xs">Por 1M Tokens (I/O)</td>
                        <td className="p-4 font-bold">$0.35 / $1.05 USD</td>
                        <td className="p-4 text-xs text-muted-foreground">Siempre</td>
                     </tr>
                  </tbody>
               </table>
            </div>

         </div>
      </div>
    </div>
  );
}
