import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Bot, MessageCircle, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface CostsResponse {
  budget?: { budgetCop: number | null; spentCop: number; percent: number | null; level: string; aiPaused: boolean; month: string };
  prices: { inputPerM: number; outputPerM: number; templateUsd: number; usdCop: number };
  costs: {
    month: string;
    ai: { calls: number; promptTokens: number; outputTokens: number; usd: number; bySource: { source: string; calls: number; usd: number }[] };
    whatsappTemplates: { count: number; usd: number };
    totalUsd: number;
    totalCop: number;
    aiMessages: number;
    costPerAiMessageCop: number | null;
    daily: { day: string; usd: number; calls: number }[];
  };
}

const cop = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const usd = (v: number) => `US$ ${v.toFixed(v < 1 ? 4 : 2)}`;
const SOURCE_NAMES: Record<string, string> = { agentes: 'Agentes de atención', simulador: 'Simulador', precotizaciones: 'Precotizaciones IA', asistente: 'Asistente interno', evaluacion: 'Evaluación de agentes' };

function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) };
  });
}

export default function CostosOmnicanalPage() {
  const months = useMemo(() => lastMonths(6), []);
  const [month, setMonth] = useState(months[0].value);
  const [data, setData] = useState<CostsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    fetch(`/api/omnichannel/costs?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError('No se pudieron consultar los costos.'));
  }, [month]);

  const c = data?.costs;
  const card = 'bg-card border border-border rounded-xl p-5 shadow-sm';

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" /> Costos de IA y mensajería
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Consumo real de la IA (tokens) y plantillas de WhatsApp enviadas. Valores estimados con las tarifas configuradas.</p>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background font-bold capitalize">
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">{error}</div>}
      {!c && !error && <div className="text-sm text-muted-foreground">Cargando…</div>}

      {c && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={card}>
              <div className="text-sm font-bold text-muted-foreground mb-1">Total del mes</div>
              <div className="text-2xl font-black">{cop(c.totalCop)}</div>
              <div className="text-xs text-muted-foreground mt-1">{usd(c.totalUsd)}</div>
            </div>
            <div className={card}>
              <div className="text-sm font-bold text-muted-foreground mb-1 flex items-center gap-1">
                <Bot className="w-4 h-4" /> Inteligencia artificial
              </div>
              <div className="text-2xl font-black">{cop(c.ai.usd * data.prices.usdCop)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.ai.calls.toLocaleString('es-CO')} consultas · {((c.ai.promptTokens + c.ai.outputTokens) / 1000).toFixed(0)} mil tokens
              </div>
            </div>
            <div className={card}>
              <div className="text-sm font-bold text-muted-foreground mb-1 flex items-center gap-1">
                <MessageCircle className="w-4 h-4" /> Plantillas WhatsApp
              </div>
              <div className="text-2xl font-black">{cop(c.whatsappTemplates.usd * data.prices.usdCop)}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.whatsappTemplates.count} avisos fuera de las 24 h</div>
            </div>
            <div className={card}>
              <div className="text-sm font-bold text-muted-foreground mb-1">Costo por respuesta de la IA</div>
              <div className="text-2xl font-black">{c.costPerAiMessageCop === null ? '—' : cop(c.costPerAiMessageCop)}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.aiMessages} respuestas enviadas a clientes</div>
            </div>
          </div>

          {data.budget?.budgetCop && data.budget.month === month ? (
            <div className={`${card} space-y-2`}>
              <div className="flex justify-between text-sm font-bold">
                <span>Tope del mes: {cop(data.budget.budgetCop)}</span>
                <span>{Math.round((data.budget.percent ?? 0) * 100)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.budget.level === 'exceeded' ? 'bg-destructive' : data.budget.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (data.budget.percent ?? 0) * 100)}%` }}
                />
              </div>
              {data.budget.aiPaused && <p className="text-xs text-destructive font-semibold">La IA está en pausa por superar el tope. Se cambia en Bandeja → Configuración de la IA.</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin tope mensual. Puedes fijarlo en Bandeja de entrada → Configuración de la IA.</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${card} lg:col-span-2`}>
              <h3 className="font-bold mb-4">IA por día</h3>
              {c.daily.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin consumo registrado este mes.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={c.daily.map((d) => ({ ...d, cop: d.usd * data.prices.usdCop, label: d.day.slice(8) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} width={60} tickFormatter={(v) => `$${Math.round(v).toLocaleString('es-CO')}`} />
                      <Tooltip formatter={(v: any) => cop(Number(v))} labelFormatter={(l) => `Día ${l}`} />
                      <Bar dataKey="cop" name="Costo" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className={card}>
              <h3 className="font-bold mb-4">¿Quién consume?</h3>
              {c.ai.bySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <div className="space-y-3">
                  {c.ai.bySource.map((s) => (
                    <div key={s.source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold">{SOURCE_NAMES[s.source] ?? s.source}</span>
                        <span className="text-muted-foreground">{cop(s.usd * data.prices.usdCop)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${c.ai.usd ? (s.usd / c.ai.usd) * 100 : 0}%` }} />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{s.calls} consultas</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0" />
            Tarifas usadas: IA US${data.prices.inputPerM} por millón de tokens de entrada y US${data.prices.outputPerM} de salida; plantilla de WhatsApp US${data.prices.templateUsd}; dólar a{' '}
            {cop(data.prices.usdCop)}. Se ajustan en el servidor (AI_PRICE_INPUT_PER_M_USD, AI_PRICE_OUTPUT_PER_M_USD, WHATSAPP_TEMPLATE_PRICE_USD, USD_COP). Las respuestas dentro de la
            ventana de 24 h de WhatsApp no tienen costo de Meta. Confirma las tarifas vigentes en tu cuenta de Meta y de Google.
          </p>
        </>
      )}
    </div>
  );
}
