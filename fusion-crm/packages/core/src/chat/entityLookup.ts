/**
 * Referencias con "#" en el chat del equipo: cotizaciones, órdenes de trabajo y clientes reales.
 * Los montos solo se muestran a quien puede ver costos.
 */

export type ChatEntityType = 'QUOTE' | 'PRODUCTION_PROJECT' | 'CLIENT';

export interface ChatEntity {
  type: ChatEntityType;
  id: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  statusVariant: 'success' | 'warning' | 'info' | 'muted';
  clientId: string | null;
  clientName: string | null;
  clientNit: string | null;
  href: string;
}

const STAGES: Record<string, string> = { '1': 'Por revisar', '2': 'Programada', '3': 'En producción', '4': 'Acabados', '5': 'Finalizado', '6': 'Entregado' };

const cop = (n: unknown) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function quoteEntity(q: any, includeAmounts: boolean): ChatEntity {
  const status = String(q.status || 'Borrador');
  const variant = /aprob/i.test(status) ? 'success' : /rechaz|anulad|vencid/i.test(status) ? 'muted' : 'warning';
  const first = q.items?.[0]?.description;
  return {
    type: 'QUOTE',
    id: String(q.id),
    code: String(q.number || q.id),
    title: [q.clientName, first].filter(Boolean).join(' — ') || 'Cotización',
    subtitle: [includeAmounts && q.total ? cop(q.total) : null, status].filter(Boolean).join(' · '),
    status,
    statusVariant: variant,
    clientId: q.clientId ?? null,
    clientName: q.clientName ?? null,
    clientNit: q.clientNit ?? null,
    href: `/dashboard/cotizador?quoteId=${encodeURIComponent(q.id)}`,
  };
}

export function projectEntity(p: any): ChatEntity {
  const stage = STAGES[String(p.stageId)] || 'En curso';
  return {
    type: 'PRODUCTION_PROJECT',
    id: String(p.id),
    code: String(p.number || p.id),
    title: [p.client, p.name].filter(Boolean).join(' — ') || 'Orden de trabajo',
    subtitle: [stage, p.dueDate ? `entrega ${String(p.dueDate).slice(0, 10)}` : null].filter(Boolean).join(' · '),
    status: stage,
    statusVariant: String(p.stageId) === '6' ? 'muted' : 'info',
    clientId: p.clientId ?? null,
    clientName: p.client ?? null,
    clientNit: p.clientNit ?? null,
    href: `/dashboard/produccion?projectId=${encodeURIComponent(p.id)}`,
  };
}

export function clientEntity(c: any): ChatEntity {
  return {
    type: 'CLIENT',
    id: String(c.id),
    code: String(c.code || c.nit || c.id),
    title: String(c.name || c.tradeName || 'Cliente'),
    subtitle: c.nit ? `NIT ${c.nit}` : 'Cliente',
    status: c.type === 'INACTIVE' ? 'Inactivo' : 'Activo',
    statusVariant: c.type === 'INACTIVE' ? 'muted' : 'success',
    clientId: String(c.id),
    clientName: c.name ?? null,
    clientNit: c.nit ?? null,
    href: `/dashboard/clientes/${encodeURIComponent(c.id)}`,
  };
}

/** Busca por código, cliente o descripción. Sin texto, lo más reciente. */
export function lookupChatEntities(
  query: string,
  data: { quotes: any[]; projects: any[]; clients: any[] },
  opts: { includeAmounts: boolean; limit?: number }
): ChatEntity[] {
  const q = norm(query).replace(/^#/, '').trim();
  const recent = (list: any[], key: string) => [...list].sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || '')));
  const match = (...fields: unknown[]) => !q || fields.some((f) => norm(f).includes(q));
  const quotes = recent(data.quotes, 'date')
    .filter((x) => x.number && match(x.number, x.clientName, x.items?.[0]?.description))
    .map((x) => quoteEntity(x, opts.includeAmounts));
  const projects = recent(data.projects, 'createdAt')
    .filter((x) => match(x.number, x.client, x.name))
    .map(projectEntity);
  const clients = data.clients.filter((x) => match(x.name, x.tradeName, x.nit, x.code)).map(clientEntity);
  const limit = opts.limit ?? 12;
  // Mezcla para que haya de los tres tipos
  const out: ChatEntity[] = [];
  for (let i = 0; out.length < limit && (i < quotes.length || i < projects.length || i < clients.length); i++) {
    for (const list of [quotes, projects, clients]) if (list[i] && out.length < limit) out.push(list[i]);
  }
  return out;
}
