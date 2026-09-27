import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, TrendingUp, AlertCircle, Clock, CheckCircle2, MessageCircle, Maximize2, Minimize2,
  FileText, Calendar, Copy, Columns, List, ChevronLeft, ChevronRight, X, CheckSquare, Users, Trash2, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { fuzzyMatchAny } from '../../../../../../../packages/core/src/utils/search';
import { notify } from '@/lib/notify';
import { useFusionAuth } from '@/context/FusionAuthContext';
import {
  OPEN_STAGES, PIPELINE_STAGES, moveOpportunity, newOpportunityId, opportunitiesCollection, stageName, whatsappLink,
  type Opportunity, type StageId,
} from '@/lib/pipelineStore';

const formatMoney = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const BOARD_STAGES = PIPELINE_STAGES.filter((s) => s.id !== 's6');

function useOpportunities() {
  const [items, setItems] = useState<Opportunity[]>(opportunitiesCollection.getAll());
  const [loading, setLoading] = useState(!opportunitiesCollection.isHydrated());
  useEffect(() => {
    const refresh = () => setItems([...opportunitiesCollection.getAll()]);
    window.addEventListener('fusion_opportunities_updated', refresh);
    opportunitiesCollection
      .hydrate()
      .catch(() => notify('No se pudo cargar el pipeline. Revisa la conexión.', 'error'))
      .finally(() => setLoading(false));
    return () => window.removeEventListener('fusion_opportunities_updated', refresh);
  }, []);
  return { items, loading };
}

export default function PipelineComercialPage() {
  const { currentUser, employees } = useFusionAuth();
  const { items: opportunities, loading } = useOpportunities();
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'TODAY'>('KANBAN');
  const [cardSize, setCardSize] = useState<'COMPACT' | 'EXPANDED'>('COMPACT');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'MINE'>('ALL');
  const [showLost, setShowLost] = useState(false);
  const [activeOppId, setActiveOppId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredOpps = useMemo(
    () =>
      opportunities
        .filter((o) => ownerFilter === 'ALL' || o.ownerId === currentUser?.id)
        .filter((o) => fuzzyMatchAny(searchQuery, [o.title, o.clientName, o.id, o.contactName ?? ''])),
    [opportunities, searchQuery, ownerFilter, currentUser]
  );

  const todayOpps = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return filteredOpps
      .filter((o) => OPEN_STAGES.includes(o.stageId) && o.nextActionAt && new Date(o.nextActionAt) <= endOfToday)
      .sort((a, b) => (a.nextActionAt ?? '').localeCompare(b.nextActionAt ?? ''));
  }, [filteredOpps]);

  const kpis = useMemo(() => {
    const open = filteredOpps.filter((o) => OPEN_STAGES.includes(o.stageId));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const wonThisMonth = filteredOpps.filter((o) => o.stageId === 's5' && (o.updatedAt ?? '') >= monthStart.toISOString());
    return {
      openCount: open.length,
      openTotal: open.reduce((s, o) => s + (o.amount || 0), 0),
      weighted: open.reduce((s, o) => s + (o.amount || 0) * ((PIPELINE_STAGES.find((st) => st.id === o.stageId)?.probability ?? 0) / 100), 0),
      wonCount: wonThisMonth.length,
      wonTotal: wonThisMonth.reduce((s, o) => s + (o.amount || 0), 0),
    };
  }, [filteredOpps]);

  const save = async (opp: Opportunity) => {
    try {
      await opportunitiesCollection.save(opp);
    } catch {
      notify('No se pudo guardar la oportunidad.', 'error');
      throw new Error('save failed');
    }
  };

  const handleMoveOpp = (oppId: string, stageId: StageId, extra: Partial<Opportunity> = {}) => {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || (opp.stageId === stageId && !Object.keys(extra).length)) return;
    save(moveOpportunity(opp, stageId, currentUser?.name, extra)).catch(() => undefined);
  };

  const handleDuplicate = async (opp: Opportunity) => {
    const copy: Opportunity = {
      ...opp,
      id: newOpportunityId(),
      title: `${opp.title} (copia)`,
      stageId: 's1',
      lostReason: undefined,
      history: [{ at: new Date().toISOString(), by: currentUser?.name, text: `Creada como copia de ${opp.id}` }],
      createdAt: undefined,
    };
    await save(copy);
    setActiveOppId(copy.id);
  };

  const handleDelete = async (id: string) => {
    await opportunitiesCollection.remove(id);
    setActiveOppId(null);
    notify('Oportunidad eliminada.');
  };

  const boardStages = showLost ? PIPELINE_STAGES : BOARD_STAGES;
  const activeOpp = opportunities.find((o) => o.id === activeOppId);

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 relative pb-20 md:pb-6">
      <div className="sticky top-0 z-30 bg-background border-b border-border shadow-sm p-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> Pipeline Comercial
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {loading
                ? 'Cargando…'
                : `${kpis.openCount} abiertas · ${formatMoney(kpis.openTotal)} (ponderado ${formatMoney(kpis.weighted)}) · ganadas este mes: ${kpis.wonCount} por ${formatMoney(kpis.wonTotal)}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg flex items-center border border-border">
              <button onClick={() => setViewMode('TODAY')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${viewMode === 'TODAY' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                Para hoy ({todayOpps.length})
              </button>
              <button onClick={() => setViewMode('KANBAN')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${viewMode === 'KANBAN' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'} hidden md:flex items-center gap-1`}>
                <Columns className="w-3 h-3" /> Tablero
              </button>
              <button onClick={() => setViewMode('LIST')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${viewMode === 'LIST' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'} md:hidden flex items-center gap-1`}>
                <List className="w-3 h-3" /> Etapas
              </button>
            </div>
            <button onClick={() => setCardSize((s) => (s === 'COMPACT' ? 'EXPANDED' : 'COMPACT'))} className="hidden md:flex p-2 text-muted-foreground hover:bg-muted rounded-md" title="Alternar tamaño de tarjeta">
              {cardSize === 'COMPACT' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por título, cliente, contacto… (atajo: /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as 'ALL' | 'MINE')} className="px-3 py-2 bg-muted/50 border border-input rounded-md text-xs font-bold">
            <option value="ALL">Todo el equipo</option>
            <option value="MINE">Solo las mías</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} className="rounded" />
            Ver perdidas
          </label>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-x-auto">
        {!loading && opportunities.length === 0 ? (
          <div className="max-w-md mx-auto text-center p-10 bg-card border border-border rounded-xl mt-10">
            <TrendingUp className="w-10 h-10 mx-auto text-primary opacity-60 mb-3" />
            <h3 className="font-bold text-lg">Aún no hay oportunidades</h3>
            <p className="text-sm text-muted-foreground mb-4">Registra cada negocio en curso para ver cuánto hay en juego y qué toca hacer hoy.</p>
            <button onClick={() => setCreating(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">
              Crear la primera
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'TODAY' && <TodayView opps={todayOpps} onOpen={setActiveOppId} />}
            {viewMode === 'KANBAN' && <KanbanView stages={boardStages} opps={filteredOpps} cardSize={cardSize} onOpen={setActiveOppId} onMoveOpp={handleMoveOpp} />}
            {viewMode === 'LIST' && <MobileStageView stages={boardStages} opps={filteredOpps} onOpen={setActiveOppId} />}
          </>
        )}
      </div>

      <AnimatePresence>
        {(activeOpp || creating) && (
          <OpportunityPanel
            key={activeOpp ? `${activeOpp.id}-${activeOpp.stageId}` : 'new'}
            opp={creating ? null : activeOpp!}
            employees={employees.filter((e) => e.status !== 'INACTIVO')}
            currentUser={currentUser}
            onClose={() => {
              setActiveOppId(null);
              setCreating(false);
            }}
            onSave={async (o) => {
              await save(o);
              notify(creating ? 'Oportunidad creada.' : 'Cambios guardados.', 'success');
              setCreating(false);
              setActiveOppId(o.id);
            }}
            onMove={handleMoveOpp}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- VISTAS ---

function KanbanView({ stages, opps, cardSize, onOpen, onMoveOpp }: { stages: readonly (typeof PIPELINE_STAGES)[number][]; opps: Opportunity[]; cardSize: string; onOpen: (id: string) => void; onMoveOpp: (id: string, s: StageId) => void }) {
  return (
    <div className="flex gap-4 h-full min-h-[600px] items-start pb-4">
      {stages.map((stage) => {
        const stageOpps = opps.filter((o) => o.stageId === stage.id);
        const stageTotal = stageOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-[290px] flex flex-col bg-muted/30 rounded-xl border border-border h-full max-h-full"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-primary/5');
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('bg-primary/5')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-primary/5');
              const oppId = e.dataTransfer.getData('text/plain');
              if (oppId) onMoveOpp(oppId, stage.id);
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
              {stageOpps.map((opp) => (
                <OppCard key={opp.id} opp={opp} cardSize={cardSize} onClick={() => onOpen(opp.id)} />
              ))}
              {stageOpps.length === 0 && <div className="p-4 text-center border-2 border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground">Arrastra aquí</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileStageView({ stages, opps, onOpen }: { stages: readonly (typeof PIPELINE_STAGES)[number][]; opps: Opportunity[]; onOpen: (id: string) => void }) {
  const [idx, setIdx] = useState(0);
  const stage = stages[Math.min(idx, stages.length - 1)];
  const stageOpps = opps.filter((o) => o.stageId === stage.id);
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-2 shadow-sm">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="p-2 disabled:opacity-30" aria-label="Etapa anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-bold text-sm">{stage.name}</div>
          <div className="text-xs text-muted-foreground">
            {stageOpps.length} · {formatMoney(stageOpps.reduce((s, o) => s + (o.amount || 0), 0))}
          </div>
        </div>
        <button onClick={() => setIdx((i) => Math.min(stages.length - 1, i + 1))} disabled={idx >= stages.length - 1} className="p-2 disabled:opacity-30" aria-label="Etapa siguiente">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3">
        {stageOpps.map((opp) => (
          <OppCard key={opp.id} opp={opp} cardSize="EXPANDED" onClick={() => onOpen(opp.id)} />
        ))}
        {stageOpps.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm font-medium">No hay oportunidades en esta etapa</div>}
      </div>
    </div>
  );
}

function TodayView({ opps, onOpen }: { opps: Opportunity[]; onOpen: (id: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
        <CheckSquare className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-lg font-black text-foreground">Para hoy</h2>
          <p className="text-xs text-muted-foreground">Próximas acciones vencidas o programadas para hoy</p>
        </div>
      </div>
      {opps.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-lg">¡Todo al día!</h3>
          <p className="text-sm text-muted-foreground">No hay acciones pendientes para hoy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opps.map((opp) => {
            const overdue = new Date(opp.nextActionAt!) < new Date(new Date().setHours(0, 0, 0, 0));
            const wa = whatsappLink(opp.contactPhone);
            return (
              <div key={opp.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/50 cursor-pointer shadow-sm" onClick={() => onOpen(opp.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className={`w-4 h-4 ${overdue ? 'text-destructive' : 'text-amber-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${overdue ? 'text-destructive' : 'text-amber-600'}`}>
                      {overdue ? 'Vencida' : 'Hoy'} · {opp.nextAction || 'Seguimiento'}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground text-lg">{opp.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {opp.clientName} · {formatMoney(opp.amount)} · {stageName(opp.stageId)}
                  </p>
                </div>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-muted rounded-full hover:bg-success hover:text-white" title="WhatsApp">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OppCard({ opp, cardSize, onClick }: { opp: Opportunity; cardSize: string; onClick: () => void }) {
  const overdue = opp.nextActionAt && OPEN_STAGES.includes(opp.stageId) && new Date(opp.nextActionAt) < new Date();
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', opp.id);
        e.currentTarget.classList.add('opacity-50');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
      className="bg-card rounded-lg border border-border hover:border-primary/50 shadow-sm cursor-pointer select-none"
      onClick={onClick}
    >
      <div className="p-3">
        <div className="flex justify-between items-start mb-1 gap-2">
          <span className="text-[10px] font-bold text-muted-foreground">{opp.id}</span>
          <div className="flex items-center gap-1">
            {overdue && <Clock className="w-3 h-3 text-destructive" aria-label="Acción vencida" />}
            {opp.hot && <span className="w-2 h-2 rounded-full bg-destructive" title="Prioritaria" />}
          </div>
        </div>
        <h4 className={`font-bold text-foreground leading-tight ${cardSize === 'COMPACT' ? 'text-xs truncate mb-1' : 'text-sm mb-2'}`}>{opp.title}</h4>
        <div className={`text-muted-foreground ${cardSize === 'COMPACT' ? 'text-[10px] truncate' : 'text-xs mb-2'}`}>{opp.clientName}</div>
        <div className="flex items-center justify-between mt-1">
          <span className={`${cardSize === 'COMPACT' ? 'text-[11px]' : 'text-sm'} font-black text-foreground`}>{formatMoney(opp.amount)}</span>
          {opp.ownerName && <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">{opp.ownerName}</span>}
        </div>
        {cardSize === 'EXPANDED' && opp.nextAction && (
          <div className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50 truncate">
            Próximo: {opp.nextAction}
            {opp.nextActionAt ? ` · ${new Date(opp.nextActionAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// --- FICHA (crear / editar) ---

interface PanelProps {
  opp: Opportunity | null;
  employees: { id: string; name: string }[];
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
  onSave: (o: Opportunity) => Promise<void>;
  onMove: (id: string, s: StageId, extra?: Partial<Opportunity>) => void;
  onDuplicate: (o: Opportunity) => void;
  onDelete: (id: string) => void;
}

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const fromDateInput = (v: string) => (v ? new Date(`${v}T09:00:00`).toISOString() : undefined);

function OpportunityPanel({ opp, employees, currentUser, onClose, onSave, onMove, onDuplicate, onDelete }: PanelProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Opportunity>(
    () =>
      opp ?? {
        id: newOpportunityId(),
        title: '',
        clientName: '',
        amount: 0,
        stageId: 's1',
        ownerId: currentUser?.id,
        ownerName: currentUser?.name,
        history: [{ at: new Date().toISOString(), by: currentUser?.name, text: 'Oportunidad creada' }],
      }
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Opportunity>(k: K, v: Opportunity[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !opp;
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(opp);
  const wa = whatsappLink(form.contactPhone);

  const submit = async () => {
    if (!form.title.trim() || !form.clientName.trim()) return notify('Escribe al menos el título y el cliente.', 'error');
    setSaving(true);
    try {
      const owner = employees.find((e) => e.id === form.ownerId);
      await onSave({ ...form, title: form.title.trim(), clientName: form.clientName.trim(), ownerName: owner?.name ?? form.ownerName });
    } catch {
      /* el aviso ya se mostró */
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-input rounded-md text-sm bg-background';
  const label = 'text-xs font-bold text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-card h-full border-l border-border shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10 gap-2">
          <div className="flex gap-2 flex-wrap">
            {!isNew && OPEN_STAGES.includes(opp!.stageId) && (
              <>
                <button onClick={() => onMove(opp!.id, 's5')} className="text-xs font-bold px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ganada
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('¿Por qué se perdió? (precio, tiempo de entrega, competencia…)');
                    if (reason === null) return;
                    onMove(opp!.id, 's6', { lostReason: reason.trim() || 'Sin motivo' });
                  }}
                  className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Perdida
                </button>
              </>
            )}
            {!isNew && !OPEN_STAGES.includes(opp!.stageId) && (
              <button onClick={() => onMove(opp!.id, 's4')} className="text-xs font-bold px-3 py-1.5 bg-muted border border-border rounded-md hover:bg-muted/70">
                Reabrir
              </button>
            )}
          </div>
          <div className="flex gap-1 items-center">
            {!isNew && (
              <>
                <button onClick={() => onDuplicate(opp!)} className="p-2 text-muted-foreground hover:bg-muted rounded-md" title="Duplicar">
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirm('¿Eliminar esta oportunidad? No se puede deshacer.') && onDelete(opp!.id)}
                  className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-md" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{form.id}</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">{stageName(form.stageId)}</span>
              {form.stageId === 's6' && form.lostReason && <span className="text-xs text-destructive">Motivo: {form.lostReason}</span>}
            </div>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Cajas para lanzamiento de pintura" className="w-full text-xl font-black bg-transparent border-b-2 border-border focus:border-primary outline-none py-1" autoFocus={isNew} />
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Cliente" className="flex-1 bg-transparent border-b border-border focus:border-primary outline-none py-1 font-bold" />
            </div>
          </div>

          {!isNew && (
            <div className="p-4 bg-muted/30 border-b border-border grid grid-cols-3 gap-3">
              <button onClick={() => navigate('/dashboard/cotizador')} className="flex flex-col items-center p-3 bg-card border border-border rounded-xl hover:border-primary">
                <FileText className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs font-bold">Cotizar</span>
              </button>
              <button onClick={() => navigate('/dashboard/comercial/agenda')} className="flex flex-col items-center p-3 bg-card border border-border rounded-xl hover:border-primary">
                <Calendar className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs font-bold">Agendar</span>
              </button>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center p-3 bg-card border border-border rounded-xl hover:border-success">
                  <MessageCircle className="w-5 h-5 text-success mb-1" />
                  <span className="text-xs font-bold">WhatsApp</span>
                </a>
              ) : (
                <div className="flex flex-col items-center p-3 bg-muted border border-dashed border-border rounded-xl text-muted-foreground" title="Agrega el celular del contacto">
                  <MessageCircle className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Sin celular</span>
                </div>
              )}
            </div>
          )}

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={label}>Valor estimado (COP)</label>
              <input type="number" min={0} step={10000} value={form.amount || ''} onChange={(e) => set('amount', Number(e.target.value) || 0)} className={input} />
            </div>
            <div className="space-y-1">
              <label className={label}>Etapa</label>
              <select value={form.stageId} onChange={(e) => set('stageId', e.target.value as StageId)} className={input} disabled={!isNew}>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={label}>Contacto</label>
              <input value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} className={input} placeholder="Nombre" />
            </div>
            <div className="space-y-1">
              <label className={label}>Celular del contacto</label>
              <input value={form.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} className={input} placeholder="310 000 0000" />
            </div>
            <div className="space-y-1">
              <label className={label}>Responsable</label>
              <select value={form.ownerId ?? ''} onChange={(e) => set('ownerId', e.target.value)} className={input}>
                <option value="">Sin asignar</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={label}>Cierre esperado</label>
              <input type="date" value={toDateInput(form.expectedCloseAt)} onChange={(e) => set('expectedCloseAt', fromDateInput(e.target.value))} className={input} />
            </div>
            <div className="space-y-1">
              <label className={label}>Próxima acción</label>
              <input value={form.nextAction ?? ''} onChange={(e) => set('nextAction', e.target.value)} className={input} placeholder="Llamar para confirmar muestras" />
            </div>
            <div className="space-y-1">
              <label className={label}>Fecha de la próxima acción</label>
              <input type="date" value={toDateInput(form.nextActionAt)} onChange={(e) => set('nextActionAt', fromDateInput(e.target.value))} className={input} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className={label}>Notas</label>
              <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className={`${input} min-h-[80px] resize-none`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer md:col-span-2">
              <input type="checkbox" checked={!!form.hot} onChange={(e) => set('hot', e.target.checked)} className="rounded" />
              Prioritaria
            </label>
          </div>

          {!isNew && (form.history?.length ?? 0) > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" /> Historial
              </h3>
              <div className="relative pl-4 border-l-2 border-border space-y-3">
                {[...(form.history ?? [])].reverse().map((h, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 bg-primary rounded-full border-2 border-card" />
                    <p className="text-sm font-bold text-foreground">{h.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      {h.by ? ` · ${h.by}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/10">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            {dirty ? 'Cancelar' : 'Cerrar'}
          </button>
          <button onClick={submit} disabled={saving || !dirty} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-bold rounded-md text-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : isNew ? 'Crear oportunidad' : 'Guardar cambios'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
