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

export const addQuote = (quote: any) => {
  const quotes = [...getQuotes()];
  const existingIndex = quotes.findIndex((q: any) => q.id === quote.id);
  if (existingIndex >= 0) {
    quotes[existingIndex] = { ...quotes[existingIndex], ...quote };
  } else {
    quotes.unshift(quote);
  }
  quotesCollection.replaceLocal(quotes);

  // SI LA COTIZACIÓN SE FINALIZA O SE APRUEBA/GANA, ACTIVAR EL FLUJO DE CREACIÓN DE OT EN PRODUCCIÓN
  const normStatus = (quote.status || '').toLowerCase().trim();
  if (normStatus === 'finalizada' || normStatus === 'aprobada' || normStatus === 'ganada' || normStatus === 'ganado' || normStatus === 'aceptada') {
    createOrEnsureProjectForQuote(quote);
    if (quote.status === 'Finalizada') {
      approveQuote(quote.id, quote);
      return;
    }
  }

  postQuote(quote).catch(err => console.warn('No se pudo guardar la cotización en el servidor:', err));
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
  const quotes = getQuotes();
  const quote = quotes.find((q: any) => q.id === quoteId);
  if (quote) {
    quote.status = status;
    if (additionalData) {
      Object.assign(quote, additionalData);
    }
    quote.updatedAt = new Date().toISOString();
    quotesCollection.replaceLocal(quotes);

    const s = (status || '').toLowerCase().trim();
    if (s === 'aprobada' || s === 'ganada' || s === 'ganado' || s === 'aceptada') {
      createOrEnsureProjectForQuote(quote, additionalData);
    }

    try {
      fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...additionalData })
      }).catch(() => {
        postQuote(quote).catch(e => console.warn('Could not sync quote status:', e));
      });
    } catch (e) {}
  }
};

export const approveQuote = async (quoteId: string, approvalData?: any) => {
  const quotes = getQuotes();
  const quote = quotes.find((q: any) => q.id === quoteId);
  if (quote) {
    quote.status = approvalData?.status || 'Aprobada';
    quote.approvedBy = getCurrentUserName(approvalData?.approvedBy || '');
    quote.approvedAt = new Date().toISOString();
    if (approvalData?.items) quote.items = approvalData.items;
    if (approvalData?.subtotal !== undefined) quote.subtotal = approvalData.subtotal;
    if (approvalData?.total !== undefined) quote.total = approvalData.total;
    if (approvalData?.deliveryTime) quote.deliveryTime = approvalData.deliveryTime;
    if (approvalData?.paymentTerms) quote.paymentTerms = approvalData.paymentTerms;
    quote.updatedAt = new Date().toISOString();

    quotesCollection.replaceLocal(quotes);

    // Inmediatamente crear el Proyecto (OT) en Producción en etapa 'Por Revisar'
    try {
      createOrEnsureProjectForQuote(quote, approvalData);
    } catch (err) {
      console.warn('Error creating local project for approved quote:', err);
    }

    try {
      const res = await fetch(`/api/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(approvalData || {}),
          quote
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.project) {
          addProject(result.project);
        } else {
          syncProjectsFromApi();
        }
        if (result.success && result.quote) {
          return result.quote;
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.warn('Backend returned error during approve:', errorData);
      }
    } catch (e: any) {
      console.warn('Backend approve sync error (using local state):', e);
    }
    return quote;
  }
  return null;
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
