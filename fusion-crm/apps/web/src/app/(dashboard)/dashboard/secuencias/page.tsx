"use client";

import * as React from "react";
import { Play, Pause, Plus, MoreVertical, Users, Search, BarChart2, Mail, MessageCircle, AlertTriangle } from "lucide-react";

export default function SecuenciasPage() {
  return (
    <div className="h-full flex flex-col font-sans max-w-7xl mx-auto w-full pb-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Secuencias (Cadencias)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatización de seguimiento de cotizaciones y nutrición de leads.
          </p>
        </div>
        
        <button className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Secuencia
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar secuencia..." 
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 2 Activas</span>
            <span className="flex items-center gap-1 ml-4"><span className="w-2 h-2 rounded-full bg-slate-400"></span> 1 Pausada</span>
          </div>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold">Secuencia</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold text-center">Inscritos</th>
              <th className="px-6 py-4 font-bold text-center">Tasa de Respuesta</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Row 1 */}
            <tr className="hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-bold text-foreground">Seguimiento Cotizaciones Frías</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <Mail className="w-3 h-3"/> 2 Correos <MessageCircle className="w-3 h-3 ml-2"/> 1 WhatsApp
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200 flex items-center w-max gap-1">
                  <Play className="w-3 h-3" /> ACTIVA
                </span>
              </td>
              <td className="px-6 py-4 text-center font-medium">45</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-bold">28%</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{width: '28%'}}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><BarChart2 className="w-4 h-4"/></button>
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><MoreVertical className="w-4 h-4"/></button>
              </td>
            </tr>

            {/* Row 2 */}
            <tr className="hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-bold text-foreground">Bienvenida Nuevos Clientes</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <MessageCircle className="w-3 h-3"/> 1 WhatsApp
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200 flex items-center w-max gap-1">
                  <Play className="w-3 h-3" /> ACTIVA
                </span>
              </td>
              <td className="px-6 py-4 text-center font-medium">12</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-bold">65%</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{width: '65%'}}></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><BarChart2 className="w-4 h-4"/></button>
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><MoreVertical className="w-4 h-4"/></button>
              </td>
            </tr>

            {/* Row 3 */}
            <tr className="hover:bg-muted/50 transition-colors bg-muted/10">
              <td className="px-6 py-4">
                <div className="font-bold text-muted-foreground">Reactivación Base de Datos 2025</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <Mail className="w-3 h-3"/> 3 Correos
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-slate-200 flex items-center w-max gap-1">
                  <Pause className="w-3 h-3" /> PAUSADA
                </span>
              </td>
              <td className="px-6 py-4 text-center font-medium text-muted-foreground">0</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 justify-center text-muted-foreground">
                  <span className="font-bold">--</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><MoreVertical className="w-4 h-4"/></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Disclaimer / Info */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
        <Users className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Las secuencias se procesan automáticamente en segundo plano.</p>
          <p className="opacity-90">El motor avanza los contactos a través de los pasos según los retrasos configurados. Si el cliente responde, se aprueba la cotización o pide darse de baja, la secuencia se detiene automáticamente para ese contacto.</p>
        </div>
      </div>
    </div>
  );
}
