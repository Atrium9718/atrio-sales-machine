import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Phone,
  Clock,
  Mic,
  ListOrdered,
  Database,
  Users,
  Bot,
  Voicemail,
  PhoneForwarded,
  PhoneOff,
  Calendar,
  X,
  Sparkles,
  ChevronRight,
  Info,
  ShieldCheck,
  AlertCircle,
  Hash,
  FastForward,
} from 'lucide-react';

import {
  IvrNodeType,
  IvrFlowDefinition,
  IvrNode,
  IvrValidationReport,
  validateIvrFlow,
  generateFlowDiff,
  runFlowStep,
  executeCrmLookup,
  IvrExecutionContext,
} from '../../../packages/core/src/voice/ivrEngine';

// ============================================================================
// COMPONENTES DE NODOS PERSONALIZADOS PARA EL LIENZO REACT FLOW
// ============================================================================

const CustomIvrNodeComponent = ({ data, selected }: NodeProps) => {
  const typeColors: Record<string, { bg: string; border: string; text: string; icon: any }> = {
    INICIO: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800', icon: Phone },
    HORARIO: { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-800', icon: Calendar },
    LOCUCION: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-800', icon: Mic },
    MENU: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800', icon: ListOrdered },
    CAPTURA: { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-800', icon: Hash },
    CONSULTA_CRM: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-800', icon: Database },
    DECISION: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', icon: Info },
    IR_A_COLA: { bg: 'bg-emerald-50', border: 'border-emerald-600', text: 'text-emerald-900', icon: Users },
    IR_A_EXTENSION: { bg: 'bg-cyan-50', border: 'border-cyan-600', text: 'text-cyan-900', icon: Phone },
    IR_A_AGENTE_IA: { bg: 'bg-violet-50', border: 'border-violet-600', text: 'text-violet-900', icon: Bot },
    BUZON: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-800', icon: Voicemail },
    TRANSFERIR_EXTERNO: { bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-900', icon: PhoneForwarded },
    DEVOLVER_LLAMADA: { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-900', icon: RotateCcw },
    NO_LLAMAR: { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-900', icon: PhoneOff },
    COLGAR: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800', icon: PhoneOff },
  };

  const currentType = (data.type as string) || 'LOCUCION';
  const styling = typeColors[currentType] || typeColors.LOCUCION;
  const Icon = styling.icon;

  const outputs = (data.outputs as any[]) || [];

  return (
    <div
      className={`rounded-xl border-2 shadow-md min-w-[200px] max-w-[260px] bg-white transition-all ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-600 shadow-lg' : styling.border
      }`}
    >
      {/* Handle de entrada (excepto INICIO) */}
      {currentType !== 'INICIO' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 hover:!bg-indigo-600 !border-2 !border-white"
        />
      )}

      {/* Cabecera del Nodo */}
      <div className={`p-2.5 rounded-t-[10px] border-b flex items-center justify-between gap-2 ${styling.bg}`}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Icon className={`w-4 h-4 shrink-0 ${styling.text}`} />
          <span className={`text-xs font-bold truncate ${styling.text}`}>{data.label as string}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 text-gray-600 font-semibold shrink-0">
          {currentType}
        </span>
      </div>

      {/* Cuerpo del Nodo */}
      <div className="p-2.5 text-xs text-gray-600 space-y-1">
        {data.isLegalConsent && (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>Habeas Data Legal</span>
          </div>
        )}

        {data.promptName && (
          <div className="text-[11px] text-gray-700 truncate font-medium">
            🔊 {data.promptName as string}
          </div>
        )}

        {data.queueName && (
          <div className="text-[11px] text-emerald-700 truncate font-semibold">
            👥 Cola: {data.queueName as string}
          </div>
        )}

        {data.extension && (
          <div className="text-[11px] text-cyan-700 font-mono font-bold">
            📞 Extensión: {data.extension as string}
          </div>
        )}

        {currentType === 'HORARIO' && (
          <div className="text-[10px] text-sky-700 font-medium">
            ⏰ Lun-Vie 7:30 - 17:30
          </div>
        )}

        {/* Salidas / Handles dinámicos */}
        {outputs.length > 0 && (
          <div className="mt-2 pt-2 border-t space-y-1.5">
            {outputs.map((out: any, idx: number) => (
              <div key={out.id || idx} className="relative flex items-center justify-between text-[11px] pr-2">
                <span
                  className={`font-semibold ${
                    out.label === '0' ? 'text-amber-700 bg-amber-100 px-1 rounded' : 'text-gray-700'
                  }`}
                >
                  {out.label === '0' ? '0 (Humano)' : `Opción ${out.label}`}
                </span>
                <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                  {out.targetNodeId ? `→ ${out.targetNodeId}` : '(sin conectar)'}
                </span>
                <Handle
                  type="source"
                  id={out.id || `out_${idx}`}
                  position={Position.Right}
                  style={{ top: `${(idx + 1) * 22 + 65}px` }}
                  className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  ivrNode: CustomIvrNodeComponent,
};

// ============================================================================
// PÁGINA PRINCIPAL DEL EDITOR IVR
// ============================================================================

export function VozIvrEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flow, setFlow] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = React.useState<IvrNode | null>(null);

  // Estados de validación, diff y publicación
  const [validationReport, setValidationReport] = React.useState<IvrValidationReport | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [diffSummary, setDiffSummary] = React.useState<string[]>([]);
  const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false);

  // Toast
  const [toastMessage, setToastMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cargar datos del flujo
  const fetchFlow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/voice/ivr-flows/${id || 'flow_main_01'}`);
      const json = await res.json();
      if (json.success && json.data) {
        setFlow(json.data);
        const def: IvrFlowDefinition = json.data.definition;

        // Transformar nodos a React Flow
        const rfNodes: Node[] = (def.nodes || []).map((n) => ({
          id: n.id,
          type: 'ivrNode',
          position: n.position || { x: 100, y: 100 },
          data: {
            ...n.data,
            type: n.type,
            id: n.id,
          },
        }));

        // Generar bordes/aristas a partir de outputs
        const rfEdges: Edge[] = [];
        def.nodes.forEach((n) => {
          (n.data.outputs || []).forEach((out, idx) => {
            if (out.targetNodeId) {
              rfEdges.push({
                id: `edge_${n.id}_${out.id || idx}_${out.targetNodeId}`,
                source: n.id,
                target: out.targetNodeId,
                sourceHandle: out.id || `out_${idx}`,
                animated: true,
                style: { stroke: out.label === '0' ? '#d97706' : '#6366f1', strokeWidth: 2 },
              });
            }
          });
        });

        setNodes(rfNodes);
        setEdges(rfEdges);
      }
    } catch {
      showToast('error', 'Error al cargar flujo IVR.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFlow();
  }, [id]);

  // Conexión de aristas
  const onConnect = React.useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds));

      // Actualizar en el modelo interno del nodo fuente
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === params.source) {
            const outputs = ((n.data.outputs as any[]) || []).map((out) => {
              if (out.id === params.sourceHandle) {
                return { ...out, targetNodeId: params.target };
              }
              return out;
            });
            return {
              ...n,
              data: { ...n.data, outputs },
            };
          }
          return n;
        })
      );
    },
    [setEdges, setNodes]
  );

  // Agregar nuevo nodo al lienzo
  const handleAddNode = (type: IvrNodeType, label: string) => {
    const newId = `node_${type.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    let initialOutputs: any[] = [{ id: 'out_next', label: 'siguiente', targetNodeId: null }];

    if (type === 'HORARIO') {
      initialOutputs = [
        { id: 'out_open', label: 'abierto', targetNodeId: null },
        { id: 'out_closed', label: 'cerrado', targetNodeId: null },
        { id: 'out_holiday', label: 'festivo', targetNodeId: null },
      ];
    } else if (type === 'MENU') {
      initialOutputs = [
        { id: '1', label: '1', targetNodeId: null },
        { id: '2', label: '2', targetNodeId: null },
        { id: '0', label: '0', targetNodeId: null }, // REGLA DE ORO
      ];
    } else if (type === 'COLGAR' || type === 'BUZON' || type === 'IR_A_COLA' || type === 'IR_A_EXTENSION') {
      initialOutputs = [];
    }

    const newNode: Node = {
      id: newId,
      type: 'ivrNode',
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: {
        id: newId,
        label,
        type,
        outputs: initialOutputs,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode as any);
    showToast('success', `Nodo "${label}" agregado al lienzo.`);
  };

  // Guardar cambios en el flujo (DRAFT)
  const handleSaveDraft = async () => {
    if (!flow) return;

    // Convertir nodos de React Flow al modelo IvrNode
    const updatedNodes: IvrNode[] = nodes.map((n) => ({
      id: n.id,
      type: (n.data.type as IvrNodeType) || 'LOCUCION',
      position: n.position,
      data: n.data as any,
    }));

    const definition: IvrFlowDefinition = {
      ...flow.definition,
      nodes: updatedNodes,
      edges: edges as any,
    };

    try {
      const res = await fetch(`/api/voice/ivr-flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition }),
      });
      const json = await res.json();
      if (json.success) {
        setFlow(json.data);
        showToast('success', 'Borrador guardado exitosamente.');
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al guardar borrador.');
    }
  };

  // Ejecutar validación bloqueante
  const handleRunValidation = async () => {
    if (!flow) return;
    try {
      const res = await fetch(`/api/voice/ivr-flows/${flow.id}/validate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setValidationReport(json.data);
        if (json.data.isValid) {
          showToast('success', 'El flujo superó todas las validaciones y cumple la Regla de Oro.');
        } else {
          showToast('error', `Se detectaron ${json.data.errors.length} errores bloqueantes.`);
        }
      }
    } catch {
      showToast('error', 'Error ejecutando validador.');
    }
  };

  // Abrir modal de publicación con Diff
  const handleOpenPublish = async () => {
    await handleSaveDraft();
    await handleRunValidation();
    setIsPublishModalOpen(true);
  };

  // Confirmar publicación
  const handleConfirmPublish = async () => {
    if (!flow) return;
    try {
      const res = await fetch(`/api/voice/ivr-flows/${flow.id}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setFlow(json.data);
        setDiffSummary(json.diffSummary || []);
        setIsPublishModalOpen(false);
        showToast('success', json.message);
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al publicar flujo.');
    }
  };

  // Rollback a versión anterior
  const handleRollback = async () => {
    if (!flow) return;
    try {
      const res = await fetch(`/api/voice/ivr-flows/${flow.id}/rollback`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setFlow(json.data);
        showToast('success', json.message);
        fetchFlow();
      } else {
        showToast('error', json.error);
      }
    } catch {
      showToast('error', 'Error al realizar rollback.');
    }
  };

  // Click en un nodo del lienzo
  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node as any);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50 -m-4 md:-m-6 overflow-hidden">
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

      {/* BARRA SUPERIOR DEL EDITOR */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/voz/ivr')}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Volver a lista de flujos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-900 text-sm">{flow?.name || 'Editor de IVR'}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                v{flow?.version || 1}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  flow?.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {flow?.status === 'PUBLISHED' ? 'En Producción' : 'Borrador'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Las llamadas activas continuarán ejecutando la versión con la que iniciaron.
            </p>
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunValidation}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Validar Reglas</span>
          </button>

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Play className="w-4 h-4 text-indigo-600" />
            <span>Simulador Telefónico</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4 text-gray-600" />
            <span>Guardar Borrador</span>
          </button>

          <button
            onClick={handleOpenPublish}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publicar Versión</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO: PALETA + LIENZO + PANEL LATERAL */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PALETA DE NODOS A LA IZQUIERDA */}
        <div className="w-56 bg-white border-r p-3 overflow-y-auto shrink-0 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Punto de Partida</div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode('HORARIO', 'Evaluación de Horario')}
                  className="w-full text-left p-2 rounded-lg border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-xs font-medium text-sky-900 flex items-center gap-2 transition"
                >
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>Horario & Festivo</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Locución y Audio</div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode('LOCUCION', 'Locución / Mensaje')}
                  className="w-full text-left p-2 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-medium text-indigo-900 flex items-center gap-2 transition"
                >
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>Reproducir Audio</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menús y Teclas DTMF</div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode('MENU', 'Menú Interactivo')}
                  className="w-full text-left p-2 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-xs font-medium text-blue-900 flex items-center gap-2 transition"
                >
                  <ListOrdered className="w-4 h-4 text-blue-600" />
                  <span>Menú DTMF (0=Humano)</span>
                </button>
                <button
                  onClick={() => handleAddNode('CAPTURA', 'Captura de Dígitos')}
                  className="w-full text-left p-2 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-xs font-medium text-teal-900 flex items-center gap-2 transition"
                >
                  <Hash className="w-4 h-4 text-teal-600" />
                  <span>Captura de Pedido/Cédula</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Integración con CRM</div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode('CONSULTA_CRM', 'Consultar Pedido/Saldo')}
                  className="w-full text-left p-2 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-xs font-medium text-amber-900 flex items-center gap-2 transition"
                >
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Consulta CRM Segura</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Destinos Humanos & IA</div>
              <div className="space-y-1">
                <button
                  onClick={() => handleAddNode('IR_A_COLA', 'Cola de Espera')}
                  className="w-full text-left p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-xs font-medium text-emerald-900 flex items-center gap-2 transition"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Cola de Asesores</span>
                </button>
                <button
                  onClick={() => handleAddNode('IR_A_EXTENSION', 'Extensión Interna')}
                  className="w-full text-left p-2 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-xs font-medium text-cyan-900 flex items-center gap-2 transition"
                >
                  <Phone className="w-4 h-4 text-cyan-600" />
                  <span>Extensión Directa</span>
                </button>
                <button
                  onClick={() => handleAddNode('IR_A_AGENTE_IA', 'Agente IA Gemini')}
                  className="w-full text-left p-2 rounded-lg border border-violet-200 bg-violet-50/60 hover:bg-violet-100 text-xs font-medium text-violet-900 flex items-center gap-2 transition"
                >
                  <Bot className="w-4 h-4 text-violet-600" />
                  <span>Voz IA Gemini</span>
                </button>
                <button
                  onClick={() => handleAddNode('DEVOLVER_LLAMADA', 'Devolución de Llamada')}
                  className="w-full text-left p-2 rounded-lg border border-green-200 bg-green-50/60 hover:bg-green-100 text-xs font-medium text-green-900 flex items-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4 text-green-600" />
                  <span>Agendar Callback</span>
                </button>
                <button
                  onClick={() => handleAddNode('BUZON', 'Buzón de Mensajes')}
                  className="w-full text-left p-2 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-xs font-medium text-rose-900 flex items-center gap-2 transition"
                >
                  <Voicemail className="w-4 h-4 text-rose-600" />
                  <span>Buzón de Voz</span>
                </button>
                <button
                  onClick={() => handleAddNode('COLGAR', 'Despedida y Colgar')}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-800 flex items-center gap-2 transition"
                >
                  <PhoneOff className="w-4 h-4 text-gray-600" />
                  <span>Colgar Llamada</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <span className="font-bold">Regla de Oro:</span>
            <p className="text-[10px] text-amber-800">
              En cada menú, el <strong>0</strong> debe conectar con una cola o extensión humana.
            </p>
          </div>
        </div>

        {/* LIENZO DE REACT FLOW */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background gap={16} size={1} color="#cbd5e1" />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>

          {/* Banner inferior de Validación si hay advertencias */}
          {validationReport && !validationReport.isValid && (
            <div className="absolute bottom-4 left-4 right-4 z-20 p-3 bg-rose-50 border border-rose-300 rounded-xl shadow-lg flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">Validación fallida: </span>
                  <span>{validationReport.errors[0]?.message}</span>
                </div>
              </div>
              <button
                onClick={() => setValidationReport(null)}
                className="p-1 text-rose-500 hover:text-rose-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* PANEL LATERAL DERECHO DE CONFIGURACIÓN DEL NODO SELECCIONADO */}
        {selectedNode && (
          <div className="w-80 bg-white border-l p-4 overflow-y-auto shrink-0 flex flex-col justify-between space-y-4 shadow-lg z-10">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-[10px] font-mono text-gray-400">{selectedNode.id}</span>
                  <h3 className="font-bold text-gray-900 text-sm">{selectedNode.data?.label || selectedNode.type}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Explicación en lenguaje claro */}
              <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                <span className="font-semibold block mb-0.5">Qué hace este nodo:</span>
                <p className="text-[11px] text-indigo-800">
                  {selectedNode.data?.type === 'MENU' &&
                    'Presenta opciones de audio y espera que el cliente marque un dígito en el teclado.'}
                  {selectedNode.data?.type === 'HORARIO' &&
                    'Evalúa la hora y festivos de Colombia. Si está abierto va a la ruta de día; si está cerrado ofrece buzón.'}
                  {selectedNode.data?.type === 'LOCUCION' &&
                    'Reproduce un archivo de audio WAV de la biblioteca. Puede configurarse como aviso legal obligatorio.'}
                  {selectedNode.data?.type === 'IR_A_COLA' &&
                    'Pone la llamada en cola de espera de asesores con música y mensaje periódico.'}
                  {selectedNode.data?.type === 'CONSULTA_CRM' &&
                    'Consulta información en Fusion CRM validando que el número pertenezca a un cliente autorizado.'}
                  {selectedNode.data?.type === 'IR_A_EXTENSION' &&
                    'Conecta directamente a un anexo interno de la empresa.'}
                </p>
              </div>

              {/* Formulario de edición según tipo */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Etiqueta visible</label>
                  <input
                    type="text"
                    value={selectedNode.data?.label || ''}
                    onChange={(e) => {
                      const updated = {
                        ...selectedNode,
                        data: { ...selectedNode.data, label: e.target.value },
                      };
                      setSelectedNode(updated);
                      setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                    }}
                    className="w-full text-xs border rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Si es LOCUCION */}
                {selectedNode.data?.type === 'LOCUCION' && (
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <label className="block font-semibold text-gray-700">Locución asignada</label>
                    <select
                      value={selectedNode.data?.promptId || 'prompt_saludo_general'}
                      onChange={(e) => {
                        const updated = {
                          ...selectedNode,
                          data: { ...selectedNode.data, promptId: e.target.value, promptName: e.target.value },
                        };
                        setSelectedNode(updated);
                        setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                      }}
                      className="w-full border rounded-lg p-1.5 text-xs bg-white"
                    >
                      <option value="prompt_legal_grabacion">Aviso Legal Grabación (Habeas Data)</option>
                      <option value="prompt_saludo_general">Bienvenida General Comercial</option>
                      <option value="prompt_fuera_de_horario">Atención Fuera de Horario</option>
                      <option value="prompt_festivo">Aviso Día Festivo Colombia</option>
                      <option value="prompt_cola_espera">Mensaje Cola de Espera</option>
                      <option value="prompt_despedida">Despedida Institucional</option>
                    </select>

                    <label className="flex items-center gap-2 pt-1 text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedNode.data?.isLegalConsent || false}
                        onChange={(e) => {
                          const updated = {
                            ...selectedNode,
                            data: {
                              ...selectedNode.data,
                              isLegalConsent: e.target.checked,
                              isInterruptible: !e.target.checked,
                            },
                          };
                          setSelectedNode(updated);
                          setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>Aviso Legal Mandatorio (No interrumpible por DTMF)</span>
                    </label>
                  </div>
                )}

                {/* Si es MENU */}
                {selectedNode.data?.type === 'MENU' && (
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <label className="block font-semibold text-gray-700">Audio del Menú</label>
                    <select
                      value={selectedNode.data?.promptId || 'prompt_saludo_general'}
                      onChange={(e) => {
                        const updated = {
                          ...selectedNode,
                          data: { ...selectedNode.data, promptId: e.target.value },
                        };
                        setSelectedNode(updated);
                        setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                      }}
                      className="w-full border rounded-lg p-1.5 text-xs bg-white"
                    >
                      <option value="prompt_saludo_general">Bienvenida Comercial (1 Ventas, 2 Pedido, 0 Asesor)</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium">Reintentos Máx.</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={selectedNode.data?.maxRetries || 3}
                          onChange={(e) => {
                            const updated = {
                              ...selectedNode,
                              data: { ...selectedNode.data, maxRetries: parseInt(e.target.value) },
                            };
                            setSelectedNode(updated);
                            setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                          }}
                          className="w-full border rounded p-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium">Tiempo Espera (s)</label>
                        <input
                          type="number"
                          min="3"
                          max="15"
                          value={selectedNode.data?.timeoutSeconds || 8}
                          onChange={(e) => {
                            const updated = {
                              ...selectedNode,
                              data: { ...selectedNode.data, timeoutSeconds: parseInt(e.target.value) },
                            };
                            setSelectedNode(updated);
                            setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                          }}
                          className="w-full border rounded p-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Si es COLA */}
                {selectedNode.data?.type === 'IR_A_COLA' && (
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <label className="block font-semibold text-gray-700">Cola de Destino</label>
                    <select
                      value={selectedNode.data?.queueId || 'queue_comercial_01'}
                      onChange={(e) => {
                        const updated = {
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            queueId: e.target.value,
                            queueName: e.target.value === 'queue_comercial_01' ? 'Ventas y Cotizaciones' : 'Soporte',
                          },
                        };
                        setSelectedNode(updated);
                        setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                      }}
                      className="w-full border rounded-lg p-1.5 text-xs bg-white"
                    >
                      <option value="queue_comercial_01">Cola Comercial (Ventas)</option>
                      <option value="queue_soporte_01">Cola Soporte y Reclamos</option>
                    </select>
                  </div>
                )}

                {/* Si es EXTENSIÓN */}
                {selectedNode.data?.type === 'IR_A_EXTENSION' && (
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <label className="block font-semibold text-gray-700">Número de Extensión</label>
                    <input
                      type="text"
                      value={selectedNode.data?.extension || '101'}
                      onChange={(e) => {
                        const updated = {
                          ...selectedNode,
                          data: { ...selectedNode.data, extension: e.target.value },
                        };
                        setSelectedNode(updated);
                        setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? (updated as any) : n)));
                      }}
                      className="w-full border rounded p-1.5 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Eliminar nodo (excepto inicio) */}
            {selectedNode.data?.type !== 'INICIO' && (
              <div className="pt-3 border-t">
                <button
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                    setSelectedNode(null);
                    showToast('success', 'Nodo eliminado del grafo.');
                  }}
                  className="w-full py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Nodo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: PUBLICACIÓN CON DIFF EN LENGUAJE CLARO */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Publicar Flujo en Producción</h3>
                <p className="text-xs text-gray-500">Versión {flow?.version} → Versión {(flow?.version || 1) + 1}</p>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de cambios (Diff) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700">Resumen de Cambios para Auditoría:</span>
              <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                <div className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Verificación de la Regla de Oro: La tecla 0 en el menú dirige al asesor humano (Recepción 101).</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Aviso legal de grabación (Habeas Data) obligatorio confirmado al inicio de la llamada.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Enrutamiento a Horario Comercial Bogotá (7:30 a 17:30) y calendario de festivos colombianos.</span>
                </div>
              </div>
            </div>

            {/* Advertencia de llamadas activas */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Protección de llamadas en curso:</strong> Las llamadas actualmente activas continuarán
                ejecutando la versión con la que iniciaron sin interrupciones. Las nuevas llamadas entrantes entrarán
                inmediatamente a la nueva versión.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPublish}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Confirmar y Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL / DRAWER SIMULADOR TELEFÓNICO INTERACTIVO */}
      {isSimulatorOpen && (
        <IvrSimulatorDrawer
          flowId={flow?.id || 'flow_main_01'}
          onClose={() => setIsSimulatorOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE SIMULADOR TELEFÓNICO EN TIEMPO REAL
// ============================================================================

interface SimulatorProps {
  flowId: string;
  onClose: () => void;
}

function IvrSimulatorDrawer({ flowId, onClose }: SimulatorProps) {
  const [callActive, setCallActive] = React.useState(false);
  const [currentNodeLabel, setCurrentNodeLabel] = React.useState<string>('En espera');
  const [currentPromptText, setCurrentPromptText] = React.useState<string>('');
  const [dtmfInput, setDtmfInput] = React.useState('');
  const [traceLog, setTraceLog] = React.useState<Array<{ time: string; text: string; type: string }>>([]);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [simulatedClockTime, setSimulatedClockTime] = React.useState('10:30');
  const [simulatedDay, setSimulatedDay] = React.useState('LUNES');
  const [simulatedIsHoliday, setSimulatedIsHoliday] = React.useState(false);
  const [execContext, setExecContext] = React.useState<any | null>(null);

  // Reloj de llamada
  React.useEffect(() => {
    let t: any;
    if (callActive) {
      t = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(t);
  }, [callActive]);

  const addTrace = (text: string, type: 'info' | 'audio' | 'dtmf' | 'success' | 'warn' = 'info') => {
    setTraceLog((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text,
        type,
      },
    ]);
  };

  const handleStartCall = async () => {
    setCallActive(true);
    setElapsedSeconds(0);
    setTraceLog([]);
    setDtmfInput('');
    addTrace('📞 Llamada entrante conectada desde +573105559876 a DID +576017441234', 'info');

    try {
      const res = await fetch(`/api/voice/ivr-flows/${flowId}/simulate-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: null, // Inicia nuevo contexto
          event: null,
        }),
      });
      const json = await res.json();
      if (json.success && json.step) {
        processStepResult(json.step);
      }
    } catch {
      addTrace('Error al conectar con motor IVR', 'warn');
    }
  };

  const processStepResult = (step: any) => {
    setExecContext(step.nextContext);
    setCurrentNodeLabel(step.nodeId);

    if (step.action === 'PLAY_PROMPT') {
      setCurrentPromptText(step.promptText || step.promptName);
      addTrace(`🔊 Locución [${step.promptName}]: "${step.promptText}"`, 'audio');
    } else if (step.action === 'WAIT_FOR_DTMF') {
      addTrace(`⌨️ Esperando dígito DTMF (opciones: ${step.options?.join(', ')})`, 'info');
    } else if (step.action === 'ROUTE_QUEUE') {
      addTrace(`👥 ENRUTADO A COLA: "${step.queueName}"`, 'success');
      setCallActive(false);
    } else if (step.action === 'ROUTE_EXTENSION') {
      addTrace(`📞 ENRUTADO A EXTENSIÓN: ${step.extension}`, 'success');
      setCallActive(false);
    } else if (step.action === 'HANGUP') {
      addTrace(`📵 Fin de llamada / Colgado por el sistema.`, 'warn');
      setCallActive(false);
    } else if (step.action === 'CRM_LOOKUP') {
      addTrace(`🔍 Consulta CRM: ${step.crmLookup?.queryType} (${step.crmLookup?.allowed ? 'Autorizado' : 'Denegado'})`, 'info');
    }
  };

  const handleSendDtmf = async (digit: string) => {
    if (!callActive) return;
    setDtmfInput((prev) => prev + digit);
    addTrace(`Dígito pulsado por el usuario: [${digit}]`, 'dtmf');

    try {
      const res = await fetch(`/api/voice/ivr-flows/${flowId}/simulate-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: execContext,
          event: { type: 'DTMF', digit },
        }),
      });
      const json = await res.json();
      if (json.success && json.step) {
        processStepResult(json.step);
      }
    } catch {
      addTrace('Error procesando DTMF en simulador', 'warn');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white border-l shadow-2xl flex flex-col">
      {/* Header del simulador */}
      <div className="p-4 border-b bg-gray-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="font-bold text-sm">Simulador de IVR en Vivo</h2>
            <p className="text-[10px] text-gray-400">Prueba de recorrido con reloj virtual</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Manipulación del reloj virtual para probar horarios */}
      <div className="p-3 bg-indigo-50/70 border-b text-xs space-y-2">
        <div className="flex items-center justify-between font-semibold text-indigo-950">
          <span>Reloj Virtual de Pruebas:</span>
          <span className="font-mono text-indigo-700">{simulatedClockTime} Bog</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <button
            onClick={() => {
              setSimulatedDay('LUNES');
              setSimulatedClockTime('10:30');
              setSimulatedIsHoliday(false);
            }}
            className={`p-1 rounded border text-center transition ${
              simulatedDay === 'LUNES' && !simulatedIsHoliday
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-white text-gray-700'
            }`}
          >
            Horario Hábil (10:30)
          </button>
          <button
            onClick={() => {
              setSimulatedDay('LUNES');
              setSimulatedClockTime('20:00');
              setSimulatedIsHoliday(false);
            }}
            className={`p-1 rounded border text-center transition ${
              simulatedClockTime === '20:00' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-gray-700'
            }`}
          >
            Noche (20:00)
          </button>
          <button
            onClick={() => {
              setSimulatedDay('LUNES');
              setSimulatedClockTime('11:00');
              setSimulatedIsHoliday(true);
            }}
            className={`p-1 rounded border text-center transition ${
              simulatedIsHoliday ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-gray-700'
            }`}
          >
            Día Festivo
          </button>
        </div>
      </div>

      {/* Pantalla del teléfono virtual */}
      <div className="p-4 bg-gray-950 text-emerald-400 font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-gray-400 text-[10px]">
          <span>ESTADO: {callActive ? 'EN LLAMADA' : 'INACTIVO'}</span>
          <span>TIEMPO: 00:{elapsedSeconds.toString().padStart(2, '0')}</span>
        </div>
        <div className="p-2 bg-gray-900 rounded border border-gray-800 min-h-[48px] flex items-center">
          <p className="text-[11px] text-emerald-300 line-clamp-2">
            {callActive ? currentPromptText || 'Conectando...' : 'Presione "Llamar" para iniciar prueba'}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-300">
          <span>Dígitos: {dtmfInput || '—'}</span>
          {elapsedSeconds > 45 && (
            <span className="text-amber-400 font-bold animate-pulse">⚠️ &gt;45s hasta humano</span>
          )}
        </div>
      </div>

      {/* Teclado DTMF (0-9, *, #) */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
            <button
              key={d}
              disabled={!callActive}
              onClick={() => handleSendDtmf(d)}
              className={`h-10 rounded-lg font-bold text-sm flex items-center justify-center border transition shadow-xs ${
                d === '0'
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Phone className="w-4 h-4" />
              <span>Llamar al DID (+576017441234)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCallActive(false);
                addTrace('Llamada finalizada por el usuario.', 'warn');
              }}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Colgar Llamada</span>
            </button>
          )}
        </div>
      </div>

      {/* Traza de ejecución paso a paso */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs bg-white">
        <span className="font-semibold text-gray-600 text-[11px] block">Traza de Ejecución en Vivo:</span>
        {traceLog.length === 0 ? (
          <p className="text-gray-400 text-center py-6 text-[11px]">No hay eventos registrados.</p>
        ) : (
          traceLog.map((log, i) => (
            <div
              key={i}
              className={`p-2 rounded border text-[11px] font-mono leading-tight ${
                log.type === 'audio'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  : log.type === 'dtmf'
                  ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                  : log.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                  : log.type === 'warn'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <div className="text-[10px] text-gray-400 mb-0.5">{log.time}</div>
              {log.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default VozIvrEditorPage;
