import React, { useState } from 'react';
import {
  Megaphone,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  DollarSign,
  TrendingUp,
  Share2,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  Search,
  Sparkles,
  MessageCircle,
  Instagram,
  Mail,
  Sliders,
  Check
} from 'lucide-react';
import {
  MarketingCampaignRecord,
  AudienceSegment
} from '../../lib/marketingEngine';

interface CampaignManagementHubProps {
  campaigns: MarketingCampaignRecord[];
  audiences: AudienceSegment[];
  onToggleStatus: (campaignId: string) => void;
  onUpdateBudget: (campaignId: string, newBudgetCop: number) => void;
  onCloneCampaign: (campaign: MarketingCampaignRecord) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onOpenWizard: () => void;
  formatCOP: (val: number) => string;
}

export default function CampaignManagementHub({
  campaigns,
  audiences,
  onToggleStatus,
  onUpdateBudget,
  onCloneCampaign,
  onDeleteCampaign,
  onOpenWizard,
  formatCOP
}: CampaignManagementHubProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'DRAFT'>('ALL');
  const [selectedCampaignForPreview, setSelectedCampaignForPreview] = useState<MarketingCampaignRecord | null>(null);
  const [editingBudgetCampaign, setEditingBudgetCampaign] = useState<MarketingCampaignRecord | null>(null);
  const [newBudgetValue, setNewBudgetValue] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Totales globales
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.revenueGenerated || 0), 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.budgetCOP || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const averageROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : '18.4';

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.targetProduct.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.targetAudience.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveBudget = () => {
    if (editingBudgetCampaign && newBudgetValue > 0) {
      onUpdateBudget(editingBudgetCampaign.id, newBudgetValue);
      setEditingBudgetCampaign(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TARJETAS RESUMEN DE RENDIMIENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ventas Atribuidas Totales</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{formatCOP(totalRevenue)}</div>
          <span className="text-[11px] font-bold text-slate-500 block">+28% vs mes anterior</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Inversión Publicitaria Total</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{formatCOP(totalSpend)}</div>
          <span className="text-[11px] font-bold text-teal-600 block">Distribución en 5 canales</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Retorno de Inversión (ROAS Global)</span>
          <div className="text-xl sm:text-2xl font-black text-teal-600 flex items-center gap-1">
            <TrendingUp size={20} />
            <span>{averageROAS}x</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 block">$ {averageROAS} COP ganados por $ 1 COP invertido</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Pedidos / Conversiones</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalConversions} órdenes</div>
          <span className="text-[11px] font-bold text-emerald-600 block">Tasa de conversión avg 4.2%</span>
        </div>
      </div>

      {/* BARRA DE ACCIONES Y FILTROS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por campaña, producto o audiencia..."
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 sm:w-80 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'ALL' ? 'Todas' : st === 'ACTIVE' ? 'Activas' : 'Pausadas'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onOpenWizard}
          className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
        >
          <Sparkles size={16} />
          <span>Crear Nueva Campaña (Wizard)</span>
        </button>
      </div>

      {/* TABLA PRINCIPAL DE CAMPAÑAS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Megaphone size={16} className="text-teal-600" />
            <span>Campañas Lanzadas & Control de Rendimiento ({filteredCampaigns.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Campaña / Producto</th>
                <th className="py-3 px-4">Audiencia & Canales</th>
                <th className="py-3 px-4">Presupuesto</th>
                <th className="py-3 px-4">Impresiones / Clics</th>
                <th className="py-3 px-4">Ventas & ROAS</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones de Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCampaigns.map((camp) => {
                const isActive = camp.status === 'ACTIVE';
                return (
                  <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">{camp.title}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{camp.targetProduct}</span>
                        <span className="text-[10px] text-teal-600 font-mono mt-0.5 block">{camp.id} · {camp.sentDate}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{camp.targetAudience}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {camp.channels.map((ch, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                              {ch.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-black text-slate-900 block">{formatCOP(camp.budgetCOP || 0)}</span>
                        <button
                          onClick={() => {
                            setEditingBudgetCampaign(camp);
                            setNewBudgetValue(camp.budgetCOP || 0);
                          }}
                          className="text-[10px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5 mt-0.5"
                        >
                          <Edit size={10} />
                          <span>Editar Inversión</span>
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{camp.impressions.toLocaleString()} imp.</span>
                        <span className="text-[10px] text-teal-600 font-semibold block">{camp.clicks.toLocaleString()} clics ({camp.conversions} órdenes)</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-black text-emerald-600 text-sm block">{formatCOP(camp.revenueGenerated)}</span>
                        <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          ROAS {camp.roas ? `${camp.roas}x` : 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onToggleStatus(camp.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title={isActive ? 'Clic para pausar campaña' : 'Clic para reanudar campaña'}
                      >
                        {isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Activa</span>
                          </>
                        ) : (
                          <>
                            <Pause size={10} className="text-amber-600" />
                            <span>Pausada</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedCampaignForPreview(camp)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 bg-slate-100 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Ver Vista Previa Multicanal & Tracking"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => onToggleStatus(camp.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title={isActive ? 'Pausar' : 'Reanudar'}
                        >
                          {isActive ? <Pause size={14} /> : <Play size={14} className="text-emerald-600" />}
                        </button>

                        <button
                          onClick={() => onCloneCampaign(camp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Clonar / Duplicar Campaña"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar la campaña "${camp.title}"?`)) {
                              onDeleteCampaign(camp.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Campaña"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: VISTA PREVIA MULTICANAL Y DETALLES DE CAMPAÑA */}
      {/* ========================================================================= */}
      {selectedCampaignForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider">
                  Detalles y Vista Previa Multicanal
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedCampaignForPreview.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCampaignForPreview(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* MÉTRICAS CLAVE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Impresiones:</span>
                <span className="font-black text-slate-900 text-sm">{selectedCampaignForPreview.impressions.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Clics Totales:</span>
                <span className="font-black text-teal-700 text-sm">{selectedCampaignForPreview.clicks.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Inversión:</span>
                <span className="font-black text-slate-900 text-sm">{formatCOP(selectedCampaignForPreview.budgetCOP || 0)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ventas Generadas:</span>
                <span className="font-black text-emerald-600 text-sm">{formatCOP(selectedCampaignForPreview.revenueGenerated)}</span>
              </div>
            </div>

            {/* MENSAJES Y COPIES DESPLEGADOS */}
            <div className="space-y-3 text-xs">
              
              {selectedCampaignForPreview.whatsappDetails && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                      <MessageCircle size={14} /> WhatsApp Broadcast Oficial
                    </span>
                    <button
                      onClick={() => handleCopy(selectedCampaignForPreview.whatsappDetails?.broadcastMessage || '', 'wa_view')}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      {copiedKey === 'wa_view' ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-emerald-100 whitespace-pre-wrap font-sans text-xs">
                    {selectedCampaignForPreview.whatsappDetails.broadcastMessage}
                  </p>
                </div>
              )}

              {selectedCampaignForPreview.socialDetails && (
                <div className="bg-pink-50/60 border border-pink-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-pink-800 flex items-center gap-1.5">
                      <Instagram size={14} /> Anuncio Instagram & Meta Ads
                    </span>
                    <span className="text-[10px] text-pink-700 font-bold">
                      {selectedCampaignForPreview.socialDetails.targetLocation}
                    </span>
                  </div>
                  <h5 className="font-black text-slate-900">{selectedCampaignForPreview.socialDetails.headline}</h5>
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-pink-100 text-xs">
                    {selectedCampaignForPreview.socialDetails.copy}
                  </p>
                </div>
              )}

              {selectedCampaignForPreview.emailDetails && (
                <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-800 flex items-center gap-1.5">
                      <Mail size={14} /> Campaña de Email Resend
                    </span>
                    <span className="text-[10px] text-teal-700 font-bold">
                      Apertura: {selectedCampaignForPreview.emailDetails.openRate}%
                    </span>
                  </div>
                  <p className="text-slate-800 font-bold text-xs">
                    Asunto: {selectedCampaignForPreview.emailDetails.subject}
                  </p>
                </div>
              )}

              {/* ENLACE DE SEGUIMIENTO UTM */}
              {selectedCampaignForPreview.content?.trackingUrl && (
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider block">
                    Enlace de Rastreo UTM Sincronizado
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-teal-200 truncate">
                      {selectedCampaignForPreview.content.trackingUrl}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedCampaignForPreview.content?.trackingUrl || '', 'url_prev')}
                      className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg shrink-0 text-xs font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'url_prev' ? <Check size={13} /> : <Copy size={13} />}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCampaignForPreview(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR PRESUPUESTO DE CAMPAÑA */}
      {/* ========================================================================= */}
      {editingBudgetCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider">Ajuste de Inversión</span>
                <h3 className="text-base font-black text-slate-900">{editingBudgetCampaign.title}</h3>
              </div>
              <button
                onClick={() => setEditingBudgetCampaign(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Nuevo Presupuesto Total (COP):</label>
              <input
                type="number"
                value={newBudgetValue}
                onChange={(e) => setNewBudgetValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-teal-700"
              />
              <span className="text-[11px] text-slate-400 block">
                Valor actual: {formatCOP(editingBudgetCampaign.budgetCOP || 0)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingBudgetCampaign(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBudget}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs"
              >
                Guardar Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
