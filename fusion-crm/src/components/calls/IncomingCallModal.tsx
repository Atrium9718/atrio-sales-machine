import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, MessageSquare, ChevronDown, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callSounds } from '../../utils/callSounds';

export interface IncomingCallData {
  session: {
    id: string;
    roomName: string;
    title?: string | null;
    type: string;
    channelId?: string | null;
    linkedEntityType?: string | null;
    linkedEntityId?: string | null;
  };
  caller: {
    id: string;
    name: string;
    role?: string;
  };
  timeoutSeconds?: number;
}

interface IncomingCallModalProps {
  incomingCall: IncomingCallData | null;
  onClose: () => void;
}

const QUICK_RESPONSES = [
  'Estoy en una reunión, te llamo en 5 minutos.',
  'En este momento no puedo hablar, por favor escríbeme por el chat.',
  'Voy en camino hacia planta de producción, te regreso la llamada pronto.',
  'Revisando un pedido urgente, te marco en breve.',
];

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ incomingCall, onClose }) => {
  const navigate = useNavigate();
  const [remainingSeconds, setRemainingSeconds] = useState(45);
  const [showQuickMessageMenu, setShowQuickMessageMenu] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!incomingCall) {
      callSounds.stopIncomingRingtone();
      return;
    }

    setRemainingSeconds(incomingCall.timeoutSeconds || 45);
    callSounds.startIncomingRingtone();

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          callSounds.stopIncomingRingtone();
          callSounds.playEndedChime();
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      callSounds.stopIncomingRingtone();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAnswer = async () => {
    setIsResponding(true);
    callSounds.stopIncomingRingtone();
    callSounds.playConnectedChime();

    try {
      await fetch('/api/calls/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: incomingCall.session.id,
          action: 'ANSWER',
        }),
      });
      onClose();
      navigate(`/llamada/${incomingCall.session.roomName}`);
    } catch (err) {
      console.error('Error al contestar llamada:', err);
      navigate(`/llamada/${incomingCall.session.roomName}`);
    } finally {
      setIsResponding(false);
    }
  };

  const handleReject = async (message?: string) => {
    setIsResponding(true);
    callSounds.stopIncomingRingtone();
    callSounds.playEndedChime();

    try {
      await fetch('/api/calls/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: incomingCall.session.id,
          action: message ? 'MESSAGE' : 'REJECT',
          declineMessage: message,
        }),
      });
    } catch (err) {
      console.error('Error al rechazar llamada:', err);
    } finally {
      setIsResponding(false);
      onClose();
    }
  };

  const entityTag = incomingCall.session.linkedEntityType
    ? `${incomingCall.session.linkedEntityType}: ${incomingCall.session.linkedEntityId || ''}`
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 text-center"
        >
          {/* Indicador de tiempo restante circular/badge */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Llamada entrante
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {remainingSeconds}s
            </span>
          </div>

          {/* Avatar del llamante con pulso visual */}
          <div className="relative mx-auto mb-4 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60" />
            <div className="relative w-20 h-20 rounded-full bg-primary/10 text-primary border-2 border-primary/30 flex items-center justify-center text-2xl font-bold shadow-md">
              {incomingCall.caller.name.charAt(0)}
            </div>
          </div>

          {/* Datos del llamante */}
          <h3 className="text-lg font-bold text-foreground truncate">{incomingCall.caller.name}</h3>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {incomingCall.caller.role || 'Colaborador Fusion ERP'}
          </p>

          {/* Asunto o entidad vinculada */}
          {incomingCall.session.title && (
            <p className="text-xs font-medium text-foreground/80 mt-2 line-clamp-1 bg-muted/40 py-1 px-2.5 rounded-md">
              {incomingCall.session.title}
            </p>
          )}

          {entityTag && (
            <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-2">
              <Shield className="w-3 h-3" />
              {entityTag}
            </div>
          )}

          {/* Acciones principales: Contestar / Rechazar */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {/* Rechazar */}
            <button
              onClick={() => handleReject()}
              disabled={isResponding}
              className="flex flex-col items-center gap-1 group"
              title="Rechazar llamada"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                Rechazar
              </span>
            </button>

            {/* Contestar */}
            <button
              onClick={handleAnswer}
              disabled={isResponding}
              className="flex flex-col items-center gap-1 group"
              title="Contestar llamada"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-emerald-600 group-hover:bg-emerald-600 transition-all shadow-lg ring-4 ring-emerald-500/20 animate-pulse">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                Contestar
              </span>
            </button>
          </div>

          {/* Opción de responder con mensaje rápido */}
          <div className="mt-5 pt-3 border-t border-border/50">
            {!showQuickMessageMenu ? (
              <button
                onClick={() => setShowQuickMessageMenu(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Responder con mensaje...</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            ) : (
              <div className="space-y-2 text-left">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                  Selecciona una respuesta rápida:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {QUICK_RESPONSES.map((resp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleReject(resp)}
                      className="w-full text-left text-xs p-1.5 rounded bg-muted/50 hover:bg-muted text-foreground transition-colors truncate"
                    >
                      {resp}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowQuickMessageMenu(false)}
                  className="text-[11px] text-muted-foreground hover:underline mt-1"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
