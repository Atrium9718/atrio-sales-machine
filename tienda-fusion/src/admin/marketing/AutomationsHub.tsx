import React, { useState } from 'react';
import {
  Zap,
  Play,
  Pause,
  Sliders,
  Sparkles,
  MessageCircle,
  Mail,
  Clock,
  Tag,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Edit,
  Copy,
  Check,
  Send,
  Eye,
  Settings,
  ShieldCheck,
  Percent,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AutomationWorkflow } from '../../lib/marketingEngine';

interface AutomationsHubProps {
  automations: AutomationWorkflow[];
  onToggleAutomation: (automationId: string) => void;
  onUpdateAutomation: (updatedAutomation: AutomationWorkflow) => void;
  onSimulateTrigger: (automationId: string) => void;
  formatCOP: (val: number) => string;
}

export default function AutomationsHub({
  automations,
  onToggleAutomation,
  onUpdateAutomation,
  onSimulateTrigger,
  formatCOP
}: AutomationsHubProps) {
  const [selectedForEdit, setSelectedForEdit] = useState<AutomationWorkflow | null>(null);
  const [selectedForSimulate, setSelectedForSimulate] = useState<AutomationWorkflow | null>(null);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    recipient: string;
    channelsDispatched: string[];
    couponApplied: string;
  } | null>(null);

  // Totales
  const totalTriggered = automations.reduce((acc, a) => acc + a.stats.triggered, 0);
  const totalConverted = automations.reduce((acc, a) => acc + a.stats.converted, 0);
  const totalRecoveredRevenue = automations.reduce((acc, a) => acc + (a.stats.recoveredRevenueCOP || 0), 0);
  const activeCount = automations.filter(a => a.status === 'ACTIVE').length;

  // Estado del formulario modal de edición
  const [editName, setEditName] = useState('');
  const [editTriggerEvent, setEditTriggerEvent] = useState('');
  const [editDelay, setEditDelay] = useState('');
  const [editChannels, setEditChannels] = useState<string[]>([]);
  const [editCouponCode, setEditCouponCode] = useState('');
  const [editDiscountPercent, setEditDiscountPercent] = useState<number>(15);
  const [editWhatsappText, setEditWhatsappText] = useState('');
  const [editEmailSubject, setEditEmailSubject] = useState('');
  const [editEmailPreview, setEditEmailPreview] = useState('');

  const handleOpenEditModal = (auto: AutomationWorkflow) => {
    setSelectedForEdit(auto);
    setEditName(auto.name);
    setEditTriggerEvent(auto.triggerEvent);
    setEditDelay(auto.delay);
    setEditChannels([...auto.channels]);
    setEditCouponCode(auto.couponCode || '');
    setEditDiscountPercent(auto.discountPercent || 15);
    setEditWhatsappText(auto.messageCustomization?.whatsappText || '');
    setEditEmailSubject(auto.messageCustomization?.emailSubject || '');
    setEditEmailPreview(auto.messageCustomization?.emailPreview || '');
  };

  const handleToggleChannel = (chan: string) => {
    if (editChannels.includes(chan)) {
      if (editChannels.length > 1) {
        setEditChannels(editChannels.filter(c => c !== chan));
      }
    } else {
      setEditChannels([...editChannels, chan]);
    }
  };

  const handleSaveRule = () => {
    if (!selectedForEdit) return;
    const updated: AutomationWorkflow = {
      ...selectedForEdit,
      name: editName,
      triggerEvent: editTriggerEvent,
      delay: editDelay,
      channels: editChannels,
      couponCode: editCouponCode,
      discountPercent: editDiscountPercent,
      messageCustomization: {
        ...selectedForEdit.messageCustomization,
        whatsappText: editWhatsappText,
        emailSubject: editEmailSubject,
        emailPreview: editEmailPreview
      }
    };
    onUpdateAutomation(updated);
    setSelectedForEdit(null);
  };

  const handleRunSimulation = (auto: AutomationWorkflow) => {
    setSelectedForSimulate(auto);
    setSimulationResult(null);

    setTimeout(() => {
      setSimulationResult({
        success: true,
        recipient: auto.category === 'B2B_REORDER' ? 'Comercializadora Andina S.A.S (+57 312 884 9283 / compras@andina.com.co)' : 'Carlos Mario Restrepo (+57 310 456 7890 / carlos.restrepo@empresa.com)',
        channelsDispatched: auto.channels,
        couponApplied: auto.couponCode || 'N/A'
      });
      onSimulateTrigger(auto.id);
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER PRINCIPAL DE AUTOMATIZACIONES */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Zap size={16} />
            <span>Motor de Automatizaciones & Triggers Inteligentes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Flujos de Venta y Recuperación en Piloto Automático
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Rescata carritos a los 30 minutos, activa recompras B2B automáticas cada 30-60 días y nutre nuevos clientes con catálogos y listas de precios por volumen.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-900/50 p-2.5 rounded-2xl border border-indigo-700/50 shrink-0">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-xs font-black text-indigo-200">
            {activeCount} de {automations.length} Flujos Activos 24/7
          </span>
        </div>
      </div>

      {/* METRICAS GLOBALES DE WORKFLOWS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Facturación Recuperada en Automático</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{formatCOP(totalRecoveredRevenue)}</div>
          <span className="text-[11px] font-bold text-slate-500 block">Ventas salvadas por WhatsApp y Email</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Disparos / Ejecuciones Totales</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalTriggered.toLocaleString()} triggers</div>
          <span className="text-[11px] font-bold text-indigo-600 block">Eventos procesados sin intervención</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Órdenes / Conversiones Exitosas</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalConverted} pedidos</div>
          <span className="text-[11px] font-bold text-emerald-600 block">Tasa de conversión global {(totalConverted / (totalTriggered || 1) * 100).toFixed(1)}%</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Canales Conectados</span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 flex items-center gap-1.5">
            <MessageCircle size={18} className="text-emerald-500" />
            <Mail size={18} className="text-teal-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 block">WhatsApp Cloud + Resend API</span>
        </div>
      </div>

      {/* LISTADO DE REGLAS Y AUTOMATIZACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {automations.map((auto) => {
          const isActive = auto.status === 'ACTIVE';
          return (
            <div
              key={auto.id}
              className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm space-y-4 flex flex-col justify-between ${
                isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200/60 bg-slate-50/50 opacity-80'
              }`}
            >
              <div className="space-y-3">
                {/* CABECERA DE LA REGLA */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[10px] px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{auto.delay}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleAutomation(auto.id)}
                      className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={isActive ? 'Pausar regla' : 'Activar regla'}
                    >
                      {isActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <Pause size={11} />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TÍTULO Y DESCRIPCIÓN */}
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    {auto.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{auto.description}</p>
                </div>

                {/* DISPARADOR & CONDICIONES */}
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Disparador (Trigger):</span>
                      <span className="text-slate-600 text-[11px]">{auto.triggerEvent}</span>
                    </div>
                  </div>

                  {auto.couponCode && (
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <Tag size={12} />
                        <span>Cupón Auto-Inyectado: <strong>{auto.couponCode}</strong> ({auto.discountPercent}% DTO)</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded">
                        Dinámico
                      </span>
                    </div>
                  )}

                  {/* MÉTRICAS DEL WORKFLOW */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Disparados</span>
                      <span className="text-sm font-black text-slate-900">{auto.stats.triggered}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Abiertos</span>
                      <span className="text-sm font-black text-indigo-600">{auto.stats.opened}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Convertidos</span>
                      <span className="text-sm font-black text-emerald-600">{auto.stats.converted}</span>
                    </div>
                  </div>

                  {auto.stats.recoveredRevenueCOP && (
                    <div className="text-center pt-1 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500">Recuperado: </span>
                      <span className="text-xs font-black text-emerald-700">{formatCOP(auto.stats.recoveredRevenueCOP)}</span>
                    </div>
                  )}
                </div>

                {/* CANALES DE SALIDA */}
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Canales:</span>
                  {auto.channels.map((chan, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-100 text-slate-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      {chan.includes('WhatsApp') ? <MessageCircle size={10} className="text-emerald-600" /> : <Mail size={10} className="text-teal-600" />}
                      <span>{chan}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* BOTONES DE EDICIÓN Y PRUEBA */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditModal(auto)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sliders size={13} />
                  <span>Personalizar Regla</span>
                </button>

                <button
                  onClick={() => handleRunSimulation(auto)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  title="Simular envío de prueba a cliente de muestra"
                >
                  <Send size={13} />
                  <span>Simular Disparo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDITOR DE REGLA Y PERSONALIZACIÓN DE MENSAJES */}
      {/* ========================================================================= */}
      {selectedForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                  Editor de Regla & Automatización
                </span>
                <h3 className="text-base font-black text-slate-900">Personalizar Flujo de {selectedForEdit.name}</h3>
              </div>
              <button
                onClick={() => setSelectedForEdit(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Nombre del Flujo:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Tiempo de Espera (Delay):</label>
                  <input
                    type="text"
                    value={editDelay}
                    onChange={(e) => setEditDelay(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Condición Disparadora (Trigger Event):</label>
                <input
                  type="text"
                  value={editTriggerEvent}
                  onChange={(e) => setEditTriggerEvent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-xs"
                />
              </div>

              {/* CUPÓN DE DESCUENTO */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <Tag size={14} /> Oferta / Cupón de Conversión Automático
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Código del Cupón:</label>
                    <input
                      type="text"
                      value={editCouponCode}
                      onChange={(e) => setEditCouponCode(e.target.value)}
                      placeholder="Ej: VUELVE15"
                      className="w-full bg-white border border-emerald-200 rounded-xl p-2 font-mono font-bold text-emerald-800 uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">% Descuento:</label>
                    <input
                      type="number"
                      value={editDiscountPercent}
                      onChange={(e) => setEditDiscountPercent(Number(e.target.value))}
                      className="w-full bg-white border border-emerald-200 rounded-xl p-2 font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* SELECCIÓN DE CANALES DE SALIDA */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Canales de Despacho Activos:</label>
                <div className="flex gap-2">
                  {[
                    { id: 'WhatsApp Cloud API', icon: MessageCircle, color: 'text-emerald-600' },
                    { id: 'Resend Email API', icon: Mail, color: 'text-teal-600' }
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = editChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleToggleChannel(ch.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={14} className={isSelected ? 'text-teal-400' : ch.color} />
                        <span>{ch.id}</span>
                        {isSelected && <CheckCircle2 size={12} className="text-emerald-400 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MENSAJE DE WHATSAPP */}
              {editChannels.includes('WhatsApp Cloud API') && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">
                    Plantilla WhatsApp (Variables: {'{nombre}'}, {'{producto}'}, {'{url_checkout}'}):
                  </label>
                  <textarea
                    value={editWhatsappText}
                    onChange={(e) => setEditWhatsappText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-sans leading-relaxed"
                  />
                </div>
              )}

              {/* MENSAJE DE CORREO */}
              {editChannels.includes('Resend Email API') && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block">Asunto del Correo (Email Subject):</label>
                    <input
                      type="text"
                      value={editEmailSubject}
                      onChange={(e) => setEditEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block">Preheader / Resumen Previo:</label>
                    <input
                      type="text"
                      value={editEmailPreview}
                      onChange={(e) => setEditEmailPreview(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedForEdit(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRule}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/20"
              >
                Guardar Cambios de la Regla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULACIÓN DE DISPARO EN TIEMPO REAL */}
      {/* ========================================================================= */}
      {selectedForSimulate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Send size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Simulador en Vivo</span>
                  <h3 className="text-sm font-black text-slate-900">Ejecución del Disparador</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedForSimulate(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {!simulationResult ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Verificando condiciones de base de datos y despachando webhook...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                    <CheckCircle2 size={16} />
                    <span>¡Disparador Ejecutado con Éxito (Simulación 200 OK)!</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    El evento de <strong>"{selectedForSimulate.triggerEvent}"</strong> fue detectado y los mensajes se formularon correctamente.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">Destinatario de Prueba:</span>
                    <span className="font-bold text-slate-800">{simulationResult.recipient}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">Canales Notificados:</span>
                    <span className="font-bold text-indigo-700">{simulationResult.channelsDispatched.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold">Cupón Inyectado:</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {simulationResult.couponApplied}
                    </span>
                  </div>
                </div>

                {selectedForSimulate.messageCustomization?.whatsappText && (
                  <div className="bg-slate-900 text-teal-300 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                    <span className="text-slate-400 block text-[9px] mb-1 font-sans font-bold">PREVIEW WHATSAPP:</span>
                    {selectedForSimulate.messageCustomization.whatsappText
                      .replace('{nombre}', 'Carlos Mario')
                      .replace('{producto}', 'Cajas Plegadizas')
                      .replace('{url_checkout}', 'https://fusiongrafica.com.co/checkout?cup=VUELVE15')}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedForSimulate(null)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    Entendido / Cerrar
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
