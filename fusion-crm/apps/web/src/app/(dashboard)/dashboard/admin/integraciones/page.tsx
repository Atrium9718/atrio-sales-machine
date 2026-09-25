import React, { useState, useEffect } from 'react';
import { Blocks, PlayCircle, Settings2, RefreshCcw, Power, CheckCircle2, XCircle, Clock, Link as LinkIcon, Code, Smartphone, MessageCircle, Copy } from 'lucide-react';

export default function IntegracionesPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/ops/integrations').then(r => r.json()).then(setIntegrations);
  }, []);

  const handleTest = async (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, testing: true } : i));
    try {
      const res = await fetch(`/api/ops/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setIntegrations(prev => prev.map(i => i.id === id ? { 
        ...i, 
        testing: false, 
        status: data.success ? 'OK' : 'ERROR',
        error: data.error,
        latency: data.latency
      } : i));
    } catch (e) {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, testing: false, status: 'ERROR', error: 'Network error' } : i));
    }
  };

  const copyWidgetCode = () => {
    const code = `<script src="https://api.fusioncg.com/widget.js" data-company="FUSION_123" async></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background overflow-y-auto space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Blocks className="text-primary" /> Integraciones y Omnicanalidad</h1>
          <p className="text-muted-foreground mt-1">Conecta WhatsApp, Redes Sociales y despliega el Widget Chatbot en tu página web.</p>
        </div>
      </div>

      {/* WIDGET WEB SECTION */}
      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Botón para tu Sitio Web (Chat Widget)</h2>
            <p className="text-sm text-muted-foreground">Copia y pega este código en tu página web antes del cierre de la etiqueta &lt;/body&gt; para instalar el asistente inteligente.</p>
          </div>
        </div>
        <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full md:w-2/3 bg-black rounded-lg p-4 font-mono text-xs text-green-400 relative overflow-x-auto shadow-inner">
            <code>
              &lt;!-- Inicio FusionCG Widget --&gt;<br />
              &lt;script <br />
              &nbsp;&nbsp;src="https://api.fusioncg.com/widget.js" <br />
              &nbsp;&nbsp;data-company="FUSION_123" <br />
              &nbsp;&nbsp;async<br />
              &gt;&lt;/script&gt;<br />
              &lt;!-- Fin FusionCG Widget --&gt;
            </code>
            <button 
              onClick={copyWidgetCode}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded transition-colors flex items-center gap-1"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="w-full md:w-1/3 text-sm text-muted-foreground">
            <h4 className="font-bold text-foreground mb-2">Características del Widget:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Redirección a tus agentes IA.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Centraliza los chats en tu Inbox.</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Captura automática de prospectos.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* OTRAS INTEGRACIONES SECTION */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          Canales y Sistemas Conectados
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {integrations.map(int => (
            <div key={int.id} className="border border-border bg-card rounded-xl flex flex-col lg:flex-row overflow-hidden shadow-sm">
              <div className="p-5 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-border bg-muted/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {int.status === 'OK' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    <h3 className="font-bold text-lg">{int.name}</h3>
                  </div>
                  {int.status === 'ERROR' && (
                    <div className="text-xs text-red-600 bg-red-500/10 p-2 rounded mt-2 font-mono">
                      {int.error}
                    </div>
                  )}
                  {int.latency && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3" /> Latencia: {int.latency}ms
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => handleTest(int.id)}
                    disabled={int.testing}
                    className="flex-1 bg-secondary text-secondary-foreground border border-border px-3 py-2 rounded-md text-sm font-medium hover:bg-muted flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" /> {int.testing ? 'Probando...' : 'Probar Conexión'}
                  </button>
                </div>
              </div>
              <div className="p-5 lg:w-2/3">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-sm">Configuración de Conexión</h4>
                  <div className="flex gap-2">
                    <button className="text-muted-foreground hover:text-primary p-1 transition-colors" title="Configurar Webhooks"><Settings2 className="w-4 h-4" /></button>
                    <button className="text-muted-foreground hover:text-red-500 p-1 transition-colors" title="Desactivar temporalmente"><Power className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(int.config).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <input type="text" defaultValue={String(val)} className="mt-1 px-3 py-2 border border-input rounded-md w-full bg-background text-sm font-mono shadow-sm" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      Token / Secreto <span className="bg-primary/10 text-primary text-[10px] px-1 rounded uppercase font-bold tracking-wider">Protegido</span>
                    </label>
                    <select className="mt-1 px-3 py-2 border border-input rounded-md w-full bg-muted/50 text-sm opacity-80" disabled>
                       <option>Bóveda: {int.name} Key</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Última sincronización: Hoy, hace un momento</span>
                  <button className="text-primary hover:underline flex items-center gap-1 font-medium">
                    <RefreshCcw className="w-3 h-3" /> Forzar Sincronización
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
