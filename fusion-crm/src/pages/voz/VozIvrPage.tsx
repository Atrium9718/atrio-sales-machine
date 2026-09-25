import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitFork,
  Plus,
  Play,
  History,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Calendar,
  PhoneCall,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Copy,
  Trash2,
} from 'lucide-react';

interface IvrFlowSummary {
  id: string;
  name: string;
  description?: string;
  didIds: string[];
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  publishedById?: string;
  nodeCount: number;
  updatedAt: string;
}

export function VozIvrPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = React.useState<IvrFlowSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [newFlowName, setNewFlowName] = React.useState('');
  const [newFlowDescription, setNewFlowDescription] = React.useState('');
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/voice/ivr-flows');
      const json = await res.json();
      if (json.success) {
        setFlows(json.data);
      }
    } catch {
      showToast('error', 'Error al cargar flujos de IVR.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      showToast('error', 'El nombre del flujo es requerido.');
      return;
    }
    try {
      const res = await fetch('/api/voice/ivr-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlowName.trim(),
          description: newFlowDescription.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsNewModalOpen(false);
        setNewFlowName('');
        setNewFlowDescription('');
        showToast('success', `Flujo "${json.data.name}" creado con éxito.`);
        navigate(`/voz/ivr/${json.data.id}`);
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al crear flujo.');
    }
  };

  const statusBadges = {
    PUBLISHED: {
      label: 'Publicado (En Producción)',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    },
    DRAFT: {
      label: 'Borrador (En Edición)',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
    ARCHIVED: {
      label: 'Archivado',
      color: 'bg-gray-50 text-gray-600 border-gray-200',
      icon: History,
    },
  };

  const publishedCount = flows.filter((f) => f.status === 'PUBLISHED').length;
  const draftCount = flows.filter((f) => f.status === 'DRAFT').length;

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Árboles de Decisión IVR</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Respuesta Vocal Interactiva
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Diseñe el recorrido telefónico de sus clientes mediante grafos de nodos, menús DTMF, validación bloqueante y simulador interactivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFlows}
            className="p-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition"
            title="Recargar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Flujo IVR</span>
          </button>
        </div>
      </div>

      {/* Tarjeta Regla de Oro del IVR */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-indigo-950 text-sm">
        <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">Regla de Oro de la Telefonía en Fusion CRM</p>
          <p className="text-indigo-800 text-xs mt-0.5">
            <strong>EL CERO SIEMPRE LLEVA A UNA PERSONA.</strong> En todos los menús, en todos los niveles, esté donde esté.
            El validador impedirá publicar cualquier flujo donde la tecla '0' no esté asignada a una cola de asesores o extensión humana.
          </p>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flujos Totales</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{flows.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Árboles configurados en la organización</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">En Producción (Publicados)</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
          <div className="text-xs text-emerald-600/80 mt-0.5">Atendiendo llamadas en tiempo real</div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Borradores en Edición</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{draftCount}</div>
          <div className="text-xs text-amber-600/80 mt-0.5">En diseño sin afectar llamadas activas</div>
        </div>
      </div>

      {/* Lista de Flujos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flows.map((flow) => {
          const badge = statusBadges[flow.status] || statusBadges.DRAFT;
          const BadgeIcon = badge.icon;

          return (
            <div
              key={flow.id}
              className="bg-white rounded-xl border shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">{flow.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-medium">
                        v{flow.version}
                      </span>
                    </div>
                    {flow.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{flow.description}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${badge.color}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Metadatos */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span>{flow.nodeCount} nodos en el grafo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-gray-400" />
                    <span>
                      {flow.didIds.length > 0 ? `DID: +576017441234` : 'Sin número asignado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/voz/ivr/${flow.id}?tab=simulate`)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1.5 transition shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Simulador</span>
                </button>

                <button
                  onClick={() => navigate(`/voz/ivr/${flow.id}`)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
                >
                  <span>Abrir Editor Visual</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nuevo Flujo */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Crear Nuevo Flujo IVR</h2>
            <p className="text-xs text-gray-500">
              Se creará un borrador inicial con nodo de inicio listo para editar en el lienzo visual.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Flujo *</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="ej: Conmutador Principal 2026"
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={newFlowDescription}
                  onChange={(e) => setNewFlowDescription(e.target.value)}
                  placeholder="Propósito del flujo y horario de aplicación..."
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFlow}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs"
              >
                Crear y Diseñar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VozIvrPage;
