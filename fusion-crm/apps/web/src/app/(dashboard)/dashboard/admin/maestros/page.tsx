import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Power, Edit, ArrowDownUp, AlertTriangle } from 'lucide-react';

const CATALOGS = [
  { id: 'Sector', name: 'Sectores de Cliente' },
  { id: 'ClientType', name: 'Tipos de Cliente' },
  { id: 'Origin', name: 'Orígenes de Cliente' },
  { id: 'LostReason', name: 'Motivos de Pérdida' },
  { id: 'PipelineStage', name: 'Etapas de Pipeline' },
  { id: 'ProductionStage', name: 'Etapas de Producción' },
  { id: 'WorkType', name: 'Tipos de Trabajo' },
  { id: 'Unit', name: 'Unidades de Medida' },
  { id: 'Material', name: 'Materiales y Gramajes' },
  { id: 'Finish', name: 'Acabados' },
  { id: 'Ink', name: 'Tintas' },
  { id: 'SupplyCategory', name: 'Categorías de Insumo' },
  { id: 'StopReason', name: 'Causas de Paro' },
  { id: 'ReworkReason', name: 'Motivos de Reproceso' },
  { id: 'Tag', name: 'Etiquetas de Conversación' },
  { id: 'Disposition', name: 'Dispositions de Llamada' },
];

export default function MaestrosPage() {
  const [activeCatalog, setActiveCatalog] = useState(CATALOGS[0].id);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/maestros/${activeCatalog}`)
      .then(r => r.json())
      .then(data => {
        setRecords(data);
        setLoading(false);
      });
  }, [activeCatalog]);

  const handleToggleActive = async (id: string, current: boolean, usageCount: number) => {
    if(current && usageCount > 0) {
      if(!confirm(`Este registro está siendo usado ${usageCount} veces. Si lo desactiva, dejará de aparecer en listas nuevas pero se conservará en registros históricos. ¿Continuar?`)) return;
    }
    
    try {
      const res = await fetch(`/api/maestros/${activeCatalog}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current })
      });
      if(res.ok) {
        setRecords(records.map(r => r.id === id ? { ...r, isActive: !current } : r));
      }
    } catch(e) {}
  };

  const handleAdd = () => {
    const code = prompt("Código interno (estable, no editable luego):");
    if(!code) return;
    const name = prompt("Nombre visible:");
    if(!name) return;

    fetch(`/api/maestros/${activeCatalog}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, description: '' })
    }).then(r => r.json()).then(data => {
      setRecords([...records, data]);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="text-primary" /> Maestros y Catálogos</h1>
          <p className="text-muted-foreground mt-1">Gestión unificada de tablas de apoyo. Los registros en uso no pueden eliminarse.</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Nav */}
        <aside className="w-64 border-r border-border bg-muted/20 overflow-y-auto">
          <nav className="p-4 flex flex-col gap-1">
            {CATALOGS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCatalog(cat.id)}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${activeCatalog === cat.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{CATALOGS.find(c => c.id === activeCatalog)?.name}</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Buscar..." className="pl-9 pr-3 py-1.5 border border-border rounded bg-background text-sm" />
              </div>
              <button onClick={handleAdd} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Nuevo
              </button>
              <button className="border border-border bg-card px-3 py-1.5 rounded text-sm font-medium hover:bg-muted">
                Fusión (Merge)
              </button>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12 text-center"><ArrowDownUp className="w-4 h-4 mx-auto text-muted-foreground" /></th>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold text-center">Uso</th>
                  <th className="px-4 py-3 font-semibold text-center">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Cargando...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No hay registros en este catálogo.</td></tr>
                ) : (
                  records.map(record => (
                    <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-center text-muted-foreground cursor-grab">⋮⋮</td>
                      <td className="px-4 py-3 font-mono text-xs">{record.code}</td>
                      <td className="px-4 py-3 font-medium">{record.name}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{record.usageCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${record.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {record.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button 
                          onClick={() => handleToggleActive(record.id, record.isActive, record.usageCount)}
                          className={`p-1.5 rounded ${record.isActive ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                          title={record.isActive ? "Desactivar" : "Activar"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
