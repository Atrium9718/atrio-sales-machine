import React, { useState } from 'react';
import {
  Radio,
  Instagram,
  Facebook,
  MessageCircle,
  Mail,
  Search,
  Video,
  Briefcase,
  Sparkles,
  Send,
  CheckCircle2,
  TrendingUp,
  Plus,
  Play,
  Pause,
  Copy,
  Check,
  Eye,
  Sliders,
  DollarSign,
  Users,
  Target,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import {
  ChannelConnection,
  MarketingCampaignRecord,
  AudienceSegment
} from '../../lib/marketingEngine';

interface ChannelCampaignsHubProps {
  channels: ChannelConnection[];
  campaigns: MarketingCampaignRecord[];
  audiences: AudienceSegment[];
  onDispatchCampaign: (camp: MarketingCampaignRecord) => void;
  formatCOP: (val: number) => string;
}

export default function ChannelCampaignsHub({
  channels,
  campaigns,
  audiences,
  onDispatchCampaign,
  formatCOP
}: ChannelCampaignsHubProps) {
  const [selectedChannelCategory, setSelectedChannelCategory] = useState<'ALL' | 'WHATSAPP' | 'META' | 'GOOGLE' | 'EMAIL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChannelType, setModalChannelType] = useState<'WHATSAPP' | 'META' | 'GOOGLE' | 'EMAIL'>('WHATSAPP');
  
  // Quick Campaign Form State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [targetProduct, setTargetProduct] = useState('Tarjetas de Presentación con Reserva UV');
  const [selectedAudienceId, setSelectedAudienceId] = useState(audiences[0]?.id || 'SEG-B2B-VIP');
  const [budgetCOP, setBudgetCOP] = useState(150000);
  const [messageCopy, setMessageCopy] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (selectedChannelCategory === 'ALL') return true;
    if (selectedChannelCategory === 'WHATSAPP') return c.channelType === 'WHATSAPP' || c.channels.includes('WHATSAPP_BROADCAST');
    if (selectedChannelCategory === 'META') return c.channelType === 'META' || c.channels.includes('META_INSTAGRAM') || c.channels.includes('META_FACEBOOK');
    if (selectedChannelCategory === 'GOOGLE') return c.channelType === 'GOOGLE' || c.channels.includes('GOOGLE_ADS');
    if (selectedChannelCategory === 'EMAIL') return c.channelType === 'EMAIL' || c.channels.includes('EMAIL_MARKETING');
    return true;
  });

  const handleOpenCreate = (type: 'WHATSAPP' | 'META' | 'GOOGLE' | 'EMAIL') => {
    setModalChannelType(type);
    if (type === 'WHATSAPP') {
      setCampaignTitle('Difusión WhatsApp: Descuento 20% en Cajas Plegadizas');
      setTargetProduct('Cajas Plegadizas y Empaques');
      setMessageCopy('🔥 ¡Hola {nombre}! En Fusión Comunicación Gráfica tenemos 20% DTO en empaques litográficos por esta semana. ¿Te enviamos cotización formal con medidas exactas?');
    } else if (type === 'META') {
      setCampaignTitle('Anuncio Instagram & Reels: Calidad Offset Heidelberg');
      setTargetProduct('Etiquetas en Rollo y Catálogos Corporativos');
      setMessageCopy('Imprime tus materiales gráficos con calidad industrial CTP directa a plancha. Despachos a Manizales, Pereira, Armenia, Bogotá y todo Colombia.');
    } else if (type === 'GOOGLE') {
      setCampaignTitle('Google Ads Search: Imprenta Litográfica Manizales y Eje Cafetero');
      setTargetProduct('Litografía Offset y Gran Formato');
      setMessageCopy('Imprenta líder en Colombia. Cotizaciones inmediatas y producción de alta precisión.');
    } else {
      setCampaignTitle('Newsletter B2B: Reactivación de Clientes Corporativos');
      setTargetProduct('Catálogo General Litográfico');
      setMessageCopy('Conoce nuestros nuevos acabados en hot stamping, reserva UV y troquel digital.');
    }
    setIsModalOpen(true);
  };

  const handlePublishNewCampaign = () => {
    if (!campaignTitle.trim()) return;
    setIsPublishing(true);

    setTimeout(() => {
      const selectedAud = audiences.find(a => a.id === selectedAudienceId);
      const estAudience = selectedAud?.totalContacts || 2500;
      
      const newCamp: MarketingCampaignRecord = {
        id: `CAMP-${modalChannelType.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: campaignTitle,
        targetProduct,
        targetAudience: selectedAud?.name || 'Audiencia General',
        channelType: modalChannelType,
        channels: [
          modalChannelType === 'WHATSAPP' ? 'WHATSAPP_BROADCAST' :
          modalChannelType === 'META' ? 'META_INSTAGRAM' :
          modalChannelType === 'GOOGLE' ? 'GOOGLE_ADS' : 'EMAIL_MARKETING'
        ],
        status: 'ACTIVE',
        sentDate: new Date().toISOString().split('T')[0],
        impressions: estAudience,
        clicks: Math.floor(estAudience * 0.12),
        conversions: Math.max(1, Math.floor(estAudience * 0.024)),
        revenueGenerated: Math.floor(estAudience * 0.024 * 380000),
        budgetCOP,
        roas: Math.floor((estAudience * 0.024 * 380000) / (budgetCOP || 1) * 10) / 10,
        content: {
          copy: messageCopy,
          targetProduct
        }
      };

      onDispatchCampaign(newCamp);
      setIsPublishing(false);
      setIsModalOpen(false);
    }, 1500);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE CANALES */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Radio size={16} />
            <span>Gestor de Campañas Específicas por Canal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Lanzamiento y Monitoreo de Canales Publicitarios
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Crea, despacha y mide campañas segmentadas en WhatsApp Cloud API, Instagram Ads, Facebook Ads Manager, Google Search y Email Masivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenCreate('WHATSAPP')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <MessageCircle size={15} />
            <span>+ WhatsApp Broadcast</span>
          </button>
          <button
            onClick={() => handleOpenCreate('META')}
            className="bg-pink-600 hover:bg-pink-500 text-white font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-all"
          >
            <Instagram size={15} />
            <span>+ Meta Ads</span>
          </button>
          <button
            onClick={() => handleOpenCreate('GOOGLE')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
          >
            <Search size={15} />
            <span>+ Google Ads</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE CANAL ACTIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* WHATSAPP */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle size={22} />
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
              Conectado
            </span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">WhatsApp Cloud API</h3>
            <span className="text-xs text-slate-400 font-semibold">+57 310 456 7890</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Conversión:</span>
              <span className="font-black text-emerald-600">14.8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contactos:</span>
              <span className="font-bold text-slate-800">6.4K Activos</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreate('WHATSAPP')}
            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
          >
            <span>Crear Difusión</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* INSTAGRAM & FACEBOOK */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Instagram size={22} />
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
              Conectado
            </span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Meta Ads (IG + FB)</h3>
            <span className="text-xs text-slate-400 font-semibold">@fusiongraficacol</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">ROAS Promedio:</span>
              <span className="font-black text-teal-600">5.8x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alcance Mensual:</span>
              <span className="font-bold text-slate-800">112K Vistas</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreate('META')}
            className="w-full bg-pink-50 hover:bg-pink-100 text-pink-800 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
          >
            <span>Lanzar Anuncio</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* GOOGLE ADS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Search size={22} />
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
              Conectado
            </span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Google Ads Search</h3>
            <span className="text-xs text-slate-400 font-semibold">CID: 482-938-1920</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">CTR Medio:</span>
              <span className="font-black text-blue-600">5.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CPC Promedio:</span>
              <span className="font-bold text-slate-800">$ 420 COP</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreate('GOOGLE')}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
          >
            <span>Crear Campaña</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* EMAIL RESEND */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Mail size={22} />
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
              Conectado
            </span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Resend Email API</h3>
            <span className="text-xs text-slate-400 font-semibold">ventas@fusiongrafica...</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Apertura (Open):</span>
              <span className="font-black text-teal-600">44.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Suscriptores:</span>
              <span className="font-bold text-slate-800">14.8K B2B</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreate('EMAIL')}
            className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
          >
            <span>Redactar Correo</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

      </div>

      {/* FILTROS POR CANAL */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', name: 'Todos los Canales', count: campaigns.length },
            { id: 'WHATSAPP', name: 'WhatsApp Broadcast', count: campaigns.filter(c => c.channelType === 'WHATSAPP' || c.channels.includes('WHATSAPP_BROADCAST')).length },
            { id: 'META', name: 'Meta Ads (IG & FB)', count: campaigns.filter(c => c.channelType === 'META' || c.channels.includes('META_INSTAGRAM')).length },
            { id: 'GOOGLE', name: 'Google Ads', count: campaigns.filter(c => c.channelType === 'GOOGLE' || c.channels.includes('GOOGLE_ADS')).length },
            { id: 'EMAIL', name: 'Email Marketing', count: campaigns.filter(c => c.channelType === 'EMAIL' || c.channels.includes('EMAIL_MARKETING')).length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedChannelCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedChannelCategory === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.name}</span>
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/40 text-inherit font-extrabold">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* LISTADO DE CAMPAÑAS POR CANAL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Campaña / Producto</th>
                <th className="py-3.5 px-4">Canal</th>
                <th className="py-3.5 px-4">Audiencia Destino</th>
                <th className="py-3.5 px-4">Impresiones / Clics</th>
                <th className="py-3.5 px-4">Presupuesto / ROAS</th>
                <th className="py-3.5 px-4">Ventas Generadas</th>
                <th className="py-3.5 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCampaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{camp.title}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{camp.targetProduct}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                      camp.channelType === 'WHATSAPP' || camp.channels.includes('WHATSAPP_BROADCAST')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      camp.channelType === 'META' || camp.channels.includes('META_INSTAGRAM')
                        ? 'bg-pink-50 text-pink-800 border border-pink-200' :
                      camp.channelType === 'GOOGLE' || camp.channels.includes('GOOGLE_ADS')
                        ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}>
                      {camp.channelType === 'WHATSAPP' ? <MessageCircle size={11} /> :
                       camp.channelType === 'META' ? <Instagram size={11} /> :
                       camp.channelType === 'GOOGLE' ? <Search size={11} /> : <Mail size={11} />}
                      <span>{camp.channelType || 'OMNICHANNEL'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{camp.targetAudience}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-slate-900">{camp.impressions.toLocaleString()} imp.</span>
                      <span className="block text-[10px] text-teal-600 font-semibold">
                        {camp.clicks.toLocaleString()} clics ({camp.conversions} compras)
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-slate-900">{formatCOP(camp.budgetCOP || 150000)}</span>
                      <span className="block text-[10px] text-emerald-600 font-bold">
                        ROAS: {camp.roas || 5.4}x
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
                      <CheckCircle2 size={11} /> Activa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR CAMPAÑA POR CANAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <Radio size={12} /> Despachador Directo
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Nueva Campaña: {modalChannelType}
                </h3>
              </div>
              <button
                onClick={() => !isPublishing && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nombre de la Campaña:</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Producto Litográfico Promocionado:</label>
                <input
                  type="text"
                  value={targetProduct}
                  onChange={(e) => setTargetProduct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Audiencia Segmentada:</label>
                <select
                  value={selectedAudienceId}
                  onChange={(e) => setSelectedAudienceId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {audiences.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.totalContacts.toLocaleString()} contactos)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Presupuesto Asignado (COP):</label>
                <input
                  type="number"
                  value={budgetCOP}
                  onChange={(e) => setBudgetCOP(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Copy / Mensaje Publicitario:</label>
                <textarea
                  value={messageCopy}
                  onChange={(e) => setMessageCopy(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePublishNewCampaign}
                  disabled={isPublishing || !campaignTitle.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sincronizando con {modalChannelType}...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Publicar & Despachar</span>
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
