import { normalizeColombianPhone } from './normalizePhone';

/**
 * Quién llama, a partir de los clientes, cotizaciones y OT del CRM: se compara el número
 * normalizado (+57…) con los teléfonos del cliente y de sus contactos.
 */

const STAGE_NAMES: Record<string, string> = { '1': 'Por revisar', '2': 'Programada', '3': 'En producción', '4': 'Acabados', '5': 'Finalizado', '6': 'Entregado' };
const CLOSED_QUOTE = new Set(['aprobada', 'rechazada', 'ganada', 'perdida', 'anulada']);
const PHONE_FIELDS = ['phone1', 'phone2', 'phone3', 'phone', 'mobile', 'whatsapp', 'cellphone'];

export interface CallerIdentity {
  number: string | null;
  isAnonymous: boolean;
  matches: number;
  customerId: string | null;
  customerName: string | null;
  contactName: string | null;
  temperature: string | null;
  openQuote: { id: string; number: string; status: string; total: number | null; date: string | null } | null;
  activeProject: { id: string; number: string; name: string; stageName: string; dueDate: string | null } | null;
}

export function phonesOf(client: any): { phone: string; contactName: string | null }[] {
  const out: { phone: string; contactName: string | null }[] = [];
  for (const f of PHONE_FIELDS) if (client?.[f]) out.push({ phone: String(client[f]), contactName: null });
  for (const c of Array.isArray(client?.contacts) ? client.contacts : []) {
    const name = [c?.name, c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || null;
    for (const f of PHONE_FIELDS) if (c?.[f]) out.push({ phone: String(c[f]), contactName: name });
  }
  return out;
}

export function identifyCaller(
  rawNumber: string,
  data: { clients: any[]; quotes: any[]; projects: any[] },
  opts: { includeAmounts: boolean } = { includeAmounts: false },
): CallerIdentity {
  const number = normalizeColombianPhone(rawNumber);
  const empty: CallerIdentity = { number, isAnonymous: !number, matches: 0, customerId: null, customerName: null, contactName: null, temperature: null, openQuote: null, activeProject: null };
  if (!number) return empty;

  const hits: { client: any; contactName: string | null }[] = [];
  for (const client of data.clients) {
    const hit = phonesOf(client).find((p) => normalizeColombianPhone(p.phone) === number);
    if (hit) hits.push({ client, contactName: hit.contactName });
  }
  if (!hits.length) return empty;

  const { client, contactName } = hits[0];
  const nit = String(client.nit || '').replace(/\D/g, '');
  const isTheirs = (q: any) => q.clientId === client.id || (nit && String(q.clientNit || q.clientData?.nit || '').replace(/\D/g, '') === nit);
  const theirQuotes = data.quotes.filter(isTheirs);
  const openQuote = theirQuotes
    .filter((q) => !CLOSED_QUOTE.has(String(q.status || '').toLowerCase()))
    .sort((a, b) => String(b.date || b.updatedAt || '').localeCompare(String(a.date || a.updatedAt || '')))[0];
  const quoteIds = new Set(theirQuotes.map((q) => q.id));
  const project = data.projects
    .filter((p) => (p.clientId === client.id || quoteIds.has(p.quoteId)) && String(p.stageId) !== '6')
    .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))[0];

  return {
    number,
    isAnonymous: false,
    matches: hits.length,
    customerId: String(client.id),
    customerName: String(client.name || client.tradeName || 'Cliente'),
    contactName,
    temperature: client.temp || client.temperature || null,
    openQuote: openQuote
      ? { id: openQuote.id, number: String(openQuote.number || ''), status: String(openQuote.status || ''), total: opts.includeAmounts ? Number(openQuote.total) || 0 : null, date: openQuote.date || null }
      : null,
    activeProject: project
      ? { id: project.id, number: String(project.number || ''), name: String(project.name || ''), stageName: STAGE_NAMES[String(project.stageId)] || 'En curso', dueDate: project.dueDate || null }
      : null,
  };
}

/** Directorio del marcador: clientes y contactos con teléfono que coinciden con lo escrito. */
export function searchDialDirectory(query: string, clients: any[], limit = 20) {
  const q = String(query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const qDigits = q.replace(/\D/g, '');
  const out: Array<{ id: string; type: 'CUSTOMER'; customerId: string; name: string; contactName: string | null; phone: string; displayPhone: string; temperature: string | null }> = [];
  for (const c of clients) {
    const name = String(c.name || c.tradeName || '');
    const plain = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const p of phonesOf(c)) {
      const e164 = normalizeColombianPhone(p.phone);
      if (!e164) continue;
      const contact = String(p.contactName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const hit = !q || plain.includes(q) || (contact && contact.includes(q)) || (qDigits.length >= 3 && e164.replace(/\D/g, '').includes(qDigits));
      if (!hit) continue;
      out.push({ id: `${c.id}:${e164}`, type: 'CUSTOMER', customerId: String(c.id), name, contactName: p.contactName, phone: e164, displayPhone: p.phone, temperature: c.temp ?? null });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
