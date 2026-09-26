"use client";

import * as React from "react";
import { BookOpen, Plus, Search, Edit3, Trash2, Tag, Eye, Bot, RefreshCw } from "lucide-react";

export default function ConocimientoPage() {
  return (
    <div className="h-full flex flex-col font-sans max-w-7xl mx-auto w-full pb-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Base de Conocimiento (RAG)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Artículos y guías que alimentan al Agente IA para responder a los clientes.
          </p>
        </div>
        
        <button className="h-10 px-4 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Artículo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Categories Sidebar */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Categorías</h2>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 bg-primary/10 text-primary font-bold rounded-md text-sm">Todos (15)</button>
            <button className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted font-medium rounded-md text-sm">Productos y Servicios (6)</button>
            <button className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted font-medium rounded-md text-sm">Tiempos y Envíos (4)</button>
            <button className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted font-medium rounded-md text-sm">Pagos y Políticas (3)</button>
            <button className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-muted font-medium rounded-md text-sm">Requisitos Técnicos (2)</button>
          </div>
          
          <div className="mt-auto pt-4 border-t border-border">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                <Bot className="w-4 h-4" /> Estado del Índice IA
              </div>
              <p className="text-[10px] text-indigo-900 mb-2">15 artículos fragmentados e indexados (embeddings generados).</p>
              <button className="text-[10px] bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded w-full font-bold flex items-center justify-center gap-1 hover:bg-indigo-50">
                <RefreshCw className="w-3 h-3" /> Reindexar Todo
              </button>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar artículos..." 
                className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Article Item 1 */}
            <div className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Tiempos de entrega estándar por tipo de trabajo</h3>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Publicado</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                Define los tiempos estándar (SLA) para litografía (3-5 días hábiles), digital (1-2 días), y gran formato (2-3 días). Incluye excepciones por acabados especiales como troquel o barniz UV.
              </p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3"/> Tiempos y Envíos</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/> 245 lecturas IA</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded"><Edit3 className="w-4 h-4"/></button>
                  <button className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>

            {/* Article Item 2 */}
            <div className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Requisitos de archivos de arte para impresión</h3>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded">Borrador</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                Guía técnica: Los archivos deben venir en CMYK, resolución mínima de 300dpi, con sangrado de 3mm por lado y fuentes convertidas a curvas (o incrustadas en PDF).
              </p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3"/> Requisitos Técnicos</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/> 0 lecturas IA</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded"><Edit3 className="w-4 h-4"/></button>
                  <button className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>

            {/* Article Item 3 */}
            <div className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Política de anticipos y formas de pago</h3>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded">Publicado</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                Todo trabajo de producción requiere un anticipo mínimo del 50% para iniciar. El 50% restante debe cancelarse contra entrega. Clientes corporativos con crédito aprobado tienen plazo de 30 días.
              </p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3"/> Pagos y Políticas</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3"/> 128 lecturas IA</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded"><Edit3 className="w-4 h-4"/></button>
                  <button className="p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
