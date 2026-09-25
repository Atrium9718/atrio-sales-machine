import * as React from 'react';
import {
  PhoneCall,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Globe,
  Server,
  Radio,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ArrowRight,
  Activity,
  Sliders,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface TrunkData {
  id: string;
  name: string;
  provider: string;
  sipHost: string;
  sipPort: number;
  transport: string;
  username: string;
  register: boolean;
  maxChannels: number;
  codecs: string[];
  callerIdDefault: string;
  status: string;
  lastTestedAt?: string;
  testResult?: {
    status: 'GREEN' | 'YELLOW' | 'RED';
    latencyMs?: number;
    ariVersion?: string;
    details: string;
  };
}

interface NumberRecord {
  id: string;
  e164Number: string;
  displayName: string;
  countryCode: string;
  trunkId: string;
  primaryAction: 'IVR_FLOW' | 'QUEUE' | 'EXTENSION' | 'AI_AGENT' | 'VOICEMAIL' | 'EXTERNAL_NUMBER';
  primaryTargetId: string;
  secondaryAction?: string;
  secondaryTargetId?: string;
  scheduleId?: string;
  status: string;
}

interface ExtensionRecord {
  id: string;
  extension: string;
  label: string;
  sipUsername: string;
  userId?: string;
  type: string;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_PROVISION';
  ringStrategy: 'BROWSER_ONLY' | 'BROWSER_THEN_MOBILE' | 'BROWSER_AND_MOBILE' | 'MOBILE_ONLY';
  mobileNumber?: string;
  ringTimeoutSeconds: number;
  voicemailEnabled: boolean;
  recordingPolicy: string;
  liveState: 'online' | 'offline' | 'unknown' | 'ring' | 'inuse' | 'busy';
  channelCount: number;
  hasDiscrepancy: boolean;
}

interface ScheduleData {
  id: string;
  name: string;
  timezone: string;
  holidaysFollowLaw51: boolean;
  weeklyHours: {
    dayOfWeek: number;
    dayName: string;
    enabled: boolean;
    openTime: string;
    closeTime: string;
  }[];
  openAction: string;
  closedAction: string;
  holidayAction: string;
}

export function VozConfiguracionPage() {
  const [activeTab, setActiveTab] = React.useState<'TRONCAL' | 'NUMEROS' | 'EXTENSIONES' | 'HORARIOS'>('TRONCAL');
  const [loading, setLoading] = React.useState(true);

  // Datos del backend
  const [trunk, setTrunk] = React.useState<TrunkData | null>(null);
  const [numbers, setNumbers] = React.useState<NumberRecord[]>([]);
  const [extensions, setExtensions] = React.useState<ExtensionRecord[]>([]);
  const [schedule, setSchedule] = React.useState<ScheduleData | null>(null);
  const [realtimeBogota, setRealtimeBogota] = React.useState<any>(null);
  const [nextHoliday, setNextHoliday] = React.useState<any>(null);
  const [upcomingHolidays, setUpcomingHolidays] = React.useState<any[]>([]);

  // Banderas de estado del sistema
  const [hasDesync, setHasDesync] = React.useState(false);
  const [hasUnconfiguredNumbers, setHasUnconfiguredNumbers] = React.useState(false);

  // Estados de prueba y guardado
  const [testingTrunk, setTestingTrunk] = React.useState(false);
  const [reconciling, setReconciling] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modal para revelar credenciales SIP
  const [revealedCreds, setRevealedCreds] = React.useState<{ ext: string; user: string; pass: string } | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);

  // Modal para nueva extensión
  const [isNewExtModalOpen, setIsNewExtModalOpen] = React.useState(false);
  const [newExtData, setNewExtData] = React.useState({
    userName: '',
    userId: '',
    type: 'USER',
  });

  // Modal para nuevo número DID
  const [isNewNumModalOpen, setIsNewNumModalOpen] = React.useState(false);
  const [newNumData, setNewNumData] = React.useState<Partial<NumberRecord>>({
    e164Number: '+57',
    displayName: '',
    primaryAction: 'IVR_FLOW',
    primaryTargetId: 'ivr_menu_bienvenida',
  });

  // Estado de cierre de emergencia ("Cerrar Ahora")
  const [scheduleLiveStatus, setScheduleLiveStatus] = React.useState<any>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState('');
  const [overrideMinutes, setOverrideMinutes] = React.useState('120');

  // Cargar datos principales
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [resTrunk, resNumbers, resExtensions, resSchedules, resStatus] = await Promise.all([
        fetch('/api/voice/trunk').then((r) => r.json()).catch(() => ({ trunk: null })),
        fetch('/api/voice/numbers').then((r) => r.json()).catch(() => ({ numbers: [], hasUnconfiguredTarget: false })),
        fetch('/api/voice/extensions').then((r) => r.json()).catch(() => ({ extensions: [], hasDesync: false })),
        fetch('/api/voice/schedules').then((r) => r.json()).catch(() => ({ schedule: null })),
        fetch('/api/voice/schedules/status').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (resTrunk.trunk) setTrunk(resTrunk.trunk);
      if (resNumbers.numbers) {
        setNumbers(resNumbers.numbers);
        setHasUnconfiguredNumbers(resNumbers.hasUnconfiguredTarget);
      }
      if (resExtensions.extensions) {
        setExtensions(resExtensions.extensions);
        setHasDesync(resExtensions.hasDesync);
      }
      if (resSchedules.schedule) {
        setSchedule(resSchedules.schedule);
        setRealtimeBogota(resSchedules.realtimeBogota);
        setNextHoliday(resSchedules.nextHoliday);
        setUpcomingHolidays(resSchedules.upcomingHolidays || []);
      }
      if (resStatus.success && resStatus.data) {
        setScheduleLiveStatus(resStatus.data);
      }
    } catch (err: any) {
      console.error('Error cargando configuración de voz:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEmergencyClosure = async (active: boolean) => {
    try {
      const res = await fetch('/api/voice/schedules/sched_main/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active,
          reason: overrideReason,
          reopenMinutes: parseInt(overrideMinutes, 10),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: json.message });
        setIsOverrideModalOpen(false);
        setOverrideReason('');
        loadData();
      } else {
        setStatusMessage({ type: 'error', text: json.error });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error al cambiar estado de cierre de emergencia.' });
    }
  };

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Probar conexión de troncal
  const handleTestTrunk = async () => {
    setTestingTrunk(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/voice/trunk/test', { method: 'POST' });
      const data = await res.json();
      if (data.testResult && trunk) {
        setTrunk({
          ...trunk,
          lastTestedAt: data.lastTestedAt,
          testResult: data.testResult,
        });
        if (data.testResult.status === 'GREEN') {
          setStatusMessage({ type: 'success', text: data.testResult.details });
        } else if (data.testResult.status === 'YELLOW') {
          setStatusMessage({ type: 'info', text: data.testResult.details });
        } else {
          setStatusMessage({ type: 'error', text: data.testResult.details });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error ejecutando prueba: ' + err.message });
    } finally {
      setTestingTrunk(false);
    }
  };

  // Reconciliar extensiones con Asterisk
  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/voice/extensions/reconcile', { method: 'POST' });
      const data = await res.json();
      setStatusMessage({
        type: data.errors && data.errors.length > 0 ? 'info' : 'success',
        text: `Reconciliación completada: ${data.synced} sincronizadas, ${data.pending} pendientes.`,
      });
      await loadData();
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Fallo al reconciliar: ' + e.message });
    } finally {
      setReconciling(false);
    }
  };

  // Rotar contraseña de extensión
  const handleRotateSecret = async (extNumber: string) => {
    if (!window.confirm(`¿Rotar la contraseña SIP de la Extensión ${extNumber}? Se generará una nueva contraseña de 24 caracteres aleatorios y se actualizará en Asterisk. Los dispositivos deberán reconectarse.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/voice/extensions/${extNumber}/rotate-secret`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: `Contraseña de Extensión ${extNumber} rotada exitosamente.` });
        await loadData();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Error al rotar contraseña' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  // Revelar credenciales SIP
  const handleRevealCredentials = async (extNumber: string) => {
    if (!window.confirm(`Acceso a credenciales protegidas de la Ext. ${extNumber}. Esta acción se registrará en el registro de auditoría (AuditLog) por seguridad. ¿Desea continuar?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/voice/extensions/${extNumber}/reveal`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.credentials) {
        setRevealedCreds({
          ext: data.credentials.extension,
          user: data.credentials.username,
          pass: data.credentials.password,
        });
      } else {
        alert('Error: ' + (data.error || 'No se pudieron descifrar las credenciales.'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Desaprovisionar extensión
  const handleDeprovision = async (extNumber: string) => {
    if (!window.confirm(`¿Deshabilitar la extensión ${extNumber}? La configuración se eliminará de Asterisk pero el historial de llamadas (VoiceCall) se conservará íntegramente.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/voice/extensions/${extNumber}/deprovision`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'info', text: `Extensión ${extNumber} deshabilitada.` });
        await loadData();
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    }
  };

  // Crear nueva extensión
  const handleCreateExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtData.userName.trim()) return;

    try {
      const res = await fetch('/api/voice/extensions/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newExtData.userId || `user_${Date.now()}`,
          userName: newExtData.userName,
          type: newExtData.type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewExtModalOpen(false);
        setNewExtData({ userName: '', userId: '', type: 'USER' });
        setStatusMessage({
          type: 'success',
          text: `Extensión ${data.extension} aprovisionada exitosamente.`,
        });
        await loadData();
      }
    } catch (err: any) {
      alert('Error aprovisionando: ' + err.message);
    }
  };

  // Crear o actualizar número
  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumData.e164Number || !newNumData.displayName) return;

    try {
      const res = await fetch('/api/voice/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNumData),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewNumModalOpen(false);
        setNewNumData({ e164Number: '+57', displayName: '', primaryAction: 'IVR_FLOW', primaryTargetId: 'ivr_menu_bienvenida' });
        setStatusMessage({ type: 'success', text: 'Número telefónico registrado.' });
        await loadData();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div id="voz-configuracion-page" className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Asterisk 22.6 LTS (ARI / WebRTC)
              </span>
              <span className="text-xs font-mono text-slate-500">Etapa 17.2</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Configuración de Telefonía y Troncales SIP
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Administración de la troncal SIP de operador, enrutamiento de números entrantes (DIDs),
              aprovisionamiento automático de extensiones WebRTC y control de horarios comerciales de Bogotá.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Bogotá: {realtimeBogota?.currentTimeBogota || '--:--'}</span>
              <span
                className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  realtimeBogota?.isOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {realtimeBogota?.isOpen ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          </div>
        </div>

        {/* Mensaje de estado global */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium flex-1">{statusMessage.text}</div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Alerta de Desincronización de Extensiones */}
        {hasDesync && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Discrepancia detectada entre el CRM y Asterisk
                </h4>
                <p className="text-xs text-amber-700">
                  Existen extensiones en estado pendiente o fuera de sincronía con la memoria de Asterisk ARI.
                </p>
              </div>
            </div>
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              Reconciliar con Asterisk
            </button>
          </div>
        )}

        {/* Alerta de Números sin destino asignado */}
        {hasUnconfiguredNumbers && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-3 shadow-sm">
            <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Líneas telefónicas sin destino</h4>
              <p className="text-xs text-rose-700">
                Hay números DID asignados que no tienen acción de entrada (IVR, Cola, Extensión o Agente de IA). Las llamadas a estas líneas serán rechazadas.
              </p>
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('TRONCAL')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
                activeTab === 'TRONCAL'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Server className="w-4 h-4" />
              Troncal SIP de Operador
            </button>
            <button
              onClick={() => setActiveTab('NUMEROS')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
                activeTab === 'NUMEROS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              Números Entrantes (DIDs)
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-xs rounded-full font-mono">
                {numbers.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('EXTENSIONES')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
                activeTab === 'EXTENSIONES'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <User className="w-4 h-4" />
              Extensiones de Usuario
              <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-xs rounded-full font-mono">
                {extensions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('HORARIOS')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors ${
                activeTab === 'HORARIOS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Horarios y Festivos (Ley 51)
            </button>
          </nav>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* PESTAÑA 1: TRONCAL SIP */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'TRONCAL' && trunk && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel Izquierdo: Formulario de Troncal */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Parámetros de Enlace SIP</h3>
                  <p className="text-xs text-slate-500">
                    Configuración PJSIP del operador de telefonía (Claro, ETB, Twilio o Asterisk local).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {trunk.provider}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Nombre de la Troncal</label>
                  <input
                    type="text"
                    readOnly
                    value={trunk.name}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Host SIP / IP Operador</label>
                  <input
                    type="text"
                    readOnly
                    value={trunk.sipHost}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Puerto SIP</label>
                  <input
                    type="number"
                    readOnly
                    value={trunk.sipPort}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Protocolo de Transporte</label>
                  <input
                    type="text"
                    readOnly
                    value={trunk.transport}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Usuario SIP Autenticado</label>
                  <input
                    type="text"
                    readOnly
                    value={trunk.username}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Contraseña SIP</label>
                  <input
                    type="password"
                    readOnly
                    value="••••••••••••••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Caller ID por Defecto (E.164)</label>
                  <input
                    type="text"
                    readOnly
                    value={trunk.callerIdDefault}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">Límite de Canales Simultáneos</label>
                  <input
                    type="number"
                    readOnly
                    value={trunk.maxChannels}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">Códecs de Audio Negociados</label>
                <div className="flex gap-2">
                  {trunk.codecs.map((codec) => (
                    <span
                      key={codec}
                      className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-semibold uppercase"
                    >
                      {codec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <span>
                  Seguridad perimetral activa: El dialplan <code className="text-indigo-600 font-bold">extensions.conf</code> delega
                  el 100% del control a Stasis (<code className="text-indigo-600 font-bold">fusion-voz</code>). Asterisk tiene
                  <code className="text-slate-800 font-bold"> allowguest=no</code> y el puerto 5060 está blindado con UFW y fail2ban.
                </span>
              </div>
            </div>

            {/* Panel Derecho: Diagnóstico y Semáforo de Conexión */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Diagnóstico en Vivo</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Prueba de enlace mediante REST ARI y verificación de registro PJSIP.
                </p>

                {/* Semáforo Visual */}
                <div className="p-5 rounded-xl border bg-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        trunk.testResult?.status === 'GREEN'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                          : trunk.testResult?.status === 'YELLOW'
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                          : trunk.testResult?.status === 'RED'
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                          : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      <Activity className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="font-bold text-sm text-slate-800">
                    {trunk.testResult?.status === 'GREEN' && 'EN LÍNEA Y REGISTRADA'}
                    {trunk.testResult?.status === 'YELLOW' && 'PARCIAL / SIN REGISTRO'}
                    {trunk.testResult?.status === 'RED' && 'DESCONECTADA / ERROR'}
                    {!trunk.testResult && 'PENDIENTE DE PRUEBA'}
                  </div>

                  <div className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    {trunk.testResult?.details || 'Presione el botón inferior para diagnosticar la troncal en tiempo real.'}
                  </div>

                  {trunk.testResult?.latencyMs !== undefined && (
                    <div className="text-[11px] font-mono text-slate-500">
                      Latencia de respuesta: {trunk.testResult.latencyMs} ms
                    </div>
                  )}
                </div>

                {trunk.lastTestedAt && (
                  <div className="mt-3 text-[11px] text-slate-400 text-center">
                    Última prueba realizada: {new Date(trunk.lastTestedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <button
                onClick={handleTestTrunk}
                disabled={testingTrunk}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${testingTrunk ? 'animate-spin' : ''}`} />
                {testingTrunk ? 'Consultando Asterisk ARI...' : 'Probar conexión'}
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PESTAÑA 2: NÚMEROS TELEFÓNICOS (DIDs) */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'NUMEROS' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Números Telefónicos Entrantes (DIDs)</h3>
                <p className="text-xs text-slate-500">
                  Enrutamiento de llamadas entrantes hacia Flujos IVR, Colas de Atención o el Agente de IA.
                </p>
              </div>
              <button
                onClick={() => setIsNewNumModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Asignar Nuevo Número
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Número (E.164)</th>
                    <th className="py-3 px-4">Identificador</th>
                    <th className="py-3 px-4">Destino Principal</th>
                    <th className="py-3 px-4">Destino Fuera de Horario</th>
                    <th className="py-3 px-4">Troncal</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {numbers.map((num) => (
                    <tr key={num.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {num.e164Number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{num.displayName}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {num.primaryAction === 'IVR_FLOW' && 'Menú IVR Bienvenida'}
                          {num.primaryAction === 'QUEUE' && 'Cola de Atención'}
                          {num.primaryAction === 'AI_AGENT' && 'Agente de IA Clara'}
                          {num.primaryAction === 'EXTENSION' && 'Extensión Directa'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                          {num.secondaryAction === 'AI_AGENT' ? 'Agente de IA (24/7)' : 'Buzón de Voz'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">Claro SIP</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={async () => {
                            if (window.confirm(`¿Liberar número ${num.e164Number}?`)) {
                              await fetch(`/api/voice/numbers/${num.id}`, { method: 'DELETE' });
                              await loadData();
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar número"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PESTAÑA 3: EXTENSIONES TELEFÓNICAS (VOICE EXTENSIONS) */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'EXTENSIONES' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Extensiones de Telefonía Interna</h3>
                <p className="text-xs text-slate-500">
                  Aprovisionadas automáticamente mediante ARI con contraseñas seguras cifradas en Secret.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReconcile}
                  disabled={reconciling}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                  Reconciliar con Asterisk
                </button>
                <button
                  onClick={() => setIsNewExtModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
                >
                  <Plus className="w-4 h-4" /> Aprovisionar Extensión
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Extensión</th>
                    <th className="py-3 px-4">Usuario / Etiqueta</th>
                    <th className="py-3 px-4">Usuario SIP</th>
                    <th className="py-3 px-4">Estrategia de Timbrado</th>
                    <th className="py-3 px-4">Estado Asterisk (ARI)</th>
                    <th className="py-3 px-4">Estado CRM</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extensions.map((ext) => (
                    <tr key={ext.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {ext.extension}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{ext.label}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{ext.sipUsername}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          {ext.ringStrategy === 'BROWSER_AND_MOBILE' ? (
                            <>
                              <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Navegador + Celular</span>
                            </>
                          ) : (
                            <>
                              <Laptop className="w-3.5 h-3.5 text-slate-600" />
                              <span>Solo Navegador WebRTC</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            ext.liveState === 'online'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ext.liveState === 'inuse'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ext.liveState === 'online'
                                ? 'bg-emerald-500'
                                : ext.liveState === 'inuse'
                                ? 'bg-indigo-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {ext.liveState === 'online'
                            ? 'Registrado (En línea)'
                            : ext.liveState === 'inuse'
                            ? 'En Llamada'
                            : 'No Registrado (Offline)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            ext.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ext.status === 'PENDING_PROVISION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {ext.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRevealCredentials(ext.extension)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                            title="Ver credenciales SIP (Auditado)"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRotateSecret(ext.extension)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                            title="Rotar contraseña de 24 caracteres"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeprovision(ext.extension)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                            title="Deshabilitar extensión"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* PESTAÑA 4: HORARIOS Y FESTIVOS (VOICE SCHEDULES) */}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'HORARIOS' && schedule && (
          <div className="space-y-6">
            {/* Widget de Estado en Tiempo Real (Bogotá) */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    scheduleLiveStatus?.isOpen
                      ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-100'
                      : 'bg-amber-500 ring-4 ring-amber-100'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Estado en Tiempo Real (Bogotá)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        scheduleLiveStatus?.isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {scheduleLiveStatus?.statusHeadline || (scheduleLiveStatus?.isOpen ? 'ABIERTO' : 'CERRADO')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {scheduleLiveStatus?.detailText || 'Horario de atención de lunes a viernes de 7:30 a.m. a 5:30 p.m.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Zona Horaria Oficial: <strong>America/Bogota (UTC-5)</strong> — Sin cambio de hora estacional.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {scheduleLiveStatus?.overrideActive ? (
                  <button
                    onClick={() => handleToggleEmergencyClosure(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reanudar Atención Normal</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsOverrideModalOpen(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cerrar Ahora (Emergencia)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel Izquierdo: Horario Semanal */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{schedule.name}</h3>
                    <p className="text-xs text-slate-500">Zona Horaria Oficial: {schedule.timezone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Ley 51 de 1983 (Emiliani)
                    </span>
                  </div>
                </div>

              <div className="space-y-3">
                {schedule.weeklyHours.map((wh) => (
                  <div
                    key={wh.dayOfWeek}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                      wh.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          wh.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-semibold text-slate-800 w-24">{wh.dayName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {wh.enabled ? (
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                          <span>{wh.openTime}</span>
                          <span className="text-slate-400">a</span>
                          <span>{wh.closeTime}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Cerrado</span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          wh.enabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {wh.enabled ? 'Laboral' : 'Inhábil'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones de enrutamiento por horario */}
              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="font-bold block mb-1">En Horario Abierto</span>
                  <span>Enruta a Flujo IVR Principal con agentes humanos y colas.</span>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold block mb-1">Fuera de Horario</span>
                  <span>Transfiere inmediatamente al Agente de IA Clara (24/7).</span>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                  <span className="font-bold block mb-1">Días Festivos</span>
                  <span>Respuesta institucional de festivo + captura de requerimiento con IA.</span>
                </div>
              </div>
            </div>

            {/* Panel Derecho: Festivos Oficiales de Colombia */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Festivos Nacionales de Colombia</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Cálculo automático según Ley 51 de 1983 (Ley Emiliani) y calendario litúrgico de Pascua.
                </p>

                {/* Tarjeta de Próximo Festivo */}
                {nextHoliday && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 text-indigo-950 space-y-2 mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      <Calendar className="w-4 h-4" /> Próximo Día Feriado
                    </div>
                    <div className="text-lg font-bold">{nextHoliday.name}</div>
                    <div className="text-xs font-mono text-indigo-600">{nextHoliday.date}</div>
                    <div className="text-[11px] text-slate-600">
                      El sistema cerrará automáticamente las colas humanas y activará la atención telefónica con IA.
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Próximos festivos del año
                  </span>
                  <div className="divide-y divide-slate-100 text-xs">
                    {upcomingHolidays.map((h, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-800 block">{h.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {h.type === 'EMILIANI' ? 'Trasladado a lunes' : h.type === 'EASTER' ? 'Semana Santa / Pascua' : 'Fecha fija'}
                          </span>
                        </div>
                        <span className="font-mono text-slate-600 font-semibold">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Modal: Revelar Credenciales SIP */}
      {revealedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <KeyRound className="w-5 h-5" />
                <span>Credenciales SIP de Extensión {revealedCreds.ext}</span>
              </div>
              <button
                onClick={() => {
                  setRevealedCreds(null);
                  setCopiedKey(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Esta visualización fue registrada en el log de auditoría. Guarde la contraseña en un gestor seguro.
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Extensión</label>
                <input
                  type="text"
                  readOnly
                  value={revealedCreds.ext}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Usuario SIP</label>
                <input
                  type="text"
                  readOnly
                  value={revealedCreds.user}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Contraseña SIP Cifrada</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={revealedCreds.pass}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 pr-10"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(revealedCreds.pass);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-indigo-600"
                    title="Copiar contraseña"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setRevealedCreds(null);
                setCopiedKey(false);
              }}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Aprovisionar Nueva Extensión */}
      {isNewExtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Aprovisionar Extensión Telefónica</h3>
              <button onClick={() => setIsNewExtModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExtension} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Asesor / Colaborador</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carolina Gómez"
                  value={newExtData.userName}
                  onChange={(e) => setNewExtData({ ...newExtData, userName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Extensión</label>
                <select
                  value={newExtData.type}
                  onChange={(e) => setNewExtData({ ...newExtData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                >
                  <option value="USER">Usuario Asesor (WebRTC Navegador)</option>
                  <option value="DESK">Teléfono SIP Físico de Escritorio</option>
                  <option value="VIRTUAL">Línea Virtual / Recepción</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                El sistema asignará automáticamente el siguiente número de serie libre (desde 101),
                generará una contraseña aleatoria de 24 caracteres en el baúl <code className="font-bold">Secret</code>
                y registrará el <code className="font-bold">endpoint</code>, <code className="font-bold">auth</code> y <code className="font-bold">aor</code> en Asterisk vía ARI.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewExtModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  Aprovisionar en Asterisk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Número DID */}
      {isNewNumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Registrar Número Entrante (DID)</h3>
              <button onClick={() => setIsNewNumModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNumber} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Número E.164</label>
                <input
                  type="text"
                  required
                  placeholder="+576017441234"
                  value={newNumData.e164Number}
                  onChange={(e) => setNewNumData({ ...newNumData, e164Number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre / Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="PBX Secundaria Medellín"
                  value={newNumData.displayName}
                  onChange={(e) => setNewNumData({ ...newNumData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Destino Principal (En Horario)</label>
                <select
                  value={newNumData.primaryAction}
                  onChange={(e) => setNewNumData({ ...newNumData, primaryAction: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 bg-white"
                >
                  <option value="IVR_FLOW">Flujo IVR de Bienvenida</option>
                  <option value="QUEUE">Cola de Atención Comercial</option>
                  <option value="AI_AGENT">Agente de IA Clara (Atención Directa)</option>
                  <option value="EXTENSION">Extensión Específica</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewNumModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  Guardar Número
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Ahora (Anulación de Emergencia de Horario) */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cierre Extraordinario de Líneas Telefónicas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Las llamadas entrantes escucharán la locución de fuera de horario y no timbrarán en asesores.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo obligatorio del cierre *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="ej: Reunión general de equipo / Emergencia técnica / Mantenimiento de servidores"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reapertura automática en:
                </label>
                <select
                  value={overrideMinutes}
                  onChange={(e) => setOverrideMinutes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="120">2 horas (Recomendado)</option>
                  <option value="240">4 horas</option>
                  <option value="900">Hasta mañana a primera hora (7:30 a.m.)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!overrideReason.trim()}
                onClick={() => handleToggleEmergencyClosure(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                Confirmar Cierre de Emergencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VozConfiguracionPage;
