import { parseNumericInput } from '../utils/format';

/**
 * Ficha del cliente: sus cotizaciones y OT con los indicadores que se calculan de ellas.
 * Una cotización es del cliente si trae su id o su NIT.
 */

const APPROVED = new Set(['aprobada', 'ganada', 'aceptada']);
const REJECTED = new Set(['rechazada', 'perdida']);
const STAGE_NAMES: Record<string, string> = { '1': 'Por revisar', '2': 'Programada', '3': 'En producción', '4': 'Acabados', '5': 'Finalizado', '6': 'Entregado' };

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const money = (v: unknown) => (typeof v === 'number' ? v : parseNumericInput(String(v ?? '').replace(/[^\d.,-]/g, '')).toNumber());

export interface ClientProfile {
  quotes: { id: string; number: string; status: string; date: string | null; total: number }[];
  projects: { id: string; number: string; name: string; stageName: string; delivered: boolean; dueDate: string | null; quoteNumber: string | null }[];
  stats: { wonValue: number; quotesCount: number; approvedCount: number; closeRate: number | null; openProjects: number; lastQuoteAt: string | null };
}

export function clientProfile(client: { id: string; nit?: string }, quotes: any[], projects: any[]): ClientProfile {
  const nit = digits(client.nit);
  const mine = quotes
    .filter((q) => q.clientId === client.id || (nit.length >= 6 && digits(q.clientNit ?? q.clientData?.nit).startsWith(nit.slice(0, 9))))
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
  const quoteIds = new Set(mine.map((q) => q.id));
  const quoteNumber = new Map(mine.map((q) => [q.id, q.number]));
  const myProjects = projects
    .filter((p) => p.clientId === client.id || quoteIds.has(p.quoteId))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const status = (q: any) => String(q.status || '').toLowerCase().trim();
  const approved = mine.filter((q) => APPROVED.has(status(q)));
  const decided = mine.filter((q) => APPROVED.has(status(q)) || REJECTED.has(status(q)));
  return {
    quotes: mine.map((q) => ({ id: q.id, number: String(q.number || ''), status: String(q.status || 'Borrador'), date: q.date || q.createdAt || null, total: money(q.total) })),
    projects: myProjects.map((p) => ({
      id: p.id,
      number: String(p.number || ''),
      name: String(p.name || ''),
      stageName: STAGE_NAMES[String(p.stageId)] || 'En curso',
      delivered: String(p.stageId) === '6',
      dueDate: p.dueDate || null,
      quoteNumber: p.quoteNumber || quoteNumber.get(p.quoteId) || null,
    })),
    stats: {
      wonValue: approved.reduce((s, q) => s + money(q.total), 0),
      quotesCount: mine.length,
      approvedCount: approved.length,
      closeRate: decided.length ? Math.round((approved.length / decided.length) * 100) : null,
      openProjects: myProjects.filter((p) => String(p.stageId) !== '6').length,
      lastQuoteAt: mine[0]?.date || mine[0]?.createdAt || null,
    },
  };
}
