export const INITIAL_QUOTES: any[] = [];

import { createOrEnsureProjectForQuote, addProject, syncProjectsFromApi } from './projectsStore';

export const getQuotes = () => {

  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('fusion_quotes');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Filter out any leftover mock quotes from earlier test sessions
        const cleaned = parsed.filter((q: any) => !['quote-pre-4812', 'quote-pre-3910', 'quote-pre-1029', 'quote-1', 'quote-2', 'quote-3', 'quote-4'].includes(q?.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('fusion_quotes', JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error parsing fusion_quotes from localStorage:', err);
  }
  return [];
};

export const addQuote = (quote: any) => {
  const quotes = getQuotes();
  // if exists update, else add
  const existingIndex = quotes.findIndex((q: any) => q.id === quote.id);
  if (existingIndex >= 0) {
    quotes[existingIndex] = { ...quotes[existingIndex], ...quote };
  } else {
    quotes.unshift(quote);
  }
  localStorage.setItem('fusion_quotes', JSON.stringify(quotes));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));

  // SI LA COTIZACIÓN SE FINALIZA O SE APRUEBA/GANA, ACTIVAR EL FLUJO DE CREACIÓN DE OT EN PRODUCCIÓN
  const normStatus = (quote.status || '').toLowerCase().trim();
  if (normStatus === 'finalizada' || normStatus === 'aprobada' || normStatus === 'ganada' || normStatus === 'ganado' || normStatus === 'aceptada') {
    createOrEnsureProjectForQuote(quote);
    if (quote.status === 'Finalizada') {
      approveQuote(quote.id, quote);
      return;
    }
  }

  // Sync with Firestore backend in background
  try {
    fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote)
    }).catch(err => console.warn('Background quote sync failed:', err));
  } catch (e) {
    // Ignore network errors in background
  }
};

export const syncQuotesFromApi = async () => {
  try {
    const res = await fetch('/api/quotes');
    if (!res.ok) return getQuotes();
    const data = await res.json();
    if (data.success && Array.isArray(data.quotes) && data.quotes.length > 0) {
      const local = getQuotes();
      const map = new Map<string, any>();
      // Put default/local first
      local.forEach((q: any) => map.set(q.id, q));
      // Overwrite/add remote
      data.quotes.forEach((q: any) => map.set(q.id, q));
      const merged = Array.from(map.values());
      localStorage.setItem('fusion_quotes', JSON.stringify(merged));
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync quotes from API:', err);
  }
  return getQuotes();
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
    localStorage.setItem('fusion_quotes', JSON.stringify(quotes));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));

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
        fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quote)
        }).catch(e => console.warn('Could not sync quote status:', e));
      });
    } catch (e) {}
  }
};

export const approveQuote = async (quoteId: string, approvalData?: any) => {
  const quotes = getQuotes();
  const quote = quotes.find((q: any) => q.id === quoteId);
  if (quote) {
    quote.status = approvalData?.status || 'Aprobada';
    quote.approvedBy = approvalData?.approvedBy || 'Jorge Enrique Escobar G. (Gerencia Comercial)';
    quote.approvedAt = new Date().toISOString();
    if (approvalData?.items) quote.items = approvalData.items;
    if (approvalData?.subtotal !== undefined) quote.subtotal = approvalData.subtotal;
    if (approvalData?.total !== undefined) quote.total = approvalData.total;
    if (approvalData?.deliveryTime) quote.deliveryTime = approvalData.deliveryTime;
    if (approvalData?.paymentTerms) quote.paymentTerms = approvalData.paymentTerms;
    quote.updatedAt = new Date().toISOString();

    localStorage.setItem('fusion_quotes', JSON.stringify(quotes));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));

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
    quote.sentBy = sendData.sentBy || 'Asesor Comercial';
    quote.updatedAt = new Date().toISOString();

    localStorage.setItem('fusion_quotes', JSON.stringify(quotes));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));

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
  const quotes = getQuotes().filter((q: any) => q.id !== quoteId);
  localStorage.setItem('fusion_quotes', JSON.stringify(quotes));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_quotes_updated'));

  try {
    fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' }).catch(() => {});
  } catch (e) {}
};

export const seedQuotes = () => {
  return [];
};
