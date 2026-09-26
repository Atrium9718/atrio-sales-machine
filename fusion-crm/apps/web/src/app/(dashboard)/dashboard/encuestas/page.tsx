"use client";

import * as React from "react";
import { Smile, Frown, Meh, BarChart2, TrendingUp, AlertTriangle, ExternalLink, Settings } from "lucide-react";

export default function EncuestasPage() {
  return (
    <div className="h-full flex flex-col font-sans max-w-7xl mx-auto w-full pb-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Experiencia del Cliente (CX)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resultados de encuestas NPS, CSAT y CES automatizadas.
          </p>
        </div>
        
        <button className="h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
          <Settings className="w-4 h-4" /> Configurar Disparadores
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">NPS (Net Promoter Score)</span>
          </div>
          <div className="text-4xl font-black text-foreground mb-1">+45</div>
          <div className="text-sm text-emerald-600 font-medium">Excelente (Mes actual)</div>
          
          <div className="mt-4 flex h-2 rounded-full overflow-hidden">
            <div className="bg-red-500 w-[15%]" title="Detractores (0-6)"></div>
            <div className="bg-amber-400 w-[25%]" title="Pasivos (7-8)"></div>
            <div className="bg-emerald-500 w-[60%]" title="Promotores (9-10)"></div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Smile className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CSAT (Satisfacción)</span>
          </div>
          <div className="text-4xl font-black text-foreground mb-1">4.6<span className="text-xl text-muted-foreground">/5</span></div>
          <div className="text-sm text-muted-foreground">Promedio en atención al cliente</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detractores (Sin Resolver)</span>
          </div>
          <div className="text-4xl font-black text-foreground mb-1">2</div>
          <div className="text-sm text-amber-600 font-medium hover:underline cursor-pointer">Requieren seguimiento urgente</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Comentarios Recientes</h2>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-bold">Cliente / Proyecto</th>
              <th className="px-6 py-4 font-bold text-center">Tipo</th>
              <th className="px-6 py-4 font-bold text-center">Puntaje</th>
              <th className="px-6 py-4 font-bold">Comentario / Sentimiento (IA)</th>
              <th className="px-6 py-4 font-bold text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-bold text-foreground">Inversiones Andinas</div>
                <div className="text-xs text-muted-foreground">PROD-08450 (Entregado)</div>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">NPS</span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold">10</span>
              </td>
              <td className="px-6 py-4">
                <p className="italic text-muted-foreground mb-1">"Excelente calidad en las cajas, llegaron antes de lo esperado."</p>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">Positivo</span>
              </td>
              <td className="px-6 py-4 text-right text-muted-foreground">Hoy, 10:30 AM</td>
            </tr>
            <tr className="hover:bg-muted/50 transition-colors bg-amber-50/30">
              <td className="px-6 py-4">
                <div className="font-bold text-foreground">Global Events</div>
                <div className="text-xs text-muted-foreground">Atención WhatsApp</div>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">CSAT</span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold">2</span>
              </td>
              <td className="px-6 py-4">
                <p className="italic text-muted-foreground mb-1">"Se demoraron mucho en responderme y no me resolvieron la duda del precio."</p>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">Negativo</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">Tarea Asignada</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right text-muted-foreground">Ayer, 4:15 PM</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
