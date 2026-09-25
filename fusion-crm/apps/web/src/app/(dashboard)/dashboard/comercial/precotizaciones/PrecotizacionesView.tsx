"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, CheckCircle2, AlertCircle, Clock, Send, MessageSquare, 
  Eye, FileText, Check, X, Download, Mail, Phone, Building2, 
  Sparkles, Calendar, DollarSign, ArrowRight, Trash2, Edit3, 
  ExternalLink, Copy, Plus, RefreshCw, UserCheck, Layers, ChevronRight, Calculator
} from 'lucide-react';
import { 
  getQuotes, addQuote, approveQuote, markQuoteAsSent, deleteQuote, 
  syncQuotesFromApi, generatePreQuoteWithAI 
} from '../../../../../lib/quotesStore';
import { generateQuotePDF, sendQuoteWhatsApp, sendQuoteEmail } from '../../../../../lib/quoteSharing';

const formatCOP = (val: number | string | undefined | null): string => {
  const n = typeof val === 'number' ? val : Number(val) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n);
};

interface PrecotizacionesViewProps {
  onOpenInCotizador?: (quote: any) => void;
}

export default function PrecotizacionesView({ onOpenInCotizador }: PrecotizacionesViewProps) {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Borrador' | 'Aprobada' | 'Enviada'>('ALL');

  // Abrir pre-cotización en el cotizador normal (con todas las capacidades técnicas, de costos y edición)
  const handleOpenInCotizadorNormal = (quote: any) => {
    if (onOpenInCotizador) {
      onOpenInCotizador(quote);
    } else if (quote?.id) {
      navigate(`/dashboard/cotizador?quoteId=${quote.id}`);
    } else {
      navigate('/dashboard/cotizador');
    }
  };
  
  // Modals state
  const [selectedForConversation, setSelectedForConversation] = useState<any | null>(null);
  const [selectedForReview, setSelectedForReview] = useState<any | null>(null);
  const [selectedForSend, setSelectedForSend] = useState<any | null>(null);
  const [sendMethod, setSendMethod] = useState<'WHATSAPP' | 'EMAIL' | 'PDF'>('WHATSAPP');
  const [isNewPreQuoteModalOpen, setIsNewPreQuoteModalOpen] = useState(false);

  // Review modal editable fields
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewDeliveryTime, setReviewDeliveryTime] = useState('');
  const [reviewPaymentTerms, setReviewPaymentTerms] = useState('');
  const [reviewCommercialNotes, setReviewCommercialNotes] = useState('');

  // New AI extraction modal
  const [newChatText, setNewChatText] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load quotes and listen for updates
  const loadData = () => {
    setIsLoading(true);
    syncQuotesFromApi().then((data: any[]) => {
      setQuotes(data);
      setIsLoading(false);
    }).catch(() => {
      setQuotes(getQuotes());
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      setQuotes(getQuotes());
    };
    window.addEventListener('fusion_quotes_updated', handleUpdate);
    return () => window.removeEventListener('fusion_quotes_updated', handleUpdate);
  }, []);

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Filter only pre-quotes or quotes with AI extraction / draft / status
  const preQuotes = useMemo(() => {
    return quotes.filter((q: any) => {
      // Prioritize quotes identified as pre-quotes or quotes generated through AI
      const isPre = q.isPreQuote || q.aiExtracted || (q.number && q.number.startsWith('PRE-')) || q.source === 'WHATSAPP_AI' || (q.subtotal === 0 && q.status === 'Borrador');
      if (!isPre) return false;

      // Status filter
      if (statusFilter !== 'ALL' && q.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const clientName = (q.clientName || '').toLowerCase();
        const number = (q.number || '').toLowerCase();
        const tradeName = (q.clientData?.tradeName || '').toLowerCase();
        const phone = (q.clientPhone || '').toLowerCase();
        const itemsDesc = (q.items || []).map((i: any) => i.description || '').join(' ').toLowerCase();

        return clientName.includes(term) || number.includes(term) || tradeName.includes(term) || phone.includes(term) || itemsDesc.includes(term);
      }

      return true;
    });
  }, [quotes, statusFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const all = quotes.filter((q: any) => q.isPreQuote || (q.number && q.number.startsWith('PRE-')) || q.aiExtracted);
    const drafts = all.filter(q => q.status === 'Borrador');
    const approved = all.filter(q => q.status === 'Aprobada');
    const sent = all.filter(q => q.status === 'Enviada');
    return {
      total: all.length,
      draftsCount: drafts.length,
      approvedCount: approved.length,
      sentCount: sent.length
    };
  }, [quotes]);

  // Open in normal cotizador for review and costing
  const handleOpenReview = (quote: any) => {
    handleOpenInCotizadorNormal(quote);
  };

  // Update item in review modal
  const handleItemPriceChange = (index: number, field: string, val: any) => {
    const updated = [...reviewItems];
    const item = { ...updated[index], [field]: val };
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'applyVat') {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unitPrice) || 0;
      const subtotal = qty * unit;
      const vatAmount = item.applyVat ? Math.round(subtotal * 0.19) : 0;
      item.subtotal = subtotal;
      item.vatAmount = vatAmount;
      item.total = subtotal + vatAmount;
    }

    updated[index] = item;
    setReviewItems(updated);
  };

  // Calculated totals in review modal
  const calculatedReviewTotals = useMemo(() => {
    let subtotal = 0;
    let vatAmount = 0;
    let total = 0;
    reviewItems.forEach(it => {
      subtotal += Number(it.subtotal) || 0;
      vatAmount += Number(it.vatAmount) || 0;
      total += Number(it.total) || 0;
    });
    return { subtotal, vatAmount, total };
  }, [reviewItems]);

  // Save changes from review modal
  const handleSaveReview = (asApproved = false) => {
    if (!selectedForReview) return;
    const totals = calculatedReviewTotals;
    const updatedQuote = {
      ...selectedForReview,
      items: reviewItems,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      deliveryTime: reviewDeliveryTime,
      paymentTerms: reviewPaymentTerms,
      notes: reviewCommercialNotes,
      status: asApproved ? 'Aprobada' : selectedForReview.status,
      approvedBy: asApproved ? 'Jorge Enrique Escobar G. (Gerencia Comercial)' : selectedForReview.approvedBy,
      approvedAt: asApproved ? new Date().toISOString() : selectedForReview.approvedAt
    };

    addQuote(updatedQuote);
    setSelectedForReview(null);
    triggerFeedback(asApproved ? `Pre-cotización ${updatedQuote.number} aprobada con éxito.` : `Cambios guardados en ${updatedQuote.number}.`);
  };

  // Direct approve handler
  const handleDirectApprove = async (quote: any) => {
    // If unitPrice of all items is 0, prompt to cost first
    const hasZeroPrices = (quote.items || []).every((it: any) => !it.unitPrice || it.unitPrice === 0);
    if (hasZeroPrices) {
      handleOpenReview(quote);
      triggerFeedback('Asigna los precios unitarios a los ítems antes de aprobar la cotización.');
      return;
    }

    await approveQuote(quote.id, {
      approvedBy: 'Jorge Enrique Escobar G. (Gerencia Comercial)',
      items: quote.items,
      subtotal: quote.subtotal,
      total: quote.total,
      deliveryTime: quote.deliveryTime,
      paymentTerms: quote.paymentTerms
    });
    triggerFeedback(`¡Pre-cotización ${quote.number} aprobada formalmente para envío!`);
  };

  // Direct send handler
  const handleSendWhatsApp = async (quote: any) => {
    await sendQuoteWhatsApp(quote);
    
    // Mark as sent
    markQuoteAsSent(quote.id, {
      channel: 'WHATSAPP',
      destination: quote.clientPhone,
      sentBy: 'Asesor Comercial Fusión'
    });

    setSelectedForSend(null);
    triggerFeedback(`Cotización ${quote.number} enviada por WhatsApp.`);
  };

  // Generate PDF
  const handleDownloadPdf = async (quote: any) => {
    const res = await generateQuotePDF(quote);
    if (res.success) {
      triggerFeedback(`PDF de ${quote.number} generado y descargado.`);
    } else {
      triggerFeedback('Error al generar PDF. Intente de nuevo.');
    }
  };

  // Generate new Pre-quote with AI from raw text
  const handleGenerateAiPreQuote = async () => {
    if (!newChatText.trim()) return;
    setIsGeneratingAi(true);
    try {
      const generated = await generatePreQuoteWithAI({
        conversation: [
          { sender: 'user', content: newChatText }
        ],
        customer: {
          name: newClientName || 'Cliente Solicitante',
          phone: newClientPhone || ''
        },
        channel: 'WhatsApp',
        manualText: `Cliente: ${newClientName} | Teléfono: ${newClientPhone}`
      });

      setIsGeneratingAi(false);
      setIsNewPreQuoteModalOpen(false);
      setNewChatText('');
      setNewClientName('');
      setNewClientPhone('');
      triggerFeedback(`¡Pre-cotización ${generated.number} estructurada con éxito por la IA!`);
      handleOpenReview(generated);
    } catch (err: any) {
      console.error('Error generando pre-cotización con IA:', err);
      setIsGeneratingAi(false);
      triggerFeedback(err.message || 'Error al procesar con IA');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full font-sans">
      
      {/* TOAST / FEEDBACK MESSAGE */}
      {actionFeedback && (
        <div className="fixed top-5 right-5 z-50 bg-foreground text-background text-sm font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-border animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Pre-cotizaciones Comerciales
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  IA WhatsApp & Omnicanal
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Revisa solicitudes extraídas por los agentes, consulta el chat con el cliente, asigna costos, aprueba y despacha cotizaciones formales.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl border border-border transition-colors"
            title="Sincronizar cotizaciones"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsNewPreQuoteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Extraer con IA desde Chat</span>
          </button>
        </div>
      </div>

      {/* STATS METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-primary/5 border-primary/40 shadow-sm' : 'bg-card border-border hover:border-primary/30'}`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase mb-1">
            <span>Total Precotizaciones</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{metrics.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Registradas en Firestore</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Borrador')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'Borrador' ? 'bg-amber-500/10 border-amber-500/50 shadow-sm' : 'bg-card border-border hover:border-amber-500/30'}`}
        >
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold uppercase mb-1">
            <span>Por Revisar / Costear</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground flex items-center gap-2">
            {metrics.draftsCount}
            {metrics.draftsCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                Pendientes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Esperando revisión comercial</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Aprobada')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'Aprobada' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm' : 'bg-card border-border hover:border-emerald-500/30'}`}
        >
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase mb-1">
            <span>Aprobadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{metrics.approvedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Costeadas, listas para despacho</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Enviada')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'Enviada' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-card border-border hover:border-indigo-500/30'}`}
        >
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold uppercase mb-1">
            <span>Enviadas a Cliente</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{metrics.sentCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Vía WhatsApp o Correo</p>
        </div>
      </div>

      {/* FILTERS AND SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente, empresa, N° PRE o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-muted/50 text-foreground text-sm rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Todas ({quotes.length})
          </button>
          <button
            onClick={() => setStatusFilter('Borrador')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${statusFilter === 'Borrador' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Por Costear ({metrics.draftsCount})
          </button>
          <button
            onClick={() => setStatusFilter('Aprobada')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${statusFilter === 'Aprobada' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Aprobadas ({metrics.approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('Enviada')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${statusFilter === 'Enviada' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Enviadas ({metrics.sentCount})
          </button>
        </div>
      </div>

      {/* PRE-QUOTATIONS LIST */}
      {preQuotes.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Sparkles className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No se encontraron pre-cotizaciones</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            {searchTerm ? 'No hay resultados que coincidan con tu búsqueda.' : 'Las pre-cotizaciones se crean automáticamente cuando los clientes solicitan productos en WhatsApp o mediante el extractor asistido por IA.'}
          </p>
          <button
            onClick={() => setIsNewPreQuoteModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Extraer Pre-cotización desde texto o chat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {preQuotes.map((quote: any) => {
            const isDraft = quote.status === 'Borrador';
            const isApproved = quote.status === 'Aprobada';
            const isSent = quote.status === 'Enviada';
            const hasChat = Array.isArray(quote.conversation) && quote.conversation.length > 0;
            const itemsCount = quote.items?.length || 0;

            return (
              <div 
                key={quote.id || quote.number} 
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
              >
                {/* LEFT: Info and Customer */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleOpenInCotizadorNormal(quote)}
                      className="font-mono text-base font-black text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left group-hover:text-primary"
                      title="Abrir en el cotizador normal para revisar y costear"
                    >
                      <span>{quote.number}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
                    </button>
                    
                    {/* Status Badge */}
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                      isApproved ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' :
                      isSent ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30' :
                      'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                    }`}>
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isSent && <Send className="w-3.5 h-3.5" />}
                      {isDraft && <Clock className="w-3.5 h-3.5" />}
                      {isDraft ? 'Pendiente Costeo' : quote.status}
                    </span>

                    {/* Source tag */}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {quote.source === 'WHATSAPP_AI' ? 'WhatsApp IA' : 'Agente IA'}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {new Date(quote.date || quote.createdAt || Date.now()).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{quote.clientName || 'Cliente sin nombre'}</span>
                    </div>

                    {quote.clientPhone && (
                      <a 
                        href={`https://wa.me/${quote.clientPhone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{quote.clientPhone}</span>
                      </a>
                    )}

                    {quote.clientEmail && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{quote.clientEmail}</span>
                      </span>
                    )}

                    {quote.approvedBy && isApproved && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Aprobada por: {quote.approvedBy}
                      </span>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-xs space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>{itemsCount} ítem{itemsCount !== 1 ? 's' : ''} solicitado{itemsCount !== 1 ? 's' : ''}:</span>
                      {quote.aiSummary && (
                        <span className="text-muted-foreground text-[11px] italic truncate max-w-md hidden md:inline">
                          "{quote.aiSummary}"
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(quote.items || []).slice(0, 2).map((it: any, idx: number) => (
                        <div key={it.id || idx} className="flex items-center justify-between text-muted-foreground">
                          <span className="truncate pr-2">
                            • <strong className="text-foreground">{it.quantity.toLocaleString('es-CO')}x</strong> {it.description} ({it.size || 'Medida estándar'})
                          </span>
                          <span className="font-mono font-medium text-foreground shrink-0">
                            {it.unitPrice > 0 ? formatCOP(it.total || it.subtotal) : <span className="text-amber-600 font-bold">$0 (Por costear)</span>}
                          </span>
                        </div>
                      ))}
                      {itemsCount > 2 && (
                        <p className="text-[11px] text-primary font-bold pt-0.5">
                          +{itemsCount - 2} ítem{itemsCount - 2 > 1 ? 's' : ''} más en el detalle...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Financial summary & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 shrink-0 min-w-[240px]">
                  <div className="text-right w-full sm:w-auto lg:w-full">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Total Cotizado
                    </span>
                    <div className="text-xl font-black text-foreground font-mono">
                      {quote.total > 0 ? (
                        formatCOP(quote.total)
                      ) : (
                        <span className="text-amber-600 text-base font-bold flex items-center justify-end gap-1">
                          <AlertCircle className="w-4 h-4" /> Pendiente de costos
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {quote.total > 0 ? 'IVA 19% Incluido' : 'Se deben fijar precios unitarios'}
                    </span>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                    
                    {/* LEER CONVERSACIÓN BUTTON */}
                    <button
                      onClick={() => setSelectedForConversation(quote)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-sm ${
                        hasChat 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' 
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                      title="Leer la conversación de WhatsApp con el cliente"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Leer Conversación</span>
                    </button>

                    {/* REVISAR Y COSTEAR BUTTON */}
                    <button
                      onClick={() => handleOpenInCotizadorNormal(quote)}
                      className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/20 flex items-center gap-1.5 transition-all shadow-sm"
                      title="Abrir en el cotizador normal para revisar y costear"
                    >
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      <span>Revisar y Costear</span>
                    </button>

                    {/* APROBAR BUTTON */}
                    {!isApproved && (
                      <button
                        onClick={() => handleDirectApprove(quote)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Aprobar formalmente la pre-cotización"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>
                    )}

                    {/* ENVIAR BUTTON */}
                    <button
                      onClick={() => {
                        setSelectedForSend(quote);
                        setSendMethod('WHATSAPP');
                      }}
                      className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Enviar cotización formal al cliente"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>

                    {/* PDF BUTTON */}
                    <button
                      onClick={() => handleDownloadPdf(quote)}
                      className="p-2 text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-xl border border-border transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* OPEN IN FULL COTIZADOR */}
                    {onOpenInCotizador && (
                      <button
                        onClick={() => onOpenInCotizador(quote)}
                        className="p-2 text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-xl border border-border transition-colors"
                        title="Abrir en Cotizador Avanzado"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MODAL: LEER CONVERSACIÓN CON EL CLIENTE ("que se pueda leer la conversación") */}
      {/* ========================================================================= */}
      {selectedForConversation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    Conversación con el Cliente
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 font-semibold">
                      WhatsApp Oficial
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedForConversation.clientName} • {selectedForConversation.clientPhone || 'Canal Digital'} • Ref: {selectedForConversation.number}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedForConversation(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Summary Banner */}
            <div className="bg-primary/5 border-b border-primary/20 px-6 py-3 flex items-start gap-3 text-xs">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-primary">Contexto extraído por IA:</span>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedForConversation.aiSummary || selectedForConversation.internalNotes || 'Solicitud de cotización canalizada a través de agentes virtuales.'}
                </p>
              </div>
            </div>

            {/* Chat Body - WhatsApp style */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/15">
              {Array.isArray(selectedForConversation.conversation) && selectedForConversation.conversation.length > 0 ? (
                selectedForConversation.conversation.map((msg: any, idx: number) => {
                  const isUser = msg.sender === 'user' || msg.role === 'user';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={idx} className="flex justify-center my-2">
                        <span className="text-[11px] bg-muted px-3 py-1 rounded-full text-muted-foreground border border-border">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                        <span className="font-bold">
                          {isUser ? (selectedForConversation.clientName || 'Cliente') : (msg.agentName || 'Asesor Fusión')}
                        </span>
                        <span>•</span>
                        <span>{msg.time || '10:00 AM'}</span>
                      </div>
                      
                      <div 
                        className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isUser 
                            ? 'bg-card border border-border text-foreground rounded-tl-none' 
                            : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No hay mensajes directos guardados para esta pre-cotización.</p>
                  <p className="text-xs mt-1">Transcripción resumida: {selectedForConversation.conversationTranscript || 'Requerimiento registrado manualmente.'}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Estado actual: <strong className="text-foreground">{selectedForConversation.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = (selectedForConversation.conversation || []).map((m: any) => `${m.sender}: ${m.content}`).join('\n');
                    navigator.clipboard.writeText(text);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border border-border flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? '¡Copiado!' : 'Copiar Chat'}</span>
                </button>

                <button
                  onClick={() => {
                    const quote = selectedForConversation;
                    setSelectedForConversation(null);
                    handleOpenInCotizadorNormal(quote);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Revisar y Costear en Cotizador</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL: REVISAR, ASIGNAR PRECIOS Y APROBAR PRE-COTIZACIÓN */}
      {/* ========================================================================= */}
      {selectedForReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                  Revisión Técnica y Costeo
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {selectedForReview.number}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cliente: <strong className="text-foreground">{selectedForReview.clientName}</strong> ({selectedForReview.clientPhone || 'Sin teléfono'})
                </p>
              </div>

              <button
                onClick={() => setSelectedForReview(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Ítems y Especificaciones Técnicas
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Modifica cantidades o precios unitarios directamente:
                  </span>
                </div>

                <div className="space-y-3">
                  {reviewItems.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">Descripción del Producto</span>
                        </div>
                        <textarea
                          rows={4}
                          value={item.description}
                          onChange={(e) => handleItemPriceChange(idx, 'description', e.target.value)}
                          placeholder="Descripción detallada del producto o servicio, especificaciones y notas..."
                          className="w-full bg-card p-3 rounded-lg border border-border text-foreground text-sm sm:text-base font-medium resize-y min-h-[110px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none leading-relaxed block"
                        />
                      </div>

                      {/* Technical specifications sub-grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Medidas / Formato</span>
                          <input
                            type="text"
                            value={item.size || ''}
                            onChange={(e) => handleItemPriceChange(idx, 'size', e.target.value)}
                            placeholder="Ej: 40x30x25 cm"
                            className="w-full bg-card px-2 py-1 rounded border border-border text-foreground text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Material</span>
                          <input
                            type="text"
                            value={item.material || ''}
                            onChange={(e) => handleItemPriceChange(idx, 'material', e.target.value)}
                            placeholder="Ej: Cartón Kraft onda C"
                            className="w-full bg-card px-2 py-1 rounded border border-border text-foreground text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Tintas</span>
                          <input
                            type="text"
                            value={item.inks || ''}
                            onChange={(e) => handleItemPriceChange(idx, 'inks', e.target.value)}
                            placeholder="Ej: 1 tinta negra"
                            className="w-full bg-card px-2 py-1 rounded border border-border text-foreground text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Acabados</span>
                          <input
                            type="text"
                            value={item.finishes || ''}
                            onChange={(e) => handleItemPriceChange(idx, 'finishes', e.target.value)}
                            placeholder="Ej: Troquelado y pegue"
                            className="w-full bg-card px-2 py-1 rounded border border-border text-foreground text-xs"
                          />
                        </div>
                      </div>

                      {/* Quantities & Pricing Row */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground block">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemPriceChange(idx, 'quantity', Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-card border border-border rounded font-bold text-sm text-foreground"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground block">Precio Unitario ($ COP)</label>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder="0"
                              value={item.unitPrice || ''}
                              onChange={(e) => handleItemPriceChange(idx, 'unitPrice', Number(e.target.value))}
                              className="w-32 px-2 py-1 bg-card border border-primary/40 focus:border-primary rounded font-bold text-sm text-foreground"
                            />
                          </div>

                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer pt-4">
                            <input
                              type="checkbox"
                              checked={item.applyVat !== false}
                              onChange={(e) => handleItemPriceChange(idx, 'applyVat', e.target.checked)}
                              className="rounded border-border"
                            />
                            <span>Aplica IVA 19%</span>
                          </label>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Subtotal Ítem</span>
                          <span className="text-sm font-black text-foreground font-mono">
                            {formatCOP(item.subtotal || 0)}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Commercial Terms & Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Tiempo Estimado de Entrega
                  </label>
                  <input
                    type="text"
                    value={reviewDeliveryTime}
                    onChange={(e) => setReviewDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Condiciones de Pago
                  </label>
                  <input
                    type="text"
                    value={reviewPaymentTerms}
                    onChange={(e) => setReviewPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Notas y Observaciones para el Cliente
                  </label>
                  <textarea
                    rows={2}
                    value={reviewCommercialNotes}
                    onChange={(e) => setReviewCommercialNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground resize-none"
                    placeholder="Observaciones técnicas o condiciones de embalaje y transporte..."
                  />
                </div>
              </div>

              {/* Totals Summary Banner */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Subtotal antes de IVA:</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {formatCOP(calculatedReviewTotals.subtotal)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    IVA 19%: {formatCOP(calculatedReviewTotals.vatAmount)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-primary block uppercase">TOTAL COTIZACIÓN</span>
                  <span className="text-2xl font-black text-foreground font-mono">
                    {formatCOP(calculatedReviewTotals.total)}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  const quote = selectedForReview;
                  setSelectedForReview(null);
                  if (onOpenInCotizador) onOpenInCotizador(quote);
                }}
                className="px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir en Cotizador Avanzado (con MO y divisor)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedForReview(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => handleSaveReview(false)}
                  className="px-4 py-2 bg-card border border-border hover:bg-muted text-foreground text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Guardar Borrador
                </button>

                <button
                  onClick={() => handleSaveReview(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Aprobar Pre-cotización</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: ENVIAR COTIZACIÓN A CLIENTE (WHATSAPP, CORREO, PDF) */}
      {/* ========================================================================= */}
      {selectedForSend && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  Enviar Cotización
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {selectedForSend.number}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Destinatario: <strong className="text-foreground">{selectedForSend.clientName}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedForSend(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channels Tabs */}
            <div className="flex border-b border-border bg-muted/40 p-2 gap-2">
              <button
                onClick={() => setSendMethod('WHATSAPP')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  sendMethod === 'WHATSAPP' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-card'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Oficial</span>
              </button>

              <button
                onClick={() => setSendMethod('EMAIL')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  sendMethod === 'EMAIL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-card'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Correo Electrónico</span>
              </button>

              <button
                onClick={() => setSendMethod('PDF')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  sendMethod === 'PDF' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-card'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
            </div>

            {/* Method Content */}
            <div className="p-6 space-y-4">
              {sendMethod === 'WHATSAPP' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Número de WhatsApp:</span>
                    <span className="font-bold text-foreground">{selectedForSend.clientPhone || 'Sin número registrado'}</span>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl text-xs space-y-2 text-foreground font-mono">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                      *FUSIÓN COMUNICACIÓN GRÁFICA Y EMPAQUES S.A.S.*
                    </p>
                    <p>Cotización N° {selectedForSend.number}</p>
                    <p>Cliente: {selectedForSend.clientName}</p>
                    <div className="py-2 border-y border-emerald-500/20 space-y-1">
                      {(selectedForSend.items || []).map((it: any, i: number) => (
                        <p key={i}>
                          • {it.quantity}x {it.description} ({formatCOP(it.total || it.subtotal)})
                        </p>
                      ))}
                    </div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                      TOTAL: {formatCOP(selectedForSend.total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Entrega: {selectedForSend.deliveryTime || '5 a 8 días'} | Pago: {selectedForSend.paymentTerms || '50% anticipo'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSendWhatsApp(selectedForSend)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Abrir Chat de WhatsApp y Despachar Propuesta</span>
                  </button>
                </div>
              )}

              {sendMethod === 'EMAIL' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Para:</label>
                    <input 
                      type="email" 
                      defaultValue={selectedForSend.clientEmail || 'cliente@empresa.com'}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Asunto:</label>
                    <input 
                      type="text" 
                      defaultValue={`Propuesta Comercial ${selectedForSend.number} - Fusión Comunicación Gráfica`}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      await sendQuoteEmail(selectedForSend);
                      markQuoteAsSent(selectedForSend.id, {
                        channel: 'EMAIL',
                        destination: selectedForSend.clientEmail,
                        sentBy: 'Asesor Comercial Fusión'
                      });
                      setSelectedForSend(null);
                      triggerFeedback(`Cotización ${selectedForSend.number} enviada por correo electrónico.`);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar Cotización por Correo Electrónico</span>
                  </button>
                </div>
              )}

              {sendMethod === 'PDF' && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Documento Oficial en PDF</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Genera el archivo PDF con membrete corporativo, tabla de productos, totales y condiciones comerciales.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      handleDownloadPdf(selectedForSend);
                      setSelectedForSend(null);
                    }}
                    className="px-6 py-3 bg-foreground text-background font-bold text-sm rounded-xl inline-flex items-center gap-2 hover:bg-foreground/90 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF de {selectedForSend.number}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: EXTRAER PRE-COTIZACIÓN CON IA DESDE TEXTO O CHAT */}
      {/* ========================================================================= */}
      {isNewPreQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2.5 text-primary">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-base text-foreground">
                  Estructurar Pre-cotización con IA
                </h3>
              </div>
              <button
                onClick={() => setIsNewPreQuoteModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Pega el mensaje de WhatsApp, transcripción de llamada o notas de requerimiento del cliente. El motor de IA analizará y extraerá automáticamente los productos, cantidades, tintas, materiales y medidas.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Nombre o Empresa:</label>
                  <input
                    type="text"
                    placeholder="Ej: Copidrogas / Carlos Mendoza"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Teléfono:</label>
                  <input
                    type="text"
                    placeholder="Ej: +57 310 445 9921"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Texto del Requerimiento / Chat:
                </label>
                <textarea
                  rows={5}
                  placeholder="Ej: 'Buenos días, necesito que me coticen 2.000 cajas corrugadas Kraft de 40x30x25 cm a 1 tinta negra y 5.000 bolsas kraft con manija de 25x35x10 cm a 2 tintas...'"
                  value={newChatText}
                  onChange={(e) => setNewChatText(e.target.value)}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsNewPreQuoteModalOpen(false)}
                  disabled={isGeneratingAi}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleGenerateAiPreQuote}
                  disabled={isGeneratingAi || !newChatText.trim()}
                  className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analizando y extrayendo con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generar Pre-cotización</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
