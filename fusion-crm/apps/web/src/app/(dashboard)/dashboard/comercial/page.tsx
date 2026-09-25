import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Calendar, Target, DollarSign, TrendingUp, TrendingDown, Clock, 
  AlertTriangle, ArrowRight, Download, Mail, Users, CheckCircle, Percent, AlertCircle,
  TableProperties, LayoutGrid, EyeOff, Sparkles, FileText
} from 'lucide-react';
import PrecotizacionesView from './precotizaciones/PrecotizacionesView';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Area, AreaChart, ReferenceLine
} from 'recharts';

// --- ESTADO INICIAL LIMPIO (SIN ACTIVIDAD INICIAL REGISTRADA) ---
const DEVIATIONS: any[] = [];

const FUNNEL_DATA = [
  { name: 'Prospecto', value: 0, amount: 0, color: '#3b82f6' },
  { name: 'Cotizado', value: 0, amount: 0, color: '#6366f1' },
  { name: 'En Negociación', value: 0, amount: 0, color: '#8b5cf6' },
  { name: 'Cierre Ganado', value: 0, amount: 0, color: '#10b981' },
];

const SALES_TREND: any[] = [];

const RANKING_DATA: any[] = [];

const CONCENTRATION_DATA: any[] = [];
const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#9ca3af'];

const QUOTES_AT_RISK: any[] = [];

const CLIENTS_AT_RISK: any[] = [];

type WidgetId = 'W_TREND' | 'W_FUNNEL' | 'W_RANKING' | 'W_CONCENTRATION' | 'W_ACTIVITY' | 'W_QUOTES' | 'W_CLIENTS' | 'W_AGENDA';

const INITIAL_WIDGET_ORDER: WidgetId[] = ['W_TREND', 'W_FUNNEL', 'W_RANKING', 'W_CONCENTRATION', 'W_ACTIVITY', 'W_QUOTES', 'W_CLIENTS', 'W_AGENDA'];

export default function ComercialDashboardPage() {
  const navigate = useNavigate();
  const [activeComercialTab, setActiveComercialTab] = useState<'METRICS' | 'PRECOTIZACIONES'>('METRICS');
  const [period, setPeriod] = useState('MONTH');

  const handleOpenInCotizador = (quote: any) => {
    if (quote?.id) {
      navigate(`/dashboard/cotizador?quoteId=${quote.id}`);
    } else {
      navigate('/dashboard/cotizador');
    }
  };
  
  // ROLE SIMULATION
  const [currentUserRole, setCurrentUserRole] = useState<'COMERCIAL' | 'GERENTE'>('GERENTE');
  const loggedInUserName = 'Andrés'; 

  const [selectedScope, setSelectedScope] = useState('TEAM');
  const scope = currentUserRole === 'COMERCIAL' ? 'ME' : selectedScope;

  // Widget Customization State
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(INITIAL_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  
  // A11y Table View State
  const [viewAsTable, setViewAsTable] = useState<Record<string, boolean>>({});

  // SSE / Live updates simulation
  const [liveDeviations, setLiveDeviations] = useState(DEVIATIONS);
  useEffect(() => {
    // Simulate Server-Sent Events updating deviations without page reload
    const interval = setInterval(() => {
      // In a real app: const es = new EventSource('/api/stream/commercial-deviations');
      // console.log("[SSE] Received new metrics update");
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const emitEvent = (eventName: string, payload: any) => {
    console.log(`[EVENT EMITTED] ${eventName}`, payload);
  };

  // Formatters
  const formatMoney = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  // Derived Data
  const filteredRanking = useMemo(() => {
    if (scope === 'ME') return RANKING_DATA.filter(r => r.name === loggedInUserName);
    if (scope === 'U_ANA') return RANKING_DATA.filter(r => r.name === 'Ana G.');
    if (scope === 'U_CARLOS') return RANKING_DATA.filter(r => r.name === 'Carlos R.');
    return RANKING_DATA;
  }, [scope]);

  const filteredQuotes = useMemo(() => {
    if (scope === 'ME') return QUOTES_AT_RISK.filter(q => q.rep === loggedInUserName);
    if (scope === 'U_ANA') return QUOTES_AT_RISK.filter(q => q.rep === 'Ana G.');
    if (scope === 'U_CARLOS') return QUOTES_AT_RISK.filter(q => q.rep === 'Carlos R.');
    return QUOTES_AT_RISK;
  }, [scope]);

  const filteredClients = useMemo(() => {
    if (scope === 'ME') return CLIENTS_AT_RISK.filter(c => c.rep === loggedInUserName);
    if (scope === 'U_ANA') return CLIENTS_AT_RISK.filter(c => c.rep === 'Ana G.');
    if (scope === 'U_CARLOS') return CLIENTS_AT_RISK.filter(c => c.rep === 'Carlos R.');
    return CLIENTS_AT_RISK;
  }, [scope]);

  const totalSales = scope === 'TEAM' ? 0 : filteredRanking[0]?.sales || 0;
  const goalPercentage = scope === 'TEAM' ? 0 : filteredRanking[0]?.pct || 0;
  
  const pacePercentage = 0; 
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercentage / 100) * circumference;
  const paceOffset = circumference - (pacePercentage / 100) * circumference;

  // D&D Handlers
  const handleDragStart = (e: React.DragEvent, id: WidgetId) => {
    setDraggedWidget(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === id) return;
    const items = [...widgetOrder];
    const draggedIdx = items.indexOf(draggedWidget);
    const targetIdx = items.indexOf(id);
    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedWidget);
    setWidgetOrder(items);
  };
  const handleDrop = () => {
    setDraggedWidget(null);
  };
  const toggleWidgetVisibility = (id: WidgetId) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTableView = (widgetId: string) => {
    setViewAsTable(prev => ({ ...prev, [widgetId]: !prev[widgetId] }));
  };

  const WIDGET_COMPONENTS: Record<WidgetId, React.ReactNode> = {
    W_TREND: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col h-full col-span-1 lg:col-span-2 relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_TREND')} onDragOver={(e) => handleDragOver(e, 'W_TREND')} onDrop={handleDrop}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-foreground">Proyección de Ventas vs. Meta</h3>
            <p className="text-xs text-muted-foreground">Calculado: Promedio móvil de últimos 5 días hábiles</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={() => toggleTableView('trend')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors" aria-label="Alternar vista de tabla">
              {viewAsTable['trend'] ? <LayoutGrid className="w-4 h-4" /> : <TableProperties className="w-4 h-4" />}
            </button>
            <button onClick={() => toggleWidgetVisibility('W_TREND')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
          </div>
        </div>
        
        {viewAsTable['trend'] ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30"><tr><th className="p-2">Día</th><th className="p-2">Real</th><th className="p-2">Proyección</th><th className="p-2">Meta</th></tr></thead>
              <tbody>
                {SALES_TREND.length > 0 ? SALES_TREND.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border"><td className="p-2">{row.day}</td><td className="p-2">{row.real ? formatMoney(row.real) : '-'}</td><td className="p-2">{row.proj ? formatMoney(row.proj) : '-'}</td><td className="p-2">{formatMoney(row.goal)}</td></tr>
                )) : (
                  <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">Sin registros de tendencia en el período inicial</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {SALES_TREND.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={SALES_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(val) => '$' + (val/1000000) + 'M'} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    formatter={(value: any, name: string) => [formatMoney(value), name === 'real' ? 'Acumulado' : name === 'goal' ? 'Meta' : 'Proyección']}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Area type="monotone" dataKey="goal" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" />
                  <Area type="monotone" dataKey="proj" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="5 5" fill="none" />
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-foreground">Sin actividad comercial registrada</p>
                <p className="text-xs text-muted-foreground mt-1">La gráfica de proyección se construirá automáticamente cuando se emitan cotizaciones y ventas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    W_FUNNEL: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col h-full relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_FUNNEL')} onDragOver={(e) => handleDragOver(e, 'W_FUNNEL')} onDrop={handleDrop}>
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-foreground">Embudo de Conversión</h3>
            <p className="text-xs text-muted-foreground">Volumen y valor por etapa</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleTableView('funnel')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><TableProperties className="w-4 h-4" /></button>
            <button onClick={() => toggleWidgetVisibility('W_FUNNEL')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
          </div>
        </div>
        
        {viewAsTable['funnel'] ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30"><tr><th className="p-2">Etapa</th><th className="p-2">Conteo</th><th className="p-2">Valor</th></tr></thead>
              <tbody>
                {FUNNEL_DATA.map((row, i) => (
                  <tr key={i} className="border-b border-border"><td className="p-2">{row.name}</td><td className="p-2">{scope === 'TEAM' ? row.value : Math.ceil(row.value / 3)}</td><td className="p-2">{formatMoney(scope === 'TEAM' ? row.amount : row.amount / 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 justify-center">
            {FUNNEL_DATA.map((stage, idx) => {
              const maxVal = FUNNEL_DATA[0]?.value || 1;
              const widthPct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
              let conversion = null;
              if (idx > 0 && FUNNEL_DATA[idx - 1]?.value > 0) {
                conversion = ((stage.value / FUNNEL_DATA[idx - 1].value) * 100).toFixed(0);
              }
              
              return (
                <div key={stage.name} className="relative group/bar">
                  {conversion && <div className="absolute -top-3 right-0 text-[10px] font-bold text-muted-foreground bg-muted px-1.5 rounded-full z-10">{conversion}% paso</div>}
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-foreground">{stage.name} <span className="text-muted-foreground font-normal ml-1">({scope === 'TEAM' ? stage.value : Math.ceil(stage.value / 3)})</span></span>
                    <span className="font-bold">${((scope === 'TEAM' ? stage.amount : stage.amount / 3)/1000000).toFixed(1)}M</span>
                  </div>
                  <div className="w-full bg-muted rounded-md h-8 overflow-hidden flex items-center justify-center relative">
                    <div className="absolute inset-y-0 left-0 transition-all duration-500 rounded-md" style={{ width: `${Math.max(4, widthPct)}%`, backgroundColor: stage.color, opacity: 0.85 }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    W_RANKING: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_RANKING')} onDragOver={(e) => handleDragOver(e, 'W_RANKING')} onDrop={handleDrop}>
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-foreground">Ranking del Equipo</h3>
            <p className="text-xs text-muted-foreground">Ventas cerradas vs meta individual</p>
          </div>
          <button onClick={() => toggleWidgetVisibility('W_RANKING')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          {filteredRanking.length > 0 ? filteredRanking.map((rep, i) => (
            <div key={rep.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{scope === 'TEAM' ? (i + 1) + '.' : '-'}</span>
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black">{rep.avatar}</div>
                  <span className="font-bold text-foreground">{rep.name} {rep.name === loggedInUserName && scope === 'TEAM' ? '(Tú)' : ''}</span>
                </div>
                <div className="text-right">
                  <span className="font-black">${((rep.sales || 0)/1000000).toFixed(1)}M</span>
                  <span className="text-xs text-muted-foreground ml-1">/ ${((rep.goal || 1)/1000000).toFixed(1)}M</span>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                <div className={`absolute top-0 left-0 h-full rounded-full ${rep.pct >= 100 ? 'bg-success' : rep.pct >= 80 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, rep.pct || 0)}%` }}></div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/20 z-10" style={{ left: '100%' }}></div>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Sin vendedores activos con ventas registradas en el período.
            </div>
          )}
        </div>
      </div>
    ),
    W_CONCENTRATION: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_CONCENTRATION')} onDragOver={(e) => handleDragOver(e, 'W_CONCENTRATION')} onDrop={handleDrop}>
         <div className="mb-4 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-foreground">Concentración de Cartera</h3>
            <p className="text-xs text-muted-foreground">Pipeline por cliente activo</p>
          </div>
          <div className="flex gap-2 items-center">
            {scope === 'TEAM' && Boolean(CONCENTRATION_DATA[0]?.value > 30) && <AlertCircle className="w-4 h-4 text-destructive animate-pulse" aria-label="¡ANOMALÍA! Un cliente supera 30% del pipeline total" />}
            <button onClick={() => toggleTableView('concentration')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><TableProperties className="w-4 h-4" /></button>
            <button onClick={() => toggleWidgetVisibility('W_CONCENTRATION')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
          </div>
        </div>
        
        {viewAsTable['concentration'] ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30"><tr><th className="p-2">Cliente</th><th className="p-2">% Concentración</th></tr></thead>
              <tbody>
                {CONCENTRATION_DATA.length > 0 ? CONCENTRATION_DATA.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border"><td className="p-2 font-bold">{row.name}</td><td className={`p-2 ${row.value > 30 ? 'text-destructive font-black' : ''}`}>{row.value}%</td></tr>
                )) : (
                  <tr><td colSpan={2} className="p-4 text-center text-sm text-muted-foreground">Sin concentración registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[200px] relative flex items-center justify-center">
             {CONCENTRATION_DATA.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={CONCENTRATION_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                     {CONCENTRATION_DATA.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip formatter={(val: number) => [`${val}%`, 'Porcentaje']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontWeight: 'bold' }} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-center text-xs text-muted-foreground">
                 Sin clientes concentrados en el período.
               </div>
             )}
          </div>
        )}
      </div>
    ),
    W_ACTIVITY: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_ACTIVITY')} onDragOver={(e) => handleDragOver(e, 'W_ACTIVITY')} onDrop={handleDrop}>
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-foreground">Mapa de Actividad (Semanal)</h3>
            <p className="text-xs text-muted-foreground">Llamadas, visitas, cotizaciones</p>
          </div>
          <button onClick={() => toggleWidgetVisibility('W_ACTIVITY')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[300px]">
            <div className="grid grid-cols-6 gap-1 mb-2">
              <div className="text-xs text-transparent">User</div>
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
                <div key={d} className="text-xs font-bold text-center text-muted-foreground">{d}</div>
              ))}
            </div>
            {filteredRanking.length > 0 ? filteredRanking.map(user => (
              <div key={user.name} className="grid grid-cols-6 gap-1 mb-2 items-center">
                <div className="text-xs font-bold text-foreground truncate pr-2" aria-label={user.name}>{user.name}</div>
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="h-6 rounded-md border border-border/20 bg-muted/40"
                  ></div>
                ))}
              </div>
            )) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Sin actividad semanal registrada.
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    W_QUOTES: (
      <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_QUOTES')} onDragOver={(e) => handleDragOver(e, 'W_QUOTES')} onDrop={handleDrop}>
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Sin seguimiento ({">"}7 días)
            </h3>
          </div>
          <button onClick={() => toggleWidgetVisibility('W_QUOTES')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                {scope === 'TEAM' && <th className="px-4 py-3">Comercial</th>}
                <th className="px-4 py-3">Inactivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuotes.length > 0 ? filteredQuotes.map(q => (
                <tr key={q.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-bold text-foreground">{q.client}</td>
                  <td className="px-4 py-3">{formatMoney(q.amount)}</td>
                  {scope === 'TEAM' && <td className="px-4 py-3 text-xs text-muted-foreground">{q.rep}</td>}
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-700 font-bold rounded-md text-xs">{q.days}d</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">No hay cotizaciones atrasadas</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-muted/10 border-t border-border mt-auto flex justify-center">
          <button 
            onClick={() => emitEvent('desviacion.accion_ejecutada', { action: 'create_tasks_quotes' })}
            className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Crear tarea para todas
          </button>
        </div>
      </div>
    ),
    W_CLIENTS: (
      <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_CLIENTS')} onDragOver={(e) => handleDragOver(e, 'W_CLIENTS')} onDrop={handleDrop}>
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" /> En riesgo de fuga (VIP)
            </h3>
          </div>
          <button onClick={() => toggleWidgetVisibility('W_CLIENTS')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">LTV</th>
                <th className="px-4 py-3">Sin compra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClients.length > 0 ? filteredClients.map(c => (
                <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-bold text-foreground">{c.client}</td>
                  <td className="px-4 py-3">{formatMoney(c.ltv)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-destructive/10 text-destructive font-bold rounded-md text-xs">{c.daysSince}d</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="p-4 text-center text-sm text-muted-foreground">No hay clientes en riesgo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ),
    W_AGENDA: (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col relative group" draggable onDragStart={(e) => handleDragStart(e, 'W_AGENDA')} onDragOver={(e) => handleDragOver(e, 'W_AGENDA')} onDrop={handleDrop}>
        <div className="mb-4 flex justify-between items-start">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Cumplimiento de Agenda
          </h3>
          <button onClick={() => toggleWidgetVisibility('W_AGENDA')} className="text-muted-foreground hover:text-foreground hidden group-hover:block transition-colors"><EyeOff className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {filteredRanking.length > 0 ? filteredRanking.map(user => (
            <div key={user.name}>
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span>{user.name}</span>
                <span className="text-muted-foreground">0% (0/0)</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-muted-foreground/30" style={{ width: '0%' }}></div>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Sin compromisos de agenda registrados en el período.
            </div>
          )}
        </div>
      </div>
    )
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 pb-12">
      {/* HEADER FIJO */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black text-foreground tracking-tight">Dashboard Comercial</h1>
             {/* SIMULADOR DE ROL (Solo para demo) */}
             <div className="flex bg-muted rounded-md p-0.5 border border-border">
               <button 
                 onClick={() => { setCurrentUserRole('GERENTE'); setSelectedScope('TEAM'); }}
                 className={`text-[10px] font-bold px-2 py-1 rounded-sm transition-colors ${currentUserRole === 'GERENTE' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
               >
                 GERENTE
               </button>
               <button 
                 onClick={() => setCurrentUserRole('COMERCIAL')}
                 className={`text-[10px] font-bold px-2 py-1 rounded-sm transition-colors ${currentUserRole === 'COMERCIAL' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
               >
                 COMERCIAL
               </button>
             </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Panel de control de desviaciones y pipeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-muted text-foreground text-sm font-bold px-3 py-2 rounded-md border border-border focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer">
            <option value="TODAY">Hoy</option>
            <option value="WEEK">Esta semana</option>
            <option value="MONTH">Este mes</option>
            <option value="QUARTER">Este trimestre</option>
            <option value="YEAR">Este año</option>
          </select>
          <select 
            value={scope} 
            onChange={(e) => setSelectedScope(e.target.value)} 
            disabled={currentUserRole === 'COMERCIAL'}
            className="bg-muted text-foreground text-sm font-bold px-3 py-2 rounded-md border border-border focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="ME">Mi vista</option>
            {currentUserRole === 'GERENTE' && (
              <>
                <option value="TEAM">Equipo completo</option>
                <option value="U_ANA">→ Ana Gómez</option>
                <option value="U_CARLOS">→ Carlos Ruiz</option>
              </>
            )}
          </select>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
          <button 
            onClick={() => emitEvent('dashboard_comercial.exportado', { format: 'PDF', filters: { period, scope } })}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => emitEvent('dashboard_comercial.programado', { schedule: 'WEEKLY', filters: { period, scope } })}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 transition-colors shadow-sm"
          >
            <Mail className="w-4 h-4" /> Programar
          </button>
        </div>
      </div>

      {/* TABS NAVEGACIÓN COMERCIAL */}
      <div className="bg-background border-b border-border px-6 flex items-center gap-2">
        <button
          onClick={() => setActiveComercialTab('METRICS')}
          className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeComercialTab === 'METRICS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Métricas y Desviaciones</span>
        </button>

        <button
          onClick={() => setActiveComercialTab('PRECOTIZACIONES')}
          className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeComercialTab === 'PRECOTIZACIONES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Pre-cotizaciones IA</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
            Revisar & Enviar
          </span>
        </button>
      </div>

      {activeComercialTab === 'PRECOTIZACIONES' ? (
        <div className="p-6 max-w-[1600px] mx-auto w-full">
          <PrecotizacionesView onOpenInCotizador={handleOpenInCotizador} />
        </div>
      ) : (
        <>
          {/* AVISO CALIDAD DE DATOS (EXCLUSIONES) */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-700">
             <AlertTriangle className="w-4 h-4" /> 14 registros excluidos del cálculo por revisar (DataQualityIssue). Esto garantiza métricas puras.
          </div>

          <div className="p-6 max-w-[1600px] mx-auto w-full space-y-6">
        
        {/* FRANJA DE DESVIACIONES */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Alertas de Desviación (Acción Inmediata)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {liveDeviations.slice(0, scope === 'TEAM' ? 4 : 2).map(dev => (
              <div key={dev.id} className={`p-4 rounded-xl border flex flex-col justify-between shadow-sm transition-colors hover:shadow-md ${dev.isAnomaly ? 'bg-destructive/10 border-destructive/30 animate-pulse' : dev.impact === 'high' ? 'bg-destructive/5 border-destructive/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <p className="text-sm font-medium text-foreground leading-snug mb-4">{dev.text}</p>
                <button 
                  onClick={() => emitEvent('desviacion.accion_ejecutada', { devId: dev.id })}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex justify-center items-center gap-2 transition-colors ${dev.isAnomaly || dev.impact === 'high' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-white'}`}
                >
                  {dev.action} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FILA DE TARJETAS KPI (Carrusel en Mobile, Grid en Desktop) */}
        <div className="flex overflow-x-auto snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pb-4 sm:pb-0 scrollbar-hide">
          
          <div className="snap-start min-w-[280px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary transition-colors group">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-primary transition-all duration-1000" />
                <circle cx="32" cy="32" r="28" stroke="#ef4444" strokeWidth="8" fill="transparent" strokeDasharray="4 200" strokeDashoffset={paceOffset} className="opacity-80" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black">{goalPercentage}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Meta del Mes</p>
              <p className="text-lg font-black leading-tight">${(totalSales/1000000).toFixed(1)}M</p>
              <p className="text-[10px] text-destructive font-bold">Ritmo: {pacePercentage}%</p>
            </div>
          </div>

          <div className="snap-start min-w-[200px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Ventas Cerradas</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-black leading-none">${(totalSales/1000000).toFixed(1)}M</p>
            </div>
            <div className="flex items-center gap-1 mt-2 text-success text-xs font-bold bg-success/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> +14.5% vs ant.
            </div>
          </div>

          <div className="snap-start min-w-[200px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Pipeline Pond.</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-black leading-none">{scope === 'TEAM' ? '$29.5M' : '$8.4M'}</p>
            </div>
            <div className="flex items-center gap-1 mt-2 text-destructive text-xs font-bold bg-destructive/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingDown className="w-3 h-3" /> -2.1%
            </div>
          </div>

          <div className="snap-start min-w-[200px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Conversión Global</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-black leading-none">{scope === 'TEAM' ? '24.8%' : '32.1%'}</p>
            </div>
            <div className="flex items-center gap-1 mt-2 text-success text-xs font-bold bg-success/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> +1.2% pts
            </div>
          </div>

          <div className="snap-start min-w-[200px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Ciclo de Venta</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-black leading-none">{scope === 'TEAM' ? '18' : '14'} <span className="text-sm text-muted-foreground">días</span></p>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground mt-2 truncate">Creación a ganado</p>
          </div>

          <div className="snap-start min-w-[200px] sm:min-w-0 bg-card p-4 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors group">
            <p className="text-xs font-bold text-muted-foreground uppercase">Ticket Promedio</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-black leading-none">{scope === 'TEAM' ? '$4.2M' : '$3.1M'}</p>
            </div>
            <div className="flex items-center gap-1 mt-2 text-success text-xs font-bold bg-success/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> +5.0%
            </div>
          </div>
        </div>

        {/* GRÁFICOS DINÁMICOS (Reordenables) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {widgetOrder.filter(w => !hiddenWidgets.has(w)).map(wId => (
             <React.Fragment key={wId}>
               {WIDGET_COMPONENTS[wId]}
             </React.Fragment>
          ))}
        </div>

        {hiddenWidgets.size > 0 && (
          <div className="pt-4 border-t border-border">
             <p className="text-xs font-bold text-muted-foreground mb-2">Widgets Ocultos:</p>
             <div className="flex gap-2">
                {Array.from(hiddenWidgets).map((id: any) => (
                  <button key={id} onClick={() => toggleWidgetVisibility(id)} className="px-3 py-1.5 bg-muted text-xs font-bold rounded-md hover:bg-background border border-border transition-colors">
                    Mostrar {id.replace('W_','')}
                  </button>
                ))}
             </div>
          </div>
        )}

      </div>
        </>
      )}
    </div>
  );
}
