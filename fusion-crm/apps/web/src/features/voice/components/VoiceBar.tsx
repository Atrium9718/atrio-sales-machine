import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Volume2,
  Mic,
  Settings2,
  Inbox,
  CircleDot,
  Clock,
  ChevronDown,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useSoftphone } from '../sip/SoftphoneContext';
import { voiceRpc } from '../sip/rpc';

export interface VoiceBarProps {
  onOpenDialer: () => void;
  onOpenVoicemail: () => void;
  onOpenDeviceSettings: () => void;
  onOpenMobileConfig: () => void;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({
  onOpenDialer,
  onOpenVoicemail,
  onOpenDeviceSettings,
  onOpenMobileConfig,
}) => {
  const { state, isMasterTab, registeredExtension, hasVoicePermission } = useSoftphone();
  const [agentStatus, setAgentStatus] = useState<string>('DISPONIBLE');
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<{ count: number; longestWait: number }>({ count: 0, longestWait: 0 });
  const [unreadVoicemails, setUnreadVoicemails] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // REGLA CRÍTICA: Sin voice:use, la barra no existe en el DOM. No un botón deshabilitado: no existe.
  if (!hasVoicePermission) {
    return null;
  }

  // Cargar estado inicial de agente, colas y buzón
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [statusData, queues, vmCount] = await Promise.all([
          voiceRpc.agentStatus.get().catch(() => ({ status: 'DISPONIBLE', reason: null })),
          voiceRpc.queues.getStatus().catch(() => []),
          voiceRpc.voicemail.getUnreadCount().catch(() => 0),
        ]);

        if (isMounted) {
          setAgentStatus(statusData.status);
          setPauseReason(statusData.reason || null);

          const totalCalls = queues.reduce((acc, q) => acc + (q.waitingCallsCount || 0), 0);
          const maxWait = queues.reduce((acc, q) => Math.max(acc, q.longestWaitSeconds || 0), 0);
          setQueueStats({ count: totalCalls, longestWait: maxWait });
          setUnreadVoicemails(vmCount);
        }
      } catch {}
    }

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleStatusSelect = async (newStatus: string, reason?: string) => {
    setIsUpdatingStatus(true);
    setIsStatusMenuOpen(false);
    try {
      await voiceRpc.agentStatus.set(newStatus, reason);
      setAgentStatus(newStatus);
      setPauseReason(reason || null);
    } catch (err) {
      console.error('Error al actualizar estado de agente', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Indicador de conexión del softphone
  const renderConnectionStatus = () => {
    switch (state) {
      case 'REGISTERED':
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold cursor-help"
            title={`Softphone Conectado (Ext: ${registeredExtension || '101'})${isMasterTab ? ' • Pestaña Maestra' : ' • Modo Espejo'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Conectado</span>
            {registeredExtension && <span className="font-mono text-[10px] opacity-75">#{registeredExtension}</span>}
          </div>
        );
      case 'CONNECTING':
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold cursor-help"
            title="Conectando al servidor WSS de telefonía..."
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="hidden sm:inline">Conectando...</span>
          </div>
        );
      case 'MIRROR_MODE':
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold cursor-help"
            title="Esta pestaña está en Modo Espejo. El registro principal activo reside en otra pestaña de su navegador."
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="hidden sm:inline">Espejo</span>
          </div>
        );
      case 'REGISTRATION_FAILED':
      case 'DISCONNECTED':
      default:
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold cursor-help group relative"
            title="Sin conexión con el PBX. Haga clic para reintentar."
          >
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="hidden sm:inline">Sin conexión</span>
          </div>
        );
    }
  };

  // Color de espera en colas según tiempo máximo
  const getQueueBadgeClass = () => {
    if (queueStats.count === 0) return 'bg-muted text-muted-foreground';
    if (queueStats.longestWait < 30) return 'bg-emerald-500 text-white animate-none';
    if (queueStats.longestWait <= 60) return 'bg-amber-500 text-white animate-none';
    return 'bg-destructive text-white animate-pulse';
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm border border-border px-2 sm:px-3 py-1 rounded-lg text-xs shadow-sm">
      {/* 1. Indicador de estado del softphone */}
      {renderConnectionStatus()}

      {/* 2. Selector de estado del agente */}
      <div className="relative">
        <button
          type="button"
          disabled={isUpdatingStatus}
          onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 hover:bg-muted font-medium text-foreground transition-colors"
          title="Cambiar estado del agente"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              agentStatus === 'DISPONIBLE'
                ? 'bg-emerald-500'
                : agentStatus === 'OCUPADO'
                ? 'bg-rose-500'
                : agentStatus === 'EN_PAUSA'
                ? 'bg-amber-500'
                : 'bg-zinc-400'
            }`}
          />
          <span className="capitalize">{agentStatus.toLowerCase().replace('_', ' ')}</span>
          {agentStatus === 'EN_PAUSA' && pauseReason && (
            <span className="text-[10px] text-muted-foreground hidden md:inline">({pauseReason.toLowerCase()})</span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
        </button>

        {isStatusMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-48 bg-popover text-popover-foreground border border-border shadow-xl rounded-lg py-1.5 z-50 animate-in fade-in zoom-in-95">
            <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Estado de Telefonía
            </div>
            <button
              onClick={() => handleStatusSelect('DISPONIBLE')}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Disponible</span>
            </button>
            <button
              onClick={() => handleStatusSelect('OCUPADO')}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ocupado</span>
            </button>

            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground border-t border-border mt-1 pt-1">
              En pausa:
            </div>
            {['ALMUERZO', 'REUNION', 'DESCANSO', 'CAPACITACION', 'OTRO'].map((reason) => (
              <button
                key={reason}
                onClick={() => handleStatusSelect('EN_PAUSA', reason)}
                className="w-full text-left pl-6 pr-3 py-1 hover:bg-muted text-xs flex items-center justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="capitalize">{reason.toLowerCase()}</span>
                {agentStatus === 'EN_PAUSA' && pauseReason === reason && (
                  <CheckCircle2 className="w-3 h-3 text-amber-500" />
                )}
              </button>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => handleStatusSelect('DESCONECTADO')}
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 text-muted-foreground font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span>Desconectado</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-border mx-0.5" />

      {/* 3. Contador de llamadas en cola */}
      <button
        type="button"
        onClick={onOpenDialer}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/60 transition-colors text-foreground"
        title={`Llamadas en espera: ${queueStats.count} • Espera máxima: ${queueStats.longestWait}s`}
      >
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold hidden md:inline">Colas:</span>
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${getQueueBadgeClass()}`}>
          {queueStats.count}
        </span>
      </button>

      {/* 4. Botón de teclado (abre el marcador) */}
      <button
        type="button"
        onClick={onOpenDialer}
        className="p-1.5 rounded hover:bg-primary/10 text-primary hover:text-primary transition-colors relative"
        title="Abrir Teclado de Marcación"
      >
        <Phone className="w-4 h-4" />
      </button>

      {/* 5. Buzón de voz con badge de no oídos */}
      <button
        type="button"
        onClick={onOpenVoicemail}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
        title={`Buzón de voz (${unreadVoicemails} mensajes no oídos)`}
      >
        <Inbox className="w-4 h-4" />
        {unreadVoicemails > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
            {unreadVoicemails}
          </span>
        )}
      </button>

      {/* 6. Configuración de celular (Zoiper / Desvío) */}
      <button
        type="button"
        onClick={onOpenMobileConfig}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex"
        title="Configurar celular (Softphone móvil / Desvío)"
      >
        <Smartphone className="w-4 h-4" />
      </button>

      {/* 7. Dispositivos y prueba de audio */}
      <button
        type="button"
        onClick={onOpenDeviceSettings}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Configurar dispositivos de audio (Micrófono / Altavoces)"
      >
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
};
