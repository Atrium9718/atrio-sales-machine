import React, { useState } from 'react';
import { 
  Bot, Factory, AlertTriangle, ChevronRight, Activity, Clock, Users,
  BarChart2, Calendar, Check, X, ShieldAlert, Cpu, Hammer, Loader2
} from 'lucide-react';

export default function CapacidadAgentePage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'agent',
      content: "La troqueladora está al 108% de ocupación para esta semana y PROY-840 está en riesgo. Le recomiendo mover PROY-852 al miércoles para liberar 6 horas hoy. ¿Desea que prepare la reprogramación?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProposal, setShowProposal] = useState(true);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setMessages([...messages, { role: 'user', content: query }]);
    setQuery('');
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'agent',
        content: "1. Actualmente no tenemos espacio para 5.000 plegables antes del viernes (faltan 12 horas de offset).\n2. La offset GTO tiene compromisos inamovibles (PROY-801, PROY-803) y la digital es 3 veces más costosa para este tiraje.\n3. Opciones:\n   a) Tercerizar la impresión (margen cae 15%, cumple el viernes).\n   b) Desplazar PROY-803 (multa por retraso de $50.000, cumple el viernes).\n   c) Entregar el martes (sin costo adicional).\n4. Recomiendo la opción C y negociar con el cliente, o la A si la fecha es crítica."
      }]);
    }, 1500);
  };

  const suggestedQueries = [
    "¿Cabe un trabajo de 5.000 plegables a dos tintas para el viernes?",
    "¿Cuál es mi cuello de botella el mes entrante?",
    "Si la offset entra a mantenimiento el jueves, ¿qué se cae?",
    "¿Qué trabajos debería tercerizar esta semana y por qué?"
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capacidad Instalada y Planificación</h1>
        <p className="text-muted-foreground mt-1">Vigilancia proactiva y simulación de carga.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Agent Chat */}
        <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-lg shadow-sm overflow-hidden h-[600px]">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Jefe de Producción IA</h2>
                <p className="text-xs text-muted-foreground">Analítico • Basado en Datos • Resolutivo</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/40 border border-border text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {showProposal && (
               <div className="ml-4 max-w-[85%] border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
                 <div className="flex items-center gap-2 text-amber-600 mb-2 font-medium text-sm">
                   <AlertTriangle className="w-4 h-4" /> Propuesta de Reprogramación Generada
                 </div>
                 <div className="text-sm space-y-2 mb-4">
                   <p><span className="font-medium">Impacto:</span> Libera 6 horas en Troqueladora hoy. Salva PROY-840 (vence hoy).</p>
                   <p><span className="font-medium">Costo:</span> Retrasa PROY-852 1 día (Cliente flexible).</p>
                 </div>
                 <div className="flex gap-2">
                   <button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowProposal(false)}>
                     <Check className="w-4 h-4"/> Aprobar Cambios
                   </button>
                   <button className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowProposal(false)}>
                     <X className="w-4 h-4"/> Rechazar
                   </button>
                 </div>
               </div>
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analizando capacidad e histórico...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {suggestedQueries.map((q, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setQuery(q)}
                  className="whitespace-nowrap text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-full transition-colors border border-border/50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pregunte sobre cuellos de botella, viabilidad o simulaciones..."
                className="flex-1 bg-muted/50 border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button 
                type="submit"
                disabled={!query.trim() || isTyping}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                Preguntar
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Context & Vigilance */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary"/> Estado de Planta (En Vivo)</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground">OEE Promedio Planta</span>
                  <span className="font-bold">68%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[68%]"></div>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-emerald-500"/> Offset GTO</div>
                  <span className="font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">Operando (92%)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2"><Hammer className="w-4 h-4 text-amber-500"/> Troqueladora</div>
                  <span className="font-mono text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">Sobrecarga (108%)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500"/> Guillotina 2</div>
                  <span className="font-mono text-red-600 bg-red-500/10 px-2 py-0.5 rounded">Avería</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary"/> Aprendizaje de Estimaciones</h3>
             <p className="text-xs text-muted-foreground mb-4">
               El agente compara los tiempos de la Etapa 9 contra los tiempos reales registrados y propone ajustes.
             </p>
             
             <div className="border border-border/50 rounded p-3 bg-muted/20">
               <div className="flex justify-between items-start mb-2">
                 <span className="text-sm font-medium">Troquelado (Cartón 300g)</span>
                 <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">858 casos</span>
               </div>
               <div className="text-xs text-muted-foreground mb-3">
                 Desviación sistemática de <span className="font-bold text-red-500">+15.5%</span> sobre el tiempo estimado.
               </div>
               <button className="w-full text-xs bg-background border border-border hover:bg-muted py-1.5 rounded transition-colors font-medium">
                 Ver Análisis y Ajustar Tiempo Estándar
               </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
