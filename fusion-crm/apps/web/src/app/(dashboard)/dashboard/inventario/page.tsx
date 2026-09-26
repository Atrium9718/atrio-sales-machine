"use client";

import * as React from "react";
import { Search, Filter, AlertCircle, Package, TrendingDown, ArrowDownRight, Printer, CheckCircle, BarChart3, AlertTriangle, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { getInventory, InventoryItem } from "../../../../lib/inventoryStore";

const mockAlerts: any[] = [];
const mockWaste: any[] = [];

export default function InventarioDashboardPage() {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  
  React.useEffect(() => {
    setInventory(getInventory());
    const handleUpdate = () => setInventory(getInventory());
    window.addEventListener('fusion_inventory_updated', handleUpdate);
    return () => window.removeEventListener('fusion_inventory_updated', handleUpdate);
  }, []);

  const totalValue = inventory.reduce((acc, item) => acc + (item.available * item.unitCost), 0);

  return (
    <div className="flex flex-col font-sans max-w-7xl mx-auto w-full pb-6 space-y-6">

      <div className="bg-primary text-primary-foreground p-6 rounded-lg shadow-md flex justify-between items-center bg-gradient-to-r from-primary to-primary/80">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><Bot className="w-6 h-6"/> Agente de Abastecimiento IA</h2>
          <p className="text-primary-foreground/90 max-w-2xl">
            Vigile el inventario proyectado, evalúe transformaciones contra compras y analice desperdicios usando IA.
          </p>
        </div>
        <Link to="/dashboard/inventario/abastecimiento" className="bg-background text-foreground font-bold px-4 py-2 rounded-md shadow-sm hover:bg-muted transition-colors whitespace-nowrap">
          Consultar Agente
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Inventario y Materiales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de stock, lotes FIFO, desperdicio y alertas.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Conteo Físico
          </button>
          <button className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
            <Package className="w-4 h-4" /> Ingresar Compra
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* KPI 1 */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Valorización</span>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {totalValue > 0 ? `$ ${(totalValue / 1000000).toFixed(1)}M COP` : '$ 0 COP'}
          </div>
          <div className="text-sm text-muted-foreground">Costo total valorizado en bodega</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alertas</span>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">{mockAlerts.length} Items</div>
          <div className="text-sm text-muted-foreground">Requieren pedido de compra</div>
        </div>

        {/* KPI 3 - Desperdicio global */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Desperdicio Mes</span>
          </div>
          <div className="flex items-end gap-2 mb-1">
            <div className="text-3xl font-bold text-foreground">0.0%</div>
          </div>
          <div className="text-sm text-muted-foreground">Sin desviaciones registradas</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Inventory List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-bold">Catálogo de Materiales</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar papel, tinta..." 
                  className="h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                />
              </div>
              <button className="h-9 px-3 border border-input rounded-md hover:bg-muted text-sm"><Filter className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-x-auto flex-1 hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">Item</th>
                  <th className="px-6 py-4 font-bold">Categoría</th>
                  <th className="px-6 py-4 font-bold">Disponible</th>
                  <th className="px-6 py-4 font-bold">Reservado</th>
                  <th className="px-6 py-4 font-bold">Costo Promedio</th>
                  <th className="px-6 py-4 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.length > 0 ? (
                  inventory.map(item => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-xs font-bold ${item.category === 'TINTA' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>{item.category}</span></td>
                      <td className={`px-6 py-4 font-bold ${item.available < item.reserved ? 'text-danger' : 'text-success'}`}>{item.available} {item.unit}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.reserved} {item.unit}</td>
                      <td className="px-6 py-4">${(item.unitCost).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right"><button className="text-primary font-medium hover:underline">Ver Lotes</button></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No hay materiales registrados en el inventario inicial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Stacked Cards */}
          <div className="md:hidden p-4 space-y-4 divide-y divide-border">
            {inventory.map((row) => (
              <div key={row.id} className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-foreground">{row.name}</span>
                  <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">{row.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Disponible</span>
                    <span className={`font-bold text-${row.available < row.reserved ? "danger" : "success"}`}>{`${row.available} ${row.unit}`}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Reservado</span>
                    <span className="text-foreground">{`${row.reserved} ${row.unit}`}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted-foreground">Costo</span>
                    <span className="text-foreground">{`${row.unitCost.toLocaleString()}`}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border flex justify-end">
                  <button className="text-primary font-medium text-sm hover:underline">Ver Lotes</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Waste & Alerts */}
        <div className="space-y-6 flex flex-col">
          {/* Action Required */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-emerald-500" />
              Acción Requerida
            </h2>
            <div className="space-y-3">
              {mockAlerts.length > 0 ? (
                mockAlerts.map(alert => (
                  <div key={alert.id} className="p-3 bg-muted/50 rounded-lg border border-border flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm">{alert.item}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-amber-100 text-amber-700">{alert.type}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border">
                  Sin alertas de stock bajo ni órdenes de abastecimiento pendientes.
                </div>
              )}
            </div>
          </div>

          {/* Panel de Desperdicio */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Panel de Desperdicio
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Desviación porcentual frente a fórmula estándar en la última semana.</p>
            
            {mockWaste.length > 0 ? (
              <div className="space-y-4">
                {mockWaste.map(w => (
                  <div key={w.process}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{w.process}</span>
                      <span className="font-bold">{w.actual}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border">
                Sin registros de mermas o reprocesos en el período actual.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
