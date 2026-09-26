'use client';
import { useState, useEffect } from 'react';
import { PhoneOff, MicOff, Mic, ExternalLink, Minimize2, Maximize2, Pause, Play, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CallPanel() {
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  
  // This is a mockup to show the call panel for demo purposes.
  // In a real scenario, this state would be managed by a global store (Zustand/Context)
  // that listens to WebRTC or Twilio Device events.
  
  // Expose a global method to trigger calls for the demo
  useEffect(() => {
    (window as any).startDemoCall = () => {
      setIsActive(true);
      setIsRinging(true);
      setDuration(0);
      setIsMinimized(false);
      setTimeout(() => setIsRinging(false), 3000);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive && !isRinging) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isRinging]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`fixed z-50 bottom-6 right-6 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all ${isMinimized ? 'w-64 h-16' : 'w-80 h-[450px]'}`}
      >
        <div 
           className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}
        >
           <div className="flex flex-col">
              <span className="font-bold text-sm">
                 {isRinging ? 'Llamando...' : 'En Llamada'}
              </span>
              <span className="text-xs opacity-80 font-mono">
                 {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
              </span>
           </div>
           <div className="flex items-center gap-2">
              <button className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                 {isMinimized ? <Maximize2 className="w-4 h-4"/> : <Minimize2 className="w-4 h-4"/>}
              </button>
           </div>
        </div>

        {!isMinimized && (
           <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    FC
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="font-bold text-foreground truncate">Fusión Comunicación</h3>
                    <p className="text-xs text-muted-foreground truncate">+57 300 1234567</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 border border-border rounded-lg bg-muted/10 p-3">
                 <textarea 
                    className="w-full h-full bg-transparent resize-none outline-none text-sm" 
                    placeholder="Escribe notas de la llamada aquí... (se guardarán automáticamente en la ficha del cliente)"
                 ></textarea>
              </div>

              <div className="flex items-center justify-center gap-6 mb-2">
                 <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-amber-100 text-amber-600' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                 >
                    {isMuted ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                 </button>
                 <button 
                    onClick={() => {
                       setIsActive(false);
                       // Here we would show the 10-second disposition form.
                       alert("Llamada finalizada. El audio está siendo enviado a Gemini para su transcripción y análisis de compromisos.");
                    }}
                    className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors animate-pulse"
                 >
                    <PhoneOff className="w-6 h-6"/>
                 </button>
                 <button className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors">
                    <CheckSquare className="w-5 h-5"/>
                 </button>
              </div>
              <div className="text-center text-[10px] text-muted-foreground mt-2">
                 La llamada está siendo grabada.
              </div>
           </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
