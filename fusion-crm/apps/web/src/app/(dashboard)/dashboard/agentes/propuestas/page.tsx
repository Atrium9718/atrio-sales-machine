import React, { useState } from 'react';
import { 
  Check, X, Clock, AlertTriangle, ShieldAlert, Bot, Layers,
  ChevronDown, Search, Filter, TrendingUp, Package, Database
} from 'lucide-react';

export default function PropuestasAgentesPage() {
  const [proposals, setProposals] = useState<any[]>([]);

  const handleAction = (id: string, action: 'APPROVE' | 'REJECT' | 'POSTPONE') => {
    // Optimistic update
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'border-red-500/30 bg-red-500/5 text-red-600';
      case 'MEDIUM': return 'border-amber-500/30 bg-amber-500/5 text-amber-600';
      case 'LOW': return 'border-blue-500/30 bg-blue-500/5 text-blue-600';
      default: return 'border-border bg-muted/20 text-muted-foreground';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return <ShieldAlert className="w-4 h-4" />;
      case 'MEDIUM': return <AlertTriangle className="w-4 h-4" />;
      case 'LOW': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bandeja Unificada de Propuestas</h1>
          <p className="text-muted-foreground mt-1">Revisa y aprueba las tareas pendientes generadas por todos los agentes IA.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-md text-sm transition-colors border border-border">
             <Filter className="w-4 h-4" /> Filtrar
           </button>
           <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md text-sm transition-colors shadow-sm">
             <Check className="w-4 h-4" /> Aprobar Seleccionadas (Lote)
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {proposals.length === 0 ? (
           <div className="text-center py-12 bg-card border border-border rounded-lg text-muted-foreground">
             <Check className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>No hay propuestas pendientes.</p>
           </div>
        ) : (
          proposals.map(p => (
            <div key={p.id} className={`border rounded-lg p-5 flex flex-col gap-4 bg-card shadow-sm transition-colors hover:border-primary/30`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(p.urgency)}`}>
                    {getUrgencyIcon(p.urgency)} {p.urgency} URGENCY
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
                    <p.agentIcon className="w-3.5 h-3.5" /> Agente {p.agent}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Caduca en {p.expiresIn}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="text-foreground mt-1">{p.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border border-border/50">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Por qué</p>
                  <p className="text-sm">{p.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Impacto (Qué pasa si no)</p>
                  <p className="text-sm">{p.impact}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                <button 
                  onClick={() => handleAction(p.id, 'POSTPONE')}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-md transition-colors"
                >
                  Posponer
                </button>
                <button 
                  onClick={() => handleAction(p.id, 'REJECT')}
                  className="px-4 py-2 border border-red-500/20 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Rechazar
                </button>
                <button 
                  onClick={() => handleAction(p.id, 'APPROVE')}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-4 h-4" /> Aprobar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
