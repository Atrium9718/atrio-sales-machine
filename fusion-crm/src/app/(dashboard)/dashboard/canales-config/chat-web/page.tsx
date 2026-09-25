'use client';
import { useState } from 'react';
import { MessageSquare, Settings2, Code, Activity, Plus, Trash2 } from 'lucide-react';

export default function WebchatConfigPage() {
  const [activeTab, setActiveTab] = useState<'appearance'|'hours'|'install'>('appearance');
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [position, setPosition] = useState('right');
  const [greeting, setGreeting] = useState('¡Hola! ¿En qué podemos ayudarte?');
  const [quickReplies, setQuickReplies] = useState(['Cotizar un trabajo', 'Estado de mi pedido', 'Hablar con un asesor']);
  const [newReply, setNewReply] = useState('');

  const publicKey = 'pub_cuid_example_12345';
  const installScript = `<script src="https://crm.fusioncg.com/widget.js" data-key="${publicKey}" defer></script>`;

  const addReply = () => {
     if(newReply && quickReplies.length < 5) {
        setQuickReplies([...quickReplies, newReply]);
        setNewReply('');
     }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
         <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Configuración de Chat Web</h1>
         </div>
         <button className="h-9 px-4 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 text-sm">Guardar Cambios</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
         {/* Sidebar Configuration */}
         <div className="w-96 border-r border-border bg-card flex flex-col overflow-y-auto">
            <div className="flex border-b border-border">
               <button onClick={()=>setActiveTab('appearance')} className={`flex-1 p-3 text-xs font-bold uppercase transition-colors border-b-2 ${activeTab==='appearance' ? 'border-primary text-primary':'border-transparent text-muted-foreground'}`}>Apariencia</button>
               <button onClick={()=>setActiveTab('hours')} className={`flex-1 p-3 text-xs font-bold uppercase transition-colors border-b-2 ${activeTab==='hours' ? 'border-primary text-primary':'border-transparent text-muted-foreground'}`}>Atención</button>
               <button onClick={()=>setActiveTab('install')} className={`flex-1 p-3 text-xs font-bold uppercase transition-colors border-b-2 ${activeTab==='install' ? 'border-primary text-primary':'border-transparent text-muted-foreground'}`}>Instalación</button>
            </div>

            <div className="p-6 space-y-6">
               {activeTab === 'appearance' && (
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold mb-1">Color Principal</label>
                        <div className="flex gap-2">
                           <input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="w-10 h-10 p-0 border-0 rounded cursor-pointer" />
                           <input type="text" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="flex-1 border border-border rounded px-3 text-sm" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Posición en pantalla</label>
                        <select value={position} onChange={e=>setPosition(e.target.value)} className="w-full border border-border rounded px-3 h-10 text-sm bg-background">
                           <option value="right">Inferior Derecha</option>
                           <option value="left">Inferior Izquierda</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Mensaje de Bienvenida</label>
                        <textarea value={greeting} onChange={e=>setGreeting(e.target.value)} className="w-full border border-border rounded p-2 text-sm bg-background resize-none h-20"></textarea>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Respuestas Rápidas (Máx 5)</label>
                        <div className="space-y-2">
                           {quickReplies.map((reply, i) => (
                              <div key={i} className="flex gap-2 items-center bg-muted/50 p-2 rounded border border-border">
                                 <div className="flex-1 text-xs truncate">{reply}</div>
                                 <button onClick={()=>setQuickReplies(quickReplies.filter((_,j)=>j!==i))} className="text-destructive hover:bg-destructive/10 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                              </div>
                           ))}
                           {quickReplies.length < 5 && (
                              <div className="flex gap-2">
                                 <input type="text" value={newReply} onChange={e=>setNewReply(e.target.value)} className="flex-1 border border-border rounded px-2 h-8 text-xs" placeholder="Ej: Precios" />
                                 <button onClick={addReply} className="bg-primary text-white p-1.5 rounded"><Plus className="w-4 h-4"/></button>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'hours' && (
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold mb-1">Zona Horaria</label>
                        <select className="w-full border border-border rounded px-3 h-10 text-sm bg-background">
                           <option value="America/Bogota">America/Bogota (GMT-5)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Mensaje fuera de horario</label>
                        <textarea className="w-full border border-border rounded p-2 text-sm bg-background resize-none h-24" defaultValue="En este momento estamos fuera del horario de atención. Déjanos tu mensaje y te contactaremos pronto."></textarea>
                     </div>
                     <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded border border-amber-200">
                        <strong>Comportamiento:</strong> Fuera de horario, el widget capturará los datos del prospecto, creará la identidad e informará que no hay agentes disponibles, sin simular atención en tiempo real.
                     </div>
                  </div>
               )}

               {activeTab === 'install' && (
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Code className="w-4 h-4"/> Snippet de Instalación</label>
                        <p className="text-xs text-muted-foreground mb-2">Copia y pega este código antes del cierre de la etiqueta <code>&lt;/body&gt;</code> en tu sitio web.</p>
                        <div className="relative">
                           <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                              {installScript}
                           </pre>
                           <button onClick={()=>navigator.clipboard.writeText(installScript)} className="absolute top-2 right-2 bg-slate-700 text-white text-[10px] px-2 py-1 rounded hover:bg-slate-600">Copiar</button>
                        </div>
                     </div>
                     
                     <div className="border border-border rounded-lg p-4 bg-muted/20">
                        <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Dominios Autorizados</label>
                        <p className="text-xs text-muted-foreground mb-3">Para evitar abusos, el widget solo funcionará en estos dominios (Origin Validation).</p>
                        <div className="flex gap-2">
                           <input type="text" className="flex-1 border border-border rounded px-3 h-9 text-sm" placeholder="ej. www.miempresa.com" />
                           <button className="bg-muted text-foreground font-bold px-4 rounded text-sm hover:bg-muted/80">Agregar</button>
                        </div>
                        <div className="mt-3 flex gap-2 flex-wrap">
                           <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2 py-1 rounded flex items-center gap-1">*.miempresa.com <X className="w-3 h-3 cursor-pointer"/></span>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Live Preview Area */}
         <div className="flex-1 bg-muted/30 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-8 left-8">
               <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Vista Previa en Vivo</h3>
               <p className="text-sm text-muted-foreground">Así se verá el widget en tu sitio web.</p>
            </div>
            
            {/* Fake Website Background */}
            <div className="w-[800px] h-[600px] bg-white rounded-xl shadow-2xl border border-border relative overflow-hidden flex flex-col">
               <div className="h-16 border-b border-border bg-slate-50 flex items-center px-8">
                  <div className="w-24 h-6 bg-slate-200 rounded"></div>
                  <div className="ml-auto flex gap-4">
                     <div className="w-16 h-4 bg-slate-200 rounded"></div>
                     <div className="w-16 h-4 bg-slate-200 rounded"></div>
                  </div>
               </div>
               <div className="p-12 space-y-6">
                  <div className="w-3/4 h-12 bg-slate-100 rounded"></div>
                  <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
                  <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
               </div>

               {/* Render Preview of Widget */}
               <div className={`absolute bottom-6 flex flex-col ${position === 'left' ? 'left-6 items-start' : 'right-6 items-end'}`}>
                  <div className="w-[340px] bg-white rounded-2xl shadow-xl border border-border mb-4 overflow-hidden flex flex-col h-[500px]">
                     <div className="p-4 text-white flex justify-between items-center" style={{ backgroundColor: primaryColor }}>
                        <span className="font-bold text-sm">Soporte</span>
                        <span className="cursor-pointer">&times;</span>
                     </div>
                     <div className="flex-1 p-4 bg-slate-50 space-y-4">
                        <div className="bg-white border border-border p-3 rounded-xl rounded-tl-sm text-sm text-slate-700 w-4/5 shadow-sm">
                           {greeting}
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {quickReplies.map((qr, i) => (
                              <button key={i} className="text-xs border px-3 py-1.5 rounded-full bg-white shadow-sm transition-colors" style={{ borderColor: primaryColor, color: primaryColor }}>{qr}</button>
                           ))}
                        </div>
                     </div>
                     <div className="p-3 border-t border-border flex gap-2">
                        <input type="text" className="flex-1 border border-border rounded-full px-4 text-sm" placeholder="Escribe un mensaje..." disabled />
                        <button className="text-white px-4 rounded-full text-sm font-bold" style={{ backgroundColor: primaryColor }}>Enviar</button>
                     </div>
                  </div>
                  
                  <button className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105" style={{ backgroundColor: primaryColor }}>
                     <MessageSquare className="w-6 h-6" />
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

// Just a tiny X icon component for the inline tags
const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
