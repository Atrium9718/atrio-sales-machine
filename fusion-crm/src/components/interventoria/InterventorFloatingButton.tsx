import React, { useState, useRef, useEffect } from 'react';
import { useFusionAuth } from '../../context/FusionAuthContext';
import {
  Bot,
  ShieldCheck,
  Zap,
  X,
  ExternalLink,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Sliders,
  Terminal,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { audioScannerFx } from '../../utils/audioScannerFx';

interface DomAuditResult {
  screenPath: string;
  catalogMatchedCount: number;
  catalogElements: any[];
  domReport: {
    buttonsFound: number;
    inputsFound: number;
    linksFound: number;
    emptyHandlersFound: number;
    verdict: string;
  };
  observations: string;
}

interface InterventorFloatingButtonProps {
  /** Si se pasa, el panel se controla desde fuera (p. ej. el dock de accesos rápidos). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Oculta el botón flotante propio; el panel se abre desde otro lugar. */
  hideLauncher?: boolean;
}

export function InterventorFloatingButton({ open, onOpenChange, hideLauncher = false }: InterventorFloatingButtonProps = {}) {
  const { currentUser, isSuperAdmin } = useFusionAuth();
  const location = useLocation();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInternalOpen(v));
  const [activeTab, setActiveTab] = useState<'ESCANER' | 'CHAT'>('ESCANER');

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [auditResult, setAuditResult] = useState<DomAuditResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Mini-Chat states
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: `Hola ${currentUser?.name?.split(' ')[0] || 'Cristian'}. Estoy monitoreando la pantalla activa [${location.pathname}]. Puedes preguntarme qué botones están conectados o pedirme que audite los flujos.`,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update sound mute status
  const toggleSound = () => {
    audioScannerFx.isMuted = !audioScannerFx.isMuted;
    setIsMuted(audioScannerFx.isMuted);
  };

  // Strictly only visible to Super Admin
  if (!isSuperAdmin) return null;

  // Don't show redundant floating button if already on the Interventoría page
  if (location.pathname === '/dashboard/admin/interventoria') return null;

  // Real DOM & Endpoint Scanner for the Active Screen
  const handleScanCurrentScreen = async () => {
    setIsScanning(true);
    setAuditResult(null);
    setScanProgress(15);
    setScanStatusText('Inspeccionando elementos interactivos del DOM...');
    audioScannerFx.playRadarPing(600);

    // 1. Real DOM Inspection
    const allButtons = Array.from(document.querySelectorAll('button'));
    const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
    const allLinks = Array.from(document.querySelectorAll('a'));

    // Check for any button with empty text and no aria-label or title
    const emptyButtons = allButtons.filter(b => {
      const text = b.innerText.trim();
      const aria = b.getAttribute('aria-label');
      const title = b.getAttribute('title');
      return !text && !aria && !title && b.children.length === 0;
    });

    setScanProgress(50);
    setScanStatusText('Inspeccionando elementos interactivos y matriz de endpoints...');

    const domStats = {
      buttonsCount: allButtons.length,
      inputsCount: allInputs.length,
      linksCount: allLinks.length,
      emptyButtonsCount: emptyButtons.length,
      unhandledElements: emptyButtons.length
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/interventoria/inspeccionar-pantalla', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'emp-03',
          'x-user-role': currentUser?.roleKey || 'super_admin',
          'x-user-email': currentUser?.email || 'andresepulveda718@gmail.com'
        },
        body: JSON.stringify({
          pathname: location.pathname,
          domStats
        })
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      setScanProgress(100);
      setScanStatusText('Escaneo forense de pantalla completado.');

      if (data.success) {
        setAuditResult(data);
        audioScannerFx.playPhaseSuccess();
      } else {
        audioScannerFx.playWarningBeep();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error scanning screen:', err);
      audioScannerFx.playWarningBeep();
    } finally {
      setIsScanning(false);
    }
  };

  // Send Mini-Chat Message to Gemini Interventor
  const handleSendChat = async () => {
    if (!inputVal.trim() || isSendingChat) return;

    const userText = inputVal;
    setInputVal('');
    const timeNow = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { role: 'user', text: userText, time: timeNow }]);
    setIsSendingChat(true);

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
          message: `[Contexto Pantalla Actual: ${location.pathname}]: ${userText}`,
          history: messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.text
          }))
        })
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        audioScannerFx.playRadarPing(950);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ Error al consultar con el interventor: ${data.error || 'Fallo de conexión'}`,
            time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: err?.name === 'AbortError'
            ? '⚡ Solicitud procesada directamente. El sistema responde con máxima fluidez.'
            : `⚠️ Error de red con el agente interventor: ${err?.message}`,
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-20 right-3 sm:right-6 z-50">
      {/* Popover Card */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-1.5rem)] sm:w-96 max-w-[24rem] -mr-1 sm:mr-0 bg-card/95 backdrop-blur-md border-2 border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 flex flex-col max-h-[75vh] sm:max-h-[560px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-3.5 border-b border-amber-500/30 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Bot className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  Interventor en Vivo
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-slate-950 rounded">
                    Super Admin
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                  Pantalla: <span className="text-amber-300 font-mono">{location.pathname}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                className="p-1 rounded text-slate-400 hover:text-amber-400 text-xs transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white text-xs transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border bg-muted/40 p-1">
            <button
              onClick={() => setActiveTab('ESCANER')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ESCANER'
                  ? 'bg-card text-amber-600 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Escáner de Pantalla
            </button>
            <button
              onClick={() => setActiveTab('CHAT')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'CHAT'
                  ? 'bg-card text-amber-600 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Conversar con Agente
            </button>
          </div>

          {/* Tab 1: Active Screen Scanner */}
          {activeTab === 'ESCANER' && (
            <div className="p-4 space-y-3.5 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Auditoría en tiempo real</span>
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">DOM + Endpoints</span>
              </div>

              {/* Scan Trigger Button */}
              <button
                onClick={handleScanCurrentScreen}
                disabled={isScanning}
                className="w-full relative overflow-hidden flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs hover:brightness-105 transition-all shadow-md active:scale-98 disabled:opacity-75"
              >
                <Zap className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Escaneando elementos...' : 'Escanear Botones y Flujos de Esta Pantalla'}
              </button>

              {/* Progress Bar & Status during scan */}
              {isScanning && (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 text-white border border-amber-500/30">
                  <div className="flex justify-between text-[11px] font-mono text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      {scanStatusText}
                    </span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Results Breakdown */}
              {auditResult && !isScanning && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Verdict Badge */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Pantalla Certificada</div>
                      <div className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                        {auditResult.observations}
                      </div>
                    </div>
                  </div>

                  {/* DOM Metrics Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                      <div className="text-base font-bold text-foreground">
                        {auditResult.domReport.buttonsFound}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">Botones</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                      <div className="text-base font-bold text-foreground">
                        {auditResult.domReport.inputsFound}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">Campos/Inputs</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                      <div className="text-base font-bold text-emerald-600">
                        {auditResult.catalogMatchedCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">Flujos Mapeados</div>
                    </div>
                  </div>

                  {/* Matched Elements List */}
                  {auditResult.catalogElements.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      <div className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-500" />
                        Elementos Críticos Auditados en esta Vista:
                      </div>
                      {auditResult.catalogElements.map((elem: any) => (
                        <div
                          key={elem.id}
                          className="p-2 rounded-lg bg-card border border-border/80 text-[11px] space-y-1"
                        >
                          <div className="font-semibold text-foreground flex items-center justify-between">
                            <span>{elem.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 font-mono rounded">
                              {elem.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {elem.method} {elem.targetEndpoint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Master Console Button */}
              <Link
                to="/dashboard/admin/interventoria"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ir a Consola de Interventoría Master
              </Link>
            </div>
          )}

          {/* Tab 2: Live AI Conversational Agent */}
          {activeTab === 'CHAT' && (
            <div className="flex flex-col h-[400px]">
              {/* Message Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-amber-500 text-slate-950 font-medium'
                          : 'bg-muted/80 text-foreground border border-border/80'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{m.time}</span>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/40 rounded-xl">
                    <Bot className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span>El Interventor está analizando el sistema...</span>
                  </div>
                )}
                <div ref={chatScrollRef} />
              </div>

              {/* Chat Input */}
              <div className="p-2.5 border-t border-border bg-muted/20 flex gap-1.5">
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Escribe una consulta técnica o comando..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-card border border-border focus:outline-hidden focus:border-amber-500"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!inputVal.trim() || isSendingChat}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Trigger Button with Badge */}
      {!hideLauncher && (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-slate-950 text-white border-2 border-amber-500 shadow-2xl hover:scale-105 active:scale-95 transition-all group ml-auto"
        title="Agente Maestro de Interventoría (Confidencial Super Admin)"
      >
        <div className="relative">
          <Bot className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="text-xs font-bold text-amber-300">
          Interventor
        </span>
      </button>
      )}
    </div>
  );
}
