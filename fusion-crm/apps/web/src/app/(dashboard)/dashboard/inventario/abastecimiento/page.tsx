import React, { useState } from 'react';
import { 
  Bot, PackageOpen, AlertTriangle, ArrowRight, Clock, ShieldAlert,
  ShoppingCart, Search, Activity, FileText, Check, X, Loader2, TrendingUp, TrendingDown
} from 'lucide-react';

export default function AbastecimientoAgentePage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'agent',
      content: "¡Hola! Soy tu asistente de Abastecimiento y Compras IA. Estoy monitoreando el inventario, puntos de reorden, órdenes de producción y consumo de materias primas.\n\nActualmente el inventario se encuentra en su estado inicial sin alertas de desabastecimiento activas. Puedes hacerme preguntas sobre recomendaciones de compra, evaluación de proveedores o costos cuando inicies operaciones."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [showFormulaProposal, setShowFormulaProposal] = useState(false);

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
        content: "El inventario actual se encuentra en niveles normales de arranque. No se detectan consumos atípicos ni desviaciones de mermas en este período inicial."
      }]);
    }, 1000);
  };

  const suggestedQueries = [
    "¿Qué tengo que comprar esta semana y por qué?",
    "¿Cuál es el valor del inventario actual en bodega?",
    "¿Me conviene cortar pliegos de 70x100 o comprar en medio pliego?",
    "¿Cómo está el nivel de stock para arranque de producción?"
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abastecimiento y Compras IA</h1>
        <p className="text-muted-foreground mt-1">Gestión proactiva de inventario, proveedores y desperdicios.</p>
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
                <h2 className="font-bold text-lg">Jefe de Abastecimiento IA</h2>
                <p className="text-xs text-muted-foreground">Basado en Libro Mayor • FIFO • ROI</p>
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
               <div className="ml-4 max-w-[85%] border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
                 <div className="flex items-center gap-2 text-blue-600 mb-2 font-medium text-sm">
                   <ShoppingCart className="w-4 h-4" /> Propuesta de Compra Generada
                 </div>
                 <div className="flex gap-2">
                   <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowProposal(false)}>
                     <Check className="w-4 h-4"/> Aprobar (Generar DRAFT)
                   </button>
                   <button className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowProposal(false)}>
                     <X className="w-4 h-4"/> Rechazar
                   </button>
                 </div>
               </div>
            )}
            
            {showFormulaProposal && (
               <div className="ml-4 max-w-[85%] border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 mt-2">
                 <div className="flex items-center gap-2 text-amber-600 mb-2 font-medium text-sm">
                   <AlertTriangle className="w-4 h-4" /> Propuesta de Ajuste de Fórmula
                 </div>
                 <div className="flex gap-2">
                   <button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowFormulaProposal(false)}>
                     <Check className="w-4 h-4"/> Aplicar Ajuste
                   </button>
                   <button className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1" onClick={() => setShowFormulaProposal(false)}>
                     <X className="w-4 h-4"/> Mantener Fórmula
                   </button>
                 </div>
               </div>
            )}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analizando Libro Mayor y Desperdicios...
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
                placeholder="Pregunte sobre coberturas, proveedores o inventario..."
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
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary"/> Faltantes Críticos (Próx. 7 días)</h3>
            <div className="p-4 bg-muted/20 rounded-lg text-center text-xs text-muted-foreground border border-border">
              Sin faltantes proyectados. El stock actual cubre los requerimientos iniciales.
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary"/> Inteligencia de Proveedores</h3>
             <p className="text-xs text-muted-foreground mb-4">
               Variaciones de precio y cumplimiento de plazos de entrega.
             </p>
             <div className="p-4 bg-muted/20 rounded-lg text-center text-xs text-muted-foreground border border-border">
               Sin historial de compras en el período inicial para calcular desviaciones de proveedores.
             </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <h3 className="font-semibold mb-2 flex items-center gap-2"><PackageOpen className="w-4 h-4 text-primary"/> Inventario Inmovilizado</h3>
             <div className="flex justify-between items-end mb-2">
               <div>
                 <p className="text-xs text-muted-foreground">Capital inmovilizado (&gt;180 días)</p>
               </div>
               <div className="text-lg font-bold text-foreground">$ 0 COP</div>
             </div>
             <p className="text-xs text-muted-foreground">Sin lotes obsoletos ni materiales sin rotación detectados.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
