"use client";

import * as React from "react";
import { Package, Search, Plus, Filter } from "lucide-react";

export default function CatalogoPage() {
  return (
    <div className="flex flex-col max-w-[1600px] mx-auto w-full pb-12 font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo de Productos</h1>
          <p className="text-muted-foreground text-sm">Administra los productos y su historial de precios</p>
        </div>
        <button className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-4 min-h-[500px]">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input type="text" className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-background font-medium" placeholder="Buscar por código, nombre o materiales..." />
          </div>
          <button className="px-4 py-2 border border-input rounded-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted text-muted-foreground">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No hay productos creados. Comienza agregando uno nuevo.</p>
        </div>
      </div>
    </div>
  );
}
