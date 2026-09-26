"use client";

import * as React from "react";
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, FileText, CheckCircle, Clock, Truck, Users, Package } from "lucide-react";

export default function RentabilidadRealPage() {
  const [hasActiveOrder, setHasActiveOrder] = React.useState(false);

  return (
    <div className="h-full flex flex-col font-sans max-w-5xl mx-auto w-full pb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Liquidación de Producción</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
              AUDITORÍA DE COSTOS
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Control de rentabilidad real, insumos consumidos y horas hombre por orden de producción
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" /> Ver Cotizaciones
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">Venta Total (Presupuesto)</div>
          <div className="text-2xl font-bold text-foreground">$ 0</div>
          <div className="text-xs text-muted-foreground mt-1">Sin órdenes pendientes</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">Costo Estimado</div>
          <div className="text-2xl font-bold text-foreground">$ 0</div>
          <div className="text-xs text-muted-foreground mt-1">Presupuesto inicial</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm bg-muted/20">
          <div className="text-sm font-bold text-foreground mb-1">Costo Real Acumulado</div>
          <div className="text-2xl font-bold text-foreground">$ 0</div>
          <div className="text-xs text-muted-foreground mt-1">Sin consumos cargados</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <div className="text-sm font-bold text-muted-foreground mb-1">Margen Real</div>
          <div className="text-2xl font-black text-emerald-600 mb-1">0.0%</div>
          <div className="text-xs font-medium text-muted-foreground">
            En espera de liquidación
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <h2 className="text-xl font-bold mb-4">Desglose de Costos (P&G del Proyecto)</h2>
      
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-bold text-muted-foreground">Rubro</th>
              <th className="px-6 py-3 font-bold text-muted-foreground text-right">Cotizado</th>
              <th className="px-6 py-3 font-bold text-muted-foreground text-right">Real Ejecutivo</th>
              <th className="px-6 py-3 font-bold text-muted-foreground text-right">Desviación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-6 py-4 font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" /> Materiales (Papel e Insumos)
              </td>
              <td className="px-6 py-4 text-right">$ 0</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-medium">$ 0</td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Mano de Obra (Tiempos Máquina)
              </td>
              <td className="px-6 py-4 text-right">$ 0</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-medium">$ 0</td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Horas Extra y Supernumerarios
              </td>
              <td className="px-6 py-4 text-right">$ 0</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-medium">$ 0</td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" /> Domicilios y Logística
              </td>
              <td className="px-6 py-4 text-right">$ 0</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-medium">$ 0</td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Daños y Reprocesos
              </td>
              <td className="px-6 py-4 text-right">$ 0</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-medium">$ 0</td>
            </tr>
            <tr className="bg-muted/20">
              <td className="px-6 py-4 font-black">TOTAL COSTOS</td>
              <td className="px-6 py-4 text-right font-bold">$ 0</td>
              <td className="px-6 py-4 text-right font-black text-lg">$ 0</td>
              <td className="px-6 py-4 text-right text-muted-foreground font-black">$ 0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quick Add Costs */}
      <h2 className="text-xl font-bold mb-4">Registro Rápido de Costos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground group">
          <div className="p-3 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform"><Clock className="w-5 h-5" /></div>
          Hora Extra
        </button>
        <button className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground group">
          <div className="p-3 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
          Freelance / Temp
        </button>
        <button className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground group">
          <div className="p-3 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform"><Truck className="w-5 h-5" /></div>
          Domicilio Externo
        </button>
        <button className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-sm font-bold text-muted-foreground group">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-full group-hover:scale-110 transition-transform"><AlertTriangle className="w-5 h-5" /></div>
          Reportar Daño
        </button>
      </div>

    </div>
  );
}
