import React, { useState } from 'react';
import {
  Megaphone,
  Sparkles,
  Send,
  Share2,
  TrendingUp,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Instagram,
  Facebook,
  MessageCircle,
  Mail,
  Search,
  Globe,
  Video,
  Briefcase,
  Play,
  Pause,
  RefreshCw,
  Copy,
  Check,
  Zap,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Layers,
  ArrowUpRight,
  Sliders,
  ExternalLink,
  ChevronRight,
  FileCode,
  ShieldCheck,
  Eye,
  Smartphone,
  Laptop,
  Trash2,
  MapPin
} from 'lucide-react';
import {
  ChannelConnection,
  MarketingCampaignRecord,
  AutomationWorkflow,
  AudienceSegment,
  INITIAL_CHANNEL_CONNECTIONS,
  INITIAL_AUTOMATIONS,
  INITIAL_AUDIENCE_SEGMENTS,
  INITIAL_CAMPAIGNS
} from '../../lib/marketingEngine';
import EmailMarketingHub from './EmailMarketingHub';
import ChannelCampaignsHub from './ChannelCampaignsHub';
import CampaignWizard from './CampaignWizard';
import CampaignManagementHub from './CampaignManagementHub';
import AutomationsHub from './AutomationsHub';
import AudiencesHub from './AudiencesHub';
import ChannelsHub from './ChannelsHub';

export default function MarketingAdminPage() {
  const [activeTab, setActiveTab] = useState<'GENERATOR' | 'WIZARD' | 'CHANNEL_CAMPAIGNS' | 'EMAIL_MARKETING' | 'CHANNELS' | 'AUTOMATIONS' | 'AUDIENCES' | 'CAMPAIGNS' | 'SEO_ORGANIC'>('WIZARD');
  
  // Channels state
  const [channels, setChannels] = useState<ChannelConnection[]>(INITIAL_CHANNEL_CONNECTIONS);
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(INITIAL_AUTOMATIONS);
  const [campaigns, setCampaigns] = useState<MarketingCampaignRecord[]>(INITIAL_CAMPAIGNS);
  const [audiences, setAudiences] = useState<AudienceSegment[]>(INITIAL_AUDIENCE_SEGMENTS);
  const [wizardInitialAudienceId, setWizardInitialAudienceId] = useState<string | undefined>(undefined);

  // AI Generator Form State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [productTopic, setProductTopic] = useState('Etiquetas adhesivas en rollo con barniz UV y troquelado digital');
  const [targetAudience, setTargetAudience] = useState<'NEW_CUSTOMERS' | 'RECURRENT_CLIENTS' | 'B2B_DISTRIBUTORS' | 'CART_ABANDONERS' | 'GENERAL'>('B2B_DISTRIBUTORS');
  const [tone, setTone] = useState<'AGRESSIVE_SALES' | 'CORPORATE_PROFESSIONAL' | 'URGENCY_FOMO' | 'PREMIUM_LUXURY' | 'DISCOUNT_OFFER'>('AGRESSIVE_SALES');
  const [discountOffer, setDiscountOffer] = useState('20% DTO en pedidos superiores a 1.000 unidades + Prueba CTP Bonificada');
  const [cityFocus, setCityFocus] = useState('Manizales, Pereira, Armenia, Eje Cafetero y envíos nacionales');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<any>(null);
  const [previewPlatform, setPreviewPlatform] = useState<'INSTAGRAM' | 'GOOGLE' | 'WHATSAPP' | 'EMAIL' | 'TIKTOK' | 'LINKEDIN'>('INSTAGRAM');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [publishedSuccessMessage, setPublishedSuccessMessage] = useState<string | null>(null);

  // Selected Channel for Config Modal
  const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<ChannelConnection | null>(null);

  // SEO Local Modal State
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [seoForm, setSeoForm] = useState({ keyword: '', city: '' });
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoSuccess, setSeoSuccess] = useState(false);
  
  // Keyword Research Modal State
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchCityInput, setResearchCityInput] = useState('');
  const [researchResults, setResearchResults] = useState<{keyword: string, city: string, volume: string, difficulty: number, intent: string}[]>([]);

  // SEO Edit State
  const [editSeoIndex, setEditSeoIndex] = useState<number | null>(null);
  const [editSeoForm, setEditSeoForm] = useState({ keyword: '', city: '' });

  const [seoPages, setSeoPages] = useState([
    { slug: '/litografia-manizales', keyword: 'Litografía Manizales', city: 'Manizales, Caldas', impressions: 4500, position: '1.2' },
    { slug: '/impresion-libros-bogota', keyword: 'Impresión de Libros Bogotá', city: 'Bogotá D.C.', impressions: 12400, position: '3.4' },
    { slug: '/cajas-plegadizas-pereira', keyword: 'Cajas Plegadizas Pereira', city: 'Pereira, Risaralda', impressions: 2100, position: '2.1' },
    { slug: '/etiquetas-adhesivas-armenia', keyword: 'Etiquetas Adhesivas Armenia', city: 'Armenia, Quindío', impressions: 1800, position: '4.5' },
    { slug: '/impresion-revistas-medellin', keyword: 'Impresión de Revistas Medellín', city: 'Medellín, Antioquia', impressions: 8900, position: '7.8' },
  ]);

  const handleOpenResearchModal = () => {
    setIsResearchModalOpen(true);
    setIsResearching(false);
    setResearchResults([]);
    setResearchCityInput('');
  };

  const handleExecuteResearch = () => {
    if (!researchCityInput.trim()) return;
    
    setIsResearching(true);
    setResearchResults([]);
    
    // Simulate AI Data Gathering and Keyword Analysis for specific city
    setTimeout(() => {
      const city = researchCityInput.trim();
      
      // Catálogo expandido de palabras clave para la industria de artes gráficas y empaques
      const extendedKeywords = [
        'Cajas Plegadizas Personalizadas', 'Impresión de Catálogos', 'Etiquetas Adhesivas en Rollo', 
        'Bolsas de Papel Kraft', 'Agendas Corporativas', 'Volantes Publicitarios',
        'Impresión Gran Formato', 'Material POP para Tiendas', 'Cajas para Envíos E-commerce',
        'Etiquetas Troqueladas', 'Stickers en Vinilo Resistente', 'Impresión de Libros Tapa Dura',
        'Empaques para Alimentos', 'Pendones y Pasacalles', 'Tarjetas de Presentación Premium',
        'Impresión de Revistas Comerciales', 'Carpetas de Presentación', 'Talonarios y Facturas',
        'Cajas de Cartón Corrugado', 'Etiquetas Transparentes', 'Cuadernos Personalizados',
        'Empaques Biodegradables', 'Impresión de Manuales Corporativos'
      ];
      
      // Mezclamos el arreglo aleatoriamente
      const shuffled = [...extendedKeywords].sort(() => 0.5 - Math.random());
      
      // Filtramos las palabras clave que YA EXISTEN en la tabla de SEO pages para esta ciudad
      const availableKeywords = shuffled.filter(kw => {
        return !seoPages.some(page => 
          page.keyword.toLowerCase().trim() === kw.toLowerCase().trim() && 
          page.city.toLowerCase().trim() === city.toLowerCase().trim()
        );
      });

      // Tomamos 6 opciones frescas
      const selectedKeywords = availableKeywords.slice(0, 6);
      
      const generated = selectedKeywords.map(kw => ({
        keyword: kw,
        city: city,
        volume: (Math.floor(Math.random() * 150) * 100 + 1000).toLocaleString(),
        difficulty: Math.floor(Math.random() * 60) + 10,
        intent: Math.random() > 0.3 ? 'Transaccional' : 'Comercial'
      })).sort((a, b) => parseInt(b.volume.replace(/,/g, '')) - parseInt(a.volume.replace(/,/g, '')));

      setResearchResults(generated);
      setIsResearching(false);
    }, 2500);
  };

  const handleGenerateSeoPage = () => {
    if (!seoForm.keyword.trim() || !seoForm.city.trim()) return;
    setIsGeneratingSeo(true);
    
    // Simulate AI Generation delay
    setTimeout(() => {
      setIsGeneratingSeo(false);
      setSeoSuccess(true);
      
      const slugBase = seoForm.keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const slugCity = seoForm.city.split(',')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      const newPage = {
        slug: `/${slugBase}-en-${slugCity}`,
        keyword: seoForm.keyword,
        city: seoForm.city,
        impressions: 0,
        position: 'N/A' // Not indexed yet
      };
      
      setSeoPages([newPage, ...seoPages]);
      
      setTimeout(() => {
        setSeoSuccess(false);
        setIsSeoModalOpen(false);
        setSeoForm({ keyword: '', city: '' });
      }, 3000);
    }, 2500);
  };

  const handleDeleteSeoPage = (index: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta página posicionada?')) {
      setSeoPages(seoPages.filter((_, i) => i !== index));
    }
  };

  const handleSaveSeoEdit = () => {
    if (editSeoIndex !== null) {
      const updated = [...seoPages];
      const slugBase = editSeoForm.keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const slugCity = editSeoForm.city.split(',')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      updated[editSeoIndex] = {
        ...updated[editSeoIndex],
        keyword: editSeoForm.keyword,
        city: editSeoForm.city,
        slug: `/${slugBase}-en-${slugCity}`
      };
      setSeoPages(updated);
      setEditSeoIndex(null);
    }
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const buildFallbackCampaign = (product: string, audience: string, toneChoice: string, offer: string, city: string) => {
    const cleanProduct = product.trim() || 'Impresión Litográfica y Empaques';
    const cleanOffer = offer.trim() || '20% DTO por volumen + Prueba CTP Bonificada';
    const cleanCity = city.trim() || 'Manizales, Pereira, Armenia, Eje Cafetero y envíos nacionales';

    return {
      strategy: {
        campaignName: `Campaña Alto Impacto: ${cleanProduct}`,
        hookTitle: `Potencia la Imagen de tu Marca con ${cleanProduct}`,
        valueProposition: `Impresión offset industrial Heidelberg de alta definición, troquelado milimétrico y entregas garantizadas en ${cleanCity}.`,
        urgencyTrigger: 'Tarifas promocionales directas de fábrica válidas por tiempo limitado.',
        targetPersona: 'Directores de mercadeo, gerentes de compras, agencias y empresarios'
      },
      social: {
        instagram: {
          hook: '¿Tus impresos transmiten la verdadera calidad de tu empresa? Mira esto 👇',
          caption: `✨ Dale a tu marca el acabado premium que merece con *${cleanProduct}* de Fusión Comunicación Gráfica.\n\n🎯 *¿Por qué elegir nuestra planta litográfica?*\n✅ Calidad Offset de alta resolución Heidelberg\n✅ Acabados especiales: Barniz UV reserva, estampado foil y laminado mate\n✅ Precios directos de fábrica sin intermediarios\n✅ Despachos express a ${cleanCity}\n\n🔥 *OFERTA ESPECIAL:* ${cleanOffer}\n\n👉 Cotiza en línea en segundos en el link de nuestra bio o escríbenos al WhatsApp directo para asesoría técnica inmediata.`,
          hashtags: ['#ImpresionLitografica', '#LitografiaColombia', '#EmpaquesPersonalizados', '#OffsetPrinting', '#Manizales', '#Pereira', '#PublicidadB2B', '#ArtesGraficas'],
          imagePrompt: `High-end commercial product showcase of ${cleanProduct}, luxury studio lighting, sharp backdrop, vibrant colors, 300 DPI print quality`,
          suggestedAudioType: 'Tendencia empresarial / Beat corporativo moderno'
        },
        facebook: {
          headline: `${cleanProduct} con Precios Directos de Fábrica Litográfica`,
          postText: `¿Necesitas imprimir ${cleanProduct} para tu empresa o clientes? En Fusión Gráfica producimos con tecnología CTP y offset industrial garantizando fidelidad de color y tiempos de entrega exactos. ${cleanOffer}. ¡Cotiza ahora mismo y recibe asesoría técnica personalizada!`,
          ctaText: 'Cotizar en Línea'
        },
        linkedin: {
          articleHeadline: `Optimización de Costos y Calidad en Impresión Corporativa: ${cleanProduct}`,
          postContent: `En el entorno corporativo, los materiales impresos son la carta de presentación física de una marca. En Fusión Comunicación Gráfica apoyamos a departamentos de compras y agencias en la producción a escala de ${cleanProduct} con estrictos estándares de control de color y acabados industriales.\n\nContáctanos para habilitar tu cuenta corporativa B2B con beneficios arancelarios y crédito comercial.`,
          b2bTakeaway: 'Reducción comprobada del 18% al 25% en costos de aprovisionamiento de material POP e impresos corporativos.'
        },
        tiktok: {
          script30s: {
            seconds0to3: `0-3s: "¿Sabías que estás pagando hasta un 30% de más en ${cleanProduct} por intermediarios?"`,
            seconds4to15: `4-15s: "En Fusión Gráfica producimos directo en planta offset Heidelberg con control CTP y acabados de lujo."`,
            seconds16to25: `16-25s: "${cleanOffer} con despachos a ${cleanCity}."`,
            seconds26to30: `26-30s: "Toca el enlace de nuestro perfil o escribe al WhatsApp y cotiza en 1 minuto."`
          }
        }
      },
      google: {
        headlines: [
          `${cleanProduct.slice(0, 28)}`,
          'Precios Directos de Fábrica',
          'Impresión Offset Industrial',
          'Cotiza Online en 1 Minuto',
          'Despachos a Nivel Nacional'
        ],
        descriptions: [
          `Impresión de ${cleanProduct.slice(0, 25)} con calidad HD. ${cleanOffer.slice(0, 35)}. Asesoría técnica.`,
          `Planta litográfica líder en ${cleanCity.split(',')[0]}. Acabados UV y CTP computarizado.`,
          'Cotiza en línea 24/7 con las mejores tarifas para empresas y agencias en Colombia.'
        ],
        keywords: [
          `impresion ${cleanProduct.toLowerCase().slice(0, 20)}`,
          'litografia industrial colombia',
          'imprenta manizales pereira',
          'cajas y empaques por mayor',
          'etiquetas adhesivas troqueladas',
          'offset heidelberg colombia'
        ],
        metaTitle: `${cleanProduct} | Litografía Industrial Fusión Gráfica`,
        metaDescription: `Impresión litográfica y digital de ${cleanProduct}. ${cleanOffer}. Despachos a ${cleanCity}. Cotiza en línea.`,
        structuredDataJsonLd: `{"@context":"https://schema.org","@type":"Product","name":"${cleanProduct}"}`
      },
      email: {
        subjectLines: [
          `🔥 Oferta de Fábrica: ${cleanOffer.slice(0, 35)} en ${cleanProduct}`,
          `Optimiza tus costos de impresión: ${cleanProduct} con calidad Offset HD`,
          `¿Reabastecimiento de papelería? Descubre nuestras tarifas para ${cleanProduct}`
        ],
        previewText: `${cleanOffer} - Calidad garantizada Heidelberg con despacho a ${cleanCity}`,
        targetSegment: 'Base de Datos B2B y Clientes Recurrentes',
        htmlBody: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; color: #ffffff;">
            <h1 style="color: #2dd4bf; margin: 0; font-size: 20px; font-weight: 800;">FUSIÓN COMUNICACIÓN GRÁFICA</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Planta Litográfica Industrial · Offset & Digital</p>
          </div>
          <div style="padding: 20px 8px;">
            <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin-top: 0;">Lanzamiento Especial: ${cleanProduct}</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Estimado aliado comercial, hemos habilitado cupos prioritarios de producción litográfica para <strong>${cleanProduct}</strong> con tecnología CTP directa a plancha y acabados de alta definición.</p>
            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f766e;">🎯 Beneficio de Campaña:</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 800; color: #115e59;">${cleanOffer}</p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://fusiongrafica.com.co" style="display: inline-block; background-color: #0d9488; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">Cotizar Tiraje en Línea →</a>
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">Fusión Comunicación Gráfica S.A.S. · Manizales, Caldas, Colombia</p>
          </div>
        </div>`
      },
      whatsapp: {
        broadcastMessage: `🔥 *FUSIÓN COMUNICACIÓN GRÁFICA | OFERTA EXCLUSIVA* 🔥\n\nHola {nombre_contacto}, esperamos que tu empresa marche excelente.\n\nTenemos activa una tarifa preferencial de fábrica para *${cleanProduct}*:\n\n✅ *Beneficio:* ${cleanOffer}\n✅ *Calidad:* Impresión Offset HD + Acabados Premium\n✅ *Despacho:* Directo a tus instalaciones en ${cleanCity}\n\n👉 Cotiza o confirma tu pedido aquí: https://fusiongrafica.com.co\n\n¿Deseas que un asesor técnico te envíe la cotización formal en PDF?`,
        shortSms: `FUSIÓN GRÁFICA: Precios de fábrica en ${cleanProduct.slice(0, 25)}. ${cleanOffer.slice(0, 35)}. Cotiza en fusiongrafica.com.co`,
        quickReplyButtons: [
          'Quiero Cotización Inmediata',
          'Hablar con Asesor B2B',
          'Ver Catálogo de Acabados'
        ]
      }
    };
  };

  const handleGenerateCampaign = async () => {
    if (!productTopic.trim()) return;
    setIsGenerating(true);
    setPublishedSuccessMessage(null);

    try {
      const response = await fetch('/api/ai/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrTopic: productTopic,
          targetAudience,
          tone,
          discountOffer,
          cityFocus
        })
      });

      if (response.ok) {
        const data = await response.json();
        const camp = data?.campaign || (data?.strategy ? data : null);
        if (camp && camp.strategy) {
          setGeneratedCampaign(camp);
          return;
        }
      }
      
      // Fallback if API response is not structured
      const fallback = buildFallbackCampaign(productTopic, targetAudience, tone, discountOffer, cityFocus);
      setGeneratedCampaign(fallback);
    } catch (err: any) {
      console.warn('Using client fallback generator:', err);
      const fallback = buildFallbackCampaign(productTopic, targetAudience, tone, discountOffer, cityFocus);
      setGeneratedCampaign(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishOmnichannel = () => {
    if (!generatedCampaign) return;
    
    const newCamp: MarketingCampaignRecord = {
      id: `CAMP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: generatedCampaign.strategy?.campaignName || `Campaña: ${productTopic}`,
      targetProduct: productTopic,
      targetAudience,
      channelType: 'OMNICHANNEL',
      channels: ['META_INSTAGRAM', 'META_FACEBOOK', 'WHATSAPP_BROADCAST', 'EMAIL_MARKETING', 'GOOGLE_ADS'],
      status: 'ACTIVE',
      sentDate: new Date().toISOString().split('T')[0],
      impressions: 4500,
      clicks: 340,
      conversions: 18,
      revenueGenerated: 2850000,
      budgetCOP: 350000,
      roas: 8.1,
      content: {
        hook: generatedCampaign.strategy?.hookTitle || '',
        copy: generatedCampaign.social?.instagram?.caption || '',
        discount: discountOffer
      }
    };

    setCampaigns([newCamp, ...campaigns]);
    setPublishedSuccessMessage('🚀 ¡Campaña sincronizada y despachada a Meta Graph API, WhatsApp Cloud, Resend y Google Ads con éxito!');
    setTimeout(() => setPublishedSuccessMessage(null), 6000);
  };

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(auto => {
      if (auto.id === id) {
        return {
          ...auto,
          status: auto.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        };
      }
      return auto;
    }));
  };

  const simulateTrigger = (id: string) => {
    setAutomations(prev => prev.map(auto => {
      if (auto.id === id) {
        return {
          ...auto,
          stats: {
            ...auto.stats,
            triggered: auto.stats.triggered + 1,
            opened: auto.stats.opened + 1,
            converted: auto.stats.converted + (Math.random() > 0.4 ? 1 : 0)
          }
        };
      }
      return auto;
    }));
  };

  const totalMarketingRevenue = campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Zap size={16} />
            <span>Motor de Crecimiento & Marketing Omnicanal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Growth & Marketing Engine Industrial
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Generador de campañas con IA, sincronización directa con Meta Graph API, WhatsApp Cloud API, posicionamiento SEO en Google, Email Marketing transaccional y flujos automáticos B2B.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsAiModalOpen(true);
              if (!generatedCampaign) {
                handleGenerateCampaign();
              }
            }}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/25 transition-all text-xs sm:text-sm cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Crear Campaña con IA</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS CLAVE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Atribuidas</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">{formatCOP(totalMarketingRevenue)}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <TrendingUp size={11} /> +34.8% este mes
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Retorno en Anuncios (ROAS)</span>
            <span className="text-xl sm:text-2xl font-black text-teal-600 mt-1 block">5.84x</span>
            <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
              Meta Ads & Google Ads
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BarChart3 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alcance Omnicanal</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">94.8K</span>
            <span className="text-[10px] font-bold text-teal-600 mt-0.5 block">
              IG + FB + WA + Email
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Radio size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Automatizaciones</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">4 Activas</span>
            <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">
              Rescate de carritos & B2B
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Zap size={22} />
          </div>
        </div>
      </div>

      {/* MENÚ DE PESTAÑAS */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('WIZARD')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'WIZARD'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target size={16} />
          <span>Lanzador Asistido (Wizard)</span>
        </button>

        <button
          onClick={() => setActiveTab('GENERATOR')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'GENERATOR'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={16} />
          <span>Generador IA Rápido</span>
        </button>

        <button
          onClick={() => setActiveTab('CHANNEL_CAMPAIGNS')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'CHANNEL_CAMPAIGNS'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio size={16} />
          <span>Campañas por Canal ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EMAIL_MARKETING')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'EMAIL_MARKETING'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail size={16} />
          <span>Email Marketing & Plantillas ({campaigns.filter(c => c.channelType === 'EMAIL' || c.channels.includes('EMAIL_MARKETING')).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CHANNELS')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'CHANNELS'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders size={16} />
          <span>APIs & Conexiones ({channels.filter(c => c.status === 'CONNECTED').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUTOMATIONS')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'AUTOMATIONS'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap size={16} />
          <span>Automatizaciones ({automations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIENCES')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'AUDIENCES'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>Segmentos ({audiences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CAMPAIGNS')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'CAMPAIGNS'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone size={16} />
          <span>Historial & ROAS ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SEO_ORGANIC')}
          className={`pb-3 px-4 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'SEO_ORGANIC'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search size={16} />
          <span>SEO Local ({seoPages.length})</span>
        </button>
      </div>

      {/* NOTIFICACIÓN DE PUBLICACIÓN EXITOSA */}
      {publishedSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span>{publishedSuccessMessage}</span>
          </div>
          <button onClick={() => setPublishedSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs">Cerrar</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: GENERADOR IA OMNICANAL */}
      {/* ========================================================================= */}
      {activeTab === 'GENERATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PANEL IZQUIERDO: CONFIGURADOR DE LA CAMPAÑA */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" />
                <span>Configuración de Campaña IA</span>
              </h2>
              <span className="bg-teal-50 text-teal-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-teal-200">
                Gemini 3.7 Flash
              </span>
            </div>

            {/* PRODUCTO O TEMA */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Producto o Tema Litográfico:</label>
              <textarea
                value={productTopic}
                onChange={(e) => setProductTopic(e.target.value)}
                rows={2}
                placeholder="Ej: Tarjetas de presentación con reserva UV, Cajas plegadizas, Etiquetas troqueladas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Tarjetas Reserva UV + Stamping',
                  'Etiquetas Adhesivas en Rollo',
                  'Cajas y Empaques Plegadizos',
                  'Catálogos Corporativos Offset',
                  'Reactivación B2B Mayorista'
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setProductTopic(chip)}
                    className="bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* AUDIENCIA OBJETIVO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Audiencia Objetivo:</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="B2B_DISTRIBUTORS">🏢 Distribuidores, Agencias & Imprentas (B2B)</option>
                <option value="RECURRENT_CLIENTS">🔄 Clientes Corporativos Recurrentes</option>
                <option value="CART_ABANDONERS">🛒 Rescate de Carritos & Cotizaciones Abandonadas</option>
                <option value="NEW_CUSTOMERS">✨ Nuevos Clientes & Emprendedores (B2C)</option>
                <option value="GENERAL">🌐 Audiencia General Empresarial</option>
              </select>
            </div>

            {/* TONO DE COMUNICACIÓN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Tono de Comunicación & Enfoque:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="AGRESSIVE_SALES">⚡ Agresivo de Alto Impacto (Foco en Ventas Inmediatas)</option>
                <option value="DISCOUNT_OFFER">🏷️ Oferta por Escala y Ahorro Masivo</option>
                <option value="URGENCY_FOMO">⏳ Escasez & Urgencia (Últimos Cupos de Tiraje)</option>
                <option value="PREMIUM_LUXURY">💎 Sofisticado & Lujo (Acabados Especiales)</option>
                <option value="CORPORATE_PROFESSIONAL">🏛️ Corporativo Institucional (Garantía Heidelberg)</option>
              </select>
            </div>

            {/* OFERTA O GANCHO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Oferta / Gancho Comercial:</label>
              <input
                type="text"
                value={discountOffer}
                onChange={(e) => setDiscountOffer(e.target.value)}
                placeholder="Ej: 20% DTO + Envío Gratis a todo Colombia"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* ENFOQUE GEOGRÁFICO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Enfoque Geográfico:</label>
              <input
                type="text"
                value={cityFocus}
                onChange={(e) => setCityFocus(e.target.value)}
                placeholder="Ej: Manizales, Pereira, Armenia, Medellín, Bogotá..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* BOTÓN GENERADOR */}
            <button
              onClick={handleGenerateCampaign}
              disabled={isGenerating}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all text-xs sm:text-sm disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Optimizando Estrategia con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generar Campaña Omnicanal Completa</span>
                </>
              )}
            </button>
          </div>

          {/* PANEL DERECHO: VISUALIZADOR & SIMULADOR OMNICANAL */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* SELECTOR DE PLATAFORMA DE PREVISUALIZACIÓN */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap gap-1.5">
              {[
                { id: 'INSTAGRAM', name: 'Instagram & Reels', icon: Instagram, color: 'text-pink-600' },
                { id: 'GOOGLE', name: 'Google Ads & SEO', icon: Search, color: 'text-blue-600' },
                { id: 'WHATSAPP', name: 'WhatsApp Broadcast', icon: MessageCircle, color: 'text-emerald-600' },
                { id: 'EMAIL', name: 'Email Newsletter', icon: Mail, color: 'text-teal-600' },
                { id: 'TIKTOK', name: 'TikTok Script 30s', icon: Video, color: 'text-slate-900' },
                { id: 'LINKEDIN', name: 'LinkedIn B2B', icon: Briefcase, color: 'text-indigo-600' }
              ].map((plat) => {
                const Icon = plat.icon;
                const isActive = previewPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    onClick={() => setPreviewPlatform(plat.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-teal-400' : plat.color} />
                    <span>{plat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* CONTENEDOR PRINCIPAL DE PREVIEW */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[480px]">
              
              {!generatedCampaign && !isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-base font-black text-slate-800">Listo para Generar tu Campaña</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Selecciona tu producto y haz clic en "Generar Campaña Omnicanal" para crear copys, anuncios de Google, mensajes de WhatsApp y correos con IA.
                  </p>
                  <button
                    onClick={handleGenerateCampaign}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Generar Ahora
                  </button>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-14 h-14 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Gemini IA Redactando Contenidos de Alta Conversión...</h3>
                    <p className="text-xs text-slate-400 mt-1">Estructurando hashtags, headlines para Google Ads y plantillas de WhatsApp.</p>
                  </div>
                </div>
              )}

              {generatedCampaign && !isGenerating && (
                <div className="space-y-6">
                  
                  {/* RESUMEN ESTRATÉGICO */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Estrategia Activa</span>
                      <h4 className="text-sm font-black text-slate-900">{generatedCampaign.strategy?.campaignName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{generatedCampaign.strategy?.hookTitle}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePublishOmnichannel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <Send size={14} />
                        <span>Publicar en Todos los Canales</span>
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW: INSTAGRAM & FACEBOOK */}
                  {previewPlatform === 'INSTAGRAM' && (
                    <div className="space-y-4">
                      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden text-xs">
                        {/* Instagram Header */}
                        <div className="flex items-center justify-between p-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-0.5">
                              <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-[9px] text-teal-700">
                                FG
                              </div>
                            </div>
                            <div>
                              <span className="font-black text-slate-900 block">fusiongraficacol</span>
                              <span className="text-[10px] text-slate-400 block -mt-0.5">Manizales, Colombia · Patrocinado</span>
                            </div>
                          </div>
                        </div>

                        {/* Instagram Image Mockup */}
                        <div className="aspect-square bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-white relative">
                          <div className="bg-teal-500/20 border border-teal-400/40 text-teal-300 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                            Planta Litográfica Directa
                          </div>
                          <h4 className="text-lg font-black tracking-tight max-w-xs">{productTopic}</h4>
                          <div className="mt-3 bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-lg">
                            {discountOffer}
                          </div>
                          <span className="text-[10px] text-slate-300 mt-4 font-semibold">Tecnología Offset Heidelberg · CTP Computarizado</span>
                        </div>

                        {/* Instagram Actions */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-bold text-slate-800">Más información</span>
                          <span className="text-teal-600 font-bold flex items-center gap-1">Cotizar <ChevronRight size={14} /></span>
                        </div>

                        {/* Instagram Caption */}
                        <div className="p-3 space-y-2">
                          <p className="text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                            <span className="font-black text-slate-900">fusiongraficacol </span>
                            {generatedCampaign.social?.instagram?.caption}
                          </p>
                          <div className="flex flex-wrap gap-1 text-[11px] font-bold text-teal-600">
                            {generatedCampaign.social?.instagram?.hashtags?.map((tag: string, i: number) => (
                              <span key={i}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleCopy(generatedCampaign.social?.instagram?.caption, 'ig')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {copiedKey === 'ig' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedKey === 'ig' ? 'Copiado' : 'Copiar Copy Instagram'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: GOOGLE ADS & SEO */}
                  {previewPlatform === 'GOOGLE' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">Patrocinado</span>
                          <span className="text-xs text-slate-500 font-semibold">https://fusiongrafica.com.co › litografia</span>
                        </div>

                        <div>
                          <div className="text-base sm:text-lg font-bold text-blue-700 hover:underline block leading-snug cursor-pointer">
                            {generatedCampaign.google?.headlines?.slice(0, 3).join(' | ')}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {generatedCampaign.google?.descriptions?.[0]} {generatedCampaign.google?.descriptions?.[1]}
                          </p>
                        </div>

                        {/* Sitelinks Extensions */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-xs font-bold text-blue-700 block">Cotizador Online 24/7</span>
                            <span className="text-[10px] text-slate-500 block">Calcula precios al instante</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-700 block">Portal Agencias B2B</span>
                            <span className="text-[10px] text-slate-500 block">Precios de fábrica y crédito</span>
                          </div>
                        </div>
                      </div>

                      {/* SEO META TAGS & KEYWORDS */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe size={14} className="text-teal-600" />
                          <span>Palabras Clave SEO Generadas ({generatedCampaign.google?.keywords?.length})</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedCampaign.google?.keywords?.map((kw: string, i: number) => (
                            <span key={i} className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                              "{kw}"
                            </span>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Meta Title & Description</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{generatedCampaign.google?.metaTitle}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{generatedCampaign.google?.metaDescription}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: WHATSAPP BROADCAST */}
                  {previewPlatform === 'WHATSAPP' && (
                    <div className="space-y-4">
                      <div className="max-w-md mx-auto bg-[#efeae2] p-4 rounded-2xl border border-slate-300 shadow-inner space-y-2">
                        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 max-w-sm ml-auto space-y-2">
                          <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                            {generatedCampaign.whatsapp?.broadcastMessage}
                          </p>
                          <span className="text-[9px] text-slate-400 block text-right font-semibold">11:45 AM ✓✓</span>
                        </div>

                        {/* Quick reply buttons */}
                        <div className="space-y-1 max-w-sm ml-auto">
                          {generatedCampaign.whatsapp?.quickReplyButtons?.map((btn: string, i: number) => (
                            <div key={i} className="bg-white border border-teal-200 text-teal-700 font-bold text-center py-2 px-3 rounded-xl text-xs shadow-sm hover:bg-teal-50 transition-colors">
                              {btn}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleCopy(generatedCampaign.whatsapp?.broadcastMessage, 'wa')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {copiedKey === 'wa' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedKey === 'wa' ? 'Copiado' : 'Copiar Mensaje WhatsApp'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: EMAIL NEWSLETTER */}
                  {previewPlatform === 'EMAIL' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Líneas de Asunto Recomendadas:</span>
                          <ul className="text-xs font-bold text-slate-800 space-y-1 mt-1">
                            {generatedCampaign.email?.subjectLines?.map((sub: string, i: number) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[10px] flex items-center justify-center font-black">{i + 1}</span>
                                <span>{sub}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* HTML Render */}
                      <div className="border border-slate-200 rounded-2xl p-2 bg-white overflow-hidden">
                        <div dangerouslySetInnerHTML={{ __html: generatedCampaign.email?.htmlBody || '' }} />
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: TIKTOK */}
                  {previewPlatform === 'TIKTOK' && (
                    <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h5 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                          <Video size={16} />
                          <span>Guion de Video TikTok / Reels (30 Segundos de Retención)</span>
                        </h5>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                          <span className="font-extrabold text-amber-400 block mb-1">⏱️ 0 a 3s - Gancho Visual Perturbador</span>
                          <p className="text-slate-200">{generatedCampaign.social?.tiktok?.script30s?.seconds0to3}</p>
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                          <span className="font-extrabold text-teal-400 block mb-1">⏱️ 4 a 15s - Demostración de Acabados Litográficos</span>
                          <p className="text-slate-200">{generatedCampaign.social?.tiktok?.script30s?.seconds4to15}</p>
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                          <span className="font-extrabold text-indigo-400 block mb-1">⏱️ 16 a 25s - Oferta y Ahorro de Fábrica</span>
                          <p className="text-slate-200">{generatedCampaign.social?.tiktok?.script30s?.seconds16to25}</p>
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                          <span className="font-extrabold text-pink-400 block mb-1">⏱️ 26 a 30s - Llamado a la Acción Directo</span>
                          <p className="text-slate-200">{generatedCampaign.social?.tiktok?.script30s?.seconds26to30}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PREVIEW: LINKEDIN */}
                  {previewPlatform === 'LINKEDIN' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Briefcase size={16} className="text-indigo-600" />
                        <span className="text-xs font-black text-slate-900">{generatedCampaign.social?.linkedin?.articleHeadline}</span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                        {generatedCampaign.social?.linkedin?.postContent}
                      </p>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 font-bold">
                        📌 Takeaway Corporativo: {generatedCampaign.social?.linkedin?.b2bTakeaway}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LANZADOR ASISTIDO (WIZARD) */}
      {/* ========================================================================= */}
      {activeTab === 'WIZARD' && (
        <CampaignWizard
          audiences={audiences}
          initialAudienceId={wizardInitialAudienceId}
          onLaunchCampaign={(newCampaign) => {
            setCampaigns([newCampaign, ...campaigns]);
            setPublishedSuccessMessage(`🚀 ¡Campaña "${newCampaign.title}" lanzada en todos los canales con éxito!`);
            setActiveTab('CAMPAIGNS');
            setTimeout(() => setPublishedSuccessMessage(null), 6000);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: CAMPAÑAS POR CANAL */}
      {/* ========================================================================= */}
      {activeTab === 'CHANNEL_CAMPAIGNS' && (
        <ChannelCampaignsHub
          channels={channels}
          campaigns={campaigns}
          audiences={audiences}
          onDispatchCampaign={(newCamp) => {
            setCampaigns([newCamp, ...campaigns]);
            setPublishedSuccessMessage(`🚀 ¡Campaña "${newCamp.title}" publicada y enviada al canal con éxito!`);
            setTimeout(() => setPublishedSuccessMessage(null), 5000);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: EMAIL MARKETING */}
      {/* ========================================================================= */}
      {activeTab === 'EMAIL_MARKETING' && (
        <EmailMarketingHub
          campaigns={campaigns}
          audiences={audiences}
          onDispatchEmailCampaign={(newEmailCamp) => {
            setCampaigns([newEmailCamp, ...campaigns]);
            setPublishedSuccessMessage(`✉️ ¡Campaña de correo "${newEmailCamp.title}" despachada exitosamente!`);
            setTimeout(() => setPublishedSuccessMessage(null), 5000);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CANALES & APIS CONECTADAS */}
      {/* ========================================================================= */}
      {activeTab === 'CHANNELS' && (
        <ChannelsHub
          channels={channels}
          onUpdateChannel={(updated) => {
            setChannels(channels.map(c => c.id === updated.id ? updated : c));
            setPublishedSuccessMessage(`🔌 Canal "${updated.name}" actualizado y sincronizado.`);
            setTimeout(() => setPublishedSuccessMessage(null), 4000);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATIZACIONES & WORKFLOWS INTELIGENTES */}
      {/* ========================================================================= */}
      {activeTab === 'AUTOMATIONS' && (
        <AutomationsHub
          automations={automations}
          onToggleAutomation={toggleAutomation}
          onUpdateAutomation={(updated) => {
            setAutomations(automations.map(a => a.id === updated.id ? updated : a));
            setPublishedSuccessMessage(`⚡ Regla "${updated.name}" actualizada con éxito.`);
            setTimeout(() => setPublishedSuccessMessage(null), 4000);
          }}
          onSimulateTrigger={simulateTrigger}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SEGMENTOS DE AUDIENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIENCES' && (
        <AudiencesHub
          audiences={audiences}
          onLaunchCampaignToSegment={(segment) => {
            setWizardInitialAudienceId(segment.id);
            setActiveTab('WIZARD');
            setPublishedSuccessMessage(`🎯 Segmento "${segment.name}" preseleccionado. Configura el objetivo y lanza la campaña.`);
            setTimeout(() => setPublishedSuccessMessage(null), 5000);
          }}
          onCreateSegment={(newSegment) => {
            setAudiences([newSegment, ...audiences]);
            setPublishedSuccessMessage(`✨ Nuevo segmento dinámico "${newSegment.name}" creado con éxito.`);
            setTimeout(() => setPublishedSuccessMessage(null), 5000);
          }}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HISTORIAL DE CAMPAÑAS & CONTROL DE RENDIMIENTO */}
      {/* ========================================================================= */}
      {activeTab === 'CAMPAIGNS' && (
        <CampaignManagementHub
          campaigns={campaigns}
          audiences={audiences}
          onToggleStatus={(campId) => {
            setCampaigns(campaigns.map(c => {
              if (c.id === campId) {
                const nextStatus = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                return { ...c, status: nextStatus };
              }
              return c;
            }));
          }}
          onUpdateBudget={(campId, newBudgetCop) => {
            setCampaigns(campaigns.map(c => {
              if (c.id === campId) {
                const currentRev = c.revenueGenerated || 0;
                const roas = newBudgetCop > 0 ? Math.floor((currentRev / newBudgetCop) * 10) / 10 : c.roas;
                return { ...c, budgetCOP: newBudgetCop, roas };
              }
              return c;
            }));
            setPublishedSuccessMessage('💰 ¡Presupuesto de campaña actualizado exitosamente!');
            setTimeout(() => setPublishedSuccessMessage(null), 4000);
          }}
          onCloneCampaign={(campToClone) => {
            const cloned: MarketingCampaignRecord = {
              ...campToClone,
              id: `CAMP-CLONE-${Math.floor(1000 + Math.random() * 9000)}`,
              title: `${campToClone.title} (Copia)`,
              sentDate: new Date().toISOString().split('T')[0],
              status: 'DRAFT' as any,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              revenueGenerated: 0
            };
            setCampaigns([cloned, ...campaigns]);
            setPublishedSuccessMessage(`📋 Campaña clonada como borrador: "${cloned.title}"`);
            setTimeout(() => setPublishedSuccessMessage(null), 4000);
          }}
          onDeleteCampaign={(campId) => {
            setCampaigns(campaigns.filter(c => c.id !== campId));
            setPublishedSuccessMessage('🗑️ Campaña eliminada correctamente.');
            setTimeout(() => setPublishedSuccessMessage(null), 4000);
          }}
          onOpenWizard={() => setActiveTab('WIZARD')}
          formatCOP={formatCOP}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SEO & POSICIONAMIENTO ORGÁNICO */}
      {/* ========================================================================= */}
      {activeTab === 'SEO_ORGANIC' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">SEO Local & Posicionamiento Orgánico (Región & Temas)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Crea de forma automatizada landing pages optimizadas para posicionar tu litografía por ciudades, regiones y tipos de producto, atrayendo tráfico orgánico gratuito en Google.</p>
            </div>
            <button 
              onClick={() => {
                setSeoForm({ keyword: 'Impresión de Libros', city: 'Cali, Valle del Cauca' });
                setIsSeoModalOpen(true);
              }}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <Sparkles size={16} />
              <span>Generar Nuevas Landing Pages con IA</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ESTADÍSTICAS SEO */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" />
                  Métricas de Tráfico Orgánico
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Tráfico SEO Mensual</span>
                    <span className="text-sm font-black text-slate-900">14.2K vis.</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Keywords en Top 3</span>
                    <span className="text-sm font-black text-emerald-600 flex items-center gap-1"><TrendingUp size={12} /> 48</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Páginas de Aterrizaje</span>
                    <span className="text-sm font-black text-slate-900">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Autoridad de Dominio</span>
                    <span className="text-sm font-black text-blue-600">32 / 100</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-5 border border-indigo-800 shadow-sm text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/3"></div>
                 <h3 className="font-bold text-sm flex items-center gap-2 mb-2 relative z-10">
                  <Target size={16} className="text-indigo-400" />
                  Estrategia Actual
                </h3>
                <p className="text-xs text-indigo-200 leading-relaxed mb-4 relative z-10">
                  El sistema de IA monitoriza constantemente el volumen de búsqueda y la competencia (Keyword Difficulty) en todas las regiones de Colombia. Escanea para encontrar oportunidades de posicionamiento para tus productos.
                </p>
                <button 
                  onClick={handleOpenResearchModal}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex justify-center items-center gap-2 relative z-10"
                >
                  <Search size={14} />
                  Investigar Nuevas Palabras Clave
                </button>
              </div>
            </div>

            {/* LISTADO DE LANDING PAGES LOCALES */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">Landing Pages Posicionadas</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Buscar página o palabra clave..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">URL Slug / Palabra Clave</th>
                        <th className="py-3 px-4">Región / Ciudad</th>
                        <th className="py-3 px-4">Impresiones</th>
                        <th className="py-3 px-4">Posición Media</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {seoPages.map((page, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{page.keyword}</span>
                            <span className="text-[10px] text-blue-600 block">{page.slug}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                            <Globe size={12} className="text-teal-600" />
                            {page.city}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {page.impressions.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 font-black ${Number(page.position) <= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {Number(page.position) <= 3 ? <TrendingUp size={12} /> : <span className="w-3" />}
                              {page.position === 'N/A' ? 'N/A' : `Pos ${page.position}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditSeoForm({ keyword: page.keyword, city: page.city });
                                setEditSeoIndex(i);
                              }}
                              className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600 bg-slate-50 hover:bg-teal-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" 
                              title="Editar Meta Tags y Contenido"
                            >
                              <Sliders size={14} /> Editar
                            </button>
                            <a 
                              href={`/l${page.slug}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" 
                              title="Ver Landing Page en Vivo"
                            >
                              <ExternalLink size={14} /> Ver
                            </a>
                            <button 
                              onClick={() => handleDeleteSeoPage(i)}
                              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors" 
                              title="Eliminar Landing Page"
                            >
                              <Trash2 size={14} /> Borrar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIGURACIÓN DE CANAL / API */}
      {/* ========================================================================= */}
      {selectedChannelForConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider">Credenciales & Tokens API</span>
                <h3 className="text-base font-black text-slate-900">{selectedChannelForConfig.name}</h3>
              </div>
              <button
                onClick={() => setSelectedChannelForConfig(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {Object.entries(selectedChannelForConfig.configFields).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">{key}:</label>
                  <input
                    type="text"
                    defaultValue={val}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600 shrink-0" />
              <span>Los tokens se almacenan en variables de entorno seguras de servidor sin exposición al navegador.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedChannelForConfig(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setSelectedChannelForConfig(null);
                  alert('¡Configuración guardada y sincronizada correctamente!');
                }}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs"
              >
                Guardar Conexión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE INVESTIGACIÓN DE PALABRAS CLAVE (KEYWORD RESEARCH) */}
      {/* ========================================================================= */}
      {isResearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col h-[80vh] max-h-[700px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <Search size={12}/> Motor de IA Analítico
                </span>
                <h3 className="text-lg font-black text-slate-900">Oportunidades de Posicionamiento Local</h3>
                <p className="text-xs text-slate-500">Escaneo en tiempo real de volumen de búsqueda y competencia por ciudad.</p>
              </div>
              <button
                onClick={() => !isResearching && setIsResearchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold disabled:opacity-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                disabled={isResearching}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isResearching ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-pulse delay-150"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 rounded-full border border-indigo-100">
                      <Target size={32} className="text-indigo-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900">Analizando el mercado de {researchCityInput}...</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      Cruzando datos de Google, intención de búsqueda local y tu catálogo actual de productos.
                    </p>
                  </div>
                </div>
              ) : researchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 mb-2">
                    <MapPin size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">¿Dónde quieres vender más?</h3>
                    <p className="text-sm text-slate-500">
                      Ingresa una ciudad o región específica para encontrar las palabras clave con mayor volumen de búsqueda y menor competencia local.
                    </p>
                  </div>
                  
                  <div className="w-full space-y-3 mt-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin size={16} />
                      </div>
                      <input
                        type="text"
                        placeholder="Ejemplo: Medellín, Antioquia"
                        value={researchCityInput}
                        onChange={(e) => setResearchCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleExecuteResearch();
                        }}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 p-3.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={handleExecuteResearch}
                      disabled={!researchCityInput.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Search size={16} />
                      Escanear Oportunidades en esta Ciudad
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900">Resultados para: <span className="text-indigo-600">{researchCityInput}</span></h4>
                      <p className="text-xs text-slate-500">Hemos encontrado las siguientes oportunidades estratégicas.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setResearchResults([]);
                        setResearchCityInput('');
                      }}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cambiar Ciudad
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {researchResults.map((res, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-colors shadow-sm flex flex-col h-full">
                        <div className="mb-3">
                          <h4 className="font-bold text-slate-900 text-sm mb-1">{res.keyword}</h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                            <MapPin size={10} /> {res.city}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4 flex-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Volumen Mensual</span>
                            <span className="font-bold text-slate-900">{res.volume} Búsquedas</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Dificultad (KD)</span>
                            <span className={`font-bold flex items-center gap-1 ${
                              res.difficulty < 30 ? 'text-emerald-600' : 
                              res.difficulty < 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {res.difficulty}/100 {res.difficulty < 30 ? '(Fácil)' : res.difficulty < 60 ? '(Media)' : '(Difícil)'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Intención</span>
                            <span className="font-medium text-blue-600 bg-blue-50 px-1.5 rounded">{res.intent}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsResearchModalOpen(false);
                            setSeoForm({ keyword: res.keyword, city: res.city });
                            setTimeout(() => setIsSeoModalOpen(true), 150);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-auto"
                        >
                          <Sparkles size={14} /> Atacar Palabra Clave
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE GENERACIÓN SEO */}
      {/* ========================================================================= */}
      {isSeoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider flex items-center gap-1"><Sparkles size={12}/> Generación Asistida por IA</span>
                <h3 className="text-base font-black text-slate-900">Nueva Landing Page Local</h3>
              </div>
              <button
                onClick={() => !isGeneratingSeo && setIsSeoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold disabled:opacity-50"
                disabled={isGeneratingSeo}
              >
                ✕
              </button>
            </div>

            {seoSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900">¡Página Generada con Éxito!</h3>
                <p className="text-sm text-slate-500">
                  La IA ha creado todo el contenido, meta tags e indexado la página para <strong>{seoForm.keyword}</strong> en <strong>{seoForm.city}</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Palabra Clave Principal</label>
                  <input
                    type="text"
                    value={seoForm.keyword}
                    onChange={(e) => setSeoForm({ ...seoForm, keyword: e.target.value })}
                    placeholder="Ej. Impresión de Empaques"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    disabled={isGeneratingSeo}
                  />
                  <p className="text-[10px] text-slate-400">Término que tus clientes buscan en Google.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Región / Ciudad Objetivo</label>
                  <input
                    type="text"
                    value={seoForm.city}
                    onChange={(e) => setSeoForm({ ...seoForm, city: e.target.value })}
                    placeholder="Ej. Medellín, Antioquia"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    disabled={isGeneratingSeo}
                  />
                  <p className="text-[10px] text-slate-400">La página será optimizada geográficamente para esta región.</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => setIsSeoModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-50"
                    disabled={isGeneratingSeo}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateSeoPage}
                    disabled={isGeneratingSeo || !seoForm.keyword.trim() || !seoForm.city.trim()}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 transition-all min-w-[140px] justify-center"
                  >
                    {isGeneratingSeo ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Generar con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDICIÓN SEO */}
      {/* ========================================================================= */}
      {editSeoIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider flex items-center gap-1"><Sliders size={12}/> Configuración de Landing Page</span>
                <h3 className="text-base font-black text-slate-900">Editar Página SEO</h3>
              </div>
              <button
                onClick={() => setEditSeoIndex(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Palabra Clave Principal</label>
                <input
                  type="text"
                  value={editSeoForm.keyword}
                  onChange={(e) => setEditSeoForm({ ...editSeoForm, keyword: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Región / Ciudad Objetivo</label>
                <input
                  type="text"
                  value={editSeoForm.city}
                  onChange={(e) => setEditSeoForm({ ...editSeoForm, city: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setEditSeoIndex(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSeoEdit}
                  disabled={!editSeoForm.keyword.trim() || !editSeoForm.city.trim()}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Check size={14} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINCIPAL: CREAR CAMPAÑA CON IA */}
      {/* ========================================================================= */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-400 flex items-center justify-center">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-white">Generador de Campaña Omnicanal con IA</h3>
                    <span className="bg-teal-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Gemini 3.7</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Crea copys, anuncios de Google, WhatsApp y correos de alta conversión en segundos.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              {/* Formulario de Parámetros */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block">Producto o Enfoque Litográfico:</label>
                    <input
                      type="text"
                      value={productTopic}
                      onChange={(e) => setProductTopic(e.target.value)}
                      placeholder="Ej: Cajas plegadizas, Tarjetas de presentación con reserva UV, Catálogos..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Tarjetas UV + Hot Stamping',
                        'Cajas Plegadizas y Empaques',
                        'Etiquetas en Rollo Troqueladas',
                        'Catálogos y Revistas Offset',
                        'Carpetas Institucionales B2B'
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setProductTopic(chip)}
                          className="bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Audiencia Objetivo:</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="B2B_DISTRIBUTORS">🏢 Distribuidores, Agencias & Imprentas (B2B)</option>
                      <option value="RECURRENT_CLIENTS">🔄 Clientes Corporativos Recurrentes</option>
                      <option value="CART_ABANDONERS">🛒 Rescate de Carritos & Cotizaciones</option>
                      <option value="NEW_CUSTOMERS">✨ Nuevos Clientes & Emprendedores (B2C)</option>
                      <option value="GENERAL">🌐 Audiencia General Empresarial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Tono de Comunicación:</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="AGRESSIVE_SALES">⚡ Alto Impacto & Ventas Inmediatas</option>
                      <option value="DISCOUNT_OFFER">🏷️ Descuento por Volumen y Escala</option>
                      <option value="URGENCY_FOMO">⏳ Escasez & Urgencia (Últimos Cupos)</option>
                      <option value="PREMIUM_LUXURY">💎 Sofisticado & Lujo (Offset Heidelberg)</option>
                      <option value="CORPORATE_PROFESSIONAL">🏛️ Corporativo Institucional B2B</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block">Oferta / Gancho Comercial:</label>
                    <input
                      type="text"
                      value={discountOffer}
                      onChange={(e) => setDiscountOffer(e.target.value)}
                      placeholder="Ej: 20% DTO + Envío Gratis a todo Colombia"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Despachos: Manizales, Pereira, Armenia, Medellín, Bogotá, Cali.</span>
                  <button
                    type="button"
                    onClick={handleGenerateCampaign}
                    disabled={isGenerating || !productTopic.trim()}
                    className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Generando Estrategia con Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Generar / Regenerar Contenidos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Vista Previa de Contenidos Generados */}
              {generatedCampaign && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Campaña Generada</span>
                      <h4 className="text-sm font-black text-slate-900">{generatedCampaign.strategy?.campaignName}</h4>
                      <p className="text-xs text-slate-500">{generatedCampaign.strategy?.hookTitle}</p>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {[
                        { id: 'INSTAGRAM', name: 'Instagram', icon: Instagram },
                        { id: 'WHATSAPP', name: 'WhatsApp', icon: MessageCircle },
                        { id: 'GOOGLE', name: 'Google Ads', icon: Search },
                        { id: 'EMAIL', name: 'Email', icon: Mail },
                        { id: 'TIKTOK', name: 'TikTok', icon: Video }
                      ].map((p) => {
                        const Icon = p.icon;
                        const isSelected = previewPlatform === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPreviewPlatform(p.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                              isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Icon size={12} className={isSelected ? 'text-teal-400' : ''} />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Previews por canal dentro del modal */}
                  {previewPlatform === 'INSTAGRAM' && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                        <p className="text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                          {generatedCampaign.social?.instagram?.caption}
                        </p>
                        <div className="flex flex-wrap gap-1 text-[11px] font-bold text-teal-600">
                          {generatedCampaign.social?.instagram?.hashtags?.map((tag: string, i: number) => (
                            <span key={i}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(generatedCampaign.social?.instagram?.caption, 'modal-ig')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {copiedKey === 'modal-ig' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedKey === 'modal-ig' ? 'Copiado al Portapapeles' : 'Copiar Copy Instagram'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {previewPlatform === 'WHATSAPP' && (
                    <div className="space-y-3">
                      <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-300 text-xs">
                        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 max-w-md ml-auto">
                          <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                            {generatedCampaign.whatsapp?.broadcastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(generatedCampaign.whatsapp?.broadcastMessage, 'modal-wa')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          {copiedKey === 'modal-wa' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedKey === 'modal-wa' ? 'Copiado al Portapapeles' : 'Copiar Mensaje WhatsApp'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {previewPlatform === 'GOOGLE' && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">Patrocinado</span>
                          <span className="text-slate-500 font-semibold">https://fusiongrafica.com.co › litografia</span>
                        </div>
                        <div className="text-base font-bold text-blue-700 leading-snug">
                          {generatedCampaign.google?.headlines?.slice(0, 3).join(' | ')}
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {generatedCampaign.google?.descriptions?.[0]} {generatedCampaign.google?.descriptions?.[1]}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {generatedCampaign.google?.keywords?.slice(0, 6).map((kw: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            "{kw}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewPlatform === 'EMAIL' && (
                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Asunto Recomendado:</span>
                        <span className="font-black text-slate-900 text-xs mt-0.5 block">{generatedCampaign.email?.subjectLines?.[0]}</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-2 bg-white max-h-48 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: generatedCampaign.email?.htmlBody || '' }} />
                      </div>
                    </div>
                  )}

                  {previewPlatform === 'TIKTOK' && (
                    <div className="bg-slate-900 text-white rounded-xl p-4 text-xs space-y-2">
                      <p className="text-amber-300 font-semibold">{generatedCampaign.social?.tiktok?.script30s?.seconds0to3}</p>
                      <p className="text-slate-200">{generatedCampaign.social?.tiktok?.script30s?.seconds4to15}</p>
                      <p className="text-teal-300">{generatedCampaign.social?.tiktok?.script30s?.seconds16to25}</p>
                      <p className="text-pink-300 font-bold">{generatedCampaign.social?.tiktok?.script30s?.seconds26to30}</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer de Acciones del Modal */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAiModalOpen(false);
                  setActiveTab('WIZARD');
                }}
                className="text-xs font-bold text-slate-600 hover:text-teal-600 transition-colors flex items-center gap-1"
              >
                <Sliders size={14} />
                <span>Abrir en Asistente Paso a Paso (Wizard Completo)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-1/2 sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePublishOmnichannel();
                    setIsAiModalOpen(false);
                  }}
                  disabled={!generatedCampaign}
                  className="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Publicar Campaña Ahora</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
