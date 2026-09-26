import * as React from 'react';
import {
  Users,
  PhoneCall,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  Settings,
  Plus,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  PhoneForwarded,
  Filter,
  UserCheck,
  Coffee,
  XCircle,
  HelpCircle,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface QueueMember {
  id: string;
  userId: string;
  name: string;
  extension: string;
  penalty: number;
  skills: string[];
  isActive: boolean;
}

interface VoiceQueue {
  id: string;
  name: string;
  extension: string;
  strategy: 'RINGALL' | 'ROUND_ROBIN' | 'LEAST_RECENT' | 'FEWEST_CALLS' | 'LONGEST_IDLE' | 'SKILL_BASED';
  ringSeconds: number;
  wrapUpSeconds: number;
  maxWaitSeconds: number;
  maxCallers: number;
  announcePositionEverySeconds: number;
  announceHoldTime: boolean;
  musicOnHold: string;
  greetingPromptId?: string;
  periodicPromptId?: string;
  overflowTarget: 'VOICEMAIL' | 'ANOTHER_QUEUE' | 'EXTERNAL_NUMBER' | 'AI_AGENT' | 'HANGUP_WITH_MESSAGE';
  overflowTargetId?: string;
  overflowAssigneeName?: string;
  exitKey: string;
  isActive: boolean;
  members: QueueMember[];
  waitingCallsCount: number;
  longestWaitSeconds: number;
  waitTrafficLight: 'GREEN' | 'YELLOW' | 'RED';
  agentsConnectedCount: number;
  agentsAvailableCount: number;
  agentsOnCallCount: number;
  answeredToday: number;
  abandonedToday: number;
  targetSlaSeconds: number;
  serviceLevelPercentage: number;
  previewSummary: string;
}

interface LiveCaller {
  callId: string;
  queueId: string;
  fromNumber: string;
  callerName: string | null;
  enteredAt: string;
  waitSeconds: number;
  position: number;
  estimatedWaitMinutes: number;
}

interface LiveAgent {
  userId: string;
  name: string;
  extension: string;
  role: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'BREAK' | 'OFFLINE';
  since: string;
  timeInStateSeconds: number;
  reason?: string;
  currentCallId?: string;
  currentCallerNumber?: string;
  callsHandledToday: number;
  wrapUpSecondsRemaining?: number;
}

const STRATEGY_INFO: Record<string, { label: string; desc: string }> = {
  RINGALL: {
    label: 'Timbrado Simultáneo (Ringall)',
    desc: 'Timbra a todos los agentes disponibles del nivel de penalidad más bajo simultáneamente.',
  },
  ROUND_ROBIN: {
    label: 'Turno Rotativo (Round Robin)',
    desc: 'Reparto circular en orden de lista, recordando quién atendió la última vez.',
  },
  LEAST_RECENT: {
    label: 'Menos Reciente (Least Recent)',
    desc: 'Prioriza a quien lleva más tiempo sin atender una llamada en el día.',
  },
  FEWEST_CALLS: {
    label: 'Menos Llamadas (Fewest Calls)',
    desc: 'Asigna a quien lleva menos llamadas acumuladas en su turno de hoy.',
  },
  LONGEST_IDLE: {
    label: 'Mayor Tiempo Libre (Longest Idle)',
    desc: 'Asigna a quien lleva más tiempo disponible sin hacer nada (más desocupado).',
  },
  SKILL_BASED: {
    label: 'Por Habilidades (Skill-Based)',
    desc: 'Filtra estrictamente a los calificados con las habilidades requeridas.',
  },
};

export function VozColasPage() {
  const [activeTab, setActiveTab] = React.useState<'live' | 'config'>('live');
  const [queues, setQueues] = React.useState<VoiceQueue[]>([]);
  const [agents, setAgents] = React.useState<LiveAgent[]>([]);
  const [liveCallers, setLiveCallers] = React.useState<LiveCaller[]>([]);
  const [selectedQueueId, setSelectedQueueId] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [notification, setNotification] = React.useState<string | null>(null);

  // Modal para editar/crear cola
  const [isQueueModalOpen, setIsQueueModalOpen] = React.useState(false);
  const [editingQueue, setEditingQueue] = React.useState<VoiceQueue | null>(null);

  // Modal de simulación
  const [isSimModalOpen, setIsSimModalOpen] = React.useState(false);
  const [simForm, setSimForm] = React.useState({
    queueId: '',
    fromNumber: '+57 312 456 7890',
    callerName: 'Empaques de Colombia S.A.S.',
  });

  // Modal para cambiar estado de agente
  const [statusModalAgent, setStatusModalAgent] = React.useState<LiveAgent | null>(null);
  const [newStatus, setNewStatus] = React.useState<'AVAILABLE' | 'BREAK' | 'OFFLINE'>('BREAK');
  const [statusReason, setStatusReason] = React.useState('Almuerzo / Descanso');

  const loadData = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [qRes, aRes] = await Promise.all([
        fetch('/api/voice/queues'),
        fetch('/api/voice/agents'),
      ]);

      const qData = await qRes.json();
      const aData = await aRes.json();

      if (qData.success && qData.queues) {
        setQueues(qData.queues);
        if (!simForm.queueId && qData.queues.length > 0) {
          setSimForm((prev) => ({ ...prev, queueId: qData.queues[0].id }));
        }
      }

      if (aData.success && aData.agents) {
        setAgents(aData.agents);
      }

      // Cargar llamadas en vivo de todas las colas
      if (qData.queues && qData.queues.length > 0) {
        const livePromises = qData.queues.map((q: VoiceQueue) =>
          fetch(`/api/voice/queues/${q.id}/live`).then((r) => r.json())
        );
        const liveResults = await Promise.all(livePromises);
        const allWaiting: LiveCaller[] = [];
        liveResults.forEach((lr) => {
          if (lr.success && lr.waitingCalls) {
            allWaiting.push(...lr.waitingCalls);
          }
        });
        setLiveCallers(allWaiting);
      }
    } catch (err) {
      console.error('Error cargando colas:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [simForm.queueId]);

  React.useEffect(() => {
    loadData();
    // Intervalo de actualización en vivo cada 3 segundos
    const interval = setInterval(() => {
      loadData(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Actualizar segunderos locales en memoria cada segundo
  React.useEffect(() => {
    const ticker = setInterval(() => {
      setLiveCallers((prev) =>
        prev.map((c) => ({
          ...c,
          waitSeconds: c.waitSeconds + 1,
        }))
      );
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          timeInStateSeconds: a.timeInStateSeconds + 1,
          wrapUpSecondsRemaining:
            a.status === 'WRAP_UP' && a.wrapUpSecondsRemaining && a.wrapUpSecondsRemaining > 0
              ? a.wrapUpSecondsRemaining - 1
              : 0,
        }))
      );
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const handleTakeCall = async (callId: string, queueId: string) => {
    try {
      const res = await fetch(`/api/voice/queues/${queueId}/take-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(`Llamada tomada con éxito por el supervisor.`);
        setTimeout(() => setNotification(null), 4000);
        loadData(false);
      } else {
        alert(data.error || 'No se pudo tomar la llamada');
      }
    } catch (err) {
      alert('Error de conexión al tomar la llamada');
    }
  };

  const handleEndWrapUp = async (userId: string) => {
    try {
      await fetch('/api/voice/agents/end-wrapup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      loadData(false);
      setNotification('Respiro finalizado. Asesor ahora disponible.');
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simForm.queueId) return;
    try {
      const res = await fetch('/api/voice/queues/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsSimModalOpen(false);
        setNotification(`Llamada simulada de ${simForm.fromNumber} ingresó a la cola.`);
        setTimeout(() => setNotification(null), 4000);
        loadData(false);
      }
    } catch (err) {
      alert('Error simulando llamada');
    }
  };

  const handleSaveAgentStatus = async () => {
    if (!statusModalAgent) return;
    try {
      const res = await fetch('/api/voice/agents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: statusModalAgent.userId,
          status: newStatus,
          reason: newStatus === 'BREAK' ? statusReason : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusModalAgent(null);
        setNotification(`Estado de ${statusModalAgent.name} cambiado a ${newStatus}.`);
        setTimeout(() => setNotification(null), 4000);
        loadData(false);
      } else {
        alert(data.error || 'Error cambiando estado');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleOpenEditQueue = (queue?: VoiceQueue) => {
    if (queue) {
      setEditingQueue({ ...queue });
    } else {
      setEditingQueue({
        id: '',
        name: '',
        extension: '804',
        strategy: 'ROUND_ROBIN',
        ringSeconds: 20,
        wrapUpSeconds: 10,
        maxWaitSeconds: 180,
        maxCallers: 15,
        announcePositionEverySeconds: 45,
        announceHoldTime: true,
        musicOnHold: 'jazz_suave',
        overflowTarget: 'VOICEMAIL',
        overflowAssigneeName: 'Coordinador Comercial',
        exitKey: '9',
        isActive: true,
        members: [
          { id: 'm_new_1', userId: 'usr_cristian', name: 'Cristian Silva', extension: '101', penalty: 0, skills: ['ventas'], isActive: true },
        ],
        waitingCallsCount: 0,
        longestWaitSeconds: 0,
        waitTrafficLight: 'GREEN',
        agentsConnectedCount: 1,
        agentsAvailableCount: 1,
        agentsOnCallCount: 0,
        answeredToday: 0,
        abandonedToday: 0,
        targetSlaSeconds: 20,
        serviceLevelPercentage: 100,
        previewSummary: '',
      });
    }
    setIsQueueModalOpen(true);
  };

  const handleSaveQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQueue) return;

    try {
      const res = await fetch('/api/voice/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQueue),
      });
      const data = await res.json();
      if (data.success) {
        setIsQueueModalOpen(false);
        setEditingQueue(null);
        setNotification(`Cola "${data.queue.name}" guardada con éxito.`);
        setTimeout(() => setNotification(null), 4000);
        loadData(false);
      } else {
        alert(data.error || 'Error guardando cola');
      }
    } catch (e) {
      alert('Error de conexión al guardar cola');
    }
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCallers = selectedQueueId === 'ALL'
    ? liveCallers
    : liveCallers.filter((c) => c.queueId === selectedQueueId);

  const totalWaiting = queues.reduce((acc, q) => acc + q.waitingCallsCount, 0);
  const globalMaxWait = queues.length > 0 ? Math.max(...queues.map((q) => q.longestWaitSeconds)) : 0;
  const totalConnected = agents.filter((a) => a.status !== 'OFFLINE').length;
  const totalAvailable = agents.filter((a) => a.status === 'AVAILABLE').length;
  const totalOnCall = agents.filter((a) => a.status === 'ON_CALL').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header con tabs y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-amber-600 dark:text-amber-500" />
              Colas de Atención Telefónica (ACD)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Etapa 17.6
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Distribución inteligente de llamadas, holding bridges con música, penalidades y supervisión en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-1">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              Monitoreo en Vivo
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar Colas ({queues.length})
            </button>
          </div>

          <button
            onClick={() => setIsSimModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
            title="Simular una llamada entrando a una cola"
          >
            <Play className="w-3.5 h-3.5 text-amber-600" />
            Simular Llamada
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner de notificación */}
      {notification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* TAB 1: MONITOREO EN VIVO */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Métricas clave en cabecera */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                <span>En Espera Ahora</span>
                <PhoneCall className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {totalWaiting}
                </span>
                <span className="text-xs text-neutral-500">llamadas</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                <span>Mayor Espera</span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold ${
                    globalMaxWait > 180
                      ? 'text-rose-600 dark:text-rose-400'
                      : globalMaxWait >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatSeconds(globalMaxWait)}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    globalMaxWait > 180
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : globalMaxWait >= 60
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {globalMaxWait > 180 ? 'Crítico' : globalMaxWait >= 60 ? 'Moderado' : 'Óptimo'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                <span>Agentes en Línea</span>
                <UserCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {totalAvailable}
                </span>
                <span className="text-xs text-neutral-500">
                  disponibles / {totalConnected} conectados
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                <span>SLA Comercial (20s)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  92.8%
                </span>
                <span className="text-xs text-neutral-500">meta ≥ 90%</span>
              </div>
            </div>
          </div>

          {/* Selector de colas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {queues.map((q) => {
              const isSelected = selectedQueueId === q.id || selectedQueueId === 'ALL';
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQueueId(selectedQueueId === q.id ? 'ALL' : q.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-neutral-900 ${
                    selectedQueueId === q.id
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Ext {q.extension}
                        </span>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {q.name}
                        </h3>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 block">
                        Estrategia: {STRATEGY_INFO[q.strategy]?.label || q.strategy}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          q.waitingCallsCount > 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        {q.waitingCallsCount} en fila
                      </span>
                      {q.waitingCallsCount > 0 && (
                        <span className="text-[11px] block mt-1 font-mono font-medium text-rose-600">
                          Espera: {formatSeconds(q.longestWaitSeconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle compacto de asesores */}
                  <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      Asesores: <strong>{q.agentsAvailableCount}</strong> disp. / <strong>{q.agentsConnectedCount}</strong> en línea
                    </span>
                    <span>
                      SLA: <strong className="text-emerald-600">{q.serviceLevelPercentage}%</strong>
                    </span>
                  </div>

                  {/* Resumen en lenguaje natural */}
                  <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-950 p-2 rounded border border-neutral-100 dark:border-neutral-800">
                    "{q.previewSummary}"
                  </p>
                </div>
              );
            })}
          </div>

          {/* Fila en vivo: Llamadas esperando y Asesores */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel de llamadas esperando */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-500" />
                  Llamadas en Fila de Espera ({filteredCallers.length})
                </h2>
                {selectedQueueId !== 'ALL' && (
                  <button
                    onClick={() => setSelectedQueueId('ALL')}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Ver todas las colas
                  </button>
                )}
              </div>

              {filteredCallers.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-2">
                    Sin llamadas en espera
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Todos los clientes entrantes están siendo atendidos de inmediato.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCallers.map((c) => {
                    const queue = queues.find((q) => q.id === c.queueId);
                    const isRed = c.waitSeconds > 180;
                    const isYellow = c.waitSeconds >= 60 && c.waitSeconds <= 180;

                    return (
                      <div
                        key={c.callId}
                        className={`p-4 rounded-xl border transition-all bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isRed
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30'
                            : isYellow
                            ? 'border-amber-300 dark:border-amber-900/60'
                            : 'border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                              isRed
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : isYellow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            #{c.position}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                                {c.callerName || 'Cliente no identificado'}
                              </span>
                              <span className="text-xs font-mono text-neutral-500">
                                {c.fromNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                              <span>Cola: <strong>{queue?.name || c.queueId}</strong></span>
                              <span>•</span>
                              <span>Espera est.: ~{c.estimatedWaitMinutes} min</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                          <div className="text-right">
                            <span
                              className={`text-sm font-mono font-bold block ${
                                isRed
                                  ? 'text-rose-600 animate-pulse'
                                  : isYellow
                                  ? 'text-amber-600'
                                  : 'text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {formatSeconds(c.waitSeconds)}
                            </span>
                            <span className="text-[10px] text-neutral-400">tiempo transcurrido</span>
                          </div>

                          <button
                            onClick={() => handleTakeCall(c.callId, c.queueId)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                            title="El supervisor toma la llamada inmediatamente en su softphone"
                          >
                            <PhoneForwarded className="w-3.5 h-3.5" />
                            Tomar Llamada
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel de Asesores en Vivo */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Estado de Asesores ({agents.length})
                </h2>
                <span className="text-xs text-neutral-500">
                  {totalAvailable} libres / {totalOnCall} en llamada
                </span>
              </div>

              <div className="space-y-3">
                {agents.map((a) => {
                  let badgeColor = 'bg-neutral-100 text-neutral-700 border-neutral-200';
                  let label = 'Desconectado';

                  if (a.status === 'AVAILABLE') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300';
                    label = 'Disponible';
                  } else if (a.status === 'ON_CALL') {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300';
                    label = 'En Llamada';
                  } else if (a.status === 'WRAP_UP') {
                    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300';
                    label = `Respiro (${a.wrapUpSecondsRemaining || 0}s)`;
                  } else if (a.status === 'BREAK') {
                    badgeColor = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300';
                    label = `Pausa: ${a.reason || 'Descanso'}`;
                  }

                  return (
                    <div
                      key={a.userId}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {a.name}
                          </span>
                          <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            Ext {a.extension}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                          <span>{a.role}</span>
                          <span>•</span>
                          <span>{a.callsHandledToday} llamadas hoy</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
                            {label}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400 block mt-0.5">
                            {formatSeconds(a.timeInStateSeconds)}
                          </span>
                        </div>

                        {/* Botón para terminar respiro si está en WRAP_UP */}
                        {a.status === 'WRAP_UP' && (
                          <button
                            onClick={() => handleEndWrapUp(a.userId)}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-purple-300 hover:bg-purple-50 text-purple-700 dark:hover:bg-purple-950"
                            title="Finalizar respiro de post-llamada anticipadamente"
                          >
                            Listo
                          </button>
                        )}

                        {/* Botón supervisor para cambiar estado */}
                        <button
                          onClick={() => {
                            setStatusModalAgent(a);
                            setNewStatus(a.status === 'AVAILABLE' ? 'BREAK' : 'AVAILABLE');
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                          title="Cambiar estado del asesor"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN DE COLAS */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Colas Telefónicas Configuradas
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Reglas de reparto, tiempos de timbrado, respiro de post-llamada y desbordes.
              </p>
            </div>

            <button
              onClick={() => handleOpenEditQueue()}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Cola de Atención
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {queues.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Extensión {q.extension}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {q.name}
                      </h3>
                      <span className="text-xs text-neutral-500">
                        Estrategia: <strong>{STRATEGY_INFO[q.strategy]?.label || q.strategy}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {q.members.length} miembros asignados
                    </span>
                    <button
                      onClick={() => handleOpenEditQueue(q)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Editar Parámetros
                    </button>
                  </div>
                </div>

                {/* Parámetros clave de la cola */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500 block">Timbrado / Respiro:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {q.ringSeconds}s ring / {q.wrapUpSeconds}s wrap-up
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500 block">Tiempo Máx. Espera:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {q.maxWaitSeconds} segundos ({Math.round(q.maxWaitSeconds / 60)} min)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500 block">Capacidad Máxima:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {q.maxCallers} llamantes simultáneos
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500 block">Destino de Desborde:</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {q.overflowTarget} {q.overflowAssigneeName ? `(${q.overflowAssigneeName})` : ''}
                    </span>
                  </div>
                </div>

                {/* Lista de Asesores y Penalidades */}
                <div>
                  <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Miembros y Prioridades (Penalidad 0 = Mayor Prioridad):
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {q.members.map((m) => (
                      <div
                        key={m.id}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs flex items-center gap-2"
                      >
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {m.name} (Ext {m.extension})
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Penalidad {m.penalty}
                        </span>
                        {m.skills.length > 0 && (
                          <span className="text-[10px] text-neutral-500">
                            [{m.skills.join(', ')}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vista previa en lenguaje natural */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-900 dark:text-amber-300">
                  <strong>Regla de Desborde:</strong> {q.previewSummary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR / CREAR COLA */}
      {isQueueModalOpen && editingQueue && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl shadow-xl overflow-hidden my-8">
            <form onSubmit={handleSaveQueue}>
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {editingQueue.id ? 'Editar Parámetros de Cola' : 'Nueva Cola de Atención'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nombre de la Cola
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQueue.name}
                      onChange={(e) => setEditingQueue({ ...editingQueue, name: e.target.value })}
                      placeholder="Ej: Ventas y Cotizaciones"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Extensión Telefónica
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQueue.extension}
                      onChange={(e) => setEditingQueue({ ...editingQueue, extension: e.target.value })}
                      placeholder="801"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Estrategia de Reparto (ACD)
                  </label>
                  <select
                    value={editingQueue.strategy}
                    onChange={(e) => setEditingQueue({ ...editingQueue, strategy: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                  >
                    {Object.entries(STRATEGY_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {STRATEGY_INFO[editingQueue.strategy]?.desc}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Ring (segundos)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={editingQueue.ringSeconds}
                      onChange={(e) => setEditingQueue({ ...editingQueue, ringSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Respiro (wrap-up)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={editingQueue.wrapUpSeconds}
                      onChange={(e) => setEditingQueue({ ...editingQueue, wrapUpSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Máx Espera (s)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={600}
                      value={editingQueue.maxWaitSeconds}
                      onChange={(e) => setEditingQueue({ ...editingQueue, maxWaitSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Máx Personas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editingQueue.maxCallers}
                      onChange={(e) => setEditingQueue({ ...editingQueue, maxCallers: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Destino de Desborde
                    </label>
                    <select
                      value={editingQueue.overflowTarget}
                      onChange={(e) => setEditingQueue({ ...editingQueue, overflowTarget: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    >
                      <option value="VOICEMAIL">Buzón de Voz de la Cola</option>
                      <option value="EXTERNAL_NUMBER">Número Celular / Externo</option>
                      <option value="ANOTHER_QUEUE">Otra Cola de Atención</option>
                      <option value="AI_AGENT">Agente IA Conversacional</option>
                      <option value="HANGUP_WITH_MESSAGE">Colgar y Crear Tarea CRM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Responsable / Destino Específico
                    </label>
                    <input
                      type="text"
                      value={editingQueue.overflowAssigneeName || ''}
                      onChange={(e) => setEditingQueue({ ...editingQueue, overflowAssigneeName: e.target.value })}
                      placeholder="Ej: Ana Gómez (Líder Ventas)"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-neutral-950">
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR ESTADO DE AGENTE */}
      {statusModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md shadow-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Cambiar Estado: {statusModalAgent.name}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nuevo Estado
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                >
                  <option value="AVAILABLE">Disponible (recibir llamadas)</option>
                  <option value="BREAK">Pausa / Descanso</option>
                  <option value="OFFLINE">Desconectado</option>
                </select>
              </div>

              {newStatus === 'BREAK' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Motivo de la Pausa
                  </label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Ej: Almuerzo, Capacitación, Baño"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => setStatusModalAgent(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAgentStatus}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                Aplicar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULAR LLAMADA ENTRANTE */}
      {isSimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md shadow-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Simular Llamada a Cola de Atención
            </h3>
            <p className="text-xs text-neutral-500">
              Genera una llamada entrante en espera para verificar los holding bridges, el timbrado y la atención del agente.
            </p>

            <form onSubmit={handleSimulateCall} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Cola Destino
                </label>
                <select
                  value={simForm.queueId}
                  onChange={(e) => setSimForm({ ...simForm, queueId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                >
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} (Ext {q.extension})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={simForm.callerName}
                  onChange={(e) => setSimForm({ ...simForm, callerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Número Telefónico
                </label>
                <input
                  type="text"
                  required
                  value={simForm.fromNumber}
                  onChange={(e) => setSimForm({ ...simForm, fromNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Ingresar Llamada a Cola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VozColasPage;
