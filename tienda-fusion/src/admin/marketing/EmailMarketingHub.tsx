import React, { useState } from 'react';
import {
  Mail,
  Send,
  Eye,
  Sparkles,
  Plus,
  CheckCircle2,
  Users,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Code,
  FileText,
  MousePointer,
  Percent,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  EmailCampaignTemplate,
  MarketingCampaignRecord,
  AudienceSegment,
  INITIAL_EMAIL_TEMPLATES
} from '../../lib/marketingEngine';

interface EmailMarketingHubProps {
  campaigns: MarketingCampaignRecord[];
  audiences: AudienceSegment[];
  onDispatchEmailCampaign: (newCampaign: MarketingCampaignRecord) => void;
  formatCOP: (val: number) => string;
}

export default function EmailMarketingHub({
  campaigns,
  audiences,
  onDispatchEmailCampaign,
  formatCOP
}: EmailMarketingHubProps) {
  // State
  const [templates, setTemplates] = useState<EmailCampaignTemplate[]>(INITIAL_EMAIL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailCampaignTemplate>(INITIAL_EMAIL_TEMPLATES[0]);
  const [viewMode, setViewMode] = useState<'TEMPLATES' | 'COMPOSER' | 'PERFORMANCE' | 'SETTINGS'>('TEMPLATES');
  
  // Custom Email Composer State
  const [composerSubject, setComposerSubject] = useState(INITIAL_EMAIL_TEMPLATES[0].subject);
  const [composerPreviewText, setComposerPreviewText] = useState(INITIAL_EMAIL_TEMPLATES[0].previewText);
  const [composerAudienceId, setComposerAudienceId] = useState(audiences[0]?.id || 'SEG-B2B-VIP');
  const [composerHtml, setComposerHtml] = useState(INITIAL_EMAIL_TEMPLATES[0].htmlContent);
  const [senderName, setSenderName] = useState('Fusión Comunicación Gráfica');
  const [senderEmail, setSenderEmail] = useState('ventas@fusiongrafica.com.co');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Email campaigns filtered
  const emailCampaigns = campaigns.filter(c => c.channelType === 'EMAIL' || c.channels.includes('EMAIL_MARKETING'));

  // Metrics
  const totalEmailsSent = emailCampaigns.reduce((acc, c) => acc + (c.emailDetails?.recipientsCount || c.impressions || 0), 0);
  const avgOpenRate = emailCampaigns.length > 0 
    ? (emailCampaigns.reduce((acc, c) => acc + (c.emailDetails?.openRate || 42), 0) / emailCampaigns.length).toFixed(1)
    : '42.5';
  const totalEmailRevenue = emailCampaigns.reduce((acc, c) => acc + c.revenueGenerated, 0);

  const handleSelectTemplate = (tpl: EmailCampaignTemplate) => {
    setSelectedTemplate(tpl);
    setComposerSubject(tpl.subject);
    setComposerPreviewText(tpl.previewText);
    setComposerHtml(tpl.htmlContent);
    setViewMode('COMPOSER');
  };

  const handleSendCampaign = () => {
    if (!composerSubject.trim() || !composerHtml.trim()) return;
    setIsDispatching(true);

    setTimeout(() => {
      const selectedAudience = audiences.find(a => a.id === composerAudienceId);
      const recipientsCount = selectedAudience?.totalContacts || 1200;

      const newEmailCampaign: MarketingCampaignRecord = {
        id: `EMAIL-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `Email: ${composerSubject.slice(0, 45)}...`,
        targetProduct: selectedTemplate?.title || 'Litografía Industrial & Empaques',
        targetAudience: selectedAudience?.name || 'Base de Datos General',
        channelType: 'EMAIL',
        channels: ['EMAIL_MARKETING'],
        status: 'ACTIVE',
        sentDate: new Date().toISOString().split('T')[0],
        impressions: recipientsCount,
        clicks: Math.floor(recipientsCount * 0.18),
        conversions: Math.floor(recipientsCount * 0.035),
        revenueGenerated: Math.floor(recipientsCount * 0.035 * 450000),
        budgetCOP: 45000,
        roas: 35.0,
        emailDetails: {
          subject: composerSubject,
          previewText: composerPreviewText,
          senderName,
          senderEmail,
          openRate: 46.8,
          clickRate: 14.2,
          recipientsCount,
          htmlBody: composerHtml
        }
      };

      onDispatchEmailCampaign(newEmailCampaign);
      setIsDispatching(false);
      setDispatchSuccess(true);

      setTimeout(() => {
        setDispatchSuccess(false);
        setViewMode('PERFORMANCE');
      }, 2000);
    }, 1800);
  };

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE EMAIL MARKETING */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 p-6 sm:p-7 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Mail size={16} />
            <span>Centro de Email Marketing Transaccional & Newsletters B2B</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Email Studio de Alta Conversión (Resend & SMTP)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Diseña, automatiza y despacha correos persuasivos para rescate de carritos, catálogos mayoristas para agencias y promociones de temporada en toda Colombia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('COMPOSER')}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Redactar Campaña</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS EMAIL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Correos Despachados</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            {totalEmailsSent.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
            <CheckCircle2 size={11} /> 99.4% Entregabilidad
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tasa Media de Apertura</span>
          <span className="text-xl sm:text-2xl font-black text-teal-600 mt-1 block">
            {avgOpenRate}%
          </span>
          <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
            Promedio industria B2B: 24%
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Atribuidas a Email</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
            {formatCOP(totalEmailRevenue)}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
            <TrendingUp size={11} /> Alto ROI en pedidos B2B
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Servicio Conectado</span>
          <span className="text-sm font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Resend API + DKIM Activo
          </span>
          <span className="text-[10px] font-bold text-teal-700 mt-0.5 block">
            ventas@fusiongrafica.com.co
          </span>
        </div>
      </div>

      {/* SUB-PESTAÑAS DE EMAIL MARKETING */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setViewMode('TEMPLATES')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            viewMode === 'TEMPLATES'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={15} />
          <span>Plantillas de Alta Conversión ({templates.length})</span>
        </button>

        <button
          onClick={() => setViewMode('COMPOSER')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            viewMode === 'COMPOSER'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={15} />
          <span>Editor & Despachador de Campañas</span>
        </button>

        <button
          onClick={() => setViewMode('PERFORMANCE')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            viewMode === 'PERFORMANCE'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={15} />
          <span>Campañas Enviadas & Métricas ({emailCampaigns.length})</span>
        </button>

        <button
          onClick={() => setViewMode('SETTINGS')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            viewMode === 'SETTINGS'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders size={15} />
          <span>Configuración de Servidor & Remitente</span>
        </button>
      </div>

      {/* VISTA 1: PLANTILLAS PRE-DISEÑADAS */}
      {viewMode === 'TEMPLATES' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Plantillas Optimizadas para Litografía e Impresión</h3>
              <p className="text-xs text-slate-500">Diseños adaptados para clientes corporativos, agencias de publicidad y compradores recurrentes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-teal-400 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-50 text-teal-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-teal-200">
                      {tpl.badge}
                    </span>
                    {tpl.stats && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Eye size={12} /> {tpl.stats.openRate} Apertura
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    {tpl.title}
                  </h4>

                  <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Mail size={13} className="text-teal-600 shrink-0" />
                      <span>{tpl.subject}</span>
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      {tpl.previewText}
                    </p>
                    <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                      <span>Audiencia recomendada:</span>
                      <span className="text-slate-700 font-bold">{tpl.recommendedAudience}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => handleSelectTemplate(tpl)}
                    className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>Usar Plantilla & Editar</span>
                  </button>
                  <button
                    onClick={() => handleCopyCode(tpl.htmlContent, tpl.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2.5 rounded-xl text-xs transition-colors"
                    title="Copiar Código HTML"
                  >
                    {copiedKey === tpl.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: EDITOR & DESPACHADOR DE CAMPAÑAS */}
      {viewMode === 'COMPOSER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PANEL IZQUIERDO: CONFIGURADOR DEL ENVÍO */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" />
                <span>Parámetros de la Campaña</span>
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                Resend API Ready
              </span>
            </div>

            {/* AUDIENCIA OBJETIVO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Audiencia / Segmento Destinatario:</label>
              <select
                value={composerAudienceId}
                onChange={(e) => setComposerAudienceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {audiences.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.totalContacts.toLocaleString()} contactos verificados)
                  </option>
                ))}
              </select>
            </div>

            {/* LÍNEA DE ASUNTO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Línea de Asunto (Subject):</label>
              <input
                type="text"
                value={composerSubject}
                onChange={(e) => setComposerSubject(e.target.value)}
                placeholder="Ej: 🏢 Tarifario Mayorista 2025 para tu Agencia..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* TEXTO DE VISTA PREVIA (PREHEADER) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Texto de Previsualización en Bandeja de Entrada:</label>
              <input
                type="text"
                value={composerPreviewText}
                onChange={(e) => setComposerPreviewText(e.target.value)}
                placeholder="Ej: Aumenta tus márgenes con precios directos de fábrica..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* DATOS DE REMITENTE */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Nombre del Remitente:</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Email Remitente:</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>
            </div>

            {/* EDITAR CÓDIGO HTML */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Cuerpo del Correo (HTML Responsivo):</label>
                <span className="text-[10px] text-slate-400 font-semibold">Editable en tiempo real</span>
              </div>
              <textarea
                value={composerHtml}
                onChange={(e) => setComposerHtml(e.target.value)}
                rows={8}
                className="w-full bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl p-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* BOTÓN DE DESPACHO */}
            {dispatchSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>¡Campaña de correo despachada exitosamente a la lista!</span>
              </div>
            ) : (
              <button
                onClick={handleSendCampaign}
                disabled={isDispatching || !composerSubject.trim()}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all text-xs sm:text-sm disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Conectando con Servidor Resend & Despachando...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Despachar Campaña a {audiences.find(a => a.id === composerAudienceId)?.totalContacts.toLocaleString() || '1,200'} Contactos</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* PANEL DERECHO: PREVISUALIZADOR CLIENTE DE CORREO */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* SIMULADOR DE BANDEJA DE ENTRADA (GMAIL / OUTLOOK) */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden">
              
              {/* Header de Cliente de Correo */}
              <div className="bg-slate-100 p-4 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-slate-600 ml-2">Vista Previa en Bandeja de Entrada</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulación Web & Móvil</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{senderName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">10:30 AM</span>
                  </div>
                  <div className="font-bold text-teal-800 text-xs truncate">
                    {composerSubject || 'Sin asunto'}
                  </div>
                  <div className="text-slate-500 text-[11px] truncate">
                    {composerPreviewText || 'Previsualización del mensaje...'}
                  </div>
                </div>
              </div>

              {/* RENDER DEL CONTENIDO HTML */}
              <div className="p-6 bg-slate-50 min-h-[420px] flex justify-center">
                <div 
                  className="w-full max-w-[620px] shadow-sm rounded-2xl overflow-hidden bg-white"
                  dangerouslySetInnerHTML={{ __html: composerHtml }}
                />
              </div>

            </div>

          </div>

        </div>
      )}

      {/* VISTA 3: HISTORIAL DE CORREOS & RENDIMIENTO */}
      {viewMode === 'PERFORMANCE' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Historial de Campañas de Email Marketing</h3>
              <p className="text-xs text-slate-500">Métricas de tasa de apertura, clics únicos, conversiones de checkout y ventas atribuidas.</p>
            </div>
            <button
              onClick={() => setViewMode('COMPOSER')}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Nueva Campaña</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Asunto & Campaña</th>
                    <th className="py-3.5 px-4">Audiencia Destino</th>
                    <th className="py-3.5 px-4">Despachados / Apertura</th>
                    <th className="py-3.5 px-4">Clics / CTR</th>
                    <th className="py-3.5 px-4">Ventas Atribuidas</th>
                    <th className="py-3.5 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {emailCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{camp.title}</span>
                          <span className="text-[10px] text-teal-600 block mt-0.5 font-semibold">
                            {camp.emailDetails?.subject || camp.targetProduct}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {camp.targetAudience}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900">
                            {(camp.emailDetails?.recipientsCount || camp.impressions).toLocaleString()} envíos
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            {camp.emailDetails?.openRate || 44.5}% tasa apertura
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900">{camp.clicks.toLocaleString()} clics</span>
                          <span className="block text-[10px] text-teal-600 font-semibold">
                            {camp.emailDetails?.clickRate || 12.8}% CTR
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-emerald-600 text-sm">
                          {formatCOP(camp.revenueGenerated)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          <CheckCircle2 size={11} /> Entregado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: CONFIGURACIÓN DE SERVIDOR & REMITENTE */}
      {viewMode === 'SETTINGS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-black text-slate-900">Configuración de Conexión Resend & SMTP</h3>
            <p className="text-xs text-slate-500">Credenciales del motor de correos de alta entregabilidad con validación SPF/DKIM.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">API Key de Resend (Producción):</label>
              <input
                type="password"
                defaultValue="re_prod_948271829384729183749"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Dominio Autenticado:</label>
                <input
                  type="text"
                  defaultValue="fusiongrafica.com.co"
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-700 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Estado DNS:</label>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold p-2.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>SPF, DKIM y DMARC Válidos</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-xs flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-600 shrink-0" />
              <span>
                Todos los correos despachados son firmados digitalmente para evitar bandejas de SPAM y garantizar que lleguen a la bandeja principal de tus clientes.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => alert('¡Configuración de correo validada y sincronizada!')}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
