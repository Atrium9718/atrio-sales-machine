import React, { useState } from 'react';
import { 
  MessageCircle, Mail, Send, Copy, Check, ExternalLink, 
  Smartphone, Sparkles, X, CheckCircle2, RefreshCw, Eye
} from 'lucide-react';
import { 
  OrderNotificationContext, 
  NotificationTemplateResult, 
  buildOrderNotifications, 
  WORKSHOP_STATUSES 
} from '../../lib/notificationEngine';

interface NotificationSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderContext: OrderNotificationContext;
}

export default function NotificationSenderModal({
  isOpen,
  onClose,
  orderContext
}: NotificationSenderModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [selectedStatus, setSelectedStatus] = useState<string>(orderContext.status || 'NUEVO');
  const [customPhone, setCustomPhone] = useState(orderContext.customerPhone || '');
  const [customEmail, setCustomEmail] = useState(orderContext.customerEmail || '');
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  if (!isOpen) return null;

  const currentCtx: OrderNotificationContext = {
    ...orderContext,
    status: selectedStatus,
    customerPhone: customPhone,
    customerEmail: customEmail,
  };

  const notification = buildOrderNotifications(currentCtx);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateSendEmail = () => {
    setIsSendingEmail(true);
    setEmailSentSuccess(false);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSentSuccess(true);
      setTimeout(() => setEmailSentSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Centro de Notificaciones Multicanal
                <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                  WhatsApp & Email
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Transmisión directa de avance de taller, artes técnicos y despachos para la orden {orderContext.orderCode}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* SELECTOR DE ESTADO DE TALLER & CANAL */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          
          {/* Selector de Estado */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Etapa de Taller:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {Object.entries(WORKSHOP_STATUSES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.icon} {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* Canales (WhatsApp vs Email) */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setChannel('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                channel === 'whatsapp' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => setChannel('email')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                channel === 'email' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail size={14} />
              <span>Email HTML</span>
            </button>
            <button
              onClick={() => setChannel('sms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                channel === 'sms' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone size={14} />
              <span>SMS</span>
            </button>
          </div>

        </div>

        {/* CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* WHATSAPP VIEW */}
          {channel === 'whatsapp' && (
            <div className="space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block">Destinatario WhatsApp</span>
                    <span className="text-[11px] text-emerald-800">{orderContext.customerName} ({customPhone || 'Sin número registrado'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+57 311 000 0000"
                    className="bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 w-36"
                  />
                </div>
              </div>

              {/* Chat Bubble Simulator */}
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>VISTA PREVIA DEL MENSAJE (FORMATO WHATSAPP BUSINESS):</span>
                  <button
                    onClick={() => handleCopyText(notification.whatsAppText)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="bg-[#DCF8C6] text-[#075E54] p-4 rounded-2xl rounded-tl-none shadow-xs border border-emerald-200 font-sans text-xs whitespace-pre-line leading-relaxed text-slate-800">
                  {notification.whatsAppText}
                </div>
              </div>

              {/* Botón de Enlace Directo API WhatsApp */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Abre WhatsApp Web o la App oficial con el mensaje precargado.
                </span>

                {notification.whatsAppUrl ? (
                  <a
                    href={notification.whatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                  >
                    <Send size={15} />
                    <span>Disparar WhatsApp Inmediato</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="bg-slate-200 text-slate-400 px-6 py-2.5 rounded-xl font-bold text-xs cursor-not-allowed"
                  >
                    Ingresa un número telefónico
                  </button>
                )}
              </div>

            </div>
          )}

          {/* EMAIL VIEW */}
          {channel === 'email' && (
            <div className="space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-950 block">Correo Electrónico del Cliente</span>
                    <span className="text-[11px] text-indigo-800">{orderContext.customerName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 w-52"
                  />
                </div>
              </div>

              {/* Asunto */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500 mr-2">Asunto:</span>
                <span className="font-bold text-slate-900">{notification.emailSubject}</span>
              </div>

              {/* Vista previa Renderizada del Email HTML */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} /> Plantilla HTML Responsiva
                  </span>
                  <button
                    onClick={() => handleCopyText(notification.emailHtml)}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Código Copiado' : 'Copiar HTML'}</span>
                  </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto p-4 bg-white">
                  <iframe
                    title="Email Preview"
                    srcDoc={notification.emailHtml}
                    className="w-full min-h-[420px] border-0 rounded-lg"
                  />
                </div>
              </div>

              {/* Acciones de Email */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  {emailSentSuccess ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={15} /> ¡Correo transaccional enviado con éxito!
                    </span>
                  ) : (
                    <span>Se enviará vía SMTP transaccional / Resend / SendGrid.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSendingEmail || !customEmail}
                  onClick={handleSimulateSendEmail}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSendingEmail ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>Enviar Notificación por Correo</span>
                </button>
              </div>

            </div>
          )}

          {/* SMS VIEW */}
          {channel === 'sms' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-500 block">Mensaje de Texto SMS (160 Caracteres):</span>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800">
                  {notification.smsText}
                </div>
                <div className="text-right text-[10px] text-slate-400 font-bold">
                  {notification.smsText.length} / 160 caracteres
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleCopyText(notification.smsText)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>Copiar para Envío Masivo SMS</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-400">
            Fusión Gráfica Notification Hub v2.0
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
