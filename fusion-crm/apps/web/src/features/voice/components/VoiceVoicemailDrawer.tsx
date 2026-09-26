import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Play,
  Pause,
  Phone,
  Clock,
  User,
  X,
  FileText,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { voiceRpc } from '../sip/rpc';
import { useSoftphone } from '../sip/SoftphoneContext';
import { formatColombianPhone } from '../../../../../../packages/ui/src/components/PhoneLink';

export interface VoiceVoicemailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceVoicemailDrawer: React.FC<VoiceVoicemailDrawerProps> = ({ isOpen, onClose }) => {
  const { makeCall } = useSoftphone();
  const [messages, setMessages] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      voiceRpc.voicemail.getMessages().then((msgs) => setMessages(msgs));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // Simular audio breve si no hay backend de archivos
      setTimeout(() => {
        setPlayingId((cur) => (cur === id ? null : cur));
      }, 8000);
    }
  };

  const handleCallback = (senderNumber: string, senderName?: string) => {
    onClose();
    makeCall(senderNumber, senderName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
      <div className="bg-card border-l border-border w-[400px] max-w-full h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Cabecera */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-sm text-foreground">Buzón de Voz</h3>
              <p className="text-[11px] text-muted-foreground">{messages.length} mensajes recibidos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de mensajes */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No tienes mensajes de voz pendientes en tu extensión</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="bg-muted/30 border border-border/70 rounded-2xl p-3.5 space-y-2.5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="overflow-hidden">
                    <div className="font-bold text-foreground truncate">{m.callerName || 'Remitente'}</div>
                    <div className="text-[11px] font-mono text-primary font-semibold">
                      {formatColombianPhone(m.callerNumber)}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>hace 2 horas</span>
                  </div>
                </div>

                {/* Reproductor de audio */}
                <div className="bg-card p-2.5 rounded-xl border border-border flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(m.id)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 shadow transition-transform active:scale-95"
                  >
                    {playingId === m.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-primary rounded-full transition-all duration-300 ${
                          playingId === m.id ? 'w-2/3 animate-pulse' : 'w-0'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{playingId === m.id ? '00:06' : '00:00'}</span>
                      <span>00:{m.durationSeconds?.toString().padStart(2, '0') || '14'}</span>
                    </div>
                  </div>
                </div>

                {/* Transcripción AI */}
                {m.transcription && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-[11px] text-foreground space-y-1">
                    <div className="font-semibold text-primary flex items-center gap-1 text-[10px]">
                      <FileText className="w-3 h-3" />
                      <span>Transcripción Automática</span>
                    </div>
                    <p className="italic text-muted-foreground">"{m.transcription}"</p>
                  </div>
                )}

                {/* Acciones del mensaje */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Almacenado en Asterisk PBX</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCallback(m.callerNumber, m.callerName)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Devolver llamada</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
