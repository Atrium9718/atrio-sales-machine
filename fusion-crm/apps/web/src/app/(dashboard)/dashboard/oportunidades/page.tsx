"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, Filter, TrendingUp, AlertCircle, Clock, CheckCircle2, 
  Phone, MessageCircle, Mail, Maximize2, Minimize2, FileText, Calendar, 
  Copy, ExternalLink, Columns, List, ChevronLeft, ChevronRight, X, 
  AlertTriangle, CheckSquare, MoreHorizontal, UserPlus, HardDrive, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fuzzyMatchAny } from "../../../../../../../packages/core/src/utils/search";

// --- MOCKS ---
const STAGES = [
  { id: 's1', name: "Contacto Inicial", color: "border-blue-500" },
  { id: 's2', name: "Calificado", color: "border-indigo-500" },
  { id: 's3', name: "Cotización Enviada", color: "border-purple-500" },
  { id: 's4', name: "Negociación", color: "border-amber-500" },
  { id: 's5', name: "Cerrado Ganado", color: "border-green-500" },
];

const TEMPLATES = [
  { id: 't1', name: 'Licenciamiento ERP', suggestedValue: 45000000, expectedCycleDays: 45 },
  { id: 't2', name: 'Consultoría Estratégica', suggestedValue: 12000000, expectedCycleDays: 20 },
  { id: 't3', name: 'Soporte Anual', suggestedValue: 8500000, expectedCycleDays: 15 },
];

const INITIAL_OPPS: any[] = [];

const MESSAGES = [
  { id: 'm1', type: 'whatsapp', text: '¿Me puedes enviar la cotización actualizada?', date: new Date().toISOString(), sender: 'Cliente' },
  { id: 'm2', type: 'email', text: 'Adjunto requerimientos técnicos.', date: new Date(Date.now() - 2*24*60*60*1000).toISOString(), sender: 'Cliente' },
];

export default function PipelineComercialPage() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPS);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'TODAY'>('KANBAN');
  const [cardSize, setCardSize] = useState<'COMPACT' | 'EXPANDED'>('COMPACT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals
    const [activeOppId, setActiveOppId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatMoney = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const filteredOpps = useMemo(() => {
    return opportunities.filter(o => 
      fuzzyMatchAny(searchQuery, [o.title, o.clientName, o.id])
    );
  }, [opportunities, searchQuery]);

  const todayOpps = useMemo(() => {
    const now = new Date();
    return opportunities.filter(o => {
      if (!o.nextActionAt) return false;
      const actionDate = new Date(o.nextActionAt);
      return actionDate <= now || actionDate.toDateString() === now.toDateString();
    });
  }, [opportunities]);

  const handleMoveOpp = (oppId: string, newStageId: string) => {
    setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stageId: newStageId } : o));
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDuplicate = (opp: any) => {
    const newOpp = {
      ...opp,
      id: `OPP-0${Math.floor(100 + Math.random() * 900)}`,
      title: `${opp.title} (Copia)`,
      createdAt: new Date().toISOString(),
      stageId: 's1',
    };
    setOpportunities([newOpp, ...opportunities]);
    setActiveOppId(newOpp.id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 relative pb-20 md:pb-6">
      
      {/* HEADER & FILTERS */}
      <div className="sticky top-0 z-30 bg-background border-b border-border shadow-sm p-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> Pipeline Comercial
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg flex items-center border border-border">
              <button onClick={() => setViewMode('TODAY')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'TODAY' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                Para Hoy ({todayOpps.length})
              </button>
              <button onClick={() => setViewMode('KANBAN')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'KANBAN' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'} hidden md:flex items-center gap-1`}>
                <Columns className="w-3 h-3" /> Kanban
              </button>
              <button onClick={() => setViewMode('LIST')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'} md:hidden flex items-center gap-1`}>
                <List className="w-3 h-3" /> Etapas
              </button>
            </div>

            <button onClick={() => setCardSize(s => s === 'COMPACT' ? 'EXPANDED' : 'COMPACT')} className="hidden md:flex p-2 text-muted-foreground hover:bg-muted rounded-md border border-transparent hover:border-border" title="Alternar tamaño de tarjeta">
              {cardSize === 'COMPACT' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Buscar por título, cliente, ID... (Atajo: /)" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md animate-in fade-in">
              <span className="text-xs font-bold text-primary">{selectedIds.size} seleccionadas</span>
              <div className="w-px h-4 bg-primary/20 mx-1"></div>
              <button className="text-xs font-bold text-primary hover:underline">Reasignar</button>
              <button className="text-xs font-bold text-primary hover:underline">Avanzar</button>
            </div>
          )}
        </div>
      </div>

      {/* VIEWS */}
      <div className="flex-1 p-4 md:p-6 overflow-x-auto">
        {viewMode === 'TODAY' && (
          <TodayView opps={todayOpps} formatMoney={formatMoney} onOpen={setActiveOppId} />
        )}
        
        {viewMode === 'KANBAN' && (
          <KanbanView 
            stages={STAGES} 
            opps={filteredOpps} 
            formatMoney={formatMoney} 
            cardSize={cardSize}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            onOpen={setActiveOppId}
            onMoveOpp={handleMoveOpp}
          />
        )}

        {viewMode === 'LIST' && (
          <MobileStageView 
            stages={STAGES} 
            opps={filteredOpps} 
            formatMoney={formatMoney}
            onOpen={setActiveOppId}
          />
        )}
      </div>

      <AnimatePresence>
        {activeOppId && (
          <OpportunityDetailModal 
            opp={opportunities.find(o => o.id === activeOppId)!}
            onClose={() => setActiveOppId(null)}
            onDuplicate={handleDuplicate}
            formatMoney={formatMoney}
            onMoveOpp={handleMoveOpp}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function KanbanView({ stages, opps, formatMoney, cardSize, selectedIds, toggleSelection, onOpen, onMoveOpp }: any) {
  return (
    <div className="flex gap-4 h-full min-h-[600px] items-start pb-4">
      {stages.map((stage: any) => {
        const stageOpps = opps.filter((o: any) => o.stageId === stage.id);
        const stageTotal = stageOpps.reduce((sum: number, o: any) => sum + o.amount, 0);
        
        return (
          <div 
            key={stage.id} 
            className="flex-shrink-0 w-[300px] flex flex-col bg-muted/30 rounded-xl border border-border h-full max-h-full"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-primary/5');
              const oppId = e.dataTransfer.getData('text/plain');
              if (oppId && onMoveOpp) {
                onMoveOpp(oppId, stage.id);
              }
            }}
          >
            <div className={`p-3 bg-card border-b border-border border-t-2 ${stage.color} rounded-t-xl sticky top-0 z-10`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">{stage.name}</h3>
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{stageOpps.length}</span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">{formatMoney(stageTotal)}</div>
            </div>
            
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {stageOpps.map((opp: any) => (
                <OppCard 
                  key={opp.id} 
                  opp={opp} 
                  formatMoney={formatMoney} 
                  cardSize={cardSize}
                  isSelected={selectedIds.has(opp.id)}
                  onToggleSelect={() => toggleSelection(opp.id)}
                  onClick={() => onOpen(opp.id)}
                />
              ))}
              {stageOpps.length === 0 && (
                <div className="p-4 text-center border-2 border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground">
                  Arrastra aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileStageView({ stages, opps, formatMoney, onOpen }: any) {
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const stage = stages[activeStageIdx];
  const stageOpps = opps.filter((o: any) => o.stageId === stage.id);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2 shadow-sm">
        <button 
          onClick={() => setActiveStageIdx(i => Math.max(0, i - 1))}
          disabled={activeStageIdx === 0}
          className="p-2 disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-bold text-sm">{stage.name}</div>
          <div className="text-xs text-muted-foreground">{stageOpps.length} opps • {formatMoney(stageOpps.reduce((s:any,o:any)=>s+o.amount,0))}</div>
        </div>
        <button 
          onClick={() => setActiveStageIdx(i => Math.min(stages.length - 1, i + 1))}
          disabled={activeStageIdx === stages.length - 1}
          className="p-2 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {stageOpps.map((opp: any) => (
          <div key={opp.id} className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm touch-pan-x">
            {/* Simulate swipe actions with generic layout */}
            <div className="p-4" onClick={() => onOpen(opp.id)}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-muted-foreground">{opp.id}</span>
                <span className="font-black text-sm">{formatMoney(opp.amount)}</span>
              </div>
              <h4 className="font-bold text-sm leading-tight">{opp.title}</h4>
              <div className="text-xs text-muted-foreground mt-1">{opp.clientName}</div>
              
              <div className="flex justify-between mt-4">
                <div className="text-[10px] text-muted-foreground">{"<"} Desliza para perder</div>
                <div className="text-[10px] text-primary font-bold">Avanzar {">"}</div>
              </div>
            </div>
          </div>
        ))}
        {stageOpps.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm font-medium">
            No hay oportunidades en esta etapa
          </div>
        )}
      </div>
    </div>
  );
}

function TodayView({ opps, formatMoney, onOpen }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
        <CheckSquare className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-lg font-black text-foreground">Mis oportunidades para hoy</h2>
          <p className="text-xs text-muted-foreground">Próximas acciones vencidas o programadas para hoy</p>
        </div>
      </div>
      
      {opps.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-lg">¡Todo al día!</h3>
          <p className="text-sm text-muted-foreground">No tienes acciones pendientes para hoy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opps.map((opp: any) => (
            <div key={opp.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer shadow-sm group" onClick={() => onOpen(opp.id)}>
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <AlertCircle className="w-4 h-4 text-destructive" />
                   <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Acción Requerida</span>
                 </div>
                 <h4 className="font-bold text-foreground text-lg">{opp.title}</h4>
                 <p className="text-sm text-muted-foreground">{opp.clientName} • {formatMoney(opp.amount)}</p>
               </div>
               <div className="flex gap-2 shrink-0">
                  <button className="p-2 bg-muted rounded-full hover:bg-success hover:text-white transition-colors" title="Llamar" onClick={(e) => { e.stopPropagation(); console.log("Llamar"); }}>
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-muted rounded-full hover:bg-success hover:text-white transition-colors" title="WhatsApp" onClick={(e) => { e.stopPropagation(); console.log("WP"); }}>
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors" onClick={(e) => { e.stopPropagation(); console.log("Action"); }}>
                    Registrar Avance
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OppCard({ opp, formatMoney, cardSize, isSelected, onToggleSelect, onClick }: any) {
  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', opp.id);
        e.currentTarget.classList.add('opacity-50');
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove('opacity-50');
      }}
      className={`bg-card rounded-lg border shadow-sm transition-all cursor-pointer relative group select-none ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
      onClick={onClick}
    >
      {/* Checkbox Overlay */}
      <div 
        className={`absolute top-2 right-2 z-10 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
      >
        {isSelected && <CheckCircle2 className="w-3 h-3" />}
      </div>

      <div className={`p-3 ${cardSize === 'COMPACT' ? 'pb-2' : ''}`}>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-bold text-muted-foreground">{opp.id}</span>
          {opp.hot && <span className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Oportunidad Caliente" />}
        </div>
        
        <h4 className={`font-bold text-foreground leading-tight ${cardSize === 'COMPACT' ? 'text-xs truncate mb-1' : 'text-sm mb-2'}`}>
          {opp.title}
        </h4>
        
        <div className={`text-muted-foreground ${cardSize === 'COMPACT' ? 'text-[10px] truncate' : 'text-xs mb-3'}`}>
          {opp.clientName}
        </div>

        {cardSize === 'EXPANDED' && (
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
            <span className="text-sm font-black text-foreground">{formatMoney(opp.amount)}</span>
            <div className="flex gap-1">
              <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-success transition-colors" onClick={(e) => { e.stopPropagation(); }} title="WhatsApp">
                <MessageCircle className="w-3 h-3" />
              </button>
              <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); }} title="Llamar">
                <Phone className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- FICHA DE OPORTUNIDAD MODAL ---
function OpportunityDetailModal({ opp, onClose, onDuplicate, formatMoney, onMoveOpp }: any) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Panel */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-card h-full border-l border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10">
          <div className="flex gap-2">
            <button 
              onClick={() => { onMoveOpp(opp.id, 's5'); onClose(); }}
              className="text-xs font-bold px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-success" /> Marcar Ganada
            </button>
            <button 
              onClick={() => { onMoveOpp(opp.id, 's6'); onClose(); }}
              className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3 text-destructive" /> Marcar Perdida
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => onDuplicate(opp)} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors" title="Duplicar">
              <Copy className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Main Info */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{opp.id}</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">{STAGES.find(s=>s.id===opp.stageId)?.name}</span>
            </div>
            <h2 className="text-2xl font-black text-foreground leading-tight mb-2">{opp.title}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-bold flex items-center gap-1"><Users className="w-4 h-4" /> {opp.clientName}</span>
              <span className="font-bold">{formatMoney(opp.amount)}</span>
            </div>
          </div>

          {/* Quick Connectors (Crucial for Adenda) */}
          <div className="p-4 bg-muted/30 border-b border-border grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Cotizar</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Agendar</span>
            </button>
            <button className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-xl hover:border-success hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">WhatsApp</span>
            </button>
            
            {opp.driveFolderId ? (
              <button className="flex flex-col items-center justify-center p-3 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-foreground">Abrir Drive</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
              </button>
            ) : (
              <button className="flex flex-col items-center justify-center p-3 bg-muted border border-dashed border-border rounded-xl hover:border-primary transition-all">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mb-2">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">Crear Carpeta</span>
              </button>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Conversations Block */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Conversaciones Omnicanal
              </h3>
              <div className="space-y-3">
                {MESSAGES.map(m => (
                  <div key={m.id} className="bg-muted/50 p-3 rounded-lg border border-border/50 text-sm">
                    <div className="flex justify-between items-start mb-1 text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        {m.type === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-success" /> : <Mail className="w-3 h-3 text-primary" />}
                        {m.sender}
                      </span>
                      <span className="text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">{m.text}</p>
                  </div>
                ))}
                <button className="w-full py-2 text-xs font-bold text-primary border border-primary/20 rounded-md hover:bg-primary/5 transition-colors">
                  Ir a Bandeja Omnicanal
                </button>
              </div>
            </div>

            {/* Timeline Mock */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Historial
              </h3>
              <div className="relative pl-4 border-l-2 border-border space-y-4">
                <div className="relative">
                  <div className="absolute -left-[21px] w-3 h-3 bg-primary rounded-full border-2 border-card"></div>
                  <p className="text-sm font-bold text-foreground">Cotización C-1045 creada</p>
                  <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] w-3 h-3 bg-muted-foreground rounded-full border-2 border-card"></div>
                  <p className="text-sm font-bold text-foreground">Oportunidad Creada</p>
                  <p className="text-xs text-muted-foreground">{new Date(opp.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}

