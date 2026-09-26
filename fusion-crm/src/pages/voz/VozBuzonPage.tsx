import * as React from 'react';
import {
  Voicemail,
  Play,
  Pause,
  PhoneCall,
  CheckCircle,
  Clock,
  User,
  Building2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  Share2,
  Trash2,
  Archive,
  ArrowRight,
  FileText,
  Volume2,
  CheckCircle2,
  Sparkles,
  FastForward,
  UserCheck,
} from 'lucide-react';

interface VoiceVoicemailItem {
  id: string;
  queueId?: string;
  queueName?: string;
  extension?: string;
  fromNumber: string;
  callerName?: string;
  customerId?: string;
  customerName?: string;
  recordingUrl: string;
  durationSeconds: number;
  transcriptionText?: string;
  transcriptionStatus: 'COMPLETED' | 'PENDING' | 'FAILED';
  isRead: boolean;
  callBackDone: boolean;
  callBackAt?: string;
  callBackByUserName?: string;
  createdAt: string;
  notes?: string;
  assignedToUserName?: string;
}

export function VozBuzonPage() {
  const [messages, setMessages] = React.useState<VoiceVoicemailItem[]>([]);
  const [filterType, setFilterType] = React.useState<'ALL' | 'UNREAD' | 'PENDING_CALLBACK' | 'COMPLETED'>('PENDING_CALLBACK');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMessage, setSelectedMessage] = React.useState<VoiceVoicemailItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [notification, setNotification] = React.useState<string | null>(null);

  // Estados del reproductor
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackProgress, setPlaybackProgress] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);

  // Modal para nota / devolución
  const [isCallbackModalOpen, setIsCallbackModalOpen] = React.useState(false);
  const [callbackNotes, setCallbackNotes] = React.useState('');

  const loadMessages = React.useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/voice/voicemails');
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
        if (!selectedMessage && data.messages.length > 0) {
          setSelectedMessage(data.messages[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando buzones:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMessage]);

  React.useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Simulación de reproducción
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && selectedMessage) {
      timer = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= selectedMessage.durationSeconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedMessage, playbackSpeed]);

  const handleSelectMessage = async (msg: VoiceVoicemailItem) => {
    setSelectedMessage(msg);
    setIsPlaying(false);
    setPlaybackProgress(0);

    if (!msg.isRead) {
      try {
        await fetch(`/api/voice/voicemails/${msg.id}/read`, { method: 'POST' });
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
        );
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMarkCallbackDone = async () => {
    if (!selectedMessage) return;
    try {
      const res = await fetch(`/api/voice/voicemails/${selectedMessage.id}/callback-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: callbackNotes }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCallbackModalOpen(false);
        setCallbackNotes('');
        setNotification(`Llamada de ${selectedMessage.fromNumber} marcada como devuelta.`);
        setTimeout(() => setNotification(null), 4000);
        loadMessages(false);
      }
    } catch (e) {
      alert('Error registrando devolución');
    }
  };

  const handleCallNow = (number: string) => {
    setNotification(`Iniciando llamada a ${number} desde el softphone...`);
    setTimeout(() => setNotification(null), 4000);
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtrado
  const filteredMessages = messages.filter((m) => {
    if (filterType === 'UNREAD' && m.isRead) return false;
    if (filterType === 'PENDING_CALLBACK' && m.callBackDone) return false;
    if (filterType === 'COMPLETED' && !m.callBackDone) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const textMatch = m.transcriptionText?.toLowerCase().includes(q);
      const callerMatch = m.callerName?.toLowerCase().includes(q);
      const numberMatch = m.fromNumber.includes(q);
      const queueMatch = m.queueName?.toLowerCase().includes(q);
      return textMatch || callerMatch || numberMatch || queueMatch;
    }

    return true;
  });

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const pendingCallbackCount = messages.filter((m) => !m.callBackDone).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Voicemail className="w-7 h-7 text-amber-600 dark:text-amber-500" />
              Buzón de Voz y Mensajes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Etapa 17.6
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Mensajes grabados en colas de atención y extensiones con transcripción automática y gestión de devoluciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadMessages(true)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            Actualizar
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

      {/* Métricas clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Pendientes por Devolver</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCallbackCount}
            </span>
            <span className="text-xs text-neutral-400">mensajes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Mensajes No Leídos</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {unreadCount}
            </span>
            <span className="text-xs text-neutral-400">nuevos</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Promedio de Duración</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              42s
            </span>
            <span className="text-xs text-neutral-400">máx. 120s</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Tasa de Devolución &lt; 2h</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              95.4%
            </span>
            <span className="text-xs text-neutral-400">meta 90%</span>
          </div>
        </div>
      </div>

      {/* Contenido principal: Lista a la izquierda, Detalle a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna izquierda: Lista y filtros */}
        <div className="lg:col-span-5 space-y-4">
          {/* Barra de búsqueda y pestañas */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, teléfono o transcripción..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                onClick={() => setFilterType('PENDING_CALLBACK')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'PENDING_CALLBACK'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Por Devolver ({pendingCallbackCount})
              </button>
              <button
                onClick={() => setFilterType('UNREAD')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'UNREAD'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                No Leídos ({unreadCount})
              </button>
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Todos ({messages.length})
              </button>
            </div>
          </div>

          {/* Lista de mensajes */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 text-xs">
                No hay mensajes con el filtro seleccionado.
              </div>
            ) : (
              filteredMessages.map((m) => {
                const isSelected = selectedMessage?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMessage(m)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white dark:bg-neutral-900 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                        : !m.isRead
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!m.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {m.callerName || m.fromNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {formatSeconds(m.durationSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                      <span>{m.queueName || `Ext ${m.extension}`}</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {m.transcriptionText && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2 italic">
                        "{m.transcriptionText}"
                      </p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                      {m.callBackDone ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Devuelta por {m.callBackByUserName || 'Asesor'}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pendiente de devolución
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna derecha: Reproductor, Transcripción y Acciones */}
        <div className="lg:col-span-7">
          {selectedMessage ? (
            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-6">
              {/* Encabezado del mensaje */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {selectedMessage.callerName || 'Contacto no registrado'}
                    </h2>
                    <span className="text-xs font-mono text-neutral-500">
                      {selectedMessage.fromNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span>Cola: <strong>{selectedMessage.queueName || 'General'}</strong></span>
                    <span>•</span>
                    <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCallNow(selectedMessage.fromNumber)}
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Devolver Llamada
                  </button>

                  {!selectedMessage.callBackDone && (
                    <button
                      onClick={() => setIsCallbackModalOpen(true)}
                      className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Marcar Devuelta
                    </button>
                  )}
                </div>
              </div>

              {/* Reproductor de Audio */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlay}
                      className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>

                    <div>
                      <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 block">
                        {formatSeconds(playbackProgress)} / {formatSeconds(selectedMessage.durationSeconds)}
                      </span>
                      <span className="text-[10px] text-neutral-400">Audio WAV (8kHz / mono)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Control de velocidad */}
                    <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-0.5 text-xs font-semibold">
                      {[1, 1.25, 1.5].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            playbackSpeed === speed
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'text-neutral-500'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>

                    <a
                      href={selectedMessage.recordingUrl}
                      download={`buzon_${selectedMessage.id}.wav`}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      title="Descargar audio"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Barra de progreso interactiva / Onda simulada */}
                <div className="space-y-1">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = clickX / rect.width;
                      setPlaybackProgress(Math.floor(ratio * selectedMessage.durationSeconds));
                    }}
                    className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden cursor-pointer relative"
                  >
                    <div
                      className="h-full bg-amber-500 transition-all duration-150"
                      style={{
                        width: `${(playbackProgress / selectedMessage.durationSeconds) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                    <span>0:00</span>
                    <span>{formatSeconds(selectedMessage.durationSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Transcripción Inteligente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Transcripción del Mensaje
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                    Confianza: 98%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                  {selectedMessage.transcriptionText ? (
                    <p className="whitespace-pre-line font-serif italic">
                      "{selectedMessage.transcriptionText}"
                    </p>
                  ) : (
                    <p className="text-neutral-400 text-xs">
                      Transcripción en proceso de procesamiento...
                    </p>
                  )}
                </div>
              </div>

              {/* Información de Devolución / Tarea CRM */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-neutral-800 dark:text-neutral-200">
                  <span>Estado de Devolución:</span>
                  {selectedMessage.callBackDone ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      Llamada Devuelta
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold">
                      Pendiente (Tarea creada en CRM)
                    </span>
                  )}
                </div>

                {selectedMessage.callBackDone && selectedMessage.callBackAt && (
                  <div className="text-neutral-500">
                    Devuelto el {new Date(selectedMessage.callBackAt).toLocaleString()} por{' '}
                    <strong>{selectedMessage.callBackByUserName || 'Asesor'}</strong>.
                  </div>
                )}

                {selectedMessage.notes && (
                  <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <strong>Notas de devolución:</strong> {selectedMessage.notes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 text-sm">
              Selecciona un mensaje del buzón para ver el reproductor y la transcripción.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: REGISTRAR DEVOLUCIÓN */}
      {isCallbackModalOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md shadow-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Registrar Devolución de Llamada
            </h3>
            <p className="text-xs text-neutral-500">
              Marca este mensaje como resuelto y guarda las notas del resultado de la llamada.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Resultado / Notas de la conversación
              </label>
              <textarea
                rows={3}
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Ej: Se devolvió la llamada, el cliente solicitó cotización adicional de 5.000 catálogos..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
              />
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCallbackModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkCallbackDone}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirmar Devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VozBuzonPage;
