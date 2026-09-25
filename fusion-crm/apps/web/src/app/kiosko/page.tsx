"use client";

import * as React from "react";
import { Printer, ShoppingBag, ArrowRight, CheckCircle2, ChevronRight, Package, Image as ImageIcon, CreditCard, FileText } from "lucide-react";

export default function KioskPage() {
  const [step, setStep] = React.useState(1);

  if (step === 4) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <CheckCircle2 className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-6xl font-black mb-4 text-center">¡Pedido Confirmado!</h1>
        <p className="text-2xl text-gray-400 text-center max-w-2xl mb-12">
          Tu número de orden es <strong className="text-white">IPD-08492</strong>.<br />
          Te hemos enviado un mensaje por WhatsApp con el enlace para que subas tu archivo de diseño desde tu celular.
        </p>
        <button onClick={() => setStep(1)} className="px-12 py-6 bg-white text-black text-3xl font-bold rounded-2xl hover:bg-gray-200 transition-colors">
          Nuevo Pedido
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col font-sans select-none overflow-hidden">
      
      {/* Header */}
      <header className="h-24 bg-card border-b border-border flex items-center justify-between px-8 shrink-0 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-2xl">
              F
            </div>
            <h1 className="text-3xl font-black tracking-tight">Fusion Kiosko</h1>
         </div>
         
         <div className="flex items-center gap-2">
           {[1, 2, 3].map(s => (
             <div key={s} className="flex items-center">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                 {s}
               </div>
               {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
             </div>
           ))}
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {step === 1 && (
          <div className="h-full flex flex-col">
            <h2 className="text-5xl font-black mb-4">¿Qué deseas imprimir hoy?</h2>
            <p className="text-2xl text-muted-foreground mb-12">Toca una categoría para ver los precios y opciones.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1">
               {[
                 { title: "Tarjetas de Presentación", icon: <Printer className="w-16 h-16" /> },
                 { title: "Volantes / Flyers", icon: <FileText className="w-16 h-16" /> },
                 { title: "Pendones", icon: <ImageIcon className="w-16 h-16" /> },
                 { title: "Empaques Rápidos", icon: <Package className="w-16 h-16" /> },
                 { title: "Stickers / Etiquetas", icon: <ShoppingBag className="w-16 h-16" /> },
               ].map((cat, i) => (
                 <button 
                   key={i}
                   onClick={() => setStep(2)}
                   className="bg-card border-2 border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-6 hover:border-primary hover:bg-primary/5 transition-all active:scale-95 shadow-sm"
                 >
                   <div className="text-primary">{cat.icon}</div>
                   <h3 className="text-3xl font-bold text-center">{cat.title}</h3>
                 </button>
               ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex h-full gap-12">
            <div className="flex-1 space-y-12">
               <div>
                 <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
                   <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">1</span>
                   Selecciona el Material
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="p-6 rounded-2xl border-4 border-primary bg-primary/5 text-xl font-bold text-left shadow-sm">Propalcote 300g</button>
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-left text-muted-foreground">Opalina 250g</button>
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-left text-muted-foreground">Ecológico 200g</button>
                 </div>
               </div>
               
               <div>
                 <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
                   <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">2</span>
                   Acabado
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-left text-muted-foreground">Sin Plastificar</button>
                    <button className="p-6 rounded-2xl border-4 border-primary bg-primary/5 text-xl font-bold text-left shadow-sm">Plastificado Mate</button>
                 </div>
               </div>
               
               <div>
                 <h3 className="text-3xl font-bold mb-6 flex items-center gap-4">
                   <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">3</span>
                   Cantidad
                 </h3>
                 <div className="grid grid-cols-4 gap-4">
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-center text-muted-foreground">100</button>
                    <button className="p-6 rounded-2xl border-4 border-primary bg-primary/5 text-xl font-bold text-center shadow-sm">500</button>
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-center text-muted-foreground">1000</button>
                    <button className="p-6 rounded-2xl border-2 border-border bg-card text-xl font-medium text-center text-muted-foreground">2000</button>
                 </div>
               </div>
            </div>
            
            <div className="w-[400px] shrink-0 flex flex-col">
               <div className="bg-card border-2 border-border rounded-3xl p-8 flex-1 flex flex-col shadow-lg">
                  <h3 className="text-2xl font-bold mb-6 border-b-2 border-border pb-4">Resumen</h3>
                  
                  <div className="space-y-4 text-xl flex-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarjetas de Presentación</span>
                      <span className="font-bold">500 un.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Propalcote 300g</span>
                      <span>$ 45.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plastificado Mate</span>
                      <span>$ 15.000</span>
                    </div>
                  </div>
                  
                  <div className="border-t-4 border-border pt-6 mt-6">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-2xl font-bold">TOTAL</span>
                      <span className="text-5xl font-black text-primary">$ 60.000</span>
                    </div>
                    <p className="text-center text-muted-foreground mt-4">Impuestos incluidos</p>
                  </div>
               </div>
               
               <button 
                 onClick={() => setStep(3)}
                 className="w-full mt-6 bg-primary text-primary-foreground py-8 rounded-3xl text-3xl font-black shadow-xl hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center gap-4"
               >
                 Siguiente <ArrowRight className="w-8 h-8" />
               </button>
               <button 
                 onClick={() => setStep(1)}
                 className="w-full mt-4 bg-transparent text-muted-foreground py-6 rounded-3xl text-xl font-bold hover:bg-muted"
               >
                 Volver
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
            <h2 className="text-5xl font-black mb-4 text-center">Datos y Pago</h2>
            <p className="text-2xl text-muted-foreground mb-12 text-center">Para enviarte el enlace donde podrás subir tu diseño y notificarte cuando esté listo.</p>
            
            <div className="bg-card border-2 border-border rounded-3xl p-12 shadow-xl mb-12">
               <div className="space-y-8">
                 <div>
                   <label className="text-2xl font-bold block mb-4">¿Cuál es tu nombre?</label>
                   <input type="text" className="w-full h-20 text-3xl px-6 rounded-2xl border-2 border-input bg-background" placeholder="Ej. Juan Pérez" />
                 </div>
                 <div>
                   <label className="text-2xl font-bold block mb-4">Tu número de WhatsApp</label>
                   <input type="tel" className="w-full h-20 text-3xl px-6 rounded-2xl border-2 border-input bg-background" placeholder="300 000 0000" />
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setStep(1)} className="py-8 rounded-3xl border-4 border-border text-2xl font-bold text-muted-foreground hover:bg-muted">
                Cancelar
              </button>
              <button onClick={() => setStep(4)} className="py-8 rounded-3xl bg-primary text-primary-foreground text-3xl font-black flex items-center justify-center gap-4 hover:bg-primary/90">
                <CreditCard className="w-10 h-10" /> Pagar en Caja
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
