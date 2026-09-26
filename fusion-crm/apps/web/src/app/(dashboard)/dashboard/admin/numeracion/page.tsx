import React, { useState } from 'react';
import { Hash, Save, AlertTriangle, RotateCcw, Lock } from 'lucide-react';

export default function NumeracionPage() {
  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Hash className="text-primary" /> Secuencias de Numeración</h1>
          <p className="text-muted-foreground mt-1">Control de series para documentos. Las modificaciones no alteran los documentos ya emitidos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90">
          <Save className="w-4 h-4" /> Guardar Series
        </button>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 p-4 rounded-lg flex gap-3 mb-6">
        <Lock className="w-5 h-5 shrink-0" />
        <div>
          <h4 className="font-bold">Asignación Atómica Activada</h4>
          <p className="text-sm">El sistema utiliza bloqueos de base de datos a nivel de fila (<code>SELECT FOR UPDATE</code>) para la emisión de números. Está garantizado que no habrá duplicados bajo alta concurrencia. No se reutilizan números anulados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Serie Cotización */}
        <div className="border border-border bg-card rounded-lg p-5">
          <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
            Cotizaciones
            <span className="text-xs bg-muted px-2 py-1 rounded font-mono">QUOTE</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Prefijo</label>
              <input type="text" defaultValue="COT-" className="mt-1 px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Formato Año</label>
                <select className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm">
                  <option value="NONE">Ninguno</option>
                  <option value="YY">YY (Ej: 26)</option>
                  <option value="YYYY">YYYY (Ej: 2026)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Ceros Relleno</label>
                <input type="number" defaultValue={5} className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                <input type="checkbox" className="rounded border-border text-primary" /> Reiniciar anualmente
              </label>
            </div>
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Valor Actual (Último emitido)</label>
              <div className="flex gap-2 mt-1">
                <input type="number" defaultValue={1458} className="px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm" />
                <button className="px-3 py-2 border border-border rounded bg-muted hover:bg-muted/80 text-muted-foreground" title="Ajustar manualmente">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Próximo Documento:</div>
              <div className="font-mono text-lg font-bold text-primary">COT-01459</div>
            </div>
          </div>
        </div>

        {/* Serie Orden Produccion */}
        <div className="border border-border bg-card rounded-lg p-5">
          <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
            Órdenes de Producción
            <span className="text-xs bg-muted px-2 py-1 rounded font-mono">OP</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Prefijo</label>
              <input type="text" defaultValue="OP" className="mt-1 px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Formato Año</label>
                <select defaultValue="YY" className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm">
                  <option value="NONE">Ninguno</option>
                  <option value="YY">YY (Ej: 26)</option>
                  <option value="YYYY">YYYY (Ej: 2026)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Ceros Relleno</label>
                <input type="number" defaultValue={4} className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary" /> Reiniciar anualmente
              </label>
            </div>
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Valor Actual (Último emitido)</label>
              <div className="flex gap-2 mt-1">
                <input type="number" defaultValue={234} className="px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm" />
                <button className="px-3 py-2 border border-border rounded bg-muted hover:bg-muted/80 text-muted-foreground" title="Ajustar manualmente">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Próximo Documento:</div>
              <div className="font-mono text-lg font-bold text-primary">OP26-0235</div>
            </div>
          </div>
        </div>
        
        {/* Serie Remisión */}
        <div className="border border-border bg-card rounded-lg p-5">
          <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
            Remisiones
            <span className="text-xs bg-muted px-2 py-1 rounded font-mono">DELIVERY</span>
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Prefijo</label>
              <input type="text" defaultValue="REM-" className="mt-1 px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Formato Año</label>
                <select className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm">
                  <option value="NONE">Ninguno</option>
                  <option value="YY">YY (Ej: 26)</option>
                  <option value="YYYY">YYYY (Ej: 2026)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Ceros Relleno</label>
                <input type="number" defaultValue={6} className="mt-1 px-3 py-2 border border-border rounded w-full bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                <input type="checkbox" className="rounded border-border text-primary" /> Reiniciar anualmente
              </label>
            </div>
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Valor Actual (Último emitido)</label>
              <div className="flex gap-2 mt-1">
                <input type="number" defaultValue={8912} className="px-3 py-2 border border-border rounded w-full bg-background font-mono text-sm" />
                <button className="px-3 py-2 border border-border rounded bg-muted hover:bg-muted/80 text-muted-foreground" title="Ajustar manualmente">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded border border-primary/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Próximo Documento:</div>
              <div className="font-mono text-lg font-bold text-primary">REM-008913</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
