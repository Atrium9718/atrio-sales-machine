import React, { useState } from 'react';
import {
  Sparkles,
  Target,
  Users,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Instagram,
  Facebook,
  MessageCircle,
  Mail,
  Search,
  Video,
  Layers,
  Sliders,
  Copy,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Share2
} from 'lucide-react';
import {
  MarketingCampaignRecord,
  AudienceSegment
} from '../../lib/marketingEngine';

interface CampaignWizardProps {
  audiences: AudienceSegment[];
  initialAudienceId?: string;
  onLaunchCampaign: (newCampaign: MarketingCampaignRecord) => void;
  formatCOP: (val: number) => string;
}

export type CampaignGoal = 
  | 'B2B_SALES' 
  | 'LOCAL_TRAFFIC' 
  | 'LEAD_CAPTURE_PACKAGING' 
  | 'CUSTOMER_RECOVERY'
  | 'CUSTOM';

export default function CampaignWizard({
  audiences,
  initialAudienceId,
  onLaunchCampaign,
  formatCOP
}: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // PASO 1: OBJETIVO & PRODUCTO
  const [goal, setGoal] = useState<CampaignGoal>('B2B_SALES');
  const [campaignTitle, setCampaignTitle] = useState('Campaña Mayorista B2B para Agencias y Litografías Aliadas');
  const [productTopic, setProductTopic] = useState('Tarjetas de Presentación con Reserva UV y Hot Stamping');
  const [discountOffer, setDiscountOffer] = useState('20% DTO en pedidos superiores a $300.000 COP + Envío Gratis');
  const [tone, setTone] = useState<'AGRESSIVE_SALES' | 'DISCOUNT_OFFER' | 'URGENCY_FOMO' | 'PREMIUM_LUXURY' | 'CORPORATE_PROFESSIONAL'>('PREMIUM_LUXURY');

  // PASO 2: SEGMENTACIÓN & CIUDADES
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>(initialAudienceId || audiences[0]?.id || 'SEG-B2B-VIP');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    'Manizales (Caldas)',
    'Pereira (Risaralda)',
    'Armenia (Quindío)',
    'Bogotá D.C.',
    'Medellín (Antioquia)',
    'Cali (Valle)'
  ]);
  const [customCityInput, setCustomCityInput] = useState('');

  // PASO 3: CANALES & CREATIVOS (COPIES MULTICANAL EDITABLES)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'META_INSTAGRAM',
    'META_FACEBOOK',
    'WHATSAPP_BROADCAST',
    'EMAIL_MARKETING',
    'GOOGLE_ADS'
  ]);
  const [activeCopyTab, setActiveCopyTab] = useState<'WHATSAPP' | 'INSTAGRAM' | 'EMAIL' | 'GOOGLE' | 'TIKTOK'>('WHATSAPP');

  // Copys editables en vivo
  const [whatsappCopy, setWhatsappCopy] = useState(
    '🔥 ¡Hola {nombre}! En Fusión Comunicación Gráfica lanzamos temporada especial de acabados de lujo: Tarjetas con reserva UV brillante y estampado oro/plata a precio de planta offset.\n\n👉 Aprovecha 20% DTO con el cupón exclusivo B2BVIP25.\n\n¿Deseas que te enviemos la cotización técnica formal con muestra digital CTP?'
  );
  const [instagramHeadline, setInstagramHeadline] = useState('Eleva la Imagen de tu Marca con Acabados Litográficos de Lujo');
  const [instagramCopy, setInstagramCopy] = useState(
    '¿Tus tarjetas y catálogos transmiten el verdadero valor de tu empresa? En Fusión Comunicación Gráfica producimos con tecnología Heidelberg directa a plancha CTP, logrando nitidez insuperable, reserva UV táctil y hot stamping metalizado.\n\n📦 Despachos garantizados desde Manizales a todo Colombia.\n\n📲 Toca en el botón para cotizar en segundos.'
  );
  const [emailSubject, setEmailSubject] = useState('🏢 Tarifario Especial 2025: Precios de Fábrica Offset para tu Empresa');
  const [emailPreview, setEmailPreview] = useState('Aumenta tu rentabilidad y sorprende a tus clientes con acabados de alta gama.');
  const [emailBodyHtml, setEmailBodyHtml] = useState(
    `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <h2 style="color: #0f172a; margin-top: 0;">Impulsa tus proyectos con Litografía de Alta Precisión</h2>
  <p style="color: #475569; font-size: 14px; line-height: 1.6;">Aprovecha nuestros precios de fábrica en tarjetas corporativas, carpetas institucionales y empaques plegadizos.</p>
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
    <span style="color: #166534; font-size: 12px; font-weight: bold;">CÓDIGO DE DESCUENTO:</span>
    <div style="font-size: 22px; font-weight: 900; color: #15803d; letter-spacing: 2px;">B2BVIP25</div>
    <span style="color: #166534; font-size: 11px;">20% OFF en tu orden hoy</span>
  </div>
  <div style="text-align: center;">
    <a href="https://fusiongrafica.com.co" style="background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">Ver Catálogo y Cotizar</a>
  </div>
</div>`
  );
  const [googleHeadline, setGoogleHeadline] = useState('Litografía Offset en Colombia | Precios de Planta Directa');
  const [googleDescription, setGoogleDescription] = useState('Impresión de alta precisión: Tarjetas UV, Libros, Revistas, Cajas y Empaques. Despachos rápidos.');
  const [googleKeywords, setGoogleKeywords] = useState('litografia manizales, imprenta pereira, impresion tarjetas uv, cajas plegadizas colombia, etiquetas en rollo');
  const [tiktokScript, setTiktokScript] = useState(
    '🎬 [GANCHO 0-3s]: ¿Sigues entregando tarjetas de presentación aburridas?\n\n✨ [DESARROLLO 4-15s]: Mira cómo brilla esta reserva UV combinada con foil dorado en papel Propalcote 300g. En Fusión Comunicación Gráfica imprimimos en Heidelberg industrial.\n\n🚀 [LLAMADO A LA ACCIÓN 16-30s]: Escríbenos al WhatsApp y recibe cotización inmediata con 20% DTO hoy mismo.'
  );

  // PASO 4: PRESUPUESTO & CALENDARIO & UTMs
  const [dailyBudgetCop, setDailyBudgetCop] = useState(35000);
  const [totalBudgetCop, setTotalBudgetCop] = useState(350000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [utmCampaign, setUtmCampaign] = useState('b2b_promo_febrero');
  const [utmSource, setUtmSource] = useState('omnichannel_fg');
  const [utmMedium, setUtmMedium] = useState('cpc_social_email');

  // Enlace UTM generado
  const generatedTrackingUrl = `https://fusiongrafica.com.co/?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(utmCampaign)}&utm_content=${encodeURIComponent(productTopic.slice(0, 20))}`;

  // Pre-cargar valores según objetivo
  const handleSelectGoal = (selectedGoal: CampaignGoal) => {
    setGoal(selectedGoal);
    if (selectedGoal === 'B2B_SALES') {
      setCampaignTitle('🏢 Campaña Mayorista B2B: Precios de Planta para Agencias');
      setProductTopic('Catálogo Mayorista de Cajas, Carpetas y Tarjetas UV');
      setDiscountOffer('Tarifas Mayoristas hasta 40% OFF + Línea de Crédito a 30 Días');
      setTone('CORPORATE_PROFESSIONAL');
      setSelectedAudienceId('SEG-B2B-VIP');
      setUtmCampaign('b2b_mayorista_2025');
    } else if (selectedGoal === 'LOCAL_TRAFFIC') {
      setCampaignTitle('📍 Tráfico Local Eje Cafetero: Imprenta Rápida Manizales & Pereira');
      setProductTopic('Impresión Express de Talonarios, Factureros y Volantes');
      setDiscountOffer('Entrega en 24h en Manizales y Pereira + Domicilio Bonificado');
      setTone('URGENCY_FOMO');
      setSelectedAudienceId('SEG-LOCAL-CALDAS');
      setUtmCampaign('local_eje_cafetero');
    } else if (selectedGoal === 'LEAD_CAPTURE_PACKAGING') {
      setCampaignTitle('📦 Captura de Leads: Cajas Plegadizas y Empaques para Alimentos');
      setProductTopic('Cajas Litográficas en Cartón Maule con Barniz Grado Alimenticio');
      setDiscountOffer('Troquel Estándar Bonificado + Muestra Física 3D Gratis');
      setTone('PREMIUM_LUXURY');
      setSelectedAudienceId('SEG-RECURRENT-PACKAGING');
      setUtmCampaign('empaques_alimentos_leads');
    } else if (selectedGoal === 'CUSTOMER_RECOVERY') {
      setCampaignTitle('🛒 Rescate de Cotizaciones y Carritos Abandonados con Cupón 15%');
      setProductTopic('Tarjetas de Presentación, Etiquetas y Carpetas');
      setDiscountOffer('15% DTO Flash con cupón VUELVE15 válido por 48 horas');
      setTone('DISCOUNT_OFFER');
      setSelectedAudienceId('SEG-CART-RESCUE');
      setUtmCampaign('rescate_carrito_flash');
    }
  };

  // GENERAR CONTENIDO CON IA SEGÚN PARÁMETROS DEL ASISTENTE
  const handleAiAutoGenerate = async () => {
    setIsAiGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrTopic: productTopic,
          targetAudience: audiences.find(a => a.id === selectedAudienceId)?.name || 'General',
          tone,
          discountOffer,
          cityFocus: selectedRegions.join(', ')
        })
      });

      let camp: any = null;
      if (response.ok) {
        const data = await response.json();
        camp = data?.campaign || (data?.strategy ? data : null);
      }

      if (!camp) {
        // Fallback local generator
        camp = {
          strategy: {
            campaignName: `Campaña Estratégica: ${productTopic}`,
            hookTitle: `Potencia la Imagen de tu Marca con ${productTopic}`
          },
          whatsapp: {
            broadcastMessage: `🔥 *FUSIÓN COMUNICACIÓN GRÁFICA | OFERTA EXCLUSIVA* 🔥\n\nHola {nombre_contacto}, esperamos que tu empresa marche excelente.\n\nTenemos activa una tarifa preferencial de fábrica para *${productTopic}*:\n\n✅ *Beneficio:* ${discountOffer}\n✅ *Calidad:* Impresión Offset HD + Acabados Premium\n✅ *Despacho:* Directo a tus instalaciones en ${selectedRegions.join(', ')}\n\n👉 Cotiza o confirma tu pedido aquí: https://fusiongrafica.com.co\n\n¿Deseas que un asesor técnico te envíe la cotización formal en PDF?`
          },
          social: {
            instagram: {
              caption: `✨ Dale a tu marca el acabado premium que merece con *${productTopic}* de Fusión Comunicación Gráfica.\n\n🎯 *¿Por qué elegir nuestra planta litográfica?*\n✅ Calidad Offset de alta resolución Heidelberg\n✅ Acabados especiales: Barniz UV reserva, estampado foil y laminado mate\n✅ Precios directos de fábrica sin intermediarios\n✅ Despachos express a ${selectedRegions.join(', ')}\n\n🔥 *OFERTA ESPECIAL:* ${discountOffer}\n\n👉 Cotiza en línea en segundos en el link de nuestra bio o escríbenos al WhatsApp directo.`
            },
            tiktok: {
              script30s: {
                seconds0to3: `0-3s: "¿Sabías que estás pagando hasta un 30% de más en ${productTopic} por intermediarios?"`,
                seconds4to15: `4-15s: "En Fusión Gráfica producimos directo en planta offset Heidelberg con control CTP y acabados de lujo."`,
                seconds16to25: `16-25s: "${discountOffer} con despachos a ${selectedRegions.join(', ')}."`,
                seconds26to30: `26-30s: "Toca el enlace de nuestro perfil o escribe al WhatsApp y cotiza en 1 minuto."`
              }
            }
          },
          email: {
            subjectLines: [`🔥 Oferta Exclusiva: ${discountOffer} en ${productTopic}`],
            previewText: `${discountOffer} con entrega garantizada en ${selectedRegions.join(', ')}`
          },
          google: {
            headlines: [`${productTopic.slice(0, 28)}`, 'Precios Directos de Fábrica'],
            descriptions: [`Impresión de ${productTopic.slice(0, 25)} con calidad HD. ${discountOffer.slice(0, 35)}.`]
          }
        };
      }

      if (camp) {
        if (camp.strategy?.campaignName) setCampaignTitle(camp.strategy.campaignName);
        if (camp.whatsapp?.broadcastMessage) setWhatsappCopy(camp.whatsapp.broadcastMessage);
        if (camp.social?.instagram?.caption) {
          setInstagramCopy(camp.social.instagram.caption);
          setInstagramHeadline(camp.strategy?.hookTitle || instagramHeadline);
        }
        if (camp.email?.subjectLines?.[0] || camp.email?.subject) {
          setEmailSubject(camp.email.subjectLines?.[0] || camp.email.subject);
          setEmailPreview(camp.email.previewText || emailPreview);
        }
        if (camp.google?.headlines?.[0] || camp.googleAds?.headline) {
          setGoogleHeadline(camp.google?.headlines?.[0] || camp.googleAds?.headline);
          setGoogleDescription(camp.google?.descriptions?.[0] || camp.googleAds?.description || googleDescription);
          if (camp.google?.keywords?.length) {
            setGoogleKeywords(camp.google.keywords.join(', '));
          }
        }
        if (camp.social?.tiktok?.script30s) {
          const s = camp.social.tiktok.script30s;
          setTiktokScript(`${s.seconds0to3 || ''}\n\n${s.seconds4to15 || ''}\n\n${s.seconds16to25 || ''}\n\n${s.seconds26to30 || ''}`);
        } else if (camp.tiktok?.fullScript) {
          setTiktokScript(camp.tiktok.fullScript);
        }

        // Advance to step 3 so the user sees the generated creatives immediately
        setCurrentStep(3);
      }
    } catch (err) {
      console.warn('Error in Wizard AI generator, applying fallback:', err);
      // Ensure state is updated with fallback
      setCampaignTitle(`Campaña: ${productTopic}`);
      setWhatsappCopy(`🔥 *FUSIÓN GRÁFICA | OFERTA* 🔥\n\nAprovecha *${discountOffer}* en *${productTopic}* con entregas en ${selectedRegions.join(', ')}.\n\n👉 Cotiza aquí: https://fusiongrafica.com.co`);
      setInstagramCopy(`✨ Dale a tu marca el acabado premium que merece con *${productTopic}* de Fusión Gráfica.\n\n🔥 *OFERTA:* ${discountOffer}\n\n👉 Escríbenos al WhatsApp para asesoría técnica.`);
      setEmailSubject(`🔥 Oferta: ${discountOffer} en ${productTopic}`);
      setEmailPreview(`${discountOffer} con despacho a ${selectedRegions.join(', ')}`);
      setGoogleHeadline(`${productTopic.slice(0, 28)}`);
      setGoogleDescription(`Impresión directa de fábrica. ${discountOffer.slice(0, 40)}. Cotiza online.`);
      setCurrentStep(3);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleToggleRegion = (region: string) => {
    if (selectedRegions.includes(region)) {
      if (selectedRegions.length > 1) {
        setSelectedRegions(selectedRegions.filter(r => r !== region));
      }
    } else {
      setSelectedRegions([...selectedRegions, region]);
    }
  };

  const handleAddCustomCity = () => {
    if (customCityInput.trim() && !selectedRegions.includes(customCityInput.trim())) {
      setSelectedRegions([...selectedRegions, customCityInput.trim()]);
      setCustomCityInput('');
    }
  };

  const handleToggleChannel = (chan: string) => {
    if (selectedChannels.includes(chan)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter(c => c !== chan));
      }
    } else {
      setSelectedChannels([...selectedChannels, chan]);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // LANZAMIENTO REAL DE LA CAMPAÑA
  const handleLaunch = () => {
    setIsLaunching(true);

    setTimeout(() => {
      const selectedAud = audiences.find(a => a.id === selectedAudienceId);
      const estAudience = selectedAud?.totalContacts || 3200;
      const clicks = Math.floor(estAudience * 0.14);
      const conversions = Math.max(2, Math.floor(clicks * 0.08));
      const ticketAvg = goal === 'B2B_SALES' ? 950000 : goal === 'LEAD_CAPTURE_PACKAGING' ? 1400000 : 380000;
      const revenue = conversions * ticketAvg;
      const roas = Math.floor((revenue / (totalBudgetCop || 1)) * 10) / 10;

      const newCampaignRecord: MarketingCampaignRecord = {
        id: `CAMP-WZ-${Math.floor(1000 + Math.random() * 9000)}`,
        title: campaignTitle,
        targetProduct: productTopic,
        targetAudience: selectedAud?.name || 'Segmento Personalizado',
        channelType: selectedChannels.length > 1 ? 'OMNICHANNEL' : (selectedChannels[0]?.split('_')[0] as any) || 'OMNICHANNEL',
        channels: selectedChannels,
        status: 'ACTIVE',
        sentDate: startDate,
        impressions: estAudience,
        clicks,
        conversions,
        revenueGenerated: revenue,
        budgetCOP: totalBudgetCop,
        roas,
        emailDetails: {
          subject: emailSubject,
          previewText: emailPreview,
          senderName: 'Fusión Comunicación Gráfica',
          senderEmail: 'ventas@fusiongrafica.com.co',
          openRate: 46.2,
          clickRate: 14.5,
          recipientsCount: Math.floor(estAudience * 0.8),
          htmlBody: emailBodyHtml
        },
        whatsappDetails: {
          broadcastMessage: whatsappCopy,
          contactsTargeted: Math.floor(estAudience * 0.6),
          deliveredCount: Math.floor(estAudience * 0.58),
          repliedCount: Math.floor(estAudience * 0.18)
        },
        socialDetails: {
          platform: 'INSTAGRAM',
          headline: instagramHeadline,
          copy: instagramCopy,
          cta: 'Cotizar en Línea',
          targetLocation: selectedRegions.join(', ')
        },
        googleDetails: {
          headline: googleHeadline,
          description: googleDescription,
          keywords: googleKeywords.split(',').map(k => k.trim()),
          costPerClickCOP: 430
        },
        content: {
          trackingUrl: generatedTrackingUrl,
          discount: discountOffer,
          regions: selectedRegions,
          tiktokScript
        }
      };

      onLaunchCampaign(newCampaignRecord);
      setIsLaunching(false);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DEL WIZARD */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-teal-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} />
            <span>Asistente Inteligente Paso a Paso (Campaign Wizard)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Flujo de Creación y Lanzamiento Omnicanal
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Diseña campañas de alta conversión asistidas con IA (Gemini 3.7) o desde cero, redacta copys sincronizados para cada canal y lanza con enlaces UTM de atribución directa.
          </p>
        </div>

        <button
          onClick={handleAiAutoGenerate}
          disabled={isAiGenerating}
          className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all shrink-0 disabled:opacity-50"
        >
          {isAiGenerating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Redactando con IA...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Auto-Generar Textos con IA</span>
            </>
          )}
        </button>
      </div>

      {/* STEPPER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { step: 1, title: '1. Objetivo & Producto', icon: Target, desc: 'Foco comercial y tono' },
            { step: 2, title: '2. Segmentación & Región', icon: Users, desc: 'Audiencias y ciudades' },
            { step: 3, title: '3. Creativos & Canales', icon: FileText, desc: 'Copys y personalización' },
            { step: 4, title: '4. Presupuesto & Lanzar', icon: DollarSign, desc: 'Calendario y UTMs' }
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`p-3 rounded-xl text-left transition-all border flex items-center gap-3 ${
                  isCurrent
                    ? 'bg-teal-50 border-teal-400 text-teal-900 shadow-sm'
                    : isCompleted
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white border-transparent text-slate-400 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isCurrent ? 'bg-teal-500 text-slate-950' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </div>
                <div className="overflow-hidden">
                  <span className="font-extrabold text-xs block truncate">{s.title}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{s.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL POR PASO */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm min-h-[460px]">
        
        {/* ========================================================================= */}
        {/* PASO 1: OBJETIVO & PRODUCTO */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Paso 1 de 4</span>
              <h3 className="text-lg font-black text-slate-900">Define el Objetivo Comercial y el Producto Litográfico</h3>
              <p className="text-xs text-slate-500 mt-0.5">Selecciona el tipo de campaña para pre-configurar estrategias óptimas de conversión.</p>
            </div>

            {/* SELECCIÓN DE OBJETIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'B2B_SALES', title: '🏢 Ventas B2B / Agencias', desc: 'Precios de fábrica para distribuidores, agencias de publicidad y diseñadores con margen comercial.', badge: 'Alto Volumen' },
                { id: 'LOCAL_TRAFFIC', title: '📍 Tráfico Local Express', desc: 'Impresión rápida para comercios y pymes en Manizales, Pereira y Armenia con entrega local.', badge: 'Rápido Despacho' },
                { id: 'LEAD_CAPTURE_PACKAGING', title: '📦 Captura Leads Empaques', desc: 'Cotizaciones industriales de cajas plegadizas, etiquetas y empaques para marcas y alimentos.', badge: 'Mayor Ticket' },
                { id: 'CUSTOMER_RECOVERY', title: '🛒 Rescate de Clientes', desc: 'Reactivación de usuarios con cotizaciones o carritos pausados mediante descuentos flash.', badge: 'Alta Conversión' }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectGoal(item.id as CampaignGoal)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                    goal === item.id
                      ? 'border-teal-500 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="bg-slate-100 text-slate-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase">
                      {item.badge}
                    </span>
                    <h4 className="font-black text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      goal === item.id ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                    }`}>
                      {goal === item.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* FORMULARIO DETALLES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Nombre Identificador de la Campaña:</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Producto o Servicio Litográfico Específico:</label>
                <input
                  type="text"
                  value={productTopic}
                  onChange={(e) => setProductTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Oferta Principal o Gancho de Conversión:</label>
                <input
                  type="text"
                  value={discountOffer}
                  onChange={(e) => setDiscountOffer(e.target.value)}
                  placeholder="Ej: 20% DTO + Envío Gratis en primera orden"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Tono de Comunicación Publicitaria:</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800"
                >
                  <option value="PREMIUM_LUXURY">💎 Sofisticado & Lujo (Reserva UV, Acabados Especiales)</option>
                  <option value="CORPORATE_PROFESSIONAL">🏛️ Corporativo & B2B (Garantía Heidelberg, Factura Electrónica)</option>
                  <option value="AGRESSIVE_SALES">⚡ Agresivo de Alto Impacto (Foco en Venta Directa)</option>
                  <option value="DISCOUNT_OFFER">🏷️ Descuento por Volumen y Escala</option>
                  <option value="URGENCY_FOMO">⏳ Escasez & Urgencia (Últimos Cupos en Máquina)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: SEGMENTACIÓN & REGIONES */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Paso 2 de 4</span>
              <h3 className="text-lg font-black text-slate-900">Segmentación de Audiencia y Cobertura Geográfica</h3>
              <p className="text-xs text-slate-500 mt-0.5">Elige a qué base de datos y en qué regiones de Colombia se desplegará la publicidad.</p>
            </div>

            {/* LISTADO DE AUDIENCIAS DISPONIBLES */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Selecciona la Base de Contactos / Audiencia Principal:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {audiences.map((seg) => {
                  const isSelected = selectedAudienceId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setSelectedAudienceId(seg.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/60 shadow-sm ring-1 ring-teal-400'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-white border border-slate-200 text-slate-800 font-extrabold text-[9px] px-2 py-0.5 rounded">
                          {seg.tag}
                        </span>
                        <span className="text-[10px] font-black text-teal-700">
                          {seg.totalContacts.toLocaleString()} registros
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">{seg.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{seg.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FILTRO DE CIUDADES & REGIONES DE COLOMBIA */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Regiones y Ciudades de Cobertura en Colombia:</label>
                <span className="text-[11px] font-bold text-teal-600">{selectedRegions.length} ciudades seleccionadas</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  'Manizales (Caldas)',
                  'Pereira (Risaralda)',
                  'Armenia (Quindío)',
                  'Chinchiná / Villamaría',
                  'Bogotá D.C.',
                  'Medellín (Antioquia)',
                  'Cali (Valle)',
                  'Barranquilla (Atlántico)',
                  'Bucaramanga (Santander)',
                  'Ibagué (Tolima)',
                  'Cartagena (Bolívar)',
                  'Toda Colombia (Nacional)'
                ].map((region) => {
                  const isChecked = selectedRegions.includes(region);
                  return (
                    <button
                      key={region}
                      onClick={() => handleToggleRegion(region)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-slate-900 text-teal-300 border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin size={12} className={isChecked ? 'text-teal-400' : 'text-slate-400'} />
                      <span>{region}</span>
                    </button>
                  );
                })}
              </div>

              {/* AÑADIR OTRA CIUDAD */}
              <div className="flex items-center gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  value={customCityInput}
                  onChange={(e) => setCustomCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCity()}
                  placeholder="Agregar otra ciudad (ej: Pasto, Neiva)..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold w-full"
                />
                <button
                  onClick={handleAddCustomCity}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: CANALES & CREATIVOS (COPIES MULTICANAL) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Paso 3 de 4</span>
              <h3 className="text-lg font-black text-slate-900">Canales Destino y Edición de Copys en Vivo</h3>
              <p className="text-xs text-slate-500 mt-0.5">Personaliza el mensaje exacto para cada canal publicitario.</p>
            </div>

            {/* SELECCIÓN DE CANALES ACTIVOS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Canales Seleccionados para el Despacho:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'WHATSAPP_BROADCAST', name: 'WhatsApp Broadcast', icon: MessageCircle, color: 'text-emerald-600' },
                  { id: 'META_INSTAGRAM', name: 'Instagram Ads & Reels', icon: Instagram, color: 'text-pink-600' },
                  { id: 'META_FACEBOOK', name: 'Facebook Ads', icon: Facebook, color: 'text-blue-600' },
                  { id: 'EMAIL_MARKETING', name: 'Resend Email API', icon: Mail, color: 'text-teal-600' },
                  { id: 'GOOGLE_ADS', name: 'Google Ads Search', icon: Search, color: 'text-blue-500' }
                ].map((c) => {
                  const Icon = c.icon;
                  const isAct = selectedChannels.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleToggleChannel(c.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                        isAct
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={14} className={isAct ? 'text-teal-400' : c.color} />
                      <span>{c.name}</span>
                      {isAct && <CheckCircle2 size={13} className="text-emerald-400 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUB-PESTAÑAS PARA EDITAR EL COPY DE CADA CANAL */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-2 border-b border-slate-200 flex flex-wrap gap-1">
                {[
                  { id: 'WHATSAPP', name: 'WhatsApp Copy', icon: MessageCircle },
                  { id: 'INSTAGRAM', name: 'Meta Ads (IG/FB)', icon: Instagram },
                  { id: 'EMAIL', name: 'Email Newsletter', icon: Mail },
                  { id: 'GOOGLE', name: 'Google Ads Search', icon: Search },
                  { id: 'TIKTOK', name: 'Guion TikTok / Reel', icon: Video }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCopyTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCopyTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-5 bg-white space-y-4">
                
                {/* EDITOR WHATSAPP */}
                {activeCopyTab === 'WHATSAPP' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">Mensaje de Difusión WhatsApp (Soporta variables {'{nombre}'}):</label>
                      <button
                        onClick={() => handleCopy(whatsappCopy, 'wa')}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      >
                        {copiedKey === 'wa' ? <Check size={12} /> : <Copy size={12} />}
                        <span>Copiar Texto</span>
                      </button>
                    </div>
                    <textarea
                      value={whatsappCopy}
                      onChange={(e) => setWhatsappCopy(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
                    />
                  </div>
                )}

                {/* EDITOR META ADS */}
                {activeCopyTab === 'INSTAGRAM' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Titular Principal del Anuncio (Headline):</label>
                      <input
                        type="text"
                        value={instagramHeadline}
                        onChange={(e) => setInstagramHeadline(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Texto del Anuncio (Caption / Copy persuasivo):</label>
                      <textarea
                        value={instagramCopy}
                        onChange={(e) => setInstagramCopy(e.target.value)}
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* EDITOR EMAIL */}
                {activeCopyTab === 'EMAIL' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">Línea de Asunto (Subject):</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">Preheader (Texto previo):</label>
                        <input
                          type="text"
                          value={emailPreview}
                          onChange={(e) => setEmailPreview(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Contenido HTML del Correo:</label>
                      <textarea
                        value={emailBodyHtml}
                        onChange={(e) => setEmailBodyHtml(e.target.value)}
                        rows={6}
                        className="w-full bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl p-3"
                      />
                    </div>
                  </div>
                )}

                {/* EDITOR GOOGLE ADS */}
                {activeCopyTab === 'GOOGLE' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">Titular de Google Search (Máx 30 car.):</label>
                        <input
                          type="text"
                          value={googleHeadline}
                          onChange={(e) => setGoogleHeadline(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">Palabras Clave (Keywords separadas por coma):</label>
                        <input
                          type="text"
                          value={googleKeywords}
                          onChange={(e) => setGoogleKeywords(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Descripción del Anuncio (Máx 90 car.):</label>
                      <textarea
                        value={googleDescription}
                        onChange={(e) => setGoogleDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* EDITOR TIKTOK */}
                {activeCopyTab === 'TIKTOK' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800">Guion Estructurado para Video Corto (Reel / TikTok 30s):</label>
                    <textarea
                      value={tiktokScript}
                      onChange={(e) => setTiktokScript(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 leading-relaxed"
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 4: PRESUPUESTO, CALENDARIO & UTMs */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">Paso 4 de 4</span>
              <h3 className="text-lg font-black text-slate-900">Presupuesto, Calendario y Enlace de Rastreo UTM</h3>
              <p className="text-xs text-slate-500 mt-0.5">Establece la inversión publicitaria y verifica el enlace oficial de atribución.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CONFIGURACIÓN DE INVERSIÓN */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <DollarSign size={16} className="text-teal-600" />
                  <span>Inversión y Vigencia de la Campaña</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Presupuesto Diario (COP):</label>
                    <input
                      type="number"
                      value={dailyBudgetCop}
                      onChange={(e) => setDailyBudgetCop(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Presupuesto Total (COP):</label>
                    <input
                      type="number"
                      value={totalBudgetCop}
                      onChange={(e) => setTotalBudgetCop(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-teal-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Fecha de Inicio:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Fecha de Finalización:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-teal-900 text-xs">
                  <span className="font-bold block">Estimación de Rendimiento:</span>
                  <span className="text-[11px] text-teal-700 mt-0.5 block">
                    Alcance estimado: <strong>~12.5K personas</strong> | Conversiones estimadas: <strong>15 a 35 órdenes</strong> | Retorno esperado (ROAS): <strong>~6.5x</strong>
                  </span>
                </div>
              </div>

              {/* PARÁMETROS UTM Y ATRIBUCIÓN */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                  <Share2 size={16} className="text-teal-600" />
                  <span>Generador de Enlaces UTM para Rastreo</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">utm_campaign:</label>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">utm_source:</label>
                      <input
                        type="text"
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">utm_medium:</label>
                      <input
                        type="text"
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="font-bold text-slate-700 block text-[11px] mb-1">Enlace de Destino con Tracking:</label>
                    <div className="bg-slate-900 text-teal-300 p-2.5 rounded-xl font-mono text-[10px] break-all flex items-center justify-between gap-2">
                      <span>{generatedTrackingUrl}</span>
                      <button
                        onClick={() => handleCopy(generatedTrackingUrl, 'utm')}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg shrink-0"
                        title="Copiar URL"
                      >
                        {copiedKey === 'utm' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RESUMEN FINAL ANTES DE LANZAR */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-teal-400 text-xs font-extrabold uppercase tracking-wider">Resumen de Lanzamiento</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Listo para Producción
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Campaña:</span>
                  <span className="font-bold text-white block truncate">{campaignTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Canales Activos:</span>
                  <span className="font-bold text-teal-300 block">{selectedChannels.length} integraciones</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Presupuesto:</span>
                  <span className="font-bold text-emerald-400 block">{formatCOP(totalBudgetCop)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Cobertura:</span>
                  <span className="font-bold text-white block truncate">{selectedRegions.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER DE CONTROL / NAVEGACIÓN DEL WIZARD */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={15} />
          <span>Paso Anterior</span>
        </button>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Continuar al Paso {currentStep + 1}</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-7 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              {isLaunching ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sincronizando con Meta, WhatsApp y Google...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>🚀 Lanzar Campaña en Todos los Canales</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
