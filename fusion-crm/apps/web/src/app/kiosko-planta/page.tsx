"use client";

import * as React from "react";
import { Play, Square, AlertTriangle, CheckCircle, Camera, Search, User, LogOut, Wrench, MessageSquare, Megaphone, Send } from "lucide-react";
import { getProjects } from "../../lib/projectsStore";

export default function KioskoPlantaPage() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [activeTask, setActiveTask] = React.useState<boolean>(false);
  const [helpRequested, setHelpRequested] = React.useState(false);
  const [showAnnouncement, setShowAnnouncement] = React.useState(true);
  const [showMessages, setShowMessages] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<{from: string, text: string}[]>([]);
  const [projectsList, setProjectsList] = React.useState<any[]>([]);

  React.useEffect(() => {
    setProjectsList(getProjects().filter((p: any) => p.status !== 'Finalizado'));
  }, []);

  // Mock Login Screen
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans select-none">
        <div className="max-w-md w-full bg-zinc-900 rounded-3xl p-8 border-2 border-zinc-800 shadow-2xl">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Kiosko de Planta</h1>
          <p className="text-zinc-400 text-center mb-8 text-lg">Ingresa tu PIN de operario</p>
          
          <div className="text-center text-4xl font-mono tracking-[1em] mb-8 h-12 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800">
            {pin || "----"}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3,4,5,6,7,8,9].map(num => (
              <button 
                key={num} 
                onClick={() => setPin(p => (p.length < 4 ? p + num : p))}
                className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-3xl font-bold rounded-2xl aspect-square transition-colors"
              >
                {num}
              </button>
            ))}
            <button onClick={() => setPin("")} className="bg-danger/20 text-danger hover:bg-danger/30 active:bg-danger/40 text-xl font-bold rounded-2xl aspect-square transition-colors">
              BORRAR
            </button>
            <button 
              onClick={() => setPin(p => (p.length < 4 ? p + "0" : p))}
              className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-3xl font-bold rounded-2xl aspect-square transition-colors"
            >
              0
            </button>
            <button 
              onClick={() => pin.length === 4 ? setIsLoggedIn(true) : null}
              className={`text-xl font-bold rounded-2xl aspect-square transition-colors ${pin.length === 4 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-zinc-800 text-zinc-500'}`}
            >
              ENTRAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col font-sans select-none overflow-hidden">
      
      {/* Announcement Modal */}
      {showAnnouncement && (
        <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-8">
          <Megaphone className="w-24 h-24 text-primary mb-8" />
          <h1 className="text-6xl font-black mb-6 text-center">Revisión de Seguridad</h1>
          <p className="text-3xl text-zinc-300 text-center mb-16 max-w-4xl">
            A partir de hoy es obligatorio usar gafas de seguridad en la zona de guillotinas. Por favor pasar por almacén si no tienen las suyas.
          </p>
          <button 
            onClick={() => setShowAnnouncement(false)}
            className="px-16 py-8 bg-primary hover:bg-primary/90 text-primary-foreground text-4xl font-bold rounded-3xl"
          >
            ENTENDIDO
          </button>
        </div>
      )}

      {/* Messages Modal */}
      {showMessages && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-3xl bg-zinc-900 rounded-3xl border border-zinc-800 flex flex-col h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-3xl font-bold">Mensajes con Supervisor</h2>
              <button onClick={() => setShowMessages(false)} className="text-zinc-400 hover:text-white p-2">
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[70%] text-2xl ${m.from === 'me' ? 'bg-primary text-primary-foreground' : 'bg-zinc-800 text-white'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-zinc-800 flex gap-4">
              <input 
                type="text" 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-zinc-800 rounded-2xl px-6 text-2xl outline-none focus:ring-2 focus:ring-primary"
              />
              <button 
                onClick={() => {
                  if(message.trim()) {
                    setMessages(p => [...p, {from: 'me', text: message}]);
                    setMessage("");
                  }
                }}
                className="w-20 h-20 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shrink-0"
              >
                <Send className="w-10 h-10" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-20 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-2xl">
            CG
          </div>
          <div>
            <h1 className="text-xl font-bold">Carlos Gómez</h1>
            <p className="text-zinc-400 text-sm">Máquina: Heidelberg SM-52</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowMessages(true)}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold text-lg border border-zinc-700 active:bg-zinc-700"
          >
            <MessageSquare className="w-6 h-6" /> Supervisor
          </button>
          <button 
            onClick={() => setHelpRequested(true)}
            className="flex items-center gap-3 px-6 py-3 bg-amber-500/20 text-amber-500 rounded-xl font-bold text-lg border border-amber-500/30 active:bg-amber-500/40"
          >
            <AlertTriangle className="w-6 h-6" /> Pedir Ayuda
          </button>
          <button 
            onClick={() => { setIsLoggedIn(false); setPin(""); }}
            className="w-12 h-12 bg-zinc-800 text-zinc-400 flex items-center justify-center rounded-xl active:bg-zinc-700"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 flex gap-6 p-6 overflow-hidden">
        
        {/* Task List & Compliance */}
        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-300 mb-2">Mi Rendimiento</h2>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-3xl font-black">Vas muy bien</span>
            </div>
            <p className="text-zinc-400 text-lg">Has cumplido el tiempo estándar, pero ojo con los paros por mantenimiento.</p>
          </div>

          <h2 className="text-2xl font-bold text-zinc-300">Fila de Trabajo</h2>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {projectsList.length > 0 ? projectsList.map((p, idx) => (
              <div key={p.id || idx} className={`p-6 rounded-2xl border-2 transition-colors ${idx === 0 && !activeTask ? 'bg-zinc-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-zinc-500 tracking-wider">{p.code || p.id || `PROD-${idx + 1}`}</span>
                  {idx === 0 && <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase">Siguiente</span>}
                </div>
                <h3 className="text-2xl font-bold mb-2">{p.title || p.name || 'Orden de Producción'}</h3>
                <p className="text-zinc-400 mb-4 text-lg">{p.stage || 'En cola de taller'}</p>
                <div className="text-sm text-zinc-500 font-medium">Cliente: {p.clientName || 'Cliente Fusión'}</div>
              </div>
            )) : (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <p className="text-base font-medium">No hay órdenes pendientes en fila de producción.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Task Panel */}
        <div className="flex-1 bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col relative">
          
          {helpRequested && (
            <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm z-10 rounded-3xl flex flex-col items-center justify-center p-8">
              <AlertTriangle className="w-24 h-24 text-amber-500 mb-6 animate-pulse" />
              <h2 className="text-4xl font-bold mb-4">Ayuda Solicitada</h2>
              <p className="text-xl text-zinc-400 text-center mb-12">El supervisor ha sido notificado y está en camino.</p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                 <button className="py-6 bg-zinc-800 text-2xl font-bold rounded-2xl border-2 border-zinc-700 active:bg-zinc-700">Falta Material</button>
                 <button className="py-6 bg-zinc-800 text-2xl font-bold rounded-2xl border-2 border-zinc-700 active:bg-zinc-700">Avería Máquina</button>
                 <button className="py-6 bg-zinc-800 text-2xl font-bold rounded-2xl border-2 border-zinc-700 active:bg-zinc-700">Duda de Calidad</button>
                 <button className="py-6 bg-zinc-800 text-2xl font-bold rounded-2xl border-2 border-zinc-700 active:bg-zinc-700">Mantenimiento</button>
              </div>

              <button onClick={() => setHelpRequested(false)} className="px-12 py-6 bg-zinc-100 text-zinc-900 text-2xl font-bold rounded-2xl hover:bg-zinc-300">
                Cancelar Alerta
              </button>
            </div>
          )}

          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-zinc-500 font-bold tracking-wider mb-2 text-xl">PROD-08491</div>
              <h2 className="text-5xl font-black mb-2">Tarjetas Corporativas</h2>
              <p className="text-2xl text-zinc-400">Propalcote 300g • 500 pliegos (Tiro/Retiro)</p>
            </div>
            {activeTask && (
              <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 px-6 py-2 rounded-2xl flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-2xl font-bold font-mono">00:42:15</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6">
            {!activeTask ? (
              <button 
                onClick={() => setActiveTask(true)}
                className="w-full py-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] text-5xl font-black shadow-[0_10px_40px_rgba(99,102,241,0.4)] flex items-center justify-center gap-6 active:scale-95 transition-all"
              >
                <Play className="w-16 h-16 fill-white" />
                INICIAR TAREA
              </button>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800">
                    <label className="block text-zinc-500 text-xl font-bold mb-4 uppercase">Cantidad Buena</label>
                    <input type="number" className="w-full bg-transparent text-6xl font-black text-white focus:outline-none" defaultValue={500} />
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800">
                    <label className="block text-amber-500/70 text-xl font-bold mb-4 uppercase">Desperdicio</label>
                    <input type="number" className="w-full bg-transparent text-6xl font-black text-amber-500 focus:outline-none" defaultValue={12} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button className="py-8 bg-zinc-800 text-2xl font-bold rounded-[2rem] flex flex-col items-center justify-center gap-4 active:bg-zinc-700">
                    <Camera className="w-10 h-10 text-zinc-400" />
                    Tomar Foto (Calidad)
                  </button>
                  <button className="py-8 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-2xl font-bold rounded-[2rem] flex flex-col items-center justify-center gap-4 active:bg-amber-500/20">
                    <Wrench className="w-10 h-10" />
                    Registrar Paro
                  </button>
                </div>

                <button 
                  onClick={() => setActiveTask(false)}
                  className="w-full py-10 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] text-4xl font-black shadow-[0_10px_40px_rgba(16,185,129,0.4)] flex items-center justify-center gap-4 active:scale-95 transition-all"
                >
                  <CheckCircle className="w-12 h-12" />
                  FINALIZAR TAREA
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
