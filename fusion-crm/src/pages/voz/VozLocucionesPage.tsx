import * as React from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Plus,
  Upload,
  Bot,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Clock,
  FileAudio,
  Shield,
  Radio,
  Sliders,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface VoicePromptItem {
  id: string;
  name: string;
  description?: string;
  category: 'ANNOUNCEMENT' | 'MENU' | 'HOLD_MUSIC' | 'VOICEMAIL' | 'LEGAL' | 'CAMPAIGN';
  source: 'UPLOADED' | 'BROWSER_RECORD' | 'PHONE_RECORD' | 'TTS';
  text: string;
  ttsVoice?: string;
  ttsLanguage: string;
  asteriskFilename: string;
  durationSeconds: number;
  format: string;
  verifiedInAsterisk: boolean;
  verifiedAt?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  previousVersions?: Array<{
    version: number;
    createdAt: string;
    durationSeconds: number;
    source: string;
    text: string;
    storageKey: string;
  }>;
  usage?: {
    flows: Array<{ flowId: string; flowName: string; nodeId: string; nodeLabel: string }>;
    queues: Array<{ queueId: string; queueName: string }>;
    totalUsageCount: number;
    inUse: boolean;
  };
}

export function VozLocucionesPage() {
  const [prompts, setPrompts] = React.useState<VoicePromptItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('TODAS');
  const [sourceFilter, setSourceFilter] = React.useState<string>('TODOS');

  // Estado del reproductor de audio
  const [activePlayingId, setActivePlayingId] = React.useState<string | null>(null);
  const [playingProgress, setPlayingProgress] = React.useState(0);

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [modalTab, setModalTab] = React.useState<'BROWSER' | 'PHONE' | 'TTS' | 'UPLOAD'>('BROWSER');
  const [historyModalPrompt, setHistoryModalPrompt] = React.useState<VoicePromptItem | null>(null);
  const [usageBlockedPrompt, setUsageBlockedPrompt] = React.useState<VoicePromptItem | null>(null);
  const [deleteConfirmPrompt, setDeleteConfirmPrompt] = React.useState<VoicePromptItem | null>(null);

  // Formulario de nueva locución
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: 'ANNOUNCEMENT' as VoicePromptItem['category'],
    text: '',
    ttsVoice: 'es-CO-Standard-A',
    durationSeconds: 6,
  });

  // Estado para grabación en navegador
  const [isRecording, setIsRecording] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const [recordedAudioAvailable, setRecordedAudioAvailable] = React.useState(false);
  const [trimStart, setTrimStart] = React.useState(0.1);
  const [trimEnd, setTrimEnd] = React.useState(0.1);
  const [normalized, setNormalized] = React.useState(true);

  // Estado para TTS preview
  const [ttsPreviewLoading, setTtsPreviewLoading] = React.useState(false);
  const [ttsPreviewResult, setTtsPreviewResult] = React.useState<any | null>(null);

  // Mensaje de notificación
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/voice/prompts');
      const json = await res.json();
      if (json.success) {
        setPrompts(json.data);
      }
    } catch (err) {
      showToast('error', 'Error al consultar catálogo de locuciones.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPrompts();
  }, []);

  // Simulación de audio reproduciéndose
  React.useEffect(() => {
    if (!activePlayingId) return;
    const interval = setInterval(() => {
      setPlayingProgress((prev) => {
        if (prev >= 100) {
          setActivePlayingId(null);
          return 0;
        }
        return prev + 5;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [activePlayingId]);

  const togglePlay = (id: string) => {
    if (activePlayingId === id) {
      setActivePlayingId(null);
      setPlayingProgress(0);
    } else {
      setActivePlayingId(id);
      setPlayingProgress(0);
    }
  };

  // Simulación de grabación de audio con cuenta regresiva
  const handleStartBrowserRecording = () => {
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown((c) => {
        if (c && c > 1) return c - 1;
        clearInterval(countInterval);
        setCountdown(null);
        setIsRecording(true);
        setRecordSeconds(0);
        return null;
      });
    }, 900);
  };

  React.useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  const handleStopBrowserRecording = () => {
    setIsRecording(false);
    setRecordedAudioAvailable(true);
    setFormData((prev) => ({
      ...prev,
      durationSeconds: Math.max(recordSeconds, 3),
    }));
  };

  // Generar TTS Preview
  const handleGenerateTtsPreview = async () => {
    if (!formData.text.trim()) {
      showToast('error', 'El guion es obligatorio para generar TTS.');
      return;
    }
    try {
      setTtsPreviewLoading(true);
      const res = await fetch('/api/voice/prompts/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.text, voice: formData.ttsVoice }),
      });
      const json = await res.json();
      if (json.success) {
        setTtsPreviewResult(json.preview);
        setFormData((prev) => ({
          ...prev,
          durationSeconds: json.preview.estimatedDurationSeconds,
        }));
        showToast('success', 'Previsualización TTS generada correctamente.');
      }
    } catch {
      showToast('error', 'Error generando previsualización de voz.');
    } finally {
      setTtsPreviewLoading(false);
    }
  };

  // Guardar nueva locución o nueva versión
  const handleSavePrompt = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'El nombre de la locución es requerido.');
      return;
    }
    if (!formData.text.trim()) {
      showToast('error', 'El guion escrito es OBLIGATORIO para guardar la locución.');
      return;
    }

    let sourceVal: VoicePromptItem['source'] = 'BROWSER_RECORD';
    if (modalTab === 'PHONE') sourceVal = 'PHONE_RECORD';
    if (modalTab === 'TTS') sourceVal = 'TTS';
    if (modalTab === 'UPLOAD') sourceVal = 'UPLOADED';

    try {
      const res = await fetch('/api/voice/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          source: sourceVal,
          text: formData.text,
          durationSeconds: formData.durationSeconds,
          ttsVoice: formData.ttsVoice,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', `Locución "${json.data.name}" creada y convertida a WAV 8kHz mono en Asterisk.`);
        setIsNewModalOpen(false);
        setFormData({
          name: '',
          description: '',
          category: 'ANNOUNCEMENT',
          text: '',
          ttsVoice: 'es-CO-Standard-A',
          durationSeconds: 6,
        });
        setRecordedAudioAvailable(false);
        setTtsPreviewResult(null);
        fetchPrompts();
      } else {
        showToast('error', json.error || 'Error al guardar locución.');
      }
    } catch {
      showToast('error', 'Error en la conexión con el servidor.');
    }
  };

  // Borrado con protección si está en uso
  const handleDeletePrompt = async (prompt: VoicePromptItem) => {
    if (prompt.usage?.inUse) {
      setUsageBlockedPrompt(prompt);
      return;
    }
    setDeleteConfirmPrompt(prompt);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmPrompt) return;
    try {
      const res = await fetch(`/api/voice/prompts/${deleteConfirmPrompt.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message);
        setDeleteConfirmPrompt(null);
        fetchPrompts();
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al eliminar locución.');
    }
  };

  // Revertir versión
  const handleRevertVersion = async (promptId: string, version: number) => {
    try {
      const res = await fetch(`/api/voice/prompts/${promptId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: version }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message);
        setHistoryModalPrompt(null);
        fetchPrompts();
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al revertir versión.');
    }
  };

  // Filtrado de lista
  const filteredPrompts = prompts.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCategory = categoryFilter === 'TODAS' || p.category === categoryFilter;
    const matchSource = sourceFilter === 'TODOS' || p.source === sourceFilter;
    return matchSearch && matchCategory && matchSource;
  });

  const categoryLabels: Record<string, { label: string; color: string }> = {
    LEGAL: { label: 'Aviso Legal', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    MENU: { label: 'Menú Conmutador', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    ANNOUNCEMENT: { label: 'Informativo', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    HOLD_MUSIC: { label: 'Espera / Cola', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    VOICEMAIL: { label: 'Buzón de Voz', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    CAMPAIGN: { label: 'Campaña', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  };

  const sourceLabels: Record<string, { label: string; icon: any }> = {
    BROWSER_RECORD: { label: 'Navegador', icon: Mic },
    PHONE_RECORD: { label: 'Teléfono *77', icon: PhoneCall },
    TTS: { label: 'TTS Neuronal es-CO', icon: Bot },
    UPLOADED: { label: 'Archivo Subido', icon: Upload },
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Biblioteca de Locuciones</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Asterisk PCM 8kHz Mono
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de audios con guion obligatorio, versionado inmutable, 4 métodos de creación y protección contra borrado accidental.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPrompts}
            className="p-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition"
            title="Actualizar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Locución</span>
          </button>
        </div>
      </div>

      {/* Advertencia Mandatoria de Calidad */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-sm">
        <Mic className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Recomendación de calidad para grabaciones de voz</p>
          <p className="text-amber-800 text-xs mt-0.5">
            Grabe en un lugar silencioso, a 20 cm del micrófono, hablando despacio y con tono profesional.
            La calidad de las locuciones es lo primero que un cliente juzga de una empresa.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, palabra clave o texto del guion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Categoría:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="TODAS">Todas las categorías</option>
            <option value="LEGAL">Aviso Legal</option>
            <option value="MENU">Menú Conmutador</option>
            <option value="ANNOUNCEMENT">Informativo</option>
            <option value="HOLD_MUSIC">Espera / Cola</option>
            <option value="VOICEMAIL">Buzón de Voz</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-2">
            <span>Origen:</span>
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="TODOS">Todos los orígenes</option>
            <option value="BROWSER_RECORD">Navegador</option>
            <option value="PHONE_RECORD">Teléfono *77</option>
            <option value="TTS">TTS Neuronal</option>
            <option value="UPLOADED">Archivo Subido</option>
          </select>
        </div>
      </div>

      {/* Tabla de Locuciones */}
      <div className="bg-white rounded-xl border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Reproducir</th>
                <th className="py-3 px-4">Nombre y Guion Obligatorio</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Duración</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4">Versión</th>
                <th className="py-3 px-4">Dónde se Usa</th>
                <th className="py-3 px-4">Asterisk</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 text-sm">
                    No se encontraron locuciones con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((prompt) => {
                  const isPlaying = activePlayingId === prompt.id;
                  const cat = categoryLabels[prompt.category] || { label: prompt.category, color: 'bg-gray-100' };
                  const src = sourceLabels[prompt.source] || { label: prompt.source, icon: FileAudio };
                  const SrcIcon = src.icon;
                  const usageCount = prompt.usage?.totalUsageCount || 0;

                  return (
                    <tr key={prompt.id} className="hover:bg-gray-50 transition">
                      {/* Reproductor inline */}
                      <td className="py-3 px-4 w-12">
                        <button
                          onClick={() => togglePlay(prompt.id)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-xs ${
                            isPlaying
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                          title={isPlaying ? 'Pausar' : 'Reproducir locución'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      </td>

                      {/* Nombre y Guion */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-gray-900">{prompt.name}</div>
                        {prompt.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">{prompt.description}</div>
                        )}
                        <div className="mt-1 p-2 bg-gray-50 rounded border text-xs text-gray-700 font-mono italic line-clamp-2">
                          "{prompt.text}"
                        </div>
                        {isPlaying && (
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-indigo-600 h-full transition-all duration-150"
                              style={{ width: `${playingProgress}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      </td>

                      {/* Duración */}
                      <td className="py-3 px-4 font-mono text-xs text-gray-700 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {prompt.durationSeconds}s
                        </span>
                      </td>

                      {/* Origen */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <SrcIcon className="w-3.5 h-3.5 text-gray-500" />
                          <span>{src.label}</span>
                        </div>
                      </td>

                      {/* Versión */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setHistoryModalPrompt(prompt)}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs font-mono font-medium flex items-center gap-1 transition"
                          title="Ver historial de versiones y restaurar"
                        >
                          <History className="w-3 h-3 text-gray-500" />
                          <span>v{prompt.version}</span>
                        </button>
                      </td>

                      {/* Dónde se usa */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {usageCount > 0 ? (
                          <button
                            onClick={() => setUsageBlockedPrompt(prompt)}
                            className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-100 transition"
                          >
                            En {usageCount} flujo(s)
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Sin uso</span>
                        )}
                      </td>

                      {/* Estado Asterisk */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {prompt.verifiedInAsterisk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setFormData({
                                name: prompt.name,
                                description: prompt.description || '',
                                category: prompt.category,
                                text: prompt.text,
                                ttsVoice: prompt.ttsVoice || 'es-CO-Standard-A',
                                durationSeconds: prompt.durationSeconds,
                              });
                              setIsNewModalOpen(true);
                            }}
                            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="Regrabar o crear nueva versión"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(prompt)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Eliminar locución (protegido)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NUEVA LOCUCIÓN CON LAS 4 MODALIDADES */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Crear o Regrabar Locución</h2>
                <p className="text-xs text-gray-500">
                  WAV lineal 16 bits, 8 kHz, mono nativo para Asterisk (/var/lib/asterisk/sounds/fusion).
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Selector de Pestañas de Creación */}
              <div className="grid grid-cols-4 gap-2 border p-1 rounded-xl bg-gray-50">
                <button
                  onClick={() => setModalTab('BROWSER')}
                  className={`py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition ${
                    modalTab === 'BROWSER'
                      ? 'bg-white shadow-xs text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Navegador</span>
                </button>
                <button
                  onClick={() => setModalTab('PHONE')}
                  className={`py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition ${
                    modalTab === 'PHONE'
                      ? 'bg-white shadow-xs text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Teléfono (*77)</span>
                </button>
                <button
                  onClick={() => setModalTab('TTS')}
                  className={`py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition ${
                    modalTab === 'TTS'
                      ? 'bg-white shadow-xs text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>TTS Colombia</span>
                </button>
                <button
                  onClick={() => setModalTab('UPLOAD')}
                  className={`py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition ${
                    modalTab === 'UPLOAD'
                      ? 'bg-white shadow-xs text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo</span>
                </button>
              </div>

              {/* Campos comunes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Locución *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej: Bienvenida Comercial 2026"
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="ANNOUNCEMENT">Informativo</option>
                    <option value="MENU">Menú Conmutador (DTMF)</option>
                    <option value="LEGAL">Aviso Legal (No interrumpible)</option>
                    <option value="HOLD_MUSIC">Espera / Cola</option>
                    <option value="VOICEMAIL">Buzón de Voz</option>
                    <option value="CAMPAIGN">Campaña Saliente</option>
                  </select>
                </div>
              </div>

              {/* GUION ESCRITO OBLIGATORIO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                    <span>Guion Escrito (OBLIGATORIO)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Obligatorio incluso para grabaciones manuales (para búsqueda, revisión y re-grabación idéntica)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Escriba el texto exacto que se dirá en la locución..."
                  className="w-full text-sm border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans"
                />
              </div>

              {/* PESTAÑA 1: GRABAR EN NAVEGADOR */}
              {modalTab === 'BROWSER' && (
                <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center space-y-4 bg-gray-50">
                  {countdown !== null ? (
                    <div className="py-6">
                      <div className="text-5xl font-black text-indigo-600 animate-bounce">{countdown}</div>
                      <p className="text-xs text-gray-500 mt-2">Prepárese para hablar...</p>
                    </div>
                  ) : isRecording ? (
                    <div className="py-4 space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                        <span className="text-sm font-semibold text-rose-600">GRABANDO AUDIO EN VIVO</span>
                      </div>
                      <div className="text-3xl font-mono font-bold text-gray-900">00:{recordSeconds.toString().padStart(2, '0')}</div>
                      {/* Vúmetro simulado */}
                      <div className="flex items-center justify-center gap-1 h-8">
                        {[40, 75, 90, 60, 85, 95, 70, 50, 80, 65].map((h, i) => (
                          <div
                            key={i}
                            className="w-2 bg-indigo-500 rounded-full transition-all duration-100"
                            style={{ height: `${Math.random() * 24 + 6}px` }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleStopBrowserRecording}
                        className="px-5 py-2 bg-rose-600 text-white rounded-lg font-medium text-sm hover:bg-rose-700 shadow-xs"
                      >
                        Detener Grabación
                      </button>
                    </div>
                  ) : recordedAudioAvailable ? (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Grabación completada ({formData.durationSeconds}s)</span>
                      </div>
                      {/* Ajustes de silencios y normalización */}
                      <div className="grid grid-cols-2 gap-3 text-left p-3 bg-white rounded-lg border text-xs">
                        <div>
                          <span className="font-medium text-gray-700">Recorte silencio inicio:</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={trimStart}
                            onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                            className="w-full mt-1"
                          />
                          <span className="text-[11px] text-gray-500">{trimStart}s recortados</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Recorte silencio final:</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={trimEnd}
                            onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                            className="w-full mt-1"
                          />
                          <span className="text-[11px] text-gray-500">{trimEnd}s recortados</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={normalized}
                            onChange={(e) => setNormalized(e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          <span>Normalizar volumen a -16 LUFS (Estándar de telefonía)</span>
                        </label>
                        <button
                          onClick={handleStartBrowserRecording}
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Volver a grabar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <p className="text-xs text-gray-500">
                        Hable a 20 cm del micrófono. El sistema recortará automáticamente silencios al inicio y al final.
                      </p>
                      <button
                        onClick={handleStartBrowserRecording}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 shadow-xs inline-flex items-center gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Iniciar Grabación</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: GRABAR POR TELÉFONO (*77) */}
              {modalTab === 'PHONE' && (
                <div className="border rounded-xl p-5 bg-blue-50/50 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <PhoneCall className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold text-gray-900">Grabar desde Teléfono o Softphone (*77)</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Diseñado para quien tiene mejor voz en su auricular que micrófono de PC:
                      </p>
                    </div>
                  </div>
                  <ol className="list-decimal pl-5 text-xs text-gray-700 space-y-1.5">
                    <li>Marque la extensión especial <strong>*77</strong> desde su softphone o celular.</li>
                    <li>La grabadora de Asterisk le pedirá el número de locución (use el código asignado).</li>
                    <li>Hable después del tono y presione <strong>#</strong> al finalizar.</li>
                    <li>Escuche la reproducción y confirme presionando <strong>1</strong> para guardar.</li>
                  </ol>
                  <div className="p-2.5 bg-white border rounded-lg text-xs font-mono text-blue-800 flex items-center justify-between">
                    <span>Código de locución: <strong>LOC-744-9</strong></span>
                    <button
                      type="button"
                      onClick={() => showToast('success', 'Verificando con Asterisk ARI...')}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Comprobar Grabación
                    </button>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: TTS NEURONAL ES-CO */}
              {modalTab === 'TTS' && (
                <div className="border rounded-xl p-5 space-y-4 bg-indigo-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Síntesis Neuronal en Español de Colombia</h3>
                      <p className="text-xs text-gray-500">
                        Se guarda como archivo estático. NO se sintetiza en caliente en cada llamada.
                      </p>
                    </div>
                    <select
                      value={formData.ttsVoice}
                      onChange={(e) => setFormData({ ...formData, ttsVoice: e.target.value })}
                      className="text-xs border rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      <option value="es-CO-Standard-A">Voz Femenina (Bogotá Natural)</option>
                      <option value="es-CO-Standard-B">Voz Masculina (Bogotá Institucional)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={ttsPreviewLoading}
                    onClick={handleGenerateTtsPreview}
                    className="w-full py-2 bg-indigo-600 text-white font-medium text-xs rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    {ttsPreviewLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span>Generar y Escuchar Previsualización</span>
                  </button>

                  {ttsPreviewResult && (
                    <div className="p-3 bg-white rounded-lg border text-xs text-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Audio generado: {ttsPreviewResult.estimatedDurationSeconds}s (WAV 8kHz mono)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePlay('preview')}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-800 font-medium transition"
                      >
                        Reproducir
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 4: SUBIR ARCHIVO */}
              {modalTab === 'UPLOAD' && (
                <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-3 bg-gray-50">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Arrastre su archivo de audio o haga clic</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Acepta WAV, MP3 y M4A.</p>
                  </div>
                  <input
                    type="file"
                    accept=".wav,.mp3,.m4a"
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-left text-[11px] text-amber-800">
                    <strong>Validación automática:</strong> El motor convertirá el audio con ffmpeg a 16 bits, 8000 Hz, mono
                    y advertirá si detecta música de fondo excesivamente alta que opaque la voz.
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                La locución se compilará en formato slin16 nativo para Asterisk.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePrompt}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
                >
                  Guardar en Biblioteca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE VERSIONES Y ROLLBACK */}
      {historyModalPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900">Historial de Versiones</h3>
                <p className="text-xs text-gray-500">"{historyModalPrompt.name}"</p>
              </div>
              <button
                onClick={() => setHistoryModalPrompt(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Versión actual */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-indigo-900">v{historyModalPrompt.version} (Actual)</span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(historyModalPrompt.updatedAt).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1 italic">"{historyModalPrompt.text}"</p>
                </div>
                <span className="text-xs text-indigo-600 font-medium">Activa</span>
              </div>

              {/* Versiones previas */}
              {(!historyModalPrompt.previousVersions || historyModalPrompt.previousVersions.length === 0) && (
                <p className="text-xs text-gray-500 py-3 text-center">No hay versiones anteriores registradas.</p>
              )}

              {historyModalPrompt.previousVersions?.map((v) => (
                <div key={v.version} className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">v{v.version}</span>
                      <span className="text-gray-500">{new Date(v.createdAt).toLocaleDateString('es-CO')}</span>
                      <span className="text-gray-500 font-mono">({v.durationSeconds}s)</span>
                    </div>
                    <p className="text-gray-600 mt-0.5 line-clamp-1 italic">"{v.text}"</p>
                  </div>
                  <button
                    onClick={() => handleRevertVersion(historyModalPrompt.id, v.version)}
                    className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded text-gray-700 font-medium transition"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setHistoryModalPrompt(null)}
                className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BORRADO BLOQUEADO POR USO ACTIVO */}
      {usageBlockedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-start gap-3 text-rose-600">
              <Shield className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900 text-base">Borrado Protegido del Sistema</h3>
                <p className="text-xs text-gray-600 mt-1">
                  La locución "<strong>{usageBlockedPrompt.name}</strong>" no se puede borrar porque está en uso activo.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-2">
              <p className="font-semibold">Puntos de uso detectados:</p>
              <ul className="list-disc pl-4 space-y-1">
                {usageBlockedPrompt.usage?.flows.map((f, i) => (
                  <li key={i}>
                    Flujo: <strong>{f.flowName}</strong> (Nodo: <em>{f.nodeLabel}</em>)
                  </li>
                ))}
                {usageBlockedPrompt.usage?.queues.map((q, i) => (
                  <li key={i}>{q.queueName}</li>
                ))}
              </ul>
              <p className="text-[11px] text-rose-800 pt-1 border-t border-rose-200">
                Para eliminarla, primero debe reasignar o cambiar la locución en dichos flujos.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setUsageBlockedPrompt(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE BORRADO NORMAL */}
      {deleteConfirmPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-bold text-gray-900">¿Eliminar locución?</h3>
            <p className="text-xs text-gray-600">
              ¿Está seguro de eliminar "<strong>{deleteConfirmPrompt.name}</strong>"? Esta locución no está en uso en ningún flujo actualmente.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmPrompt(null)}
                className="px-3 py-1.5 border rounded-lg text-xs text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VozLocucionesPage;
