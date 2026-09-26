import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  Inbox,
  Volume2,
  VolumeX,
  ExternalLink,
  Flame,
  Sun,
  Snowflake,
  Crown,
  AlertTriangle,
  Clock,
  Briefcase,
  DollarSign,
  Calendar,
  UserPlus,
  Move,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSoftphone } from '../sip/SoftphoneContext';
import { formatColombianPhone } from '../../../../../../packages/ui/src/components/PhoneLink';
import { callSounds } from '../../../../../../src/utils/callSounds';

export interface VoiceIncomingCallModalProps {
  userPermissions?: string[];
}

export function formatCurrencyCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const VoiceIncomingCallModal: React.FC<VoiceIncomingCallModalProps> = ({ userPermissions }) => {
  const navigate = useNavigate();
  const { activeCall, answerCall, rejectCall, hangupCall } = useSoftphone();
  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);
  const [ringtoneVolume, setRingtoneVolume] = useState(80);
  const [remainingTime, setRemainingTime] = useState(30);

  // Verificar permiso cost:read para datos financieros y montos de cotizaciones
  const permissions = userPermissions || (typeof window !== 'undefined' ? (window as any).__FUSION_USER_PERMISSIONS__ || ['*'] : ['*']);
  const hasCostRead = permissions.includes('*') || permissions.includes('cost:read');

  const isIncoming = activeCall && activeCall.state === 'RINGING_INBOUND';

  // Control de timbre de llamada
  useEffect(() => {
    if (!isIncoming) {
      callSounds.stopIncomingRingtone();
      return;
    }

    if (!isRingtoneMuted) {
      callSounds.startIncomingRingtone();
    } else {
      callSounds.stopIncomingRingtone();
    }

    setRemainingTime(30);
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          callSounds.stopIncomingRingtone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      callSounds.stopIncomingRingtone();
    };
  }, [isIncoming, isRingtoneMuted]);

  // Atajos de teclado: Enter contesta, Escape rechaza
  useEffect(() => {
    if (!isIncoming) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleAnswer();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIncoming]);

  if (!isIncoming || !activeCall) {
    return null;
  }

  const handleAnswer = async () => {
    callSounds.stopIncomingRingtone();
    callSounds.playConnectedChime();
    await answerCall();
  };

  const handleReject = async () => {
    callSounds.stopIncomingRingtone();
    await rejectCall();
  };

  const handleSendToVoicemail = async () => {
    callSounds.stopIncomingRingtone();
    await hangupCall();
  };

  const context = activeCall.context || {};
  const customerName = context.customerName || (activeCall.remoteDisplayName !== activeCall.remoteNumber ? activeCall.remoteDisplayName : null);
  const contactName = context.contactName || null;
  const contactRole = context.contactRole || 'Contacto principal';
  const temperature = context.customerTemperature || 'HOT';
  const phoneFormatted = formatColombianPhone(activeCall.remoteNumber);

  const renderTemperatureBadge = () => {
    switch (temperature) {
      case 'VIP':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <Crown className="w-3 h-3" /> VIP
          </span>
        );
      case 'HOT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30">
            <Flame className="w-3 h-3" /> Caliente
          </span>
        );
      case 'WARM':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <Sun className="w-3 h-3" /> Tibio
          </span>
        );
      case 'COLD':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30">
            <Snowflake className="w-3 h-3" /> Frío
          </span>
        );
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[95vw] bg-card/95 backdrop-blur-md border-2 border-primary/40 shadow-2xl rounded-2xl overflow-hidden flex flex-col cursor-default"
      style={{ touchAction: 'none' }}
    >
      {/* Barra de cabecera con botón de arrastre */}
      <div className="bg-primary px-4 py-2.5 text-primary-foreground flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 animate-bounce" />
          <span className="font-bold text-xs uppercase tracking-wider">Llamada Entrante</span>
          <span className="font-mono text-xs opacity-80">({remainingTime}s)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRingtoneMuted(!isRingtoneMuted)}
            className="p-1 rounded hover:bg-primary-foreground/20 text-primary-foreground transition-colors"
            title={isRingtoneMuted ? 'Activar timbre' : 'Silenciar timbre (no cuelga)'}
          >
            {isRingtoneMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Move className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>

      {/* Contenido principal del modal */}
      <div className="p-4 flex-1 space-y-3.5 text-foreground text-xs">
        {/* Identidad del cliente y contacto */}
        <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
          <div className="overflow-hidden">
            {customerName ? (
              <>
                <h3 className="text-base font-bold text-foreground truncate">{customerName}</h3>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {contactName ? `${contactName} (${contactRole})` : contactRole}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-foreground">Número No Registrado</h3>
                <div className="text-xs text-muted-foreground font-mono">{phoneFormatted}</div>
              </>
            )}
            <div className="text-[11px] font-mono text-primary font-semibold mt-1">
              {phoneFormatted}
            </div>
          </div>
          <div className="shrink-0">{renderTemperatureBadge()}</div>
        </div>

        {/* Ficha CRM en vivo */}
        <div className="space-y-2 bg-muted/30 p-2.5 rounded-xl border border-border/60">
          {/* Última actividad */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Última actividad: <strong className="text-foreground font-semibold">{context.lastActivityAt || 'Hace 3 días (Correo enviado)'}</strong></span>
          </div>

          {/* Cotización abierta */}
          <div className="flex items-start gap-2 text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <span>Cotización activa: </span>
              <strong className="text-foreground font-semibold">
                COT-2026-0412
                {hasCostRead && ' · ' + formatCurrencyCOP(4850000)}
              </strong>
              <span className="block text-[10px] text-muted-foreground">Enviada, sin respuesta hace 5 días</span>
            </div>
          </div>

          {/* Proyecto en producción */}
          <div className="flex items-start gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="overflow-hidden">
              <span>Proyecto en producción: </span>
              <strong className="text-foreground font-semibold">PROD-1187 (En acabados)</strong>
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Entrega comprometida: Mañana, 3:00 PM</span>
            </div>
          </div>

          {/* Cartera y saldo vencido (SOLO CON PERMISO cost:read) */}
          {hasCostRead && (
            <div className="flex items-start gap-2 text-muted-foreground border-t border-border/50 pt-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span>Cartera: </span>
                <strong className="text-amber-600 dark:text-amber-400 font-semibold">{formatCurrencyCOP(1200000)}</strong>
                <span className="text-[10px] text-muted-foreground ml-1">(1 factura vencida hace 12 días)</span>
              </div>
            </div>
          )}

          {/* Tarea asignada */}
          <div className="text-[11px] bg-primary/10 border border-primary/20 text-primary p-2 rounded-lg font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Tarea suya: "Llamar para coordinar entrega" vence hoy</span>
          </div>
        </div>

        {/* Enlace para abrir ficha de cliente sin cortar la llamada */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          {context.customerId ? (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/clientes/${context.customerId}`)}
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>Ver ficha completa</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/dashboard/clientes')}
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              <span>Crear cliente con este número</span>
            </button>
          )}

          <span className="text-[10px] text-muted-foreground">
            [Enter] Contestar · [Esc] Rechazar
          </span>
        </div>

        {/* Botones de acción principales */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {/* Contestar */}
          <button
            type="button"
            onClick={handleAnswer}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
            title="Contestar llamada (Atajo: Enter)"
          >
            <Phone className="w-4 h-4" />
            <span>Contestar</span>
          </button>

          {/* Rechazar */}
          <button
            type="button"
            onClick={handleReject}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
            title="Rechazar llamada (Atajo: Escape)"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Rechazar</span>
          </button>

          {/* Al buzón */}
          <button
            type="button"
            onClick={handleSendToVoicemail}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium text-xs border border-border transition-colors"
            title="Enviar llamada inmediatamente al buzón de voz"
          >
            <Inbox className="w-4 h-4 text-muted-foreground" />
            <span>Al buzón</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
