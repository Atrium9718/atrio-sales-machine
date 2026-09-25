import React from 'react';
import { ThumbsDown, AlertTriangle, CheckCircle, FilePlus, Sparkles, MessagesSquare } from 'lucide-react';

export default function MejoraContinuaPage() {
  const issues = [
    {
      id: '1',
      query: '¿Cuánto desperdicio dejo para 5000 volantes tamaño media carta en propalcote 150g?',
      agent: 'Asistente Comercial',
      reason: 'El agente sugirió un 2% genérico, pero no calculó el desperdicio de arranque de máquina.',
      status: 'PENDING',
      date: 'Hace 2 horas'
    },
    {
      id: '2',
      query: '¿Qué significa "tiro y retiro" en el formato de cotización?',
      agent: 'Portal Cliente',
      reason: 'No supo explicar el término técnico.',
      status: 'PENDING',
      date: 'Hace 5 horas'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mejora Continua de IA</h1>
        <p className="text-muted-foreground mt-1">Revisa retroalimentación negativa, vacíos de conocimiento y entrena a los agentes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Cola de Revisión (Peores Respuestas)</h2>
          
          <div className="space-y-4">
            {issues.map(issue => (
              <div key={issue.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{issue.agent}</span>
                    <span className="text-xs text-muted-foreground">{issue.date}</span>
                  </div>
                  <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1">Pendiente</span>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Consulta del Usuario:</div>
                  <div className="font-medium bg-muted/30 p-3 rounded text-sm italic">"{issue.query}"</div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Motivo de Retroalimentación Negativa:</div>
                  <div className="text-sm flex items-start gap-2 text-red-600/80 bg-red-500/5 p-3 rounded">
                    <ThumbsDown className="w-4 h-4 mt-0.5 shrink-0" /> {issue.reason}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <button className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded font-medium flex items-center gap-1 transition-colors">
                    <FilePlus className="w-3.5 h-3.5" /> Crear Artículo de Conocimiento
                  </button>
                  <button className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded font-medium flex items-center gap-1 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" /> Agregar Término al Glosario
                  </button>
                  <button className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded font-medium transition-colors">
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><MessagesSquare className="w-4 h-4"/> Vacíos Detectados</h3>
            <p className="text-sm text-muted-foreground mb-4">Temas frecuentes que los agentes no pueden responder con el contexto actual.</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded border border-border/50">
                <span className="text-sm font-medium">Acabados Especiales (UVI)</span>
                <span className="text-xs bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full font-mono">14 consultas</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded border border-border/50">
                <span className="text-sm font-medium">Garantía por color (Pantone)</span>
                <span className="text-xs bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full font-mono">8 consultas</span>
              </div>
            </div>
            
            <button className="w-full mt-4 text-sm bg-muted hover:bg-muted/80 py-2 rounded transition-colors text-muted-foreground">
              Ver todos los vacíos
            </button>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
             <h3 className="font-semibold mb-4">Panel de Cobertura</h3>
             <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Consultas resueltas (sin escalar)</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Retroalimentación Positiva</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[92%]"></div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
