import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Check } from 'lucide-react';

export default function SemanticaPage() {
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    setEntities([
      {
        id: '1',
        entityKey: 'PaperInventory',
        businessName: 'Inventario de Papel',
        description: 'Registro de todo el papel físico disponible en bodega.',
        isApproved: false,
        fields: [
          { fieldKey: 'quantity', businessName: 'Cantidad', description: 'Hojas físicas en bodega', isSensitive: false },
          { fieldKey: 'cost', businessName: 'Costo Unitario', description: 'Costo por hoja', isSensitive: true },
        ]
      },
      {
        id: '2',
        entityKey: 'Quote',
        businessName: 'Cotización',
        description: 'Propuesta comercial enviada al cliente.',
        isApproved: true,
        fields: [
          { fieldKey: 'total', businessName: 'Total con IVA', description: 'Valor final cobrado', isSensitive: false },
        ]
      }
    ]);
  }, []);

  const approveEntity = (id: string) => {
    setEntities(entities.map(e => e.id === id ? { ...e, isApproved: true } : e));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diccionario Semántico</h1>
          <p className="text-muted-foreground mt-1">Revisa y aprueba las entidades y campos para el contexto de la IA.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
          <Database className="w-4 h-4" /> Generar Borrador
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-muted/20">
          <h2 className="font-semibold">Entidades Pendientes de Aprobación</h2>
        </div>
        <div className="divide-y divide-border">
          {entities.map(entity => (
            <div key={entity.id} className={`p-5 transition-colors ${entity.isApproved ? 'bg-background' : 'bg-amber-500/5'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">{entity.businessName}</h3>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{entity.entityKey}</span>
                    {entity.isApproved ? (
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Aprobado</span>
                    ) : (
                      <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Borrador</span>
                    )}
                  </div>
                  <p className="text-sm mt-2 text-muted-foreground max-w-2xl">{entity.description}</p>
                </div>
                {!entity.isApproved && (
                  <button 
                    onClick={() => approveEntity(entity.id)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    <Check className="w-4 h-4" /> Aprobar Entidad
                  </button>
                )}
              </div>

              <div className="mt-5 border border-border rounded overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Campo Original</th>
                      <th className="px-4 py-3 font-medium">Nombre de Negocio</th>
                      <th className="px-4 py-3 font-medium">Descripción Semántica</th>
                      <th className="px-4 py-3 font-medium text-center">Sensible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entity.fields.map((f: any, idx: number) => (
                      <tr key={idx} className="bg-card hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{f.fieldKey}</td>
                        <td className="px-4 py-3 font-medium">{f.businessName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.description}</td>
                        <td className="px-4 py-3 text-center">
                          {f.isSensitive ? <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded">Sí</span> : <span className="text-xs text-muted-foreground">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
