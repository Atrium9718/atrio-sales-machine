'use client';
import { useState } from 'react';
import { Facebook, Instagram, AlertTriangle, ShieldCheck, Activity, Link2, RefreshCw, MessageSquare, Send, CheckCircle2, Clock, XCircle, ChevronRight, BarChart3, Mail, Globe, Play } from 'lucide-react';

export default function MetaConfigPage() {
  const [activeTab, setActiveTab] = useState<'health'|'deliverability'|'whatsapp'|'instagram'|'messenger'|'logs'>('health');
  
  const mockLogs = [
     { id: 1, type: 'meta.mensaje_recibido', platform: 'instagram', date: '2023-10-24 10:12:00', payload: '{ "sender": "usr_123", "text": "Hola, precio?" }' },
     { id: 2, type: 'meta.comentario_recibido', platform: 'instagram', date: '2023-10-24 09:45:00', payload: '{ "post_id": "987", "text": "Qué lindo, quiero uno" }' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
         <div className="flex items-center gap-2">
            <Facebook className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Omnicanalidad y Salud de Red</h1>
         </div>
         <button className="h-9 px-4 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Ejecutar Diagnóstico</button>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
         {/* Sidebar Configuration */}
         <div className="w-64 border-r border-border bg-card flex flex-col overflow-y-auto">
            <div className="p-3 text-xs font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border">Monitor Operativo</div>
            <button onClick={()=>setActiveTab('health')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='health' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <Activity className="w-4 h-4"/> Salud de Canales
            </button>
            <button onClick={()=>setActiveTab('deliverability')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='deliverability' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <Send className="w-4 h-4"/> Entregabilidad (Embudo)
            </button>
            
            <div className="p-3 text-xs font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border mt-2">Configuración Meta</div>
            <button onClick={()=>setActiveTab('whatsapp')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='whatsapp' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <MessageSquare className="w-4 h-4"/> WhatsApp (WABA)
            </button>
            <button onClick={()=>setActiveTab('instagram')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='instagram' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <Instagram className="w-4 h-4"/> Instagram DM
            </button>
            <button onClick={()=>setActiveTab('messenger')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='messenger' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <Facebook className="w-4 h-4"/> FB Messenger
            </button>
            
            <div className="p-3 text-xs font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border mt-2">Sistema</div>
            <button onClick={()=>setActiveTab('logs')} className={`p-4 flex items-center gap-3 text-sm font-bold border-b border-border transition-colors ${activeTab==='logs' ? 'bg-primary/10 text-primary border-l-2 border-l-primary':'hover:bg-muted border-l-2 border-l-transparent'}`}>
               <Activity className="w-4 h-4"/> Eventos Raw (Logs)
            </button>
         </div>
         
         {/* Main Content Area */}
         <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
            <div className="max-w-4xl mx-auto space-y-6">

               {/* SALUD DE CANALES */}
               {activeTab === 'health' && (
                 <>
                    <h2 className="text-xl font-bold mb-4">Estado de Conexiones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       <div className="bg-card border border-emerald-200 rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500"></div>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                             <MessageSquare className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h3 className="font-bold">WhatsApp API</h3>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Operativo</span>
                             </div>
                             <p className="text-xs text-muted-foreground mt-1 mb-3">Verificado hace 2 min. Token y Webhook OK. Cola libre (0 msgs).</p>
                             <div className="flex justify-between items-center bg-muted/50 rounded p-2 border border-border">
                                <span className="text-xs font-bold">Calidad Número Meta:</span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">ALTA</span>
                             </div>
                          </div>
                       </div>

                       <div className="bg-card border border-red-200 rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500"></div>
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                             <Globe className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h3 className="font-bold">Web Chat (Widget)</h3>
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">Degradado</span>
                             </div>
                             <p className="text-xs text-red-600 mt-1 mb-2 font-medium">Tasa de error (HTTP 500) &gt; 5% en los últimos 10 min. Posible caída de redis.</p>
                             <button className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded px-3 py-1.5 w-full">Ver alerta en Sentry</button>
                          </div>
                       </div>

                       <div className="bg-card border border-emerald-200 rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500"></div>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                             <Mail className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h3 className="font-bold">Correo (SMTP/IMAP)</h3>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Operativo</span>
                             </div>
                             <p className="text-xs text-muted-foreground mt-1">Sincronización IMAP estable. 42 msgs recibidos hoy.</p>
                          </div>
                       </div>

                    </div>
                 </>
               )}

               {/* ENTREGABILIDAD */}
               {activeTab === 'deliverability' && (
                 <>
                    <h2 className="text-xl font-bold mb-4">Embudo de Entregabilidad</h2>
                    
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
                       <h3 className="font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-500" /> WhatsApp - Plantillas de Marketing</h3>
                       
                       <div className="relative">
                          {/* Funnel visual */}
                          <div className="flex justify-between mb-2">
                             <div className="text-center w-1/5">
                                <div className="text-2xl font-black text-foreground">1,240</div>
                                <div className="text-xs text-muted-foreground uppercase font-bold">Enviados</div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-muted-foreground mt-2" />
                             <div className="text-center w-1/5">
                                <div className="text-2xl font-black text-emerald-600">1,215</div>
                                <div className="text-xs text-emerald-600 uppercase font-bold">Entregados (98%)</div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-muted-foreground mt-2" />
                             <div className="text-center w-1/5">
                                <div className="text-2xl font-black text-blue-600">940</div>
                                <div className="text-xs text-blue-600 uppercase font-bold">Leídos (77%)</div>
                             </div>
                             <ChevronRight className="w-5 h-5 text-muted-foreground mt-2" />
                             <div className="text-center w-1/5">
                                <div className="text-2xl font-black text-indigo-600">142</div>
                                <div className="text-xs text-indigo-600 uppercase font-bold">Respondidos (11%)</div>
                             </div>
                          </div>
                          
                          <div className="h-4 bg-muted rounded-full flex overflow-hidden mt-4">
                             <div className="h-full bg-emerald-500" style={{ width: '98%' }}></div>
                             <div className="h-full bg-red-500" style={{ width: '2%' }}></div>
                          </div>
                          
                          <div className="mt-4 flex gap-4 text-xs font-bold justify-center">
                             <span className="text-red-600 bg-red-50 px-2 py-1 rounded">25 Fallidos (Errores API)</span>
                             <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">0 Bloqueos por Consentimiento</span>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Dead Letter Queue */}
                       <div className="bg-card border border-red-200 rounded-xl p-5 shadow-sm">
                          <h3 className="font-bold flex items-center gap-2 mb-4 text-red-600"><AlertTriangle className="w-5 h-5" /> Cola de Mensajes Muertos (DLQ)</h3>
                          <div className="space-y-3">
                             <div className="border border-border rounded p-3 bg-background">
                                <div className="flex justify-between items-start mb-1">
                                   <span className="text-xs font-bold">+57 320...444</span>
                                   <span className="text-[10px] text-muted-foreground">Hace 14 min</span>
                                </div>
                                <div className="text-xs text-red-600 font-medium mb-2">Error 131009: Parameter format does not match format in the created template.</div>
                                <button className="w-full text-xs font-bold bg-muted hover:bg-muted/80 text-foreground py-1.5 rounded flex justify-center items-center gap-1"><RefreshCw className="w-3 h-3"/> Reintentar Manual</button>
                             </div>
                          </div>
                       </div>

                       {/* Rebote Correos */}
                       <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                          <h3 className="font-bold flex items-center gap-2 mb-4"><Mail className="w-5 h-5" /> Tasa de Rebote de Correo</h3>
                          <table className="w-full text-left text-sm">
                             <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                <tr>
                                   <th className="p-2">Dominio</th>
                                   <th className="p-2">Enviados</th>
                                   <th className="p-2">Rebotes (Hard)</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border">
                                <tr>
                                   <td className="p-2 font-medium">gmail.com</td>
                                   <td className="p-2">4,520</td>
                                   <td className="p-2 text-emerald-600 font-bold">12 (0.2%)</td>
                                </tr>
                                <tr>
                                   <td className="p-2 font-medium">hotmail.com</td>
                                   <td className="p-2">1,200</td>
                                   <td className="p-2 text-emerald-600 font-bold">5 (0.4%)</td>
                                </tr>
                                <tr>
                                   <td className="p-2 font-medium text-red-600">empresafalsa.com.co</td>
                                   <td className="p-2">15</td>
                                   <td className="p-2 text-red-600 font-bold">15 (100%)</td>
                                </tr>
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </>
               )}

               {/* CONFIGURACIÓN WHATSAPP */}
               {activeTab === 'whatsapp' && (
                 <>
                    <div className="bg-card border border-border p-6 rounded-xl shadow-sm mb-6">
                       <div className="flex items-start justify-between">
                          <div>
                             <h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-500" /> WhatsApp Business API (WABA)</h2>
                             <p className="text-sm text-muted-foreground mt-1">Conectado a Meta Cloud API. Calidad del número: Alta.</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Operativo</span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="bg-muted/30 p-4 rounded-lg border border-border">
                             <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Límite de Mensajería</div>
                             <div className="text-xl font-black">10,000 <span className="text-sm font-medium text-muted-foreground">msgs / 24h</span></div>
                          </div>
                          <div className="bg-muted/30 p-4 rounded-lg border border-border">
                             <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Nivel WABA</div>
                             <div className="text-xl font-black">Tier 2 <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-1 rounded ml-2">Verified</span></div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                          <h3 className="font-bold">Plantillas Aprobadas (Templates)</h3>
                          <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded font-bold">Sincronizar Plantillas</button>
                       </div>
                       <table className="w-full text-left text-sm">
                          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
                             <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4">Estado Meta</th>
                                <th className="p-4">Rendimiento</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             <tr>
                                <td className="p-4 font-bold">promocion_black_friday</td>
                                <td className="p-4 text-xs font-medium bg-blue-50 text-blue-700 rounded px-2">MARKETING</td>
                                <td className="p-4"><span className="text-emerald-600 font-bold text-xs"><CheckCircle2 className="w-3 h-3 inline mr-1"/> Aprobada</span></td>
                                <td className="p-4">
                                   <div className="text-xs text-muted-foreground">Tasa Rta: <span className="font-bold text-emerald-600">14%</span></div>
                                </td>
                             </tr>
                             <tr>
                                <td className="p-4 font-bold">seguimiento_cotizacion</td>
                                <td className="p-4 text-xs font-medium bg-indigo-50 text-indigo-700 rounded px-2">UTILITY</td>
                                <td className="p-4"><span className="text-emerald-600 font-bold text-xs"><CheckCircle2 className="w-3 h-3 inline mr-1"/> Aprobada</span></td>
                                <td className="p-4">
                                   <div className="text-xs text-muted-foreground">Tasa Rta: <span className="font-bold text-red-600">1.2%</span> <span className="text-red-500 bg-red-50 px-1 rounded text-[9px] uppercase">Revisar</span></div>
                                </td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </>
               )}

               {/* RAW LOGS */}
               {activeTab === 'logs' && (
                  <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
                     <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                        <h3 className="font-bold">Eventos Crudos (Raw Webhooks)</h3>
                        <div className="text-xs text-muted-foreground font-bold">PII Enmascarado</div>
                     </div>
                     <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-y-auto space-y-4">
                        {mockLogs.map(log => (
                           <div key={log.id} className="border-b border-slate-800 pb-3">
                              <div className="flex gap-4 text-slate-400 mb-1">
                                 <span>[{log.date}]</span>
                                 <span className="text-indigo-400 uppercase">{log.platform}</span>
                                 <span className="text-emerald-300 font-bold">{log.type}</span>
                              </div>
                              <div className="pl-4 break-all">
                                 {log.payload.replace(/"sender": ".*?"/g, '"sender": "***MASKED***"')}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

            </div>
         </div>
      </div>
    </div>
  );
}
