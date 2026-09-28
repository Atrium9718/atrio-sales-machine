import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  Grid,
  Disc,
  Clock,
  Wifi,
  WifiOff,
  Minimize2,
  Maximize2,
  CheckCircle2,
  FileText,
  Calendar,
  CheckSquare,
  DollarSign,
  User,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoftphone } from '../sip/SoftphoneContext';
import { voiceRpc } from '../sip/rpc';
import { formatColombianPhone } from '../../../../../../packages/ui/src/components/PhoneLink';

export interface VoiceActiveCallPanelProps {
  onOpenNewTaskModal?: (context: any) => void;
  onOpenNewAppointmentModal?: (context: any) => void;
}

export const VoiceActiveCallPanel: React.FC<VoiceActiveCallPanelProps> = ({
  onOpenNewTaskModal,
  onOpenNewAppointmentModal,
}) => {
  const navigate = useNavigate();
  const {
    activeCall,
    qualityMetrics,
    hangupCall,
    holdCall,
    unholdCall,
    setMuted,
    sendDTMF,
    blindTransfer,
    attendedTransfer,
    pauseRecording,
    resumeRecording,
    updateNotes,
  } = useSoftphone();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showDTMF, setShowDTMF] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isNotesSaved, setIsNotesSaved] = useState(true);

  // Estados para modal de transferencia
  const [transferTab, setTransferTab] = useState<'AGENTS' | 'QUEUES' | 'EXTERNAL'>('AGENTS');
  const [transferTarget, setTransferTarget] = useState('');
  const [agentsDirectory, setAgentsDirectory] = useState<any[]>([]);
  const [queuesList, setQueuesList] = useState<any[]>([]);
  const [transferError, setTransferError] = useState<string | null>(null);

  const isActive = activeCall && (activeCall.state === 'ACTIVE' || activeCall.state === 'RINGING_OUTBOUND' || activeCall.state === 'ON_HOLD');

  useEffect(() => {
    if (activeCall) {
      setNotes(activeCall.notes || '');
    }
  }, [activeCall?.id]);

  useEffect(() => {
    if (showTransferModal) {
      Promise.all([
        voiceRpc.agentStatus.getDirectory().catch(() => []),
        voiceRpc.queues.getStatus().catch(() => []),
      ]).then(([agents, queues]) => {
        setAgentsDirectory(agents);
        setQueuesList(queues);
      });
    }
  }, [showTransferModal]);

  if (!isActive || !activeCall) {
    return null;
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setIsNotesSaved(false);
    updateNotes(val);
    setTimeout(() => setIsNotesSaved(true), 3200);
  };

  const handleDTMFPress = (char: string) => {
    sendDTMF(char);
  };

  const handleExecuteTransfer = async (type: 'BLIND' | 'ATTENDED') => {
    if (!transferTarget) {
      setTransferError('Seleccione o ingrese un destino de transferencia');
      return;
    }

    try {
      if (type === 'ATTENDED') {
        await attendedTransfer(transferTarget);
      } else {
        await blindTransfer(transferTarget);
      }
      setShowTransferModal(false);
    } catch (err: any) {
      setTransferError(err.message || 'Error al transferir llamada');
    }
  };

  const renderQualityBadge = () => {
    if (!qualityMetrics) return null;

    const rating = qualityMetrics.rating;
    const isPoor = rating === 'POOR';
    const isGood = rating === 'GOOD' || rating === 'EXCELLENT';

    return (
      <div className="relative group flex items-center gap-1 text-[11px] font-mono">
        {isGood ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        )}
        <span className={isPoor ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}>
          {qualityMetrics.roundTripTimeMs}ms
        </span>

        {/* Tooltip con métricas exactas */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-56 p-2 bg-popover text-popover-foreground border border-border shadow-xl rounded-md text-[10px] pointer-events-none">
          <div className="font-bold text-foreground mb-1">Métricas de Conexión WebRTC</div>
          <div>Latencia (RTT): {qualityMetrics.roundTripTimeMs} ms</div>
          <div>Jitter: {qualityMetrics.jitterMs} ms</div>
          <div>Pérdida paquetes: {qualityMetrics.packetLossPercent}%</div>
          {qualityMetrics.warning && (
            <div className="mt-1 pt-1 border-t border-destructive/30 text-destructive font-medium">
              {qualityMetrics.warning}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Versión minimizada (Píldora flotante)
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 left-6 z-50 bg-card/95 backdrop-blur-md border-2 border-primary shadow-2xl rounded-full px-4 py-2 flex items-center gap-3 cursor-grab active:cursor-grabbing text-xs font-semibold text-foreground"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-mono text-primary font-bold">{formatTimer(activeCall.durationSeconds)}</span>
        <span className="truncate max-w-[130px]">{activeCall.remoteDisplayName}</span>

        <button
          type="button"
          onClick={() => setMuted(!activeCall.isMuted)}
          className={`p-1.5 rounded-full ${activeCall.isMuted ? 'bg-rose-500 text-white' : 'hover:bg-muted text-muted-foreground'}`}
          title={activeCall.isMuted ? 'Reactivar micrófono' : 'Silenciar'}
        >
          {activeCall.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => hangupCall()}
          className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white"
          title="Colgar llamada"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1 text-muted-foreground hover:text-foreground"
          title="Restaurar panel"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 left-6 z-50 w-[420px] max-w-[95vw] bg-card/95 backdrop-blur-md border-2 border-primary/40 shadow-2xl rounded-2xl overflow-hidden flex flex-col cursor-default"
      style={{ touchAction: 'none' }}
    >
      {/* Cabecera del panel de llamada activa */}
      <div className="bg-primary/90 px-4 py-2.5 text-primary-foreground flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-sm font-bold tracking-wider">{formatTimer(activeCall.durationSeconds)}</span>
          <span className="text-xs opacity-80">
            {activeCall.direction === 'INBOUND' ? '• Entrante' : '• Saliente'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge obligatorio: SIEMPRE visible si graba */}
          {activeCall.isRecording && !activeCall.isRecordingPaused && (
            <div className="flex items-center gap-1 text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full">
              <Disc className="w-3 h-3 text-rose-400 animate-spin" />
              <span>GRABANDO</span>
            </div>
          )}
          {activeCall.isRecordingPaused && (
            <div className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
              <Pause className="w-3 h-3" />
              <span>GRABACIÓN PAUSADA</span>
            </div>
          )}

          {renderQualityBadge()}

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-primary-foreground/20 text-primary-foreground transition-colors ml-1"
            title="Minimizar panel a barra flotante"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido interactivo */}
      <div className="p-4 space-y-3.5 text-xs text-foreground">
        {/* Identificación del interlocutor */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-foreground truncate">{activeCall.remoteDisplayName}</h4>
            <div className="text-xs font-mono text-primary font-semibold">
              {formatColombianPhone(activeCall.remoteNumber)}
            </div>
          </div>
          {activeCall.isOnHold && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold text-[10px] border border-amber-500/30">
              En Espera (Música activa)
            </span>
          )}
        </div>

        {/* Barra de controles telefónicos en curso */}
        <div className="grid grid-cols-6 gap-1.5 py-1">
          {/* Silenciar micrófono */}
          <button
            type="button"
            onClick={() => setMuted(!activeCall.isMuted)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              activeCall.isMuted
                ? 'bg-rose-500 text-white'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title={activeCall.isMuted ? 'Reactivar micrófono' : 'Silenciar micrófono'}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            <span className="text-[9px] mt-1 font-medium">{activeCall.isMuted ? 'Mute' : 'Mudo'}</span>
          </button>

          {/* En espera (Hold) */}
          <button
            type="button"
            onClick={() => (activeCall.isOnHold ? unholdCall() : holdCall())}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              activeCall.isOnHold
                ? 'bg-amber-500 text-white'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title={activeCall.isOnHold ? 'Reanudar conversación' : 'Poner en espera con música'}
          >
            {activeCall.isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="text-[9px] mt-1 font-medium">{activeCall.isOnHold ? 'Reanudar' : 'Espera'}</span>
          </button>

          {/* Teclado DTMF */}
          <button
            type="button"
            onClick={() => setShowDTMF(!showDTMF)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              showDTMF ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title="Enviar tonos DTMF (para menús IVR)"
          >
            <Grid className="w-4 h-4" />
            <span className="text-[9px] mt-1 font-medium">DTMF</span>
          </button>

          {/* Transferir */}
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
            title="Transferir llamada a un compañero, cola o teléfono externo"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span className="text-[9px] mt-1 font-medium">Transferir</span>
          </button>

          {/* Pausar/Reanudar grabación */}
          <button
            type="button"
            onClick={() => (activeCall.isRecordingPaused ? resumeRecording() : pauseRecording())}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
              activeCall.isRecordingPaused
                ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title={
              activeCall.isRecordingPaused
                ? 'Reanudar grabación de audio'
                : 'Pausar grabación (por datos sensibles como tarjetas o contraseñas)'
            }
          >
            <Disc className={`w-4 h-4 ${activeCall.isRecordingPaused ? 'text-amber-500' : 'text-rose-500'}`} />
            <span className="text-[9px] mt-1 font-medium">
              {activeCall.isRecordingPaused ? 'Reanudar' : 'Pausar REC'}
            </span>
          </button>

          {/* Colgar */}
          <button
            type="button"
            onClick={() => hangupCall()}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-transform active:scale-95"
            title="Finalizar llamada"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="text-[9px] mt-1 font-bold">Colgar</span>
          </button>
        </div>

        {/* Teclado DTMF desplegable */}
        {showDTMF && (
          <div className="p-2 bg-muted/40 rounded-xl border border-border grid grid-cols-3 gap-1.5 animate-in fade-in">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleDTMFPress(t)}
                className="py-1.5 rounded bg-card hover:bg-primary/20 hover:text-primary font-mono font-bold text-xs border border-border/70 transition-colors shadow-sm"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Bloc de notas de la llamada con auto-guardado en vivo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary" />
              <span>Notas de la llamada</span>
            </span>
            <span className="text-[10px] flex items-center gap-1">
              {isNotesSaved ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Guardado</span>
                </>
              ) : (
                <span className="text-amber-500">Guardando cada 3s...</span>
              )}
            </span>
          </div>

          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Escribe acuerdos, compromisos o detalles clave aquí. Se guardan automáticamente en la llamada..."
            rows={3}
            className="w-full text-xs p-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Acciones rápidas en el CRM durante la llamada */}
        <div className="border-t border-border pt-2.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Acciones CRM Rápidas
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (onOpenNewTaskModal) {
                  onOpenNewTaskModal({ customerId: activeCall.context?.customerId, callId: activeCall.id });
                } else {
                  navigate('/dashboard/crm');
                }
              }}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border text-[11px] font-medium transition-colors"
            >
              <CheckSquare className="w-3 h-3 text-primary" />
              <span>+ Tarea</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenNewAppointmentModal) {
                  onOpenNewAppointmentModal({ customerId: activeCall.context?.customerId, callId: activeCall.id });
                } else {
                  navigate('/dashboard/crm');
                }
              }}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border text-[11px] font-medium transition-colors"
            >
              <Calendar className="w-3 h-3 text-emerald-500" />
              <span>+ Cita</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/cotizaciones')}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border text-[11px] font-medium transition-colors"
            >
              <DollarSign className="w-3 h-3 text-amber-500" />
              <span>+ Cotización</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[400px] max-w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <span>Transferir Llamada</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pestañas de transferencia */}
            <div className="flex border-b border-border text-xs">
              <button
                type="button"
                onClick={() => setTransferTab('AGENTS')}
                className={`flex-1 py-1.5 text-center font-semibold border-b-2 transition-colors ${
                  transferTab === 'AGENTS' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >
                Compañeros
              </button>
              <button
                type="button"
                onClick={() => setTransferTab('QUEUES')}
                className={`flex-1 py-1.5 text-center font-semibold border-b-2 transition-colors ${
                  transferTab === 'QUEUES' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >
                Colas
              </button>
              <button
                type="button"
                onClick={() => setTransferTab('EXTERNAL')}
                className={`flex-1 py-1.5 text-center font-semibold border-b-2 transition-colors ${
                  transferTab === 'EXTERNAL' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >
                Número Externo
              </button>
            </div>

            {transferError && (
              <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Lista de destinos */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 py-1">
              {transferTab === 'AGENTS' && (
                <>
                  {agentsDirectory.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-4">No hay otros agentes disponibles</div>
                  )}
                  {agentsDirectory.map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setTransferTarget(ag.extension)}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between border text-xs transition-colors ${
                        transferTarget === ag.extension
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-muted/40 hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ag.status === 'DISPONIBLE'
                              ? 'bg-emerald-500'
                              : ag.status === 'OCUPADO'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div>
                          <div className="font-semibold">{ag.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">Ext: {ag.extension}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground capitalize">
                        {ag.status.toLowerCase()}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {transferTab === 'QUEUES' && (
                <>
                  {queuesList.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setTransferTarget(q.extension)}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between border text-xs transition-colors ${
                        transferTarget === q.extension
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-muted/40 hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{q.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">Ext: {q.extension}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {q.waitingCallsCount} en espera
                      </span>
                    </button>
                  ))}
                </>
              )}

              {transferTab === 'EXTERNAL' && (
                <div className="space-y-2 p-1">
                  <label className="text-xs text-muted-foreground block">
                    Número telefónico celular o fijo colombiano:
                  </label>
                  <input
                    type="tel"
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    placeholder="+57 310 123 4567"
                    className="w-full text-xs p-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              )}
            </div>

            {/* Acciones de transferencia */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => handleExecuteTransfer('BLIND')}
                className="py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow transition-colors text-center"
              >
                Transferir ya (Ciega)
              </button>
              <button
                type="button"
                onClick={() => handleExecuteTransfer('ATTENDED')}
                className="py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border transition-colors text-center"
              >
                Consultar primero (Atendida)
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
