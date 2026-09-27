import * as React from "react";
import { getQuotes, saveQuotes, approveQuote, deleteQuote, syncQuotesFromApi } from "../../../../lib/quotesStore";
import { generateQuotePDF, sendQuoteWhatsApp, sendQuoteEmail } from "../../../../lib/quoteSharing";
import { MassRecalculateModal } from "../../../../features/quote-assist";
import { History, Search, Plus, FileText, Mail, MessageCircle, AlertCircle, Edit, Trash2, Sparkles, RefreshCw, Lock, Trophy } from "lucide-react";
import { notify } from '@/lib/notify';
import { formatCurrency } from './quoteModel';

export function QuoteHistory({
  onContinueQuote,
  onStartNewQuote
}: {
  onContinueQuote?: (quote: any) => void;
  onStartNewQuote?: () => void;
}) {
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState('Todos los estados');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [massRecalcOpen, setMassRecalcOpen] = React.useState(false);
  const currentTariffVersion = { id: 'tar-2026-02', code: 'TAR-2026-02', name: 'Tarifario Oficial Vigente (v2.0)' };

  const loadQuotes = async () => {
    const all = getQuotes();
    setQuotes(Array.isArray(all) ? all : []);
    
    // Sincronizar con el servidor para que "quede guardado"
    const synced = await syncQuotesFromApi();
    if (synced) setQuotes(synced);
  };

  React.useEffect(() => {
    loadQuotes();
    window.addEventListener('fusion_quotes_updated', loadQuotes);
    window.addEventListener('storage', loadQuotes);
    return () => {
      window.removeEventListener('fusion_quotes_updated', loadQuotes);
      window.removeEventListener('storage', loadQuotes);
    };
  }, []);

  const handleApplyRevisions = (newRevisionQuotes: any[]) => {
    if (!newRevisionQuotes || newRevisionQuotes.length === 0) return;
    saveQuotes(newRevisionQuotes);
    loadQuotes();
  };

  const handleDelete = (id: string, number: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la cotización ${number}? Esta acción no se puede deshacer.`)) {
      deleteQuote(id);
    }
  };

  const handleMarkAsWon = async (quote: any) => {
    if (window.confirm(`¿Marcar la cotización ${quote.number} como GANADA? Esto creará automáticamente el Proyecto en Producción.`)) {
      try {
        const { approveQuote } = await import("../../../../lib/quotesStore");
        await approveQuote(quote.id, { 
          status: 'Aprobada',
          total: quote.total,
          subtotal: quote.subtotal,
          items: quote.items
        });
        notify(`¡Cotización ${quote.number} marcada como GANADA! El proyecto ha sido creado en Producción.`);
        loadQuotes();
      } catch (err: any) {
        console.error('Error in handleMarkAsWon:', err);
        notify(`Error al marcar como ganada: ${err.message || 'Error desconocido'}`);
      }
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const isPreQuote = Boolean(q.isPreQuote || q.aiExtracted || q.number?.startsWith('PRE-'));
    let matchesFilter = true;
    if (filter === 'Pre-cotizaciones IA') {
      matchesFilter = isPreQuote;
    } else if (filter === 'Calculadas con tarifario anterior') {
      matchesFilter = Boolean(
        (q.tariffVersionId && q.tariffVersionId !== currentTariffVersion.id) ||
        (!q.tariffVersionId && q.items?.some((it: any) => it.assistRunId))
      );
    } else if (filter !== 'Todos los estados') {
      matchesFilter = q.status === filter;
    }
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesFilter;
    const matchesSearch = 
      (q.number && q.number.toLowerCase().includes(query)) ||
      (q.clientName && q.clientName.toLowerCase().includes(query)) ||
      (q.clientNit && q.clientNit.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 min-h-[450px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cotizaciones Históricas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta, continúa editando, descarga en PDF o envía cotizaciones guardadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón Recálculo Masivo (Bloque D) */}
          <button 
            type="button"
            onClick={() => setMassRecalcOpen(true)}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Recalcular cotizaciones en borrador con tarifario vigente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Recalcular con tarifario vigente</span>
          </button>
          {onStartNewQuote && (
            <button 
              onClick={onStartNewQuote}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nueva Cotización
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-background font-medium" 
            placeholder="Buscar por N° cotización, cliente o NIT..." 
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Estado:</label>
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="px-3 py-2 border border-input rounded-lg text-sm font-medium w-full sm:w-60 bg-background focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option>Todos los estados</option>
            <option value="Calculadas con tarifario anterior">⚠️ Con tarifario anterior</option>
            <option value="Pre-cotizaciones IA">✨ Pre-cotizaciones IA</option>
            <option>Borrador</option>
            <option>Finalizada</option>
            <option>Enviada</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
          </select>
        </div>
      </div>
      
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/10">
          <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-foreground">
            {searchQuery || filter !== 'Todos los estados' ? 'No se encontraron cotizaciones' : '0 cotizaciones en curso'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || filter !== 'Todos los estados' 
              ? 'Prueba modificando los filtros de búsqueda o estado.' 
              : 'El sistema está limpio y listo para registrar cotizaciones comerciales oficiales.'}
          </p>
          {onStartNewQuote && (
            <button 
              onClick={onStartNewQuote}
              className="mt-4 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Crear primera cotización
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                <th className="p-3.5">N° Cotización</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Fecha</th>
                <th className="p-3.5 text-right">Total (COP)</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuotes.map((q) => {
                const isPre = Boolean(q.isPreQuote || q.aiExtracted || q.number?.startsWith('PRE-'));
                return (
                <tr key={q.id} className={`hover:bg-muted/20 transition-colors group ${isPre ? 'bg-amber-500/[0.03]' : ''}`}>
                  <td className="p-3.5 text-sm font-bold text-foreground">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className={`w-4 h-4 shrink-0 ${isPre ? 'text-amber-500' : 'text-primary'}`} />
                        <span>{q.number}</span>
                        {isPre && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700">
                            ✨ IA
                          </span>
                        )}
                      </div>
                      {/* Badge Tarifario Anterior / Congelado (Bloque D) */}
                      {q.tariffVersionId && q.tariffVersionId !== currentTariffVersion.id && (
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                            q.status === 'Borrador'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {q.status === 'Borrador' ? (
                              <>
                                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Tarifario anterior ({q.tariffVersionId})</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                <span>Tarifario congelado ({q.tariffVersionId})</span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-sm">
                    <span className="font-semibold text-foreground block">{q.clientName || 'Cliente sin nombre'}</span>
                    {q.clientNit && <span className="text-xs text-muted-foreground">NIT: {q.clientNit}</span>}
                  </td>
                  <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                    {q.date ? new Date(q.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="p-3.5 text-sm font-bold text-right text-foreground whitespace-nowrap">
                    {q.total > 0 ? (
                      formatCurrency(q.total)
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Pendiente costeo
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    {isPre ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pre-cotización IA
                      </span>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        q.status === 'Aprobada' ? 'bg-success/15 text-success border border-success/20' : 
                        q.status === 'Enviada' ? 'bg-info/15 text-info border border-info/20' : 
                        q.status === 'Finalizada' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-800' :
                        q.status === 'Rechazada' ? 'bg-danger/15 text-danger border border-danger/20' : 
                        'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {q.status || 'Borrador'}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Continuar / Editar */}
                      {onContinueQuote && (
                        <button 
                          onClick={() => onContinueQuote(q)}
                          className={`px-2.5 py-1.5 font-bold text-xs rounded-md transition-colors flex items-center gap-1 ${
                            isPre 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                              : 'bg-primary/10 hover:bg-primary/20 text-primary'
                          }`}
                          title={isPre ? "Completar precios y finalizar pre-cotización" : "Continuar editando cotización"}
                        >
                          <Edit className="w-3.5 h-3.5" /> {isPre ? 'Completar' : 'Continuar'}
                        </button>
                      )}
                      
                      {/* Descargar PDF */}
                      <button 
                        onClick={() => generateQuotePDF(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        title="Descargar PDF"
                      >
                        <FileText className="w-4 h-4 text-rose-500" />
                      </button>

                      {/* Enviar WhatsApp */}
                      <button 
                        onClick={() => sendQuoteWhatsApp(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-emerald-600 rounded-md transition-colors"
                        title="Enviar por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </button>

                      {/* Marcar como GANADA */}
                      {q.status !== 'Aprobada' && (
                        <button 
                          onClick={() => handleMarkAsWon(q)}
                          className="p-1.5 hover:bg-success/10 text-muted-foreground hover:text-success rounded-md transition-colors"
                          title="Marcar como GANADA (Pasar a Producción)"
                        >
                          <Trophy className="w-4 h-4 text-amber-500" />
                        </button>
                      )}

                      {/* Enviar Email */}
                      <button 
                        onClick={() => sendQuoteEmail(q)}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-sky-600 rounded-md transition-colors"
                        title="Enviar por Email"
                      >
                        <Mail className="w-4 h-4 text-sky-600" />
                      </button>

                      {/* Eliminar */}
                      <button 
                        onClick={() => handleDelete(q.id, q.number)}
                        className="p-1.5 hover:bg-danger/10 text-muted-foreground hover:text-danger rounded-md transition-colors"
                        title="Eliminar de historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Recálculo Masivo por Cambio de Tarifario (Bloque D) */}
      <MassRecalculateModal
        isOpen={massRecalcOpen}
        onClose={() => setMassRecalcOpen(false)}
        currentTariffVersion={currentTariffVersion}
        quotes={quotes}
        onApplyRevisions={handleApplyRevisions}
      />
    </div>
  );
}
