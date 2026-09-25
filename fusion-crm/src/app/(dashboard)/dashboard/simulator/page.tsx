import React, { useState } from 'react';
import { Play, Webhook, MessageCircle, Mail, Globe, Settings, ShieldAlert, Bot, CheckCircle2 } from 'lucide-react';

export default function SimulatorPage() {
  const [channel, setChannel] = useState('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('+573104459921');
  const [message, setMessage] = useState('Hola, ¿tienen 500 pendones?');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const isProd = false;

  if (isProd) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground mt-2">El simulador de webhooks está desactivado en producción.</p>
      </div>
    );
  }

  const handleSimulate = async () => {
    setSimulating(true);
    setResult(null);
    
    setTimeout(() => {
      setSimulating(false);
      setResult('Webhook procesado exitosamente. La conversación ha sido enrutada según las reglas de SLA.');
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-card">
         <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-500" />
            <h1 className="font-bold text-lg">Simulador de Canales y Enrutamiento</h1>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
         <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
               <h2 className="font-bold border-b border-border pb-2 text-foreground">1. Configurar Webhook de Entrada</h2>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Canal a simular</label>
                     <div className="flex gap-2">
                        <button onClick={() => setChannel('whatsapp')} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border ${channel === 'whatsapp' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                           <MessageCircle className="w-6 h-6" />
                           <span className="text-xs font-bold">WhatsApp</span>
                        </button>
                        <button onClick={() => setChannel('webchat')} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border ${channel === 'webchat' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                           <Globe className="w-6 h-6" />
                           <span className="text-xs font-bold">Web Chat</span>
                        </button>
                        <button onClick={() => setChannel('email')} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border ${channel === 'email' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                           <Mail className="w-6 h-6" />
                           <span className="text-xs font-bold">Correo</span>
                        </button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Remitente (Identificador)</label>
                     <input 
                       type="text" 
                       value={phoneNumber}
                       onChange={(e) => setPhoneNumber(e.target.value)}
                       className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">Mensaje (Texto / Payload)</label>
                     <textarea 
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                       className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]" 
                     />
                  </div>
               </div>

               <button 
                 onClick={handleSimulate}
                 disabled={simulating}
                 className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
               >
                 {simulating ? (
                   <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                 ) : (
                   <><Play className="w-5 h-5 fill-current" /> Disparar Webhook</>
                 )}
               </button>
            </div>

            <div className="space-y-6">
               <div className="bg-card border border-border p-6 rounded-xl shadow-sm h-full flex flex-col">
                  <h2 className="font-bold border-b border-border pb-2 text-foreground mb-4">2. Traza de Ejecución (Logs)</h2>
                  
                  <div className="flex-1 bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-lg overflow-y-auto space-y-2">
                     {simulating && (
                        <>
                           <div className="text-slate-400">&gt; Generando payload simulado de Meta Cloud API...</div>
                           <div className="text-slate-400">&gt; Firmando con SHA256 (APP_SECRET)...</div>
                           <div className="text-slate-400">&gt; POST /api/webhooks/meta</div>
                        </>
                     )}
                     {result && (
                        <>
                           <div className="text-emerald-400">&gt; 200 OK</div>
                           <div className="text-blue-400">[Identity] Cliente resuelto: Copidrogas (Rubén Darío Valencia)</div>
                           <div className="text-blue-400">[Consent] Consentimiento verificado (Marketing: false, Ops: true)</div>
                           <div className="text-indigo-400">[Routing] Regla coincidente: STICKY_LAST_AGENT</div>
                           <div className="text-indigo-400">[Routing] Enrutando a Carlos Ruiz (Ventas)</div>
                           <div className="text-amber-400">[SLA] Deadline calculado: Lunes 8:00 AM (Descontando fin de semana)</div>
                           <div className="text-emerald-400 mt-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {result}</div>
                        </>
                     )}
                     {!simulating && !result && (
                        <div className="text-slate-500 italic">Esperando ejecución...</div>
                     )}
                  </div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}
