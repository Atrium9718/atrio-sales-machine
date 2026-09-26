import { createOrEnsureProjectForQuote, addProject, syncProjectsFromApi } from './projectsStore';
import { createServerCollection } from '@/lib/serverCollection';
import { getCurrentUserName } from '@/lib/currentUser';

export const INITIAL_QUOTES: any[] = [];

/** IDs de cotizaciones demo de versiones anteriores que no deben migrarse al servidor. */
const LEGACY_DEMO_QUOTE_IDS = new Set(['quote-pre-4812', 'quote-pre-3910', 'quote-pre-1029', 'quote-1', 'quote-2', 'quote-3', 'quote-4']);

async function postQuote(quote: any) {
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  });
  if (!res.ok) throw new Error(`POST /api/quotes: HTTP ${res.status}`);
}

/** Cotizaciones: fuente de verdad en el servidor (/api/quotes), caché en memoria en el navegador. */
export const quotesCollection = createServerCollection<any>({
  updatedEvent: 'fusion_quotes_updated',
  legacyStorageKey: 'fusion_quotes',
  legacyFilter: (q) => !LEGACY_DEMO_QUOTE_IDS.has(q?.id) && !!q?.number,
  adapter: {
    async list() {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error(`GET /api/quotes: HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.quotes) ? data.quotes : [];
    },
    async save(items) {
      for (const q of items) await postQuote(q);
    },
    async remove(id) {
      const res = await fetch(`/api/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE /api/quotes/${id}: HTTP ${res.status}`);
    },
  },
});

export const getQuotes = (): any[] => quotesCollection.getAll();

/** Guarda varias cotizaciones nuevas o modificadas (p. ej. revisiones recalculadas). */
export const saveQuotes = (quotes: any[]) =>
  quotesCollection.save(quotes).catch((err) => console.warn('No se pudieron guardar las cotizaciones:', err));

const APPROVED_STATUSES = ['aprobada', 'ganada', 'ganado', 'aceptada'];
const isApprovedStatus = (status: unknown) => APPROVED_STATUSES.includes(String(status ?? '').toLowerCase().trim());

function upsertLocal(quote: any) {
  const quotes = [...getQuotes()];
  const idx = quotes.findIndex((q: any) => q.id === quote.id);
  if (idx >= 0) quotes[idx] = quote;
  else quotes.unshift(quote);
  quotesCollection.replaceLocal(quotes);
}

export const addQuote = (quote: any) => {
  const existing = getQuotes().find((q: any) => q.id === quote.id);
  const merged = existing ? { ...existing, ...quote } : quote;
  const normStatus = (quote.status || '').toLowerCase().trim();

  // Aprobar (o finalizar) pasa por el servidor, que revisa precios y puede rechazarlo
  if ((normStatus === 'finalizada' || isApprovedStatus(normStatus)) && !isApprovedStatus(existing?.status)) {
    upsertLocal({ ...merged, status: existing?.status || 'Borrador' });
    approveQuote(merged.id, merged).catch((err) => alert(err.message));
    return;
  }

  upsertLocal(merged);
  if (isApprovedStatus(normStatus)) createOrEnsureProjectForQuote(merged);
  postQuote(merged).catch(err => console.warn('No se pudo guardar la cotización en el servidor:', err));
};

export const syncQuotesFromApi = async () => {
  try {
    return await quotesCollection.hydrate();
  } catch (err) {
    console.warn('Could not sync quotes from API:', err);
    return getQuotes();
  }
};

export const generatePreQuoteWithAI = async (params: {
  conversation: any[];
  customer?: any;
  channel?: string;
  manualText?: string;
}) => {
  const res = await fetch('/api/quotes/generate-pre-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Error del servidor (${res.status})`);
  }

  const data = await res.json();
  if (!data.success || !data.preQuote) {
    throw new Error(data.error || 'No se pudo generar la pre-cotización con la IA');
  }

  // Guardar en store local y disparar evento
  addQuote(data.preQuote);
  return data.preQuote;
};

export const updateQuoteStatus = (quoteId: string, status: string, additionalData?: any) => {
  const quote = getQuotes().find((q: any) => q.id === quoteId);
  if (!quote) return;

  if (isApprovedStatus(status) && !isApprovedStatus(quote.status)) {
    approveQuote(quoteId, { ...(additionalData || {}), status }).catch((err) => alert(err.message));
    return;
  }

  const updated = { ...quote, ...(additionalData || {}), status, updatedAt: new Date().toISOString() };
  upsertLocal(updated);
  if (isApprovedStatus(status)) createOrEnsureProjectForQuote(updated, additionalData);

  fetch(`/api/quotes/${quoteId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...additionalData })
  }).catch(() => {
    postQuote(updated).catch(e => console.warn('Could not sync quote status:', e));
  });
};

/**
 * Aprueba una cotización. El servidor recalcula los montos y revisa los precios contra el
 * costo del motor: si hay ítems por debajo del costo y el usuario no es administrador, la
 * rechaza y esta función lanza un error con el motivo. Solo si el servidor la aprueba se
 * actualiza la pantalla y se crea la orden de trabajo.
 */
export const approveQuote = async (quoteId: string, approvalData?: any) => {
  const current = getQuotes().find((q: any) => q.id === quoteId);
  if (!current && !approvalData) return null;

  const payloadQuote = {
    ...(current || {}),
    ...(approvalData?.items ? { items: approvalData.items } : {}),
    ...(approvalData?.deliveryTime ? { deliveryTime: approvalData.deliveryTime } : {}),
    ...(approvalData?.paymentTerms ? { paymentTerms: approvalData.paymentTerms } : {}),
    id: quoteId,
  };

  let res: Response;
  try {
    res = await fetch(`/api/quotes/${quoteId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(approvalData || {}), quote: payloadQuote })
    });
  } catch {
    throw new Error('No se pudo aprobar la cotización: no hay conexión con el servidor.');
  }

  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `No se pudo aprobar la cotización (HTTP ${res.status}).`);
  }

  const approved = {
    ...payloadQuote,
    ...(result.quote || {}),
    // "Finalizada" se conserva en pantalla como antes; el servidor la guarda como aprobada
    status: approvalData?.status || result.quote?.status || 'Aprobada',
  };
  upsertLocal(approved);

  if (result.project) addProject(result.project);
  else createOrEnsureProjectForQuote(approved, approvalData);
  return approved;
};

export const markQuoteAsSent = async (quoteId: string, sendData: {
  channel: 'WHATSAPP' | 'EMAIL' | 'DIRECT';
  destination?: string;
  sentBy?: string;
}) => {
  const quotes = getQuotes();
  const quote = quotes.find((q: any) => q.id === quoteId);
  if (quote) {
    quote.status = 'Enviada';
    quote.sentAt = new Date().toISOString();
    quote.sentVia = sendData.channel;
    quote.sentDestination = sendData.destination || quote.clientPhone || quote.clientEmail;
    quote.sentBy = getCurrentUserName(sendData.sentBy || '');
    quote.updatedAt = new Date().toISOString();

    quotesCollection.replaceLocal(quotes);

    try {
      await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData)
      });
    } catch (e) {
      console.warn('Backend send sync error:', e);
    }
    return quote;
  }
  return null;
};

export const deleteQuote = (quoteId: string) => {
  quotesCollection.remove(quoteId).catch((err) => console.warn('No se pudo eliminar la cotización en el servidor:', err));
};

export const seedQuotes = () => {
  return [];
};
