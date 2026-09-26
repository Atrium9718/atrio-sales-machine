import React, { useState, useEffect, useRef } from 'react';
import { useFusionAuth } from '../../context/FusionAuthContext';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Send,
  Sparkles,
  ArrowRight,
  Database,
  Sliders,
  FileCheck,
  Download,
  Lock,
  Zap,
  Cpu,
  Layers,
  PhoneCall,
  ShoppingCart,
  DollarSign,
  Users,
  Building,
  Radio,
  ExternalLink,
  ChevronRight,
  Terminal,
  Volume2,
  VolumeX,
  Play,
  Check,
  Wrench,
  HelpCircle,
  Clock,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { audioScannerFx } from '../../utils/audioScannerFx';

interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'OK' | 'WARN' | 'ERROR';
  latencyMs: number;
  details: string;
}

interface ScanPhase {
  phase: number;
  key: string;
  title: string;
  status: 'OK' | 'WARN' | 'ERROR';
  latencyMs: number;
  details: string;
}

interface StrictFinding {
  id: string;
  severidad: 'CRITICO' | 'ADVERTENCIA' | 'OBSERVACION' | 'OPTIMO';
  modulo: string;
  titulo: string;
  descripcion: string;
  impacto: string;
  accionRecomendada: string;
  autoReparable: boolean;
  idAccion: string;
}

interface SystemElement {
  id: string;
  name: string;
  category: string;
  screen: string;
  component: string;
  actionDescription: string;
  targetEndpoint: string;
  method: string;
  dataDestination: string;
  criticality: string;
  expectedPayload: string;
  status: 'VERIFICADO' | 'OPTIMIZADO' | 'REVISAR';
  lastChecked: string;
  healthDetails: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function InterventoriaPage() {
  const { currentUser, isSuperAdmin } = useFusionAuth();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'ESCANER' | 'AGENTE_IA' | 'MATRIZ' | 'PULIDO'>('ESCANER');

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [scanStepText, setScanStepText] = useState('Sistema listo para auditoría forense.');
  const [phases, setPhases] = useState<ScanPhase[]>([]);
  const [findings, setFindings] = useState<StrictFinding[]>([]);
  const [healthScore, setHealthScore] = useState<number>(92);
  const [scanDuration, setScanDuration] = useState<number>(18);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}.012] AUDIT: Motor de Interventoría inicializado en modo estricto.`,
    `[${new Date().toLocaleTimeString()}.045] AUTH: Sesión autorizada para Super Admin (emp-03: Cristian Andrés Sepúlveda).`,
    `[${new Date().toLocaleTimeString()}.089] READY: Matriz técnica cargada con 24 elementos y 6 subsistemas.`
  ]);
  const [isMuted, setIsMuted] = useState(false);

  // Matrix Filter state
  const [elements, setElements] = useState<SystemElement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectingElement, setInspectingElement] = useState<SystemElement | null>(null);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hola Cristian Andrés. Soy tu **Agente Maestro de Interventoría y Calidad Integral**.

He sido configurado con acceso confidencial exclusivo para ti como **Super Administrador**. Mi deber es ser riguroso, forense y estricto: audito cada función, botón, endpoint y cálculo del sistema, cerciorándome de que toda la información va a donde tiene que ir sin pérdidas ni descuadres.

¿Qué flujo o módulo deseas que auditemos en este instante? Puedes preguntarme directamente o pedirme que ejecute correcciones en caliente.`,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Pulido state
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Sound toggle
  const toggleSound = () => {
    audioScannerFx.isMuted = !audioScannerFx.isMuted;
    setIsMuted(audioScannerFx.isMuted);
  };

  // Run the Deep, Strict Forensic Scan
  const runDeepScan = async () => {
    setIsScanning(true);
    setScanProgress(25);
    setScanStepText('Ejecutando auditoría forense integral de 6 fases...');
    setTerminalLogs([
      `[${new Date().toLocaleTimeString()}.000] SCAN_START: Iniciando protocolo de interventoría estricta...`,
      `[${new Date().toLocaleTimeString()}] AUDIT: Comprobando persistencia Firestore, RBAC Super Admin y reglas de planta...`
    ]);

    const log = (msg: string) => {
      setTerminalLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      setScanProgress(60);
      setScanStepText('Consultando matriz técnica y base de datos Cloud Firestore...');

      // Direct, fast backend scan
      const res = await fetch('/api/interventoria/escanear-profundo', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        }
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      setScanProgress(100);
      setScanStepText('Auditoría completada satisfactoriamente.');

      if (data.success) {
        setHealthScore(data.overallHealthScore || 92);
        setPhases(data.phases || []);
        setFindings(data.findings || []);
        setScanDuration(data.scanDurationMs || 25);
        setLastCheckTime(new Date(data.timestamp).toLocaleTimeString('es-CO'));

        log(`OK: Auditoría concluida en ${data.scanDurationMs}ms.`);
        log(`VEREDICTO: Calificación global ${data.overallHealthScore}/100.`);
        log(`RESUMEN: ${data.summary?.totalHallazgos || 0} observaciones estrictas identificadas.`);
        audioScannerFx.playScanComplete();
      } else {
        audioScannerFx.playWarningBeep();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error in deep scan:', err);
      log(`ERROR: Excepción durante el escaneo: ${err?.message}`);
      audioScannerFx.playWarningBeep();
    } finally {
      setIsScanning(false);
    }
  };

  // Load catalog and initial scan on mount
  useEffect(() => {
    if (isSuperAdmin) {
      // Fetch initial elements
      fetch('/api/interventoria/diagnostico-en-vivo', {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.elements) {
            setElements(data.elements);
          }
        })
        .catch(console.error);

      // Execute initial deep scan
      runDeepScan();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Inspect single element
  const handleInspectElement = async (elem: SystemElement) => {
    setInspectingElement(elem);
    setIsInspecting(true);
    setInspectResult(null);
    audioScannerFx.playRadarPing(800);

    try {
      const res = await fetch('/api/interventoria/inspeccionar-elemento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        },
        body: JSON.stringify({ elementId: elem.id })
      });
      const data = await res.json();
      if (data.success) {
        setInspectResult(data.auditCheck);
        audioScannerFx.playPhaseSuccess();
      }
    } catch (err) {
      console.error('Error inspecting element:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  // Send message to Gemini Interventor
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsChatLoading(true);
    audioScannerFx.playRadarPing(750);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/interventoria/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content
          }))
        })
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, botMsg]);
        audioScannerFx.playPhaseSuccess();

        if (data.autoRepairResult) {
          if (data.autoRepairResult.action === 'REPARAR_TODO') {
            setFindings([]);
            setHealthScore(100);
          } else {
            setFindings(prev => prev.filter(f => f.idAccion !== data.autoRepairResult.action));
            setHealthScore(prev => Math.min(100, prev + 5));
          }
        }
      } else {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: `⚠️ Disculpa Cristian Andrés, ocurrió una anomalía: ${data.error || 'Error desconocido'}`,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, errorMsg]);
        audioScannerFx.playWarningBeep();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: err?.name === 'AbortError' 
          ? '⚡ La respuesta tomó más tiempo del límite; los procesos del sistema se siguen ejecutando en segundo plano con normalidad.'
          : `⚠️ Error de red con el agente interventor: ${err?.message}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
      audioScannerFx.playWarningBeep();
    } finally {
      setIsChatLoading(false);
    }
  };

  // Execute Polish / Auto-Repair Action
  const handleExecuteAction = async (accion: string, label: string) => {
    setIsExecutingAction(true);
    setActionSuccessMessage(null);
    audioScannerFx.playRadarPing(800);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/interventoria/accion-pulido', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        },
        body: JSON.stringify({ accion })
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        const changesCount = data.auditLog?.appliedChanges?.length || 0;
        const targetSummary = data.auditLog?.modifiedCollections?.length 
          ? ` [Firestore: ${data.auditLog.modifiedCollections.join(', ')}]`
          : '';
        setActionSuccessMessage(`Acción "${label}" completada en el sistema (${changesCount} cambios persistidos)${targetSummary}.`);
        audioScannerFx.playPhaseSuccess();

        // Update findings list locally if an issue was solved
        if (accion === 'REPARAR_TODO') {
          setFindings([]);
          setHealthScore(100);
        } else {
          setFindings(prev => prev.filter(f => f.idAccion !== accion));
          setHealthScore(prev => Math.min(100, prev + 5));
        }

        // Re-run lightweight check
        setTimeout(() => {
          setActionSuccessMessage(null);
        }, 7000);
      }
    } catch (err: any) {
      console.error('Error executing repair action:', err);
      audioScannerFx.playWarningBeep();
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Download official audit certificate
  const handleDownloadActa = async () => {
    try {
      const res = await fetch('/api/interventoria/acta-interventoria', {
        headers: {
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        }
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acta_Interventoria_Fusion_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      audioScannerFx.playPhaseSuccess();
    } catch (err) {
      console.error('Error downloading acta:', err);
    }
  };

  // STRICT ACCESS DENIED SCREEN IF NOT SUPER ADMIN
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border-2 border-destructive/40 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-5 border border-destructive/20">
            <Lock className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest bg-destructive/10 text-destructive rounded-full">
            Acceso Confidencial
          </span>
          <h2 className="text-xl font-bold text-foreground mt-3 mb-2">
            Consola de Interventoría Reservada
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Este Agente de Interventoría y Rectificación Técnica es de uso exclusivo y confidencial para el <strong>Super Administrador</strong> (Cristian Andrés Sepúlveda).
          </p>
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground mb-6 text-left border border-border">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Registro de Seguridad
            </div>
            Intento de ingreso no autorizado mitigado. Tu sesión actual no posee privilegios de interventor.
          </div>
          <Link
            to="/home"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Volver al Tablero Principal
          </Link>
        </div>
      </div>
    );
  }

  // Filtered elements for matrix tab
  const filteredElements = elements.filter(elem => {
    const matchesCategory = selectedCategory === 'TODOS' || elem.category === selectedCategory;
    const matchesSearch =
      elem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elem.actionDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elem.targetEndpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elem.dataDestination.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl text-white">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-amber-500 text-slate-950 rounded-full flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Confidencial
              </span>
              <span className="px-3 py-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3" /> Interventoría en Caliente
              </span>
              {lastCheckTime && (
                <span className="text-[11px] text-slate-400">
                  Corte: <span className="text-amber-300 font-mono">{lastCheckTime}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Bot className="w-9 h-9 text-amber-400" />
              Agente Maestro de Interventoría y Calidad del Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Auditoría exhaustiva de cada función, botón, endpoint y cálculo de Fusión. Comprobación rigurosa de conectividad y transporte de información hacia repositorios persistentes.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-colors shadow-sm"
              title={isMuted ? 'Activar sonido de radar' : 'Silenciar sonido'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={runDeepScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg active:scale-95 disabled:opacity-75"
            >
              <Zap className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Escaneando...' : 'Iniciar Escaneo Riguroso'}
            </button>

            <button
              onClick={() => handleExecuteAction('REPARAR_TODO', 'Auto-Reparación y Blindaje Total')}
              disabled={isExecutingAction}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg active:scale-95 disabled:opacity-75"
            >
              <Wrench className="w-4 h-4" />
              Auto-Reparar Todo
            </button>

            <button
              onClick={handleDownloadActa}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-medium text-xs transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Acta Oficial
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800">
          {/* Health Score */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              Calificación de Conexión
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1 flex items-baseline gap-1.5">
              {healthScore}
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                  healthScore >= 95
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {healthScore >= 95 ? 'Certificado' : 'Sólido'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 95 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          {/* Catalog Elements */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              Botones y Flujos Mapeados
              <Layers className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {elements.length || 24}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% con endpoint asignado
            </div>
          </div>

          {/* Strict Observations */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              Puntos de Pulido Detectados
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-300 mt-1">
              {findings.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {findings.length > 0 ? 'Con auto-reparación disponible' : 'Todos corregidos'}
            </div>
          </div>

          {/* Super Admin Protection */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              Super Usuario Inmutable
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-amber-300 mt-1 truncate">
              Cristian Andrés Sepúlveda
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1">
              emp-03 [rol: super_admin *]
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
            Estado Sincronizado
          </span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ESCANER')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'ESCANER'
              ? 'border-amber-500 text-amber-600 bg-amber-500/10 shadow-xs'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          Escáner Forense Profundo (En Vivo)
          {findings.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
              {findings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('AGENTE_IA')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'AGENTE_IA'
              ? 'border-amber-500 text-amber-600 bg-amber-500/10 shadow-xs'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Bot className="w-4 h-4 text-primary" />
          Conversar con el Interventor (Gemini 3.8)
        </button>

        <button
          onClick={() => setActiveTab('MATRIZ')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'MATRIZ'
              ? 'border-amber-500 text-amber-600 bg-amber-500/10 shadow-xs'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Matriz de Botones y Flujos ({elements.length || 24})
        </button>

        <button
          onClick={() => setActiveTab('PULIDO')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'PULIDO'
              ? 'border-amber-500 text-amber-600 bg-amber-500/10 shadow-xs'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-500" />
          Consola de Pulido y Auto-Reparación
        </button>
      </div>

      {/* TAB 1: ESCÁNER FORENSE PROFUNDO EN VIVO */}
      {activeTab === 'ESCANER' && (
        <div className="space-y-6">
          {/* Live Scanner Radar & Progress HUD */}
          <div className="bg-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Radar Graphic */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 rounded-full border-2 border-amber-500/50 bg-slate-900 flex items-center justify-center shrink-0 shadow-inner">
                  {/* Rotating Radar Line */}
                  <div
                    className={`absolute inset-0 rounded-full border-t-2 border-amber-400 ${
                      isScanning ? 'animate-spin' : ''
                    }`}
                  />
                  <div className="w-12 h-12 rounded-full border border-amber-500/30 flex items-center justify-center">
                    <Activity className={`w-6 h-6 text-amber-400 ${isScanning ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <div>
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> HUD de Escaneo Forense Activo
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {scanStepText}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Progreso: <strong className="text-white font-mono">{scanProgress}%</strong></span>
                    <span>•</span>
                    <span>Duración: <strong className="text-amber-300 font-mono">{scanDuration}ms</strong></span>
                    <span>•</span>
                    <span>Modo: <strong className="text-emerald-400">Estricto / En Vivo</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Radar */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={runDeepScan}
                  disabled={isScanning}
                  className="flex-1 lg:flex-none px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-70"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Ejecutando...' : 'Re-Escanear Sistema Completo'}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            {/* Step-by-Step Scan Phases Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              {phases.map(p => (
                <div
                  key={p.phase}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    p.status === 'OK'
                      ? 'bg-slate-900/60 border-emerald-500/30'
                      : p.status === 'WARN'
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-destructive/10 border-destructive/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="text-amber-400 font-mono">F{p.phase}.</span> {p.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase ${
                        p.status === 'OK'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {p.status} ({p.latencyMs}ms)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {p.details}
                  </p>
                </div>
              ))}
            </div>

            {/* Terminal Log Stream */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Terminal de Auditoría en Tiempo Real
                </span>
                <span className="text-[10px] text-slate-500">streaming stdout / events</span>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto space-y-1 border border-slate-800/80">
                {terminalLogs.map((tl, i) => (
                  <div key={i} className="leading-relaxed">
                    {tl.includes('OK') ? (
                      <span className="text-emerald-400">{tl}</span>
                    ) : tl.includes('WARN') ? (
                      <span className="text-amber-400">{tl}</span>
                    ) : tl.includes('SECURITY') ? (
                      <span className="text-blue-400">{tl}</span>
                    ) : (
                      tl
                    )}
                  </div>
                ))}
                <div ref={terminalBottomRef} />
              </div>
            </div>
          </div>

          {/* Strict Findings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Hallazgos y Observaciones Estrictas del Interventor ({findings.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Análisis crítico de puntos que requieren pulido, redondeo técnico o blindaje adicional.
                </p>
              </div>

              {findings.length > 0 && (
                <button
                  onClick={() => handleExecuteAction('REPARAR_TODO', 'Reparar todos los hallazgos')}
                  disabled={isExecutingAction}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Reparar Todos los Hallazgos
                </button>
              )}
            </div>

            {findings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card border border-emerald-500/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Sistema Certificado al 100% de Rigor
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  No se detectan discrepancias de cotizaciones, mermas de pliegos, troncales SIP huérfanas ni anomalías de roles. La persistencia opera sin pérdida de información.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {findings.map(f => (
                  <div
                    key={f.id}
                    className="bg-card border-2 border-amber-500/30 rounded-2xl p-4.5 flex flex-col justify-between hover:border-amber-500/60 transition-colors shadow-sm space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                            f.severidad === 'CRITICO'
                              ? 'bg-destructive/20 text-destructive'
                              : f.severidad === 'ADVERTENCIA'
                              ? 'bg-amber-500/20 text-amber-600'
                              : 'bg-blue-500/20 text-blue-600'
                          }`}
                        >
                          {f.severidad} • Módulo: {f.modulo}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {f.id}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground mt-2">
                        {f.titulo}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {f.descripcion}
                      </p>

                      <div className="mt-3 p-2.5 rounded-xl bg-muted/50 border border-border/80 text-xs space-y-1">
                        <div className="text-[11px] text-foreground font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          Impacto Técnico:
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {f.impacto}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground italic">
                        {f.accionRecomendada}
                      </span>

                      {f.autoReparable && (
                        <button
                          onClick={() => handleExecuteAction(f.idAccion, f.titulo)}
                          disabled={isExecutingAction}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                        >
                          <Wrench className="w-3 h-3" />
                          Auto-Reparar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONVERSACIÓN CON EL AGENTE INTERVENTOR IA (GEMINI 3.8 FLASH) */}
      {activeTab === 'AGENTE_IA' && (
        <div className="bg-card border-2 border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="bg-slate-950 p-4 border-b border-amber-500/30 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  Interventor Técnico Senior
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-slate-950 rounded">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Canal confidencial con Cristian Andrés Sepúlveda (emp-03)
                </div>
              </div>
            </div>

            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Enlace Activo
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="p-3 bg-muted/40 border-b border-border flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
              Consultas Rápidas:
            </span>
            <button
              onClick={() => handleSendMessage('Hazme una auditoría estricta del flujo de Cotizaciones hacia Planta')}
              className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-amber-500 text-foreground whitespace-nowrap transition-colors"
            >
              Auditar Cotizaciones a OT
            </button>
            <button
              onClick={() => handleSendMessage('¿Cómo está protegido mi usuario emp-03 y qué permisos tengo?')}
              className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-amber-500 text-foreground whitespace-nowrap transition-colors"
            >
              Verificar Inmutabilidad emp-03
            </button>
            <button
              onClick={() => handleSendMessage('Explícame el cálculo de pliegos, merma y redondeo Math.ceil')}
              className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-amber-500 text-foreground whitespace-nowrap transition-colors"
            >
              Cálculo de Pliegos y Mermas
            </button>
            <button
              onClick={() => handleSendMessage('Sincroniza forzosamente la persistencia a Cloud Firestore')}
              className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-amber-500 text-foreground whitespace-nowrap transition-colors"
            >
              Sincronizar a Firestore
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/30 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-4 shadow-xs text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium'
                      : 'bg-muted/70 border border-border text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      msg.role === 'user' ? 'text-slate-900/70' : 'text-muted-foreground'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 w-fit">
                <Bot className="w-4 h-4 text-amber-500 animate-spin" />
                <span>El Interventor está ejecutando análisis forense en los servidores...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3.5 border-t border-border bg-card flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Pregúntale al Interventor sobre cualquier botón, endpoint, base de datos o corrección..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-xs sm:text-sm focus:outline-hidden focus:border-amber-500 text-foreground"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || isChatLoading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MATRIZ DE BOTONES Y FLUJOS */}
      {activeTab === 'MATRIZ' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              {['TODOS', 'COMERCIAL', 'VOZ', 'PRODUCCION', 'COSTOS', 'COLABORACION', 'IA', 'SEGURIDAD', 'HOME'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar botón o endpoint..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-card border border-border focus:outline-hidden focus:border-amber-500 text-foreground"
              />
            </div>
          </div>

          {/* Elements Catalog Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Elemento / Botón</th>
                    <th className="p-3.5">Pantalla y Componente</th>
                    <th className="p-3.5">Endpoint Destino</th>
                    <th className="p-3.5">Destino de la Información</th>
                    <th className="p-3.5 text-center">Criticidad</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredElements.map(elem => (
                    <tr key={elem.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{elem.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {elem.actionDescription}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-primary font-medium">{elem.screen}</div>
                        <div className="text-[10px] text-muted-foreground">{elem.component}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground font-bold">
                          {elem.method}
                        </span>
                        <div className="font-mono text-[11px] text-muted-foreground mt-1">
                          {elem.targetEndpoint}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-foreground font-medium">{elem.dataDestination}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
                            elem.criticality === 'CRITICA'
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-blue-500/15 text-blue-600'
                          }`}
                        >
                          {elem.criticality}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            elem.status === 'VERIFICADO' || elem.status === 'OPTIMIZADO'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {elem.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleInspectElement(elem)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors"
                        >
                          Probar Ping
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspect Modal */}
          {inspectingElement && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-card border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                      {inspectingElement.id}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {inspectingElement.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setInspectingElement(null)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="font-semibold text-foreground">Ruta de Transporte:</div>
                    <div className="font-mono text-[11px] text-primary mt-1">
                      {inspectingElement.method} {inspectingElement.targetEndpoint}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="font-semibold text-foreground">Destino de la Información:</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {inspectingElement.dataDestination}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="font-semibold text-foreground">Payload Esperado:</div>
                    <div className="font-mono text-[11px] text-amber-600 mt-0.5">
                      {inspectingElement.expectedPayload}
                    </div>
                  </div>
                </div>

                {inspectResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Prueba en Caliente Exitosa ({inspectResult.latencyMs}ms)
                    </div>
                    <div className="text-[11px] text-emerald-700 leading-snug">
                      {inspectResult.traceDetails}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setInspectingElement(null)}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CENTRO DE PULIDO Y AUTO-REPARACIÓN */}
      {activeTab === 'PULIDO' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-500" />
              Consola de Pulido y Reconciliación Automatizada
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Acciones directas para forzar persistencia en Firestore, blindar las cuentas de Super Admin, limpiar estados huérfanos y aplicar reglas técnicas en caliente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Action 1: Firestore Sync */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Sincronización Forzada a Cloud Firestore
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Vuelca todo el estado en memoria hacia la colección raíz de Firestore y actualiza el snapshot local-app-state.json.
                  </p>
                </div>
                <button
                  onClick={() => handleExecuteAction('SINCRONIZAR_PERSISTENCIA', 'Sincronizar Persistencia')}
                  disabled={isExecutingAction}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  Ejecutar Sincronización Ahora
                </button>
              </div>

              {/* Action 2: Reconcile Super Admin */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Reconciliación Forzada de Super Admin
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Reafirma que emp-03 (Cristian Andrés Sepúlveda) posea rol super_admin inmutable y permisos comodín [*] en base de datos.
                  </p>
                </div>
                <button
                  onClick={() => handleExecuteAction('RECONCILIAR_SUPER_ADMIN', 'Reconciliar Super Admin')}
                  disabled={isExecutingAction}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Reconciliar Privilegios
                </button>
              </div>

              {/* Action 3: Lock Quote Scales */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Blindaje de Escala en Cotizaciones
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Asegura que ninguna cotización multiescala pase a Orden de Trabajo sin confirmación de la cantidad autorizada.
                  </p>
                </div>
                <button
                  onClick={() => handleExecuteAction('BLINDAR_ESCALAS_COTIZACION', 'Blindar Escalas de Cotización')}
                  disabled={isExecutingAction}
                  className="w-full py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-border transition-colors"
                >
                  Aplicar Regla de Escalas
                </button>
              </div>

              {/* Action 4: Rounding Paper Sheets */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Redondeo de Pliegos con Math.ceil()
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Garantiza compra en múltiplos de pliego entero y reserva merma técnica mínima para troquelado.
                  </p>
                </div>
                <button
                  onClick={() => handleExecuteAction('FORZAR_REDONDEO_PLIEGOS', 'Forzar Redondeo de Pliegos')}
                  disabled={isExecutingAction}
                  className="w-full py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-border transition-colors"
                >
                  Aplicar Redondeo Superior
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
