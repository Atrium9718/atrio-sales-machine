import React, { useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, Activity, BarChart3, AlertTriangle, 
  Settings, Power, Edit3, DollarSign, RefreshCcw, Search, ChevronRight,
  TrendingDown, TrendingUp, Filter, ThumbsDown
} from 'lucide-react';

export default function AdminIAPage() {
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [budget, setBudget] = useState({
    limit: 500000,
    current: 412500, // 82.5%
    forecast: 485000
  });

  const agents = [
    { id: 'comercial', name: 'Comercial', status: 'ACTIVE', health: 'HEALTHY', approval: 85, cost: 125000, lastEval: { score: 95, version: 3 } },
    { id: 'cotizador', name: 'Cotizador', status: 'ACTIVE', health: 'HEALTHY', approval: 92, cost: 180000, lastEval: { score: 98, version: 5 } },
    { id: 'financiero', name: 'Financiero', status: 'ACTIVE', health: 'WARNING', approval: 100, cost: 45000, lastEval: { score: 100, version: 2 }, issue: 'Alto consumo reciente' },
    { id: 'datos', name: 'Datos', status: 'ACTIVE', health: 'HEALTHY', approval: 70, cost: 25000, lastEval: { score: 85, version: 1 } },
    { id: 'capacidad', name: 'Capacidad', status: 'ACTIVE', health: 'HEALTHY', approval: 78, cost: 154000, lastEval: { score: 90, version: 4 } },
    { id: 'inventario', name: 'Abastecimiento', status: 'ACTIVE', health: 'HEALTHY', approval: 88, cost: 91000, lastEval: { score: 92, version: 2 } },
    { id: 'servicio', name: 'Servicio', status: 'INACTIVE', health: 'OFFLINE', approval: 0, cost: 0, lastEval: { score: 80, version: 1 } },
  ];

  const negativeFeedback = [
    { id: 'fb-1', date: '2026-09-11', agent: 'Cotizador', issue: 'Precio calculado erróneo en formato 100x140' },
    { id: 'fb-2', date: '2026-09-12', agent: 'Comercial', issue: 'Sugirió llamar a cliente inactivo por quiebra' }
  ];

  const budgetPercentage = (budget.current / budget.limit) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gobierno y Seguridad de IA</h1>
          <p className="text-muted-foreground mt-1">Supervisión de costos, evaluaciones y políticas de los agentes.</p>
        </div>
        <div className="flex gap-4">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${globalKillSwitch ? 'bg-red-600 text-white hover:bg-red-700 shadow-md animate-pulse' : 'bg-muted border border-border text-foreground hover:bg-muted/80'}`}
            onClick={() => setGlobalKillSwitch(!globalKillSwitch)}
          >
            <Power className="w-5 h-5" />
            {globalKillSwitch ? 'SISTEMA IA DETENIDO' : 'EMERGENCY KILL SWITCH'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presupuesto */}
        <div className="bg-card border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Presupuesto Mensual
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-black text-amber-600">${(budget.current / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">Consumido (de ${(budget.limit / 1000).toFixed(0)}k)</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{budgetPercentage.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${budgetPercentage > 90 ? 'bg-red-500' : budgetPercentage > 70 ? 'bg-amber-500' : 'bg-primary'}`} 
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-md flex gap-2 text-sm mt-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>Presupuesto superó el 70%. Al llegar al 100%, los agentes no críticos se bloquearán automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Feedback Negativo */}
        <div className="bg-card border rounded-lg p-5 shadow-sm lg:col-span-2">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold flex items-center gap-2">
               <ThumbsDown className="w-4 h-4 text-red-500" /> Cola de Retroalimentación Negativa
             </h3>
             <button className="text-xs text-primary font-medium hover:underline">Ver todo</button>
           </div>
           
           <div className="space-y-3">
             {negativeFeedback.map(fb => (
               <div key={fb.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors">
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded border">{fb.agent}</span>
                     <span className="text-xs text-muted-foreground">{fb.date}</span>
                   </div>
                   <p className="text-sm font-medium">{fb.issue}</p>
                 </div>
                 <button className="text-xs bg-background border hover:bg-muted px-3 py-1.5 rounded transition-colors font-medium">
                   Convertir en EvalCase
                 </button>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Agentes */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2"><Activity className="w-5 h-5"/> Estado de Agentes y Evaluaciones</h2>
          <div className="flex gap-2">
            <input type="text" placeholder="Buscar agente..." className="text-sm border rounded px-3 py-1.5 bg-background" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Salud</th>
                <th className="px-4 py-3 text-center">Última Eval.</th>
                <th className="px-4 py-3 text-center">Tasa Aprob.</th>
                <th className="px-4 py-3 text-right">Costo Mes</th>
                <th className="px-4 py-3 text-center">Prompt</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map(a => (
                <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${a.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${a.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    {a.name}
                  </td>
                  <td className="px-4 py-3">
                    {a.health === 'HEALTHY' && <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold border border-green-200">SALUDABLE</span>}
                    {a.health === 'WARNING' && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-200" title={a.issue}>ADVERTENCIA</span>}
                    {a.health === 'OFFLINE' && <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs font-bold border border-gray-200">APAGADO</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold ${a.lastEval.score >= 90 ? 'text-green-600' : a.lastEval.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {a.lastEval.score}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">v{a.lastEval.version}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold">{a.approval}%</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${(a.cost / 1000).toFixed(1)}k
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-primary hover:text-primary/80 transition-colors" title="Editar Prompt">
                      <Edit3 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-muted-foreground hover:text-foreground transition-colors" title="Opciones">
                      <Settings className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
