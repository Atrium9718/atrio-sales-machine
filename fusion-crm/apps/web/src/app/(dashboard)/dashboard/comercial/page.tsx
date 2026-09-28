import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Users, Percent, FileText, Calendar, Target } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useFusionAuth } from '@/context/FusionAuthContext';
import { quotesCollection } from '../../../../lib/quotesStore';
import { opportunitiesCollection, type Opportunity } from '@/lib/pipelineStore';
import { appointmentsCollection, type Appointment } from '@/lib/agendaStore';
import { computeCommercialMetrics, change, type Period } from '@/lib/commercialMetrics';

const money = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const shortMoney = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} mil M` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : v >= 1e3 ? `${Math.round(v / 1e3)} mil` : String(Math.round(v)));
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

/** Suscribe la pantalla a una colección del servidor y la carga si hace falta. */
function useCollection<T>(col: { getAll(): T[]; hydrate(): Promise<unknown>; isHydrated(): boolean }, event: string) {
  const [items, setItems] = useState<T[]>(col.getAll());
  useEffect(() => {
    const refresh = () => setItems([...col.getAll()]);
    window.addEventListener(event, refresh);
    if (!col.isHydrated()) col.hydrate().then(refresh).catch(() => undefined);
    return () => window.removeEventListener(event, refresh);
  }, [col, event]);
  return items;
}

function Delta({ now, before }: { now: number; before: number }) {
  const d = change(now, before);
  if (d === null) return <span className="text-xs text-muted-foreground">sin datos del periodo anterior</span>;
  const up = d >= 0;
  return (
    <span className={`text-xs font-bold flex items-center gap-1 ${up ? 'text-success' : 'text-destructive'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}
      {Math.round(d * 100)}% vs. mismo tramo anterior
    </span>
  );
}

export default function ComercialDashboardPage() {
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useFusionAuth();
  const quotes = useCollection<any>(quotesCollection, 'fusion_quotes_updated');
  const opportunities = useCollection<Opportunity>(opportunitiesCollection, 'fusion_opportunities_updated');
  const appointments = useCollection<Appointment>(appointmentsCollection, 'fusion_appointments_updated');

  const seesTeam = isSuperAdmin || ['admin', 'super_admin', 'gerente', 'gerente_comercial'].includes(currentUser?.roleKey ?? '');
  const [period, setPeriod] = useState<Period>('MONTH');
  const [advisor, setAdvisor] = useState<string>('');
  const effectiveAdvisor = seesTeam ? advisor : currentUser?.name ?? '';

  const advisors = useMemo(() => [...new Set(quotes.map((q) => q.advisorName).filter(Boolean))].sort() as string[], [quotes]);
  const m = useMemo(
    () =>
      computeCommercialMetrics({
        quotes,
        opportunities: opportunities.filter((o) => !effectiveAdvisor || o.ownerName === effectiveAdvisor),
        period,
        advisor: effectiveAdvisor || undefined,
      }),
    [quotes, opportunities, period, effectiveAdvisor]
  );

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    const week = new Date(Date.now() + 7 * 86400000).toISOString();
    return appointments
      .filter((a) => a.status !== 'CANCELADA' && a.start >= now && a.start <= week)
      .filter((a) => !effectiveAdvisor || a.organizerName === effectiveAdvisor)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 6);
  }, [appointments, effectiveAdvisor]);

  const periodLabel = period === 'MONTH' ? 'este mes' : period === 'QUARTER' ? 'este trimestre' : 'este año';
  const card = 'bg-card border border-border rounded-xl p-5 shadow-sm';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" /> Dashboard comercial
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calculado con las cotizaciones, el pipeline y la agenda guardados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="px-3 py-2 border border-input rounded-md text-sm bg-background font-bold">
            <option value="MONTH">Este mes</option>
            <option value="QUARTER">Este trimestre</option>
            <option value="YEAR">Este año</option>
          </select>
          {seesTeam && (
            <select value={advisor} onChange={(e) => setAdvisor(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background font-bold">
              <option value="">Todo el equipo</option>
              {advisors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" /> Aprobado {periodLabel}
          </div>
          <div className="text-2xl font-black">{money(m.current.wonValue)}</div>
          <div className="mt-2">
            <Delta now={m.current.wonValue} before={m.previous.wonValue} />
          </div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" /> Cotizado
          </div>
          <div className="text-2xl font-black">{money(m.current.quotedValue)}</div>
          <div className="text-xs text-muted-foreground mt-2">{m.current.quotedCount} cotizaciones</div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4" /> Tasa de cierre
          </div>
          <div className="text-2xl font-black text-primary">{pct(m.current.closeRate)}</div>
          <div className="text-xs text-muted-foreground mt-2">
            {m.current.wonCount} aprobadas / {m.current.lostCount} rechazadas
          </div>
        </div>
        <div className={card}>
          <div className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" /> Ticket promedio
          </div>
          <div className="text-2xl font-black">{m.current.avgTicket === null ? '—' : money(m.current.avgTicket)}</div>
          <div className="text-xs text-muted-foreground mt-2">Valor medio de lo aprobado</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${card} lg:col-span-2`}>
          <h3 className="font-bold mb-4">Últimos 6 meses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis tickFormatter={shortMoney} fontSize={11} width={60} />
                <RechartsTooltip formatter={(v: any) => money(Number(v))} />
                <Legend />
                <Bar dataKey="cotizado" name="Cotizado" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aprobado" name="Aprobado" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={card}>
          <h3 className="font-bold mb-1">Pipeline abierto</h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades por etapa</p>
          {m.funnel.every((f) => f.count === 0) ? (
            <p className="text-sm text-muted-foreground">
              Sin oportunidades.{' '}
              <button className="text-primary font-bold" onClick={() => navigate('/dashboard/oportunidades')}>
                Ir al pipeline
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {m.funnel.map((f) => {
                const max = Math.max(...m.funnel.map((x) => x.count), 1);
                return (
                  <div key={f.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold">{f.name}</span>
                      <span className="text-muted-foreground">
                        {f.count} · {shortMoney(f.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(f.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {seesTeam && !advisor && (
          <div className={card}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Por asesor ({periodLabel})
            </h3>
            {m.ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay cotizaciones en el periodo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2">Asesor</th>
                    <th className="py-2 text-right">Cotizado</th>
                    <th className="py-2 text-right">Aprobado</th>
                    <th className="py-2 text-right">Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {m.ranking.map((r) => (
                    <tr key={r.name} className="border-b border-border/50">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-right">{shortMoney(r.quotedValue)}</td>
                      <td className="py-2 text-right font-bold text-success">{shortMoney(r.wonValue)}</td>
                      <td className="py-2 text-right">{pct(r.closeRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className={card}>
          <h3 className="font-bold mb-1">Concentración de clientes</h3>
          <p className="text-xs text-muted-foreground mb-4">Participación en lo aprobado {periodLabel}</p>
          {m.concentration.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cotizaciones aprobadas en el periodo.</p>
          ) : (
            <div className="space-y-3">
              {m.concentration.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold truncate">{c.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {shortMoney(c.value)} · {pct(c.share)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full ${c.share > 0.4 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${c.share * 100}%` }} />
                  </div>
                </div>
              ))}
              {m.concentration[0]?.share > 0.4 && <p className="text-xs text-amber-600">Un solo cliente concentra más del 40% de las ventas del periodo.</p>}
            </div>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Cotizaciones sin respuesta
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Enviadas hace más de 7 días, sin aprobar ni rechazar</p>
          {m.quotesAtRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguna. Todo al día.</p>
          ) : (
            <div className="divide-y divide-border">
              {m.quotesAtRisk.slice(0, 8).map((q) => (
                <button key={q.id} onClick={() => navigate(`/dashboard/cotizador?quoteId=${encodeURIComponent(q.id)}`)} className="w-full py-2 flex items-center gap-3 text-sm text-left hover:bg-muted/30">
                  <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{q.number || q.id.slice(0, 8)}</span>
                  <span className="flex-1 truncate font-medium">{q.clientName}</span>
                  <span className="text-xs text-muted-foreground hidden sm:block">{q.advisorName}</span>
                  <span className="font-bold">{shortMoney(q.total)}</span>
                  <span className="text-xs text-amber-600 w-14 text-right">{q.days} días</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Clientes que dejaron de comprar
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Tenían pedidos aprobados y llevan más de 90 días sin uno nuevo</p>
          {m.clientsAtRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguno por ahora.</p>
          ) : (
            <div className="divide-y divide-border">
              {m.clientsAtRisk.slice(0, 8).map((c) => (
                <div key={c.name} className="py-2 flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">histórico {shortMoney(c.historicValue)}</span>
                  <span className="text-xs text-destructive w-20 text-right">{c.days} días</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Próximos 7 días en la agenda
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin citas.{' '}
              <button className="text-primary font-bold" onClick={() => navigate('/dashboard/comercial/agenda')}>
                Agendar
              </button>
            </p>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((a) => (
                <div key={a.id} className="py-2 flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">
                    {new Date(a.start).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flex-1 truncate font-medium">{a.visibility === 'PRIVATE' && a.organizerId !== currentUser?.id ? 'Ocupado' : a.title}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{a.organizerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
