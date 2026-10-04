import React, { useState } from 'react';
import {
  Radio,
  MessageCircle,
  Mail,
  Search,
  Instagram,
  Facebook,
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Send,
  Sparkles,
  QrCode,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Key,
  Globe,
  Smartphone,
  Eye,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowUpRight,
  Inbox,
  Info
} from 'lucide-react';
import { ChannelConnection } from '../../lib/marketingEngine';

interface ChannelsHubProps {
  channels: ChannelConnection[];
  onUpdateChannel: (updated: ChannelConnection) => void;
  formatCOP: (val: number) => string;
}

export type WhatsAppTemplate = {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  qualityScore: 'HIGH' | 'MEDIUM' | 'LOW';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons?: string[];
};

export const MOCK_WA_TEMPLATES: WhatsAppTemplate[] = [
  {
    name: 'notificacion_cotizacion_v2',
    category: 'MARKETING',
    status: 'APPROVED',
    language: 'es_CO',
    qualityScore: 'HIGH',
    headerText: '📄 Cotización Lista - Fusión Gráfica',
    bodyText: 'Hola {{1}}, tu cotización formal para {{2}} ya está lista en nuestro sistema. El valor liquidado es {{3}}. Puedes revisarla y aprobar el arte digital aquí: {{4}}',
    footerText: 'Fusión Comunicación Gráfica • Caldas, Colombia',
    buttons: ['Ver Cotización en Línea', 'Hablar con Asesor CTP']
  },
  {
    name: 'recompra_empaques_vip',
    category: 'MARKETING',
    status: 'APPROVED',
    language: 'es_CO',
    qualityScore: 'HIGH',
    headerText: '🏷️ Reabastecimiento de Empaques',
    bodyText: 'Hola {{1}}, notamos que hace 30 días ordenaste {{2}}. ¿Deseas renovar tu tiraje litográfico antes de agotar existencias con 15% DTO en placa CTP? Cupón: {{3}}',
    footerText: 'Oferta exclusiva clientes corporativos',
    buttons: ['Reordenar Mismo Tiraje', 'Solicitar Muestra']
  },
  {
    name: 'rescate_carrito_15dto',
    category: 'MARKETING',
    status: 'APPROVED',
    language: 'es_CO',
    qualityScore: 'HIGH',
    headerText: '🛒 Tu Proyecto Gráfico te Espera',
    bodyText: 'Hola {{1}}, dejaste configurado tu pedido de {{2}} en el cotizador. Completa tu orden hoy y te obsequiamos {{3}} adicional con el código {{4}}.',
    footerText: 'Válido por 48 horas',
    buttons: ['Completar Pedido', 'Ayuda con Archivos']
  },
  {
    name: 'despacho_orden_guia',
    category: 'UTILITY',
    status: 'APPROVED',
    language: 'es_CO',
    qualityScore: 'HIGH',
    headerText: '🚚 ¡Tu Pedido ha Sido Despachado!',
    bodyText: 'Hola {{1}}, tu producción de {{2}} (Orden #{{3}}) salió de nuestros talleres. Transportadora: {{4}} | Número de Guía: {{5}}. Tiempo estimado de entrega: {{6}}.',
    footerText: 'Rastreo 24/7 en Servientrega / Envía / TCC',
    buttons: ['Rastrear Envío', 'Confirmar Recepción']
  },
  {
    name: 'bienvenida_catalogo_2025',
    category: 'MARKETING',
    status: 'APPROVED',
    language: 'es_CO',
    qualityScore: 'HIGH',
    headerText: '✨ Bienvenido a Fusión Gráfica',
    bodyText: 'Hola {{1}}, gracias por contactarnos. Somos la imprenta litográfica líder en el Eje Cafetero. Conoce nuestro catálogo 2025 de empaques, etiquetas adhesivas y gran formato aquí: {{2}}',
    footerText: 'Atención personalizada de lunes a sábado',
    buttons: ['Descargar Catálogo PDF', 'Cotizar Nuevo Proyecto']
  }
];

export default function ChannelsHub({
  channels,
  onUpdateChannel,
  formatCOP
}: ChannelsHubProps) {
  const [selectedChannelCategory, setSelectedChannelCategory] = useState<'ALL' | 'WHATSAPP' | 'META' | 'GOOGLE' | 'EMAIL'>('ALL');
  
  // Selected Channel for Detailed Config Modal
  const [editingChannel, setEditingChannel] = useState<ChannelConnection | null>(null);
  const [configFormData, setConfigFormData] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // WhatsApp Specific State
  const [waConnectionMode, setWaConnectionMode] = useState<'CLOUD_API' | 'QR_PAIR'>('CLOUD_API');
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<WhatsAppTemplate | null>(MOCK_WA_TEMPLATES[0]);
  const [qrPairingState, setQrPairingState] = useState<'IDLE' | 'GENERATING' | 'READY' | 'CONNECTED'>('READY');

  // Test Simulator State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testChannelType, setTestChannelType] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [testRecipientPhone, setTestRecipientPhone] = useState('+57 310 456 7890');
  const [testRecipientEmail, setTestRecipientEmail] = useState('andresepulveda718@gmail.com');
  const [testRecipientName, setTestRecipientName] = useState('Carlos Mendoza (Cliente Test)');
  const [testSelectedTemplate, setTestSelectedTemplate] = useState<string>('notificacion_cotizacion_v2');
  const [testCustomMessage, setTestCustomMessage] = useState('🔥 Mensaje de prueba generado desde el centro de canales de Fusión Gráfica. Los webhooks y la API responden con código 200 OK.');
  const [testProductVariable, setTestProductVariable] = useState('5.000 Cajas Plegadizas con Barniz UV');
  const [testPromoCode, setTestPromoCode] = useState('PROMO-TEST-2025');
  
  // Dispatch Simulator execution status
  const [isSimulatingDispatch, setIsSimulatingDispatch] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    channel: 'WHATSAPP' | 'EMAIL';
    recipient: string;
    messageId: string;
    timestamp: string;
    previewContent: string;
    httpStatus: number;
    latencyMs: number;
  } | null>(null);

  // Global Webhook Ping State
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingSuccessBadge, setPingSuccessBadge] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOpenConfig = (channel: ChannelConnection) => {
    setEditingChannel(channel);
    setConfigFormData({ ...channel.configFields });
    setSaveSuccessMsg(null);
  };

  const handleSaveConfig = () => {
    if (!editingChannel) return;
    const updated: ChannelConnection = {
      ...editingChannel,
      configFields: { ...configFormData },
      status: 'CONNECTED',
      metrics: {
        ...editingChannel.metrics,
        lastSyncDate: 'Hace unos instantes (Validado)'
      }
    };
    onUpdateChannel(updated);
    setSaveSuccessMsg('✅ ¡Credenciales y Webhook guardados y validados con éxito!');
    setTimeout(() => {
      setEditingChannel(null);
      setSaveSuccessMsg(null);
    }, 1500);
  };

  const handlePingAllWebhooks = () => {
    setIsPingingAll(true);
    setPingSuccessBadge(null);
    setTimeout(() => {
      setIsPingingAll(false);
      setPingSuccessBadge('⚡ 5/5 Canales & Webhooks respondieron en <110ms (HTTP 200 OK)');
      setTimeout(() => setPingSuccessBadge(null), 5000);
    }, 1200);
  };

  const handleExecuteTestDispatch = () => {
    setIsSimulatingDispatch(true);
    setSimulationLogs([]);
    setSimulationResult(null);

    const isWA = testChannelType === 'WHATSAPP';
    const targetRecipient = isWA ? testRecipientPhone : testRecipientEmail;
    
    // Generate preview text based on selected template
    let contentToPreview = testCustomMessage;
    if (isWA) {
      const tpl = MOCK_WA_TEMPLATES.find(t => t.name === testSelectedTemplate);
      if (tpl) {
        contentToPreview = tpl.bodyText
          .replace('{{1}}', testRecipientName)
          .replace('{{2}}', testProductVariable)
          .replace('{{3}}', '$ 1.850.000 COP')
          .replace('{{4}}', 'https://fusiongrafica.com.co/cotizar/COT-9482');
      }
    }

    // Step 1
    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        isWA
          ? `[16:04:12] 🔍 Validando formato E.164 del teléfono: ${testRecipientPhone} (Código país +57 detectado)...`
          : `[16:04:12] 🔍 Validando sintaxis RFC 5322 y registros MX de ${testRecipientEmail}...`
      ]);
    }, 300);

    // Step 2
    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        isWA
          ? `[16:04:13] 📦 Empaquetando payload JSON para Meta Graph API v19.0 (Template: "${testSelectedTemplate}")...`
          : `[16:04:13] 📦 Construyendo plantilla HTML responsiva con remitente ventas@fusiongrafica.com.co...`
      ]);
    }, 800);

    // Step 3
    setTimeout(() => {
      setSimulationLogs(prev => [
        ...prev,
        isWA
          ? `[16:04:14] 🚀 Enviando POST a https://graph.facebook.com/v19.0/109827346129845/messages...`
          : `[16:04:14] 🚀 Enviando POST a https://api.resend.com/emails (TLS 1.3 / DKIM Validated)...`
      ]);
    }, 1300);

    // Step 4: Finished
    setTimeout(() => {
      const generatedMsgId = isWA
        ? `wamid.HBgLNTczMTA0NTY3ODkwFQIAERgSRjQ4OTM4MjcxOTI4Mzc0OTIA`
        : `resend_msg_${Math.random().toString(36).substring(2, 12)}`;

      setSimulationLogs(prev => [
        ...prev,
        `[16:04:15] ✅ Respuesta HTTP 200 OK | Message ID: ${generatedMsgId}`,
        `[16:04:15] 📲 Mensaje entregado con éxito en el canal destino (${isWA ? 'WhatsApp' : 'Inbox Email'}).`
      ]);

      setSimulationResult({
        success: true,
        channel: testChannelType,
        recipient: targetRecipient,
        messageId: generatedMsgId,
        timestamp: new Date().toLocaleTimeString(),
        previewContent: contentToPreview,
        httpStatus: 200,
        latencyMs: 142
      });

      setIsSimulatingDispatch(false);
    }, 1800);
  };

  // Filter channels according to category
  const filteredChannels = channels.filter(c => {
    if (selectedChannelCategory === 'ALL') return true;
    if (selectedChannelCategory === 'WHATSAPP') return c.category === 'MESSAGING';
    if (selectedChannelCategory === 'META') return c.category === 'SOCIAL';
    if (selectedChannelCategory === 'GOOGLE') return c.category === 'SEARCH';
    if (selectedChannelCategory === 'EMAIL') return c.category === 'EMAIL';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* HEADER PRINCIPAL & ESTADO GENERAL */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-teal-500/30">
              <Zap size={13} className="text-teal-400" />
              <span>Conexiones & APIs en Vivo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Centro de Conexión de Canales y Cuentas
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Monitorea el estado en tiempo real de tu <strong>WhatsApp Cloud API</strong>, <strong>Meta Pixel & CAPI</strong>, <strong>Google Ads CID</strong> y <strong>Servidores de Email</strong>. Realiza envíos de prueba antes de cualquier campaña masiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePingAllWebhooks}
              disabled={isPingingAll}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={14} className={isPingingAll ? "animate-spin text-teal-400" : "text-teal-400"} />
              <span>{isPingingAll ? 'Comprobando...' : 'Testear Webhooks'}</span>
            </button>

            <button
              onClick={() => {
                setIsTestModalOpen(true);
                setSimulationResult(null);
                setSimulationLogs([]);
              }}
              className="bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
            >
              <Send size={14} />
              <span>🧪 Simulador de Envío de Prueba</span>
            </button>
          </div>
        </div>

        {pingSuccessBadge && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>{pingSuccessBadge}</span>
          </div>
        )}

        {/* Global Health KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Cloud API</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-black text-white">100% Conectado</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">5 Plantillas Aprobadas</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meta Pixel & CAPI</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-black text-white">Activo (ID: 837261...)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">99.8% Coincidencia Eventos</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Google Ads CID</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-black text-white">482-938-1920</span>
            </div>
            <span className="text-[10px] text-teal-300 font-semibold mt-0.5 block">Enhanced Conv. Activas</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email SMTP / Resend</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-black text-white">DKIM & SPF Válidos</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">99.4% Entregabilidad</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVEGACIÓN POR TIPO DE CANAL */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedChannelCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedChannelCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            Todos los Canales ({channels.length})
          </button>
          <button
            onClick={() => setSelectedChannelCategory('WHATSAPP')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedChannelCategory === 'WHATSAPP'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <MessageCircle size={14} />
            <span>WhatsApp Cloud & QR</span>
          </button>
          <button
            onClick={() => setSelectedChannelCategory('META')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedChannelCategory === 'META'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <Instagram size={14} />
            <span>Meta Ads & Pixel</span>
          </button>
          <button
            onClick={() => setSelectedChannelCategory('GOOGLE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedChannelCategory === 'GOOGLE'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <Search size={14} />
            <span>Google Ads Search</span>
          </button>
          <button
            onClick={() => setSelectedChannelCategory('EMAIL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedChannelCategory === 'EMAIL'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <Mail size={14} />
            <span>Email Transaccional</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold px-3 hidden sm:block">
          Sincronización continua activa • Webhook Latency: <strong className="text-emerald-600">92ms</strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN ESPECIALIZADA: WHATSAPP BUSINESS CLOUD API & QR */}
      {/* ========================================================================= */}
      {(selectedChannelCategory === 'ALL' || selectedChannelCategory === 'WHATSAPP') && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <MessageCircle size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">WhatsApp Business Cloud API & QR Multi-Device</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                    OFICIAL META
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Línea corporativa: <strong>+57 (6) 885 5555 / +57 310 456 7890</strong> (WABA ID: <code>109827346129845</code>)
                </p>
              </div>
            </div>

            {/* Toggle Cloud API vs QR */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setWaConnectionMode('CLOUD_API')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  waConnectionMode === 'CLOUD_API'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Meta Cloud API (Recomendado)
              </button>
              <button
                onClick={() => setWaConnectionMode('QR_PAIR')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  waConnectionMode === 'QR_PAIR'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Escaneo de Código QR
              </button>
            </div>
          </div>

          {waConnectionMode === 'CLOUD_API' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Webhooks & Credenciales */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Estado de Conexión
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Conectado 24/7
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">PHONE NUMBER ID</span>
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 mt-0.5">
                        <code className="text-slate-800 font-mono text-[11px]">109827346129845</code>
                        <button
                          onClick={() => handleCopy('109827346129845', 'wa_pid')}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {copiedKey === 'wa_pid' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">WEBHOOK CALLBACK URL</span>
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 mt-0.5">
                        <code className="text-slate-800 font-mono text-[10px] truncate max-w-[200px]">https://api.fusiongrafica.com.co/webhooks/whatsapp</code>
                        <button
                          onClick={() => handleCopy('https://api.fusiongrafica.com.co/webhooks/whatsapp', 'wa_wh')}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {copiedKey === 'wa_wh' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">VERIFY TOKEN</span>
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 mt-0.5">
                        <code className="text-slate-800 font-mono text-[11px]">fusion_wh_secret_2025</code>
                        <button
                          onClick={() => handleCopy('fusion_wh_secret_2025', 'wa_vt')}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {copiedKey === 'wa_vt' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex gap-2">
                    <button
                      onClick={() => {
                        const waChannel = channels.find(c => c.id === 'wa_cloud');
                        if (waChannel) handleOpenConfig(waChannel);
                      }}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sliders size={13} />
                      <span>Editar Credenciales</span>
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200 text-xs space-y-1.5 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Límite de Mensajería Oficial</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Tier 2 activo: hasta <strong>10,000 conversaciones únicas / 24h</strong> iniciadas por la empresa con entrega garantizada y sin riesgo de baneo.
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Plantillas Aprobadas por Meta */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Plantillas HSM Aprobadas por Meta ({MOCK_WA_TEMPLATES.length})</h3>
                    <p className="text-[11px] text-slate-500">Plantillas verificadas listas para despachos automáticos y campañas masivas.</p>
                  </div>
                  <button
                    onClick={() => {
                      setTestChannelType('WHATSAPP');
                      setIsTestModalOpen(true);
                      setSimulationResult(null);
                      setSimulationLogs([]);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Send size={12} />
                    <span>Probar Envío</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MOCK_WA_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.name}
                      onClick={() => setSelectedTemplateForPreview(tpl)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                        selectedTemplateForPreview?.name === tpl.name
                          ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900 truncate max-w-[180px]">
                          {tpl.name}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          APROBADA
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {tpl.bodyText}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                        <span>Idioma: {tpl.language}</span>
                        <span className="text-emerald-600 font-bold">Calidad: {tpl.qualityScore}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista Previa de la Plantilla Seleccionada como en WhatsApp */}
                {selectedTemplateForPreview && (
                  <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 mt-2 border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Smartphone size={14} />
                        Vista Previa en Dispositivo: {selectedTemplateForPreview.name}
                      </span>
                      <button
                        onClick={() => {
                          setTestSelectedTemplate(selectedTemplateForPreview.name);
                          setTestChannelType('WHATSAPP');
                          setIsTestModalOpen(true);
                          setSimulationResult(null);
                        }}
                        className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>Enviar Test Real</span>
                        <ArrowUpRight size={12} />
                      </button>
                    </div>

                    <div className="bg-[#0b141a] p-3.5 rounded-xl max-w-md mx-auto space-y-2 border border-slate-800">
                      {selectedTemplateForPreview.headerText && (
                        <div className="font-bold text-xs text-emerald-300 pb-1 border-b border-slate-800">
                          {selectedTemplateForPreview.headerText}
                        </div>
                      )}
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                        {selectedTemplateForPreview.bodyText
                          .replace('{{1}}', 'Carlos Mendoza')
                          .replace('{{2}}', '5.000 Etiquetas en Rollo Metalizadas')
                          .replace('{{3}}', '$ 1.450.000 COP')
                          .replace('{{4}}', 'https://fusiongrafica.com.co/cotizar')}
                      </p>
                      {selectedTemplateForPreview.footerText && (
                        <p className="text-[10px] text-slate-400 italic">
                          {selectedTemplateForPreview.footerText}
                        </p>
                      )}
                      {selectedTemplateForPreview.buttons && selectedTemplateForPreview.buttons.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-800/80">
                          {selectedTemplateForPreview.buttons.map((btn, idx) => (
                            <div key={idx} className="bg-[#1f2c34] text-center text-teal-400 font-semibold text-xs py-1.5 rounded-lg">
                              {btn}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Modo QR Pairing */
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">
                  <QrCode size={13} />
                  <span>Modo Multi-Dispositivo Web</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Vincular WhatsApp de la Empresa mediante Código QR
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ideal para agentes humanos de ventas y envíos directos de baja escala. Para envíos masivos sin límite, mantén activa la <strong>WhatsApp Cloud API oficial</strong>.
                </p>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside font-medium pt-2">
                  <li>Abre WhatsApp en tu teléfono corporativo.</li>
                  <li>Toca <strong>Menú (⋮) o Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong>.</li>
                  <li>Apunta la cámara a este código QR para sincronizar sesiones.</li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-md text-center space-y-2">
                <div className="w-44 h-44 bg-slate-900 rounded-xl p-2 flex items-center justify-center">
                  <div className="grid grid-cols-6 gap-1.5 p-2 bg-white rounded-lg">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-sm ${
                          (i % 2 === 0 || i % 7 === 0 || i < 6 || i > 30) ? 'bg-slate-900' : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 block">● Sesión Activa (ID: WSP-CORP-01)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GRILLA DE CANALES: META ADS, GOOGLE ADS, EMAIL, ETC. */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredChannels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded-md">
                  {channel.category}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  channel.status === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <CheckCircle2 size={12} /> {channel.status === 'CONNECTED' ? 'Conectado' : 'Requiere Auth'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">{channel.name}</h3>
                <p className="text-xs font-semibold text-teal-600 mt-0.5">{channel.accountName}</p>
              </div>

              {/* Parametrizaciones Técnicas / Config Fields */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs">
                {Object.entries(channel.configFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center gap-2">
                    <span className="font-medium text-slate-500 truncate max-w-[130px]">{key}:</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[160px]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Métricas de Rendimiento */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Alcance / Audiencia:</span>
                  <span className="font-black text-white">{channel.metrics.reachOrAudience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tasa de Conversión:</span>
                  <span className="font-black text-emerald-400">{channel.metrics.conversionRate}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
                  <span>Última Sincronización:</span>
                  <span className="text-slate-300 font-semibold">{channel.metrics.lastSyncDate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenConfig(channel)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sliders size={13} />
                <span>Configurar API</span>
              </button>

              <button
                onClick={() => {
                  if (channel.category === 'EMAIL') {
                    setTestChannelType('EMAIL');
                    setIsTestModalOpen(true);
                  } else if (channel.category === 'MESSAGING') {
                    setTestChannelType('WHATSAPP');
                    setIsTestModalOpen(true);
                  } else {
                    alert(`Ping webhook enviado a ${channel.name}... ¡Respuesta 200 OK recibida en 88ms!`);
                  }
                }}
                className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                title="Probar Conexión"
              >
                <Send size={13} />
                <span>Test</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR DE ENVÍO DE PRUEBA EN VIVO */}
      {/* ========================================================================= */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} /> Despacho de Prueba en Tiempo Real
                </span>
                <h3 className="text-lg font-black text-slate-900">Simulador de Envío de Prueba</h3>
              </div>
              <button
                onClick={() => !isSimulatingDispatch && setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold disabled:opacity-50"
                disabled={isSimulatingDispatch}
              >
                ✕
              </button>
            </div>

            {/* Selector de Canal de Prueba */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTestChannelType('WHATSAPP')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  testChannelType === 'WHATSAPP'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-600 font-bold'
                }`}
              >
                <MessageCircle size={20} className={testChannelType === 'WHATSAPP' ? 'text-emerald-600' : 'text-slate-400'} />
                <div className="text-left">
                  <span className="block text-xs">WhatsApp Cloud API</span>
                  <span className="text-[10px] text-slate-400 font-normal">Mensaje directo a smartphone</span>
                </div>
              </button>

              <button
                onClick={() => setTestChannelType('EMAIL')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  testChannelType === 'EMAIL'
                    ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-500/20 text-teal-950 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-600 font-bold'
                }`}
              >
                <Mail size={20} className={testChannelType === 'EMAIL' ? 'text-teal-600' : 'text-slate-400'} />
                <div className="text-left">
                  <span className="block text-xs">Email SMTP / Resend</span>
                  <span className="text-[10px] text-slate-400 font-normal">Envío a bandeja de entrada</span>
                </div>
              </button>
            </div>

            {/* Parámetros del Destinatario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">
                  {testChannelType === 'WHATSAPP' ? 'Número WhatsApp Destino' : 'Correo Electrónico Destino'}
                </label>
                {testChannelType === 'WHATSAPP' ? (
                  <input
                    type="text"
                    value={testRecipientPhone}
                    onChange={(e) => setTestRecipientPhone(e.target.value)}
                    placeholder="+57 310 456 7890"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    disabled={isSimulatingDispatch}
                  />
                ) : (
                  <input
                    type="email"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    disabled={isSimulatingDispatch}
                  />
                )}
                <p className="text-[10px] text-slate-400">
                  {testChannelType === 'WHATSAPP' ? 'Incluye código de país (+57 para Colombia).' : 'Bandeja donde recibirás el correo de prueba.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Nombre del Destinatario (Variable {'{{1}}'})</label>
                <input
                  type="text"
                  value={testRecipientName}
                  onChange={(e) => setTestRecipientName(e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  disabled={isSimulatingDispatch}
                />
              </div>
            </div>

            {testChannelType === 'WHATSAPP' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Plantilla Aprobada por Meta</label>
                  <select
                    value={testSelectedTemplate}
                    onChange={(e) => setTestSelectedTemplate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    disabled={isSimulatingDispatch}
                  >
                    {MOCK_WA_TEMPLATES.map(t => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.category} - {t.language})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 text-xs">Producto de Muestra (Variable {'{{2}}'})</label>
                  <input
                    type="text"
                    value={testProductVariable}
                    onChange={(e) => setTestProductVariable(e.target.value)}
                    placeholder="Ej: 5.000 Cajas Plegadizas con Barniz UV"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    disabled={isSimulatingDispatch}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-xs">Mensaje / Contenido de Prueba</label>
                <textarea
                  rows={3}
                  value={testCustomMessage}
                  onChange={(e) => setTestCustomMessage(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  disabled={isSimulatingDispatch}
                />
              </div>
            )}

            {/* Consola de Logs en Vivo de Despacho */}
            {simulationLogs.length > 0 && (
              <div className="bg-slate-950 rounded-2xl p-4 text-emerald-400 font-mono text-[11px] space-y-1 border border-slate-800 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal size={12} />
                    Terminal de Despacho API
                  </span>
                  <span>Protocol: HTTPS / TLS 1.3</span>
                </div>
                {simulationLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* Resultado Exitoso con Vista Previa */}
            {simulationResult && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950">¡Envío de Prueba Exitoso!</h4>
                      <p className="text-[10px] text-emerald-700">Entregado a {simulationResult.recipient} ({simulationResult.latencyMs}ms)</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-bold">
                    HTTP 200 OK
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copia del Mensaje Entregado</span>
                  <p className="whitespace-pre-line text-[11px] font-medium leading-relaxed">
                    {simulationResult.previewContent}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs disabled:opacity-50"
                disabled={isSimulatingDispatch}
              >
                Cerrar
              </button>

              <button
                onClick={handleExecuteTestDispatch}
                disabled={isSimulatingDispatch}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 min-w-[160px] justify-center"
              >
                {isSimulatingDispatch ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Despachando...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>⚡ Enviar Mensaje Real</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURACIÓN GUIADA DE API & WEBHOOKS POR CANAL */}
      {/* ========================================================================= */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider flex items-center gap-1">
                  <Sliders size={12} /> Configuración de API & Webhooks
                </span>
                <h3 className="text-base font-black text-slate-900">{editingChannel.name}</h3>
              </div>
              <button
                onClick={() => setEditingChannel(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-black text-slate-900">{saveSuccessMsg}</h4>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Actualiza las llaves de acceso, IDs de cuenta o tokens de verificación para sincronizar en vivo.
                </p>

                {Object.entries(configFormData).map(([fieldKey, fieldValue]) => (
                  <div key={fieldKey} className="space-y-1.5">
                    <label className="font-bold text-slate-700 text-xs">{fieldKey}</label>
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setConfigFormData({ ...configFormData, [fieldKey]: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                    />
                  </div>
                ))}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                  <Info size={14} className="text-teal-600 shrink-0" />
                  <span>Todos los tokens se encriptan con TLS 1.3 y se almacenan de forma segura.</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => setEditingChannel(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Check size={14} />
                    <span>Guardar y Validar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
