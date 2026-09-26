"use client";

import * as React from "react";
import { Search, ArrowLeft, ArrowRightLeft, Menu, Filter, MessageCircle, Mail, Bot, User, Clock, CheckCircle2, MoreVertical, Send, Paperclip, Zap, AlertTriangle, MessageSquare, Phone, PhoneCall, PhoneForwarded, Settings, Instagram, Hash, X, Plus, MicOff , FileText, Calendar } from "lucide-react";


function SupervisionPanel() {
  return (
    <div className="flex-1 bg-muted/20 p-6 overflow-y-auto w-full h-full">
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><PhoneCall className="w-6 h-6 text-primary" /> Panel de Supervisión (En Vivo)</h2>
               <p className="text-sm text-muted-foreground mt-1">Monitoreo en tiempo real de colas, SLAs y agentes.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema Operativo
            </div>
         </div>
         
         {/* Top KPIs */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
               <div className="flex justify-between text-muted-foreground mb-2"><span className="text-xs font-bold uppercase">Llamadas en Curso</span> <Phone className="w-4 h-4"/></div>
               <span className="text-2xl md:text-3xl font-black">2</span>
               <span className="text-[10px] text-green-600 font-bold mt-2">1 en cola (00:45s)</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
               <div className="flex justify-between text-muted-foreground mb-2"><span className="text-xs font-bold uppercase">Conversaciones Activas</span> <MessageSquare className="w-4 h-4"/></div>
               <span className="text-2xl md:text-3xl font-black">24</span>
               <span className="text-[10px] text-indigo-600 font-bold mt-2">18 IA / 6 Humanos</span>
            </div>
            <div className="bg-card border-2 border-red-500/50 rounded-xl p-4 shadow-sm flex flex-col bg-red-50">
               <div className="flex justify-between text-red-600 mb-2"><span className="text-xs font-bold uppercase">SLA en Riesgo</span> <AlertTriangle className="w-4 h-4"/></div>
               <span className="text-2xl md:text-3xl font-black text-red-600">3</span>
               <span className="text-[10px] text-red-600 font-bold mt-2">Tiempo 1ra respuesta &gt; 15m</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col">
               <div className="flex justify-between text-muted-foreground mb-2"><span className="text-xs font-bold uppercase">TMO (Hoy)</span> <Clock className="w-4 h-4"/></div>
               <span className="text-2xl md:text-3xl font-black">4m 12s</span>
               <span className="text-[10px] text-emerald-600 font-bold mt-2">-15s vs ayer</span>
            </div>
         </div>

         {/* Main content grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold border-b border-border pb-3 mb-4 flex justify-between">
                     <span>Tráfico por Canal</span>
                     <span className="text-xs text-muted-foreground font-normal">Última hora</span>
                  </h3>
                  <div className="space-y-4">
                     {/* WhatsApp */}
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500"/> WhatsApp</span> <span>45 msgs</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-emerald-500" style={{width: '70%'}}></div>
                        </div>
                     </div>
                     {/* Instagram */}
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500"/> Instagram</span> <span>12 msgs</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-pink-500" style={{width: '30%'}}></div>
                        </div>
                     </div>
                     {/* Web Chat */}
                     <div>
                        <div className="flex justify-between text-sm mb-1"><span className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-500"/> Web Chat</span> <span>8 msgs</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                           <div className="h-full bg-indigo-500" style={{width: '20%'}}></div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold border-b border-border pb-3 mb-4">Llamadas en Curso & Cola</h3>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center p-3 border border-green-200 bg-green-50 rounded-lg">
                        <div className="flex gap-3 items-center">
                           <div className="w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold text-xs">A</div>
                           <div>
                              <div className="text-sm font-bold text-green-800">Ana Gómez (Ventas)</div>
                              <div className="text-[10px] text-green-600 flex items-center gap-1"><Clock className="w-3 h-3"/> 00:03:14 con +57 310 445 9921</div>
                           </div>
                        </div>
                        <div className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-bold uppercase tracking-wider">Hablando</div>
                     </div>
                     <div className="flex justify-between items-center p-3 border border-amber-200 bg-amber-50 rounded-lg">
                        <div className="flex gap-3 items-center">
                           <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold"><PhoneForwarded className="w-4 h-4"/></div>
                           <div>
                              <div className="text-sm font-bold text-amber-800">+57 320 999 8888</div>
                              <div className="text-[10px] text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3"/> En cola (Ring Group: Producción) - 00:00:45</div>
                           </div>
                        </div>
                        <div className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">Esperando</div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold border-b border-border pb-3 mb-4">Estado de Agentes</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <span className="text-sm font-medium">Ana Gómez</span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 rounded">3 chats</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-red-500"></span>
                           <span className="text-sm font-medium">Carlos Ruiz</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Ocupado</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                           <span className="text-sm font-medium">Sofía P.</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Pausa (Almuerzo)</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                           <span className="text-sm font-medium">Agente IA (Bot)</span>
                        </div>
                        <span className="text-xs text-indigo-600 bg-indigo-50 font-bold px-1.5 rounded">18 chats</span>
                     </div>
                  </div>
               </div>

               <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold border-b border-border pb-3 mb-4">Habilidades (Skills)</h3>
                  <div className="flex flex-wrap gap-2">
                     <span className="text-[10px] font-bold bg-muted text-foreground px-2 py-1 rounded border border-border">Ventas B2B (2 agts)</span>
                     <span className="text-[10px] font-bold bg-muted text-foreground px-2 py-1 rounded border border-border">Soporte Prod (1 agt)</span>
                     <span className="text-[10px] font-bold bg-muted text-foreground px-2 py-1 rounded border border-border">Cartera (0 agts)</span>
                  </div>
               </div>
            </div>
         </div>
        
      </div>
    </div>
  );
}


function CampaignsPanel() {
  return (
    <div className="flex-1 bg-muted/20 p-6 overflow-y-auto w-full h-full">
      <div className="max-w-5xl mx-auto space-y-6">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Campañas Masivas</h2>
               <p className="text-sm text-muted-foreground mt-1">Envía mensajes a segmentos específicos excluyendo bajas automáticas.</p>
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 flex items-center gap-2">
               <Plus className="w-4 h-4" /> Nueva Campaña
            </button>
         </div>
         
         <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm text-left min-w-[800px]">
               <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                     <th className="px-4 py-3 font-bold">Nombre</th>
                     <th className="px-4 py-3 font-bold">Canal</th>
                     <th className="px-4 py-3 font-bold">Segmento</th>
                     <th className="px-4 py-3 font-bold">Estado</th>
                     <th className="px-4 py-3 font-bold">Métricas (Env/Lec/Clic/Baja)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/30">
                     <td className="px-4 py-3 font-bold">Promo Fin de Año 2026</td>
                     <td className="px-4 py-3"><span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded w-fit"><MessageCircle className="w-3 h-3"/> WhatsApp</span></td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">Clientes Premium (excluye "No Molestar") <br/><span className="font-bold text-foreground">1,245 destinatarios</span></td>
                     <td className="px-4 py-3"><span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded uppercase">Enviada</span></td>
                     <td className="px-4 py-3">
                        <div className="flex gap-3 text-xs font-bold">
                           <span className="text-blue-600" title="Enviados">1.2k</span>
                           <span className="text-emerald-600" title="Leídos">980</span>
                           <span className="text-indigo-600" title="Clics">450</span>
                           <span className="text-red-600" title="Bajas">12</span>
                        </div>
                     </td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                     <td className="px-4 py-3 font-bold">Lanzamiento Catálogo</td>
                     <td className="px-4 py-3"><span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded w-fit"><Mail className="w-3 h-3"/> Email</span></td>
                     <td className="px-4 py-3 text-xs text-muted-foreground">Todos los contactos activos <br/><span className="font-bold text-foreground">5,000 destinatarios</span></td>
                     <td className="px-4 py-3"><span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase">Programada</span></td>
                     <td className="px-4 py-3 text-muted-foreground text-xs">-</td>
                  </tr>
               </tbody>
            </table></div>
         </div>
      </div>
    </div>
  );
}

function QAPanel() {
  return (
    <div className="flex-1 bg-muted/20 p-6 overflow-y-auto w-full h-full">
      <div className="max-w-5xl mx-auto space-y-6">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-primary" /> Auditoría y Calidad (QA)</h2>
               <p className="text-sm text-muted-foreground mt-1">Evaluación de conversaciones y retroalimentación privada por agente.</p>
            </div>
            <div className="flex items-center gap-2 text-sm bg-card border border-border px-3 py-1.5 rounded-md shadow-sm">
               <span className="font-bold">Score Promedio Global:</span> <span className="text-foreground font-black">100/100</span>
            </div>
         </div>
         
         <div className="p-12 bg-card border border-border rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <h3 className="font-bold text-foreground">Sin evaluaciones registradas en el período</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
               Cuando los supervisores auditen conversaciones de voz o chat, aquí se consolidarán los puntajes y recomendaciones de calidad por agente.
            </p>
         </div>
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="flex-1 bg-muted/20 p-6 overflow-y-auto w-full h-full">
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><Filter className="w-6 h-6 text-primary" /> Analítica Avanzada</h2>
               <p className="text-sm text-muted-foreground mt-1">Análisis de intenciones, tiempos de resolución y nube de temas.</p>
            </div>
            <button className="px-4 py-2 border border-border bg-card text-foreground text-sm font-bold rounded-md hover:bg-muted">
               Exportar CSV
            </button>
         </div>
         
         <div className="grid grid-cols-3 gap-6">
            {/* Intenciones */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
               <h3 className="font-bold border-b border-border pb-3">Motivos de Contacto (Últ. 30 días)</h3>
               <div className="space-y-3">
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span className="font-bold">Pedido Nuevo</span> <span>45%</span></div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width: '45%'}}></div></div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span className="font-bold">Estado de Pedido</span> <span>30%</span></div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: '30%'}}></div></div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span className="font-bold">Reclamos</span> <span className="text-red-600">15%</span></div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: '15%'}}></div></div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span className="font-bold">Cartera / Pagos</span> <span>10%</span></div>
                     <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{width: '10%'}}></div></div>
                  </div>
               </div>
            </div>

            {/* Sentimiento & Tiempos */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
               <h3 className="font-bold border-b border-border pb-3">Sentimiento Promedio</h3>
               <div className="flex items-center gap-4 justify-center py-4">
                  <div className="text-center"><div className="text-2xl md:text-3xl font-black text-emerald-600">65%</div><div className="text-xs font-bold uppercase text-muted-foreground mt-1">Positivo</div></div>
                  <div className="text-center"><div className="text-2xl md:text-3xl font-black text-slate-500">25%</div><div className="text-xs font-bold uppercase text-muted-foreground mt-1">Neutral</div></div>
                  <div className="text-center"><div className="text-2xl md:text-3xl font-black text-red-600">10%</div><div className="text-xs font-bold uppercase text-muted-foreground mt-1">Negativo</div></div>
               </div>
               <h3 className="font-bold border-b border-border pb-3 mt-6">TMO por Canal</h3>
               <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-200"><div className="font-bold">WhatsApp</div> 3m 45s</div>
                  <div className="bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-200"><div className="font-bold">Web Chat</div> 1m 20s</div>
                  <div className="bg-blue-50 text-blue-700 p-2 rounded border border-blue-200"><div className="font-bold">Email</div> 4h 30m</div>
                  <div className="bg-pink-50 text-pink-700 p-2 rounded border border-pink-200"><div className="font-bold">Instagram</div> 15m 10s</div>
               </div>
            </div>

            {/* Nube de Temas */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
               <h3 className="font-bold border-b border-border pb-3">Nube de Temas (IA)</h3>
               <div className="flex-1 flex flex-wrap content-center justify-center gap-2 p-4 text-center">
                  <span className="text-2xl font-black text-primary">Precios</span>
                  <span className="text-lg font-bold text-indigo-500">Demora</span>
                  <span className="text-sm font-medium text-slate-600">Pendones</span>
                  <span className="text-xl font-bold text-emerald-600">Aprobado</span>
                  <span className="text-xs text-muted-foreground">Factura</span>
                  <span className="text-2xl md:text-3xl font-black text-amber-500">Urgente</span>
                  <span className="text-sm text-red-500 font-bold">Error en arte</span>
                  <span className="text-base font-bold text-blue-600">Cotización</span>
               </div>
               <div className="text-[10px] text-muted-foreground text-center bg-muted p-2 rounded">
                  Generado dinámicamente mediante clustering semántico, sin exponer PII.
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}


function UnlinkedIdentitiesPanel() {
  const [identities] = React.useState<any[]>([]);

  return (
    <div className="flex-1 bg-muted/20 p-6 overflow-y-auto w-full h-full">
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex justify-between items-end">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2"><User className="w-6 h-6 text-primary" /> Identidades sin Vincular (Triage)</h2>
               <p className="text-sm text-muted-foreground mt-1">Contactos huérfanos generados desde distintos canales que requieren fusión con la base de datos.</p>
            </div>
            {identities.length > 0 && (
              <div className="flex items-center gap-2">
                 <button className="h-9 px-4 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 flex items-center gap-2 shadow-sm">
                   Vincular Masivamente (Auto &gt; 80%)
                 </button>
              </div>
            )}
         </div>
         
         <div className="space-y-4">
            {identities.length > 0 ? (
              identities.map((identity) => (
                <div key={identity.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                   <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                         <MessageCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <div>
                               <h3 className="font-bold text-lg">{identity.displayName}</h3>
                               <div className="text-sm text-muted-foreground font-mono">{identity.rawIdentifier}</div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              ))
            ) : (
              <div className="p-12 rounded-xl bg-card border border-border text-center space-y-3">
                 <User className="w-12 h-12 mx-auto text-muted-foreground/30" />
                 <h3 className="font-bold text-foreground">No hay identidades pendientes por resolver</h3>
                 <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Cuando ingresen mensajes o llamadas de contactos no registrados en el CRM, aparecerán aquí para vincularlos con un cliente o crear uno nuevo.
                 </p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}



function LiveWidgetInbox() {
  const [chats, setChats] = React.useState<any[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  
  const fetchChats = async () => {
    try {
      const res = await fetch('/api/inbox/chats');
      const data = await res.json();
      setChats(data);
    } catch (e) {}
  };

  React.useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeChatId) return;
    
    try {
      const res = await fetch(`/api/inbox/chats/${activeChatId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText })
      });
      if (res.ok) {
        setReplyText('');
        fetchChats();
      }
    } catch (e) {}
  };

  const handleToggleAi = async (id: string, status: string) => {
    try {
      await fetch(`/api/inbox/chats/${id}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchChats();
    } catch (e) {}
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex w-full h-full">
      {/* Left List */}
      <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="font-bold">Chats de Widget Web</h2>
          <p className="text-xs text-muted-foreground">Monitor en tiempo real</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={`p-4 border-b border-border cursor-pointer transition-colors ${activeChatId === chat.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm flex items-center gap-1">
                   {chat.channel === 'whatsapp' ? <MessageCircle className="w-3 h-3 text-emerald-500" /> : chat.channel === 'instagram' ? <Instagram className="w-3 h-3 text-pink-500" /> : <MessageSquare className="w-3 h-3 text-indigo-500" />}
                   {chat.contactName || 'Visitante Web'}
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(chat.updatedAt).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : 'Sin mensajes'}
              </div>
              <div className="mt-2 flex gap-1">
                {chat.status === 'human' ? (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Humano (IA Pausada)</span>
                ) : (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">IA Activa</span>
                )}
              </div>
            </div>
          ))}
          {chats.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No hay chats activos.</div>}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
              <div>
                <h3 className="font-bold">{activeChat.contactName || 'Chat Web'} #{activeChat.id.substring(0, 8)}</h3>
                <p className="text-xs text-muted-foreground">Vía {activeChat.channel === 'whatsapp' ? 'WhatsApp' : activeChat.channel === 'instagram' ? 'Instagram' : 'Widget de Sitio Web'}</p>
              </div>
              <div className="flex items-center gap-2">
                {activeChat.status === 'human' ? (
                  <button onClick={() => handleToggleAi(activeChat.id, 'active')} className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-200">
                    <Bot className="w-3 h-3" /> Reactivar IA
                  </button>
                ) : (
                  <button onClick={() => handleToggleAi(activeChat.id, 'human')} className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded flex items-center gap-1 hover:bg-red-200">
                    <User className="w-3 h-3" /> Pausar IA (Tomar control)
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeChat.messages?.map((msg: any, idx: number) => {
                const isAgent = msg.sender === 'bot' || msg.sender === 'human';
                return (
                  <div key={idx} className={`flex flex-col max-w-[70%] ${isAgent ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">
                        {msg.sender === 'bot' ? '🤖 IA Comercial' : msg.sender === 'human' ? '👤 Agente' : (activeChat.contactName || 'Cliente')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.time).toLocaleTimeString()}</span>
                    </div>
                    <div className={`p-3 rounded-xl text-sm ${isAgent ? 'bg-muted text-foreground rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t border-border shrink-0">
              <form onSubmit={handleReply} className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Escribe para tomar el control y responder..."
                  className="flex-1 bg-muted px-4 py-2 rounded-md text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="submit" disabled={!replyText.trim()} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md disabled:opacity-50 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </form>
              <div className="text-[10px] text-muted-foreground mt-2 text-center">
                Nota: Al enviar un mensaje, la IA se pausará automáticamente para que puedas continuar la conversación.
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
            <p>Selecciona un chat del widget para responder</p>
          </div>
        )}
      </div>
    </div>
  );
}


export default function InboxPage() {
  const [activeTab, setActiveTab] = React.useState<'mine'|'unassigned'|'resolved'|'menciones'|'supervision'|'campaigns'|'qa'|'analytics'|'unlinked'|'widget' | string>('widget');
  const [agentState, setAgentState] = React.useState<'ONLINE'|'BUSY'|'PAUSED'|'OFFLINE'>('ONLINE');
  const [pbxOpen, setPbxOpen] = React.useState(false);
  const [liveCall, setLiveCall] = React.useState(false);
  const [mobileView, setMobileView] = React.useState<'list'|'chat'|'details'>('list');
  
  return (
    <div className="h-full flex flex-col font-sans -m-4 md:-m-6">
      {/* Inbox wrapper - takes full remaining height */}
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        {activeTab === 'widget' ? <LiveWidgetInbox /> : activeTab === 'unlinked' ? <UnlinkedIdentitiesPanel /> : activeTab === 'campaigns' ? <CampaignsPanel /> : activeTab === 'qa' ? <QAPanel /> : activeTab === 'analytics' ? <AnalyticsPanel /> : activeTab === 'supervision' ? <SupervisionPanel /> : (
          <>
        
        {/* Left Column: Conversation List */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 shrink-0 border-r border-border bg-card flex-col`}>
          <div className="p-4 border-b border-border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold">Bandeja Unificada</h1>
                <div className="flex items-center gap-1 mt-1">
                   <div className="flex -space-x-2 mr-2">
                     <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background z-30" title="Carolina (Online)">C</div>
                     <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background z-20" title="Andrés (Online)">A</div>
                     <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background z-10" title="Sofía (Ausente)">S</div>
                   </div>
                </div>
              </div>
              <div className="relative group">
                 <button className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background text-xs font-bold hover:bg-muted transition-colors">
                    <span className={`w-2 h-2 rounded-full ${agentState === 'ONLINE' ? 'bg-emerald-500' : agentState === 'BUSY' ? 'bg-red-500' : agentState === 'PAUSED' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                    {agentState === 'ONLINE' ? 'En Línea' : agentState === 'BUSY' ? 'Ocupado' : agentState === 'PAUSED' ? 'En Pausa' : 'Desconectado'}
                 </button>
                 <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col py-1">
                    <button onClick={() => setAgentState('ONLINE')} className="text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> En Línea</button>
                    <button onClick={() => setAgentState('BUSY')} className="text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Ocupado</button>
                    <button onClick={() => setAgentState('PAUSED')} className="text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> En Pausa</button>
                    <button onClick={() => setAgentState('OFFLINE')} className="text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Desconectado</button>
                 </div>
              </div>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setActiveTab('widget')} className={`shrink-0 whitespace-nowrap pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'widget' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Widget Web (En vivo)
              </button>
              <button onClick={() => setActiveTab('mine')} className={`shrink-0 whitespace-nowrap pb-2 text-sm font-bold border-b-2 ${activeTab === 'mine' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                Míos (3)
              </button>
              <button onClick={() => setActiveTab('unassigned')} className={`shrink-0 whitespace-nowrap pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'unassigned' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Sin asignar
              </button>
              <button onClick={() => setActiveTab('menciones')} className={`shrink-0 whitespace-nowrap pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'menciones' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Menciones
              </button>
              <button onClick={() => setActiveTab('supervision')} className={`shrink-0 whitespace-nowrap pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'supervision' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Supervisión
              </button>
              <div className="relative group shrink-0 whitespace-nowrap">
                 <button className="pb-2 text-sm font-bold border-b-2 border-transparent text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Más <MoreVertical className="w-3 h-3" />
                 </button>
                 <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 flex flex-col py-1">
                    <button onClick={() => setActiveTab('unlinked')} className="text-left px-3 py-2 text-xs font-bold hover:bg-muted">Identidades sin Vincular</button>
                    <button onClick={() => setActiveTab('campaigns')} className="text-left px-3 py-2 text-xs font-bold hover:bg-muted">Campañas Masivas</button>
                    <button onClick={() => setActiveTab('qa')} className="text-left px-3 py-2 text-xs font-bold hover:bg-muted">Auditoría (QA)</button>
                    <button onClick={() => setActiveTab('analytics')} className="text-left px-3 py-2 text-xs font-bold hover:bg-muted">Analítica Avanzada</button>
                 </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                 <input 
                    type="text" 
                    placeholder="Búsqueda global en historial..." 
                    className="w-full h-9 pl-9 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                 />
                 <button onClick={() => setPbxOpen(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:bg-muted rounded" title="Configurar PBX & IVR">
                    <Settings className="w-4 h-4" />
                 </button>
               </div>
               <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ordenar por:</span>
                  <select className="text-xs bg-transparent border-none focus:outline-none text-foreground font-medium cursor-pointer">
                     <option>Prioridad (Triage IA)</option>
                     <option>Más recientes</option>
                     <option>Más antiguos</option>
                  </select>
               </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            
            
            {/* Delivery Notification Auto-Whatsapp */}
            <div onClick={() => setMobileView('chat')} className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">Carlos Ruiz (Cliente)</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Hace 1h</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">WhatsApp</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-sm uppercase">Entrega</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                <Bot className="w-3 h-3 inline mr-1 text-indigo-500" /> Auto: "Tu pedido PROD-08492 está en la etapa final de producción, pronto lo tendrás listo."
              </p>
              <div className="mt-2 text-[9px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Leído</div>
            </div>
            {/* Missed Call Auto-Whatsapp */}
            <div className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">+57 320 999 8888</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Hace 2m</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <PhoneForwarded className="w-3 h-3 text-red-500" />
                <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Llamada Perdida</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                <Bot className="w-3 h-3 inline mr-1 text-indigo-500" /> WhatsApp auto-enviado: "Hola, recibimos tu llamada. ¿En qué te ayudamos?"
              </p>
            </div>
            {/* Instagram Direct */}
            <div className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">@design_studio</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Hace 12m</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="w-3 h-3 text-pink-500" />
                <span className="text-xs font-medium text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">Instagram Direct</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                ¿Hacen envíos a Medellín para roll-ups impresos en alta resolución?
              </p>
              {/* Meta 24h Policy Alert */}
              <div className="mt-2 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit uppercase">Vence en 23h 48m</div>
            </div>
            {/* Conversation Item 1 */}
            <div onClick={() => setMobileView('chat')} className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer bg-red-50/50 transition-colors relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">Copidrogas</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Hace 5m</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">WhatsApp</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-sm uppercase">Puntuación: 85</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Hola, necesito cotizar urgente 500 pendones para un evento el fin de semana. ¿Tienen disponibilidad?
              </p>
            </div>
            
            {/* Conversation Item 2 */}
            <div className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate">María Rodríguez</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Hace 1h</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Correo</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Re: Aprobación de arte final - El logo en la página 3 parece un poco oscuro.
              </p>
            </div>
          </div>
        </div>

        {/* Middle Column: Chat Thread */}
        <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0 bg-background`}>
          {liveCall && (
             <div className="h-12 bg-green-50 border-b border-green-200 flex items-center justify-between px-6 animate-in slide-in-from-top shrink-0">
               <div className="flex items-center gap-3 text-green-700">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-bold text-sm">Llamada en curso (00:03:14)</span>
                  <span className="text-xs opacity-80 border-l border-green-300 pl-3 ml-1">+57 310 445 9921 — Oportunidad vinculada</span>
               </div>
               <div className="flex gap-2">
                  <button className="px-3 py-1 bg-white border border-green-200 text-green-700 rounded-md text-xs font-bold hover:bg-green-100 flex items-center gap-1"><MicOff className="w-3 h-3" /> Silenciar</button>
                  <button onClick={() => setLiveCall(false)} className="px-3 py-1 bg-red-600 text-white rounded-md text-xs font-bold hover:bg-red-700 flex items-center gap-1"><Phone className="w-3 h-3" /> Colgar</button>
               </div>
             </div>
          )}
          <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
            <div className="flex items-center gap-3">
                            <button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 mr-1 text-muted-foreground hover:bg-muted rounded-md"><ArrowLeft className="w-5 h-5"/></button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">CD</div>
              <div>
                <h2 className="font-bold">Copidrogas</h2>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> +57 310 445 9921
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="h-8 px-3 bg-amber-50 text-amber-600 rounded-md text-xs font-bold border border-amber-200 hover:bg-amber-100 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Posponer
              </button>
              <button className="h-8 px-3 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Resolver
              </button>
              <button onClick={() => setMobileView('details')} className="lg:hidden w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-md">
                <Menu className="w-4 h-4" />
              </button>
              <button className="hidden lg:flex w-8 h-8 items-center justify-center text-muted-foreground hover:bg-muted rounded-md">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* AI Handoff Alert */}
            <div className="flex justify-center">
              <div className="bg-muted px-4 py-2 rounded-full text-xs text-muted-foreground font-medium flex items-center gap-2">
                <Bot className="w-4 h-4" /> El agente IA atendió los primeros 3 mensajes y escaló por solicitud de precio.
              </div>
              <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> 
                    Carolina está viendo esta conversación y respondiendo...
                 </div>
                 <button className="bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded text-[10px] uppercase">Tomar de todos modos</button>
              </div>
            </div>

            {/* Inbound Message */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
              <div>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none text-sm text-foreground">
                  Hola, necesito cotizar urgente 500 pendones para un evento el fin de semana. ¿Tienen disponibilidad?
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">10:42 AM</div>
              </div>
            </div>

            
            {/* System Hygiene Note */}
            <div className="flex justify-center my-4">
               <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-full text-xs text-slate-600 font-medium flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Conversación cerrada automáticamente por inactividad (48h)
               </div>
            </div>
            
            {/* Reopening note */}
            <div className="flex justify-center my-2">
               <div className="bg-amber-100 border border-amber-200 px-4 py-1.5 rounded-full text-xs text-amber-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Reabierta automáticamente por nuevo mensaje del cliente
               </div>
            </div>

            {/* AI Summary Box */}
            <div className="ml-12 mr-12 bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-2 uppercase tracking-wider">
                <Zap className="w-4 h-4" /> Resumen de IA & Triage
              </div>
              <p className="text-sm text-indigo-900 mb-2">
                El cliente solicita 500 pendones. El sistema detectó urgencia (fin de semana). Se recomienda revisar inventario de lona y consultar a producción si hay capacidad en plóter antes de prometer entrega.
              </p>
              <div className="flex gap-2">
                 <span className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">Intención: Pedido Nuevo</span>
                 <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">Urgencia: ALTA</span>
                 <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">Sentimiento: NEGATIVO</span>
              </div>
            </div>

            {/* Outbound WhatsApp Interactive Quote */}
            <div className="flex gap-4 justify-end">
              <div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl rounded-tr-none max-w-sm">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-200/50">
                     <FileText className="w-8 h-8 text-emerald-600" />
                     <div>
                        <div className="font-bold text-emerald-900 text-sm">Cotización COT-2938</div>
                        <div className="text-xs text-emerald-700">Material POP Aniversario • $1.2M</div>
                     </div>
                  </div>
                  <p className="text-sm text-emerald-900 mb-4">
                    Hola Copidrogas, aquí tienes la cotización para los 500 pendones. Si todo está correcto, puedes aprobarla aquí mismo.
                  </p>
                  <div className="flex flex-col gap-2">
                     <button className="w-full py-2 bg-white text-emerald-700 font-bold text-xs rounded border border-emerald-200 hover:bg-emerald-100 transition-colors">Aprobar Cotización</button>
                     <button className="w-full py-2 bg-white text-emerald-700 font-bold text-xs rounded border border-emerald-200 hover:bg-emerald-100 transition-colors">Solicitar Cambios</button>
                     <button className="w-full py-2 bg-white text-emerald-700 font-bold text-xs rounded border border-emerald-200 hover:bg-emerald-100 transition-colors">Hablar con un humano</button>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-right flex justify-end items-center gap-1">10:55 AM <CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">YO</div>
            </div>

            {/* Typing Indicator */}
            <div className="flex justify-center my-2">
               <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground font-bold flex items-center gap-1">
                  Carlos Ruiz está escribiendo una respuesta...
               </span>
            </div>
          </div>

          {/* Composer */}
          <div className="p-4 bg-card border-t border-border shrink-0">
            <div className="border border-input rounded-xl bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
              <div className="flex px-3 py-2 border-b border-border/50 bg-muted/30 gap-2">
                <button className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3"/> Respuesta</button>
                <button className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Nota Interna</button>
              </div>
              <div className="relative w-full">
                <textarea 
                   placeholder="Escribe una respuesta (Usa / para plantillas o macros)..." 
                   className="w-full min-h-[80px] p-3 text-sm focus:outline-none resize-none bg-transparent"
                   defaultValue="/"
                ></textarea>
                {/* Autocomplete Popover */}
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-20">
                   <div className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1 uppercase border-b border-border">Respuestas Rápidas (Macros)</div>
                   <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border/50">
                      <div className="font-bold flex justify-between"><span>/tiempos</span> <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">Compartida</span></div>
                      <div className="text-[10px] text-muted-foreground truncate">Nuestros tiempos de entrega estándar son 3 días...</div>
                   </button>
                   <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border/50">
                      <div className="font-bold flex justify-between"><span>/datos_pago</span> <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">Personal</span></div>
                      <div className="text-[10px] text-muted-foreground truncate">Puedes realizar el pago a la cuenta Bancolombia...</div>
                   </button>
                   <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-primary font-bold text-center">
                      + Administrar macros
                   </button>
                </div>
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-muted/30 border-t border-border/50">
                <div className="flex gap-1">
                  <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Paperclip className="w-4 h-4" /></button>
                  <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Zap className="w-4 h-4" /></button>
                </div>
                <button className="h-8 px-4 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 flex items-center gap-2">
                  Enviar <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Context */}
        <div className={`${mobileView === 'details' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 shrink-0 border-l border-border bg-card overflow-y-auto`}>
          <div className="p-6">
            <button onClick={() => setMobileView('chat')} className="lg:hidden mb-4 flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
               <ArrowLeft className="w-4 h-4" /> Volver al chat
            </button>
            <div className="flex justify-between items-start mb-1">
               <h3 className="font-bold text-lg">Copidrogas</h3>
               <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-red-200" title="Basado en 3 reclamos recientes y CSAT bajo">Riesgo Alto</span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">Cliente Premium</div>

            {/* Bloque F: Panel de Contexto Enriquecido - Canales Conocidos */}
            <div className="mb-6 bg-muted/20 border border-border rounded-lg p-3">
               <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Canales de Contacto</div>
               <div className="flex gap-2 mb-3">
                  <button className="w-8 h-8 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200" title="WhatsApp (+57 310 445 9921) - Activo"><MessageCircle className="w-4 h-4" /></button>
                  <button className="w-8 h-8 rounded bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center border border-border" title="Correo (rvalencia@copidrogas.com.co) - Cambiar a este canal"><Mail className="w-4 h-4" /></button>
                  <button className="w-8 h-8 rounded bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center border border-border" title="Teléfono Fijo - Llamar"><Phone className="w-4 h-4" /></button>
               </div>
               <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Respondiendo vía WhatsApp
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
               <div className="bg-muted/30 p-2 rounded border border-border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">LTV (Compras)</div>
                  <div className="font-black text-sm">$45.2M</div>
               </div>
               <div className="bg-muted/30 p-2 rounded border border-border text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Último NPS</div>
                  <div className="font-black text-sm text-red-600">3/10 (Detractor)</div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
               <button className="flex-1 h-8 bg-primary/10 text-primary rounded-md text-xs font-bold hover:bg-primary/20 flex items-center justify-center gap-1"><FileText className="w-3 h-3" /> Cotizar</button>
               <button className="flex-1 h-8 bg-primary/10 text-primary rounded-md text-xs font-bold hover:bg-primary/20 flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> Cita</button>
               <button className="w-8 h-8 bg-muted text-muted-foreground rounded-md flex items-center justify-center hover:bg-muted/80"><Plus className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Datos de Contacto</h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Teléfono:</span> <div className="flex items-center gap-2"><span>+57 310 445 9921</span> <button onClick={() => setLiveCall(true)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 shadow-sm transition-colors" title="Llamar (WebRTC)"><PhoneCall className="w-3 h-3" /></button></div></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email:</span> <span>rvalencia@copidrogas.com.co</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Asesor:</span> <span>Ana Gómez</span></div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50">
                     <span className="text-muted-foreground text-xs">Preferencias:</span>
                     <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="No enviar marketing"><Zap className="w-3 h-3" /> No Molestar</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Historial Omnicanal</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 relative">
                     <div className="absolute left-3.5 top-5 bottom-[-15px] w-px bg-border"></div>
                     <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 z-10"><MessageCircle className="w-3 h-3" /></div>
                     <div>
                        <div className="text-sm font-bold">Esta conversación</div>
                        <div className="text-xs text-muted-foreground">WhatsApp • En curso</div>
                     </div>
                  </div>
                  <div className="flex gap-3 relative">
                     <div className="absolute left-3.5 top-5 bottom-[-15px] w-px bg-border"></div>
                     <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 z-10"><PhoneForwarded className="w-3 h-3" /></div>
                     <div>
                        <div className="text-sm font-bold">Reclamo por entrega</div>
                        <div className="text-xs text-muted-foreground">Llamada (Buzón) • Ayer</div>
                     </div>
                  </div>
                  <div className="flex gap-3">
                     <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 z-10"><Mail className="w-3 h-3" /></div>
                     <div>
                        <div className="text-sm font-bold">Aprobación COT-2938</div>
                        <div className="text-xs text-muted-foreground">Correo • Hace 1 sem</div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </>)}

      {/* PBX & IVR CONFIG MODAL */}
      {pbxOpen && (
         <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
               <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
                  <h2 className="font-bold text-lg flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> Configuración de Telefonía (PBX & IVR)</h2>
                  <button onClick={() => setPbxOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Lines & Integration */}
                  <div className="space-y-4">
                     <h3 className="font-bold border-b border-border pb-2 text-foreground">1. Líneas Telefónicas & Proveedor</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 border border-border rounded-lg">
                           <div className="flex justify-between mb-2"><span className="font-bold text-sm">Twilio / SIP Trunk</span> <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold">Conectado</span></div>
                           <p className="text-xs text-muted-foreground">Credenciales seguras almacenadas en <code className="bg-muted px-1 rounded">Secret</code>.</p>
                        </div>
                        <div className="p-4 bg-background border border-border rounded-lg border-l-4 border-l-primary">
                           <div className="flex justify-between mb-2"><span className="font-bold text-sm">Línea Principal (Ventas)</span> <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">+57 601 999 9999</span></div>
                           <label className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                              <input type="checkbox" defaultChecked className="rounded text-primary" /> Grabar llamadas (Aviso legal automático)
                           </label>
                        </div>
                     </div>
                  </div>

                  {/* IVR Builder */}
                  <div className="space-y-4">
                     <h3 className="font-bold border-b border-border pb-2 text-foreground">2. Constructor de IVR (Menú Interactivo)</h3>
                     <div className="bg-background border border-border rounded-lg p-4 space-y-4">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Mensaje de Bienvenida (Texto a Voz)</label>
                           <textarea defaultValue="Bienvenido a Fusión. Para ventas marque 1. Para estado de producción, marque 2. Para buzón de voz, marque 3." className="w-full bg-muted/50 border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" rows={2}></textarea>
                        </div>
                        <div className="space-y-2">
                           <div className="flex items-center gap-3 p-2 border border-border rounded bg-muted/20">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-sm font-bold shrink-0">1</div>
                              <select defaultValue="Ventas" className="w-40 text-sm border-none bg-transparent focus:outline-none"><option value="Ventas">Transferir a: Ventas</option></select>
                           </div>
                           <div className="flex items-center gap-3 p-2 border border-border rounded bg-muted/20">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-sm font-bold shrink-0">2</div>
                              <select defaultValue="Prod" className="w-40 text-sm border-none bg-transparent focus:outline-none"><option value="Prod">Transferir a: Producción</option></select>
                           </div>
                           <div className="flex items-center gap-3 p-2 border border-border rounded border-dashed bg-muted/10 text-muted-foreground">
                              <Plus className="w-4 h-4" /> <span className="text-sm font-bold">Añadir opción</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Ring Groups */}
                  <div className="space-y-4">
                     <h3 className="font-bold border-b border-border pb-2 text-foreground">3. Grupos de Timbrado (Ring Groups)</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                           <h4 className="font-bold text-sm mb-1">Grupo Ventas</h4>
                           <p className="text-xs text-muted-foreground mb-3">Estrategia: <span className="font-bold text-foreground">Todos a la vez (All-at-once)</span></p>
                           <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background">A</div>
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background">P</div>
                           </div>
                        </div>
                        <div className="p-4 border border-border rounded-lg bg-card shadow-sm">
                           <h4 className="font-bold text-sm mb-1">Grupo Producción</h4>
                           <p className="text-xs text-muted-foreground mb-3">Estrategia: <span className="font-bold text-foreground">Turnos (Round Robin)</span></p>
                           <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background">M</div>
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-background">J</div>
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  {/* Fallbacks */}
                  <div className="space-y-4">
                     <h3 className="font-bold border-b border-border pb-2 text-foreground">4. Comportamiento Automático</h3>
                     <div className="p-4 border border-border rounded-lg bg-muted/20 text-sm space-y-3">
                        <label className="flex items-center gap-2">
                           <input type="checkbox" defaultChecked className="rounded text-primary" /> Si nadie contesta en 30s, redirigir a Buzón de Voz (Transcrito por IA)
                        </label>
                        <label className="flex items-center gap-2">
                           <input type="checkbox" defaultChecked className="rounded text-primary" /> En llamadas perdidas, disparar WhatsApp automático de seguimiento (Omnicanal)
                        </label>
                     </div>
                  </div>
               </div>
               <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-3 shrink-0">
                  <button onClick={() => setPbxOpen(false)} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 text-sm">Guardar Configuración</button>
               </div>
            </div>
         </div>
      )}
      </div>
    </div>
  );
}
