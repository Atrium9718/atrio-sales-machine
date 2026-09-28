/**
 * Métricas comerciales calculadas con los datos reales (cotizaciones y pipeline).
 * Funciones puras: se prueban sin navegador (commercialMetrics.test.ts).
 */

export type Period = 'MONTH' | 'QUARTER' | 'YEAR';

export interface QuoteLike {
  id: string;
  number?: string;
  status?: string;
  total?: number | string;
  clientName?: string;
  clientNit?: string;
  advisorName?: string;
  date?: string;
  createdAt?: string;
  sentAt?: string;
  updatedAt?: string;
  isPreQuote?: boolean;
}

export interface OpportunityLike {
  stageId: string;
  amount?: number;
}

const APPROVED = ['aprobada', 'ganada', 'ganado', 'aceptada'];
const REJECTED = ['rechazada', 'perdida', 'perdido'];
const SENT = ['enviada', 'finalizada'];

const norm = (s?: string) => String(s ?? '').toLowerCase().trim();
export const isApproved = (q: QuoteLike) => APPROVED.includes(norm(q.status));
export const isRejected = (q: QuoteLike) => REJECTED.includes(norm(q.status));
export const isSent = (q: QuoteLike) => SENT.includes(norm(q.status));

export const quoteTotal = (q: QuoteLike) => {
  // Texto en formato colombiano: "$ 2.000.000,50" (punto de miles, coma decimal)
  const n = typeof q.total === 'string' ? Number(q.total.replace(/[^\d,-]/g, '').replace(',', '.')) : Number(q.total);
  return Number.isFinite(n) ? n : 0;
};

/** Fecha de la cotización (la del documento; si no, la de creación). */
export const quoteDate = (q: QuoteLike): Date | null => {
  const raw = q.date || q.createdAt;
  if (!raw) return null;
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function periodRange(period: Period, now = new Date()): { from: Date; prevFrom: Date; prevTo: Date } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = period === 'MONTH' ? 1 : period === 'QUARTER' ? 3 : 12;
  if (period === 'QUARTER') from.setMonth(Math.floor(now.getMonth() / 3) * 3);
  if (period === 'YEAR') from.setMonth(0);
  const prevFrom = new Date(from);
  prevFrom.setMonth(prevFrom.getMonth() - months);
  // Mismo tramo del periodo anterior (p. ej. 1–15 del mes pasado si hoy es 15)
  const prevTo = new Date(prevFrom.getTime() + (now.getTime() - from.getTime()));
  return { from, prevFrom, prevTo };
}

interface Totals {
  quotedCount: number;
  quotedValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  closeRate: number | null;
  avgTicket: number | null;
}

function totals(quotes: QuoteLike[]): Totals {
  const won = quotes.filter(isApproved);
  const lost = quotes.filter(isRejected);
  const wonValue = won.reduce((s, q) => s + quoteTotal(q), 0);
  const decided = won.length + lost.length;
  return {
    quotedCount: quotes.length,
    quotedValue: quotes.reduce((s, q) => s + quoteTotal(q), 0),
    wonCount: won.length,
    wonValue,
    lostCount: lost.length,
    closeRate: decided ? won.length / decided : null,
    avgTicket: won.length ? wonValue / won.length : null,
  };
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function computeCommercialMetrics(input: { quotes: QuoteLike[]; opportunities?: OpportunityLike[]; period: Period; advisor?: string; now?: Date }) {
  const now = input.now ?? new Date();
  const all = input.quotes.filter((q) => !q.isPreQuote && (!input.advisor || q.advisorName === input.advisor));
  const { from, prevFrom, prevTo } = periodRange(input.period, now);
  const inRange = (q: QuoteLike, a: Date, b: Date) => {
    const d = quoteDate(q);
    return !!d && d >= a && d <= b;
  };
  const current = all.filter((q) => inRange(q, from, now));
  const previous = all.filter((q) => inRange(q, prevFrom, prevTo));

  // Tendencia: últimos 6 meses (cotizado vs. aprobado)
  const trend = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const t = totals(all.filter((q) => inRange(q, start, end)));
    return { month: `${MONTHS[start.getMonth()]} ${String(start.getFullYear()).slice(2)}`, cotizado: t.quotedValue, aprobado: t.wonValue };
  });

  // Ranking por asesor (valor aprobado en el periodo)
  const byAdvisor = new Map<string, Totals & { name: string }>();
  for (const name of new Set(current.map((q) => q.advisorName || 'Sin asesor'))) {
    byAdvisor.set(name, { name, ...totals(current.filter((q) => (q.advisorName || 'Sin asesor') === name)) });
  }
  const ranking = [...byAdvisor.values()].sort((a, b) => b.wonValue - a.wonValue || b.quotedValue - a.quotedValue);

  // Concentración: participación de los 5 principales clientes en lo aprobado
  const byClient = new Map<string, number>();
  for (const q of current.filter(isApproved)) byClient.set(q.clientName || 'Sin nombre', (byClient.get(q.clientName || 'Sin nombre') ?? 0) + quoteTotal(q));
  const wonValue = [...byClient.values()].reduce((s, v) => s + v, 0);
  const topClients = [...byClient.entries()].sort((a, b) => b[1] - a[1]);
  const concentration = [
    ...topClients.slice(0, 5).map(([name, value]) => ({ name, value, share: wonValue ? value / wonValue : 0 })),
    ...(topClients.length > 5
      ? [{ name: 'Otros', value: topClients.slice(5).reduce((s, [, v]) => s + v, 0), share: wonValue ? topClients.slice(5).reduce((s, [, v]) => s + v, 0) / wonValue : 0 }]
      : []),
  ];

  // Cotizaciones enviadas hace más de 7 días sin respuesta
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const quotesAtRisk = all
    .filter((q) => isSent(q))
    .map((q) => ({ q, since: new Date(q.sentAt || q.updatedAt || q.date || q.createdAt || now.toISOString()) }))
    .filter(({ since }) => since < weekAgo)
    .sort((a, b) => quoteTotal(b.q) - quoteTotal(a.q))
    .map(({ q, since }) => ({ id: q.id, number: q.number, clientName: q.clientName, total: quoteTotal(q), days: Math.floor((now.getTime() - since.getTime()) / 86400000), advisorName: q.advisorName }));

  // Clientes que compraban y llevan más de 90 días sin aprobar nada
  const lastWon = new Map<string, { date: Date; value: number }>();
  for (const q of all.filter(isApproved)) {
    const d = quoteDate(q);
    if (!d) continue;
    const key = q.clientName || q.clientNit || '';
    if (!key) continue;
    const prev = lastWon.get(key);
    lastWon.set(key, { date: !prev || d > prev.date ? d : prev.date, value: (prev?.value ?? 0) + quoteTotal(q) });
  }
  const quarterAgo = new Date(now.getTime() - 90 * 86400000);
  const clientsAtRisk = [...lastWon.entries()]
    .filter(([, v]) => v.date < quarterAgo)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([name, v]) => ({ name, lastPurchase: v.date.toISOString(), days: Math.floor((now.getTime() - v.date.getTime()) / 86400000), historicValue: v.value }));

  // Embudo del pipeline (oportunidades abiertas por etapa)
  const opps = input.opportunities ?? [];
  const funnel = [
    { id: 's1', name: 'Contacto' },
    { id: 's2', name: 'Calificado' },
    { id: 's3', name: 'Cotizado' },
    { id: 's4', name: 'Negociación' },
    { id: 's5', name: 'Ganado' },
  ].map((s) => {
    const list = opps.filter((o) => o.stageId === s.id);
    return { ...s, count: list.length, amount: list.reduce((sum, o) => sum + (o.amount || 0), 0) };
  });

  return { current: totals(current), previous: totals(previous), trend, ranking, concentration, quotesAtRisk, clientsAtRisk, funnel };
}

/** Variación porcentual frente al periodo anterior (null si no hay base). */
export const change = (now: number, before: number) => (before > 0 ? (now - before) / before : null);
