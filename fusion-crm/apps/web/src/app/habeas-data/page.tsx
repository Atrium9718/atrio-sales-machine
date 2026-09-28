'use client';
import { useState } from 'react';
import { FileText, Search, Trash2, XCircle, AlertTriangle } from 'lucide-react';

export default function HabeasDataPage() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-xl shadow-sm border border-border text-center">
           <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
           <h2 className="text-2xl font-bold mb-2">Solicitud Recibida</h2>
           <p className="text-muted-foreground text-sm">Tu solicitud de Habeas Data ha sido radicada. Recibirás respuesta al correo indicado dentro de los términos de ley aplicables (10 o 15 días hábiles según el tipo de solicitud).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
         <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold">Portal de Habeas Data</h1>
            <p className="text-muted-foreground text-sm">Ejerce tus derechos sobre tus datos personales conforme a la Ley 1581 de 2012.</p>
         </div>

         <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-6">
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-bold mb-1">Tipo de Solicitud</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="border border-border p-3 rounded-lg flex gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                           <input type="radio" name="dsr_type" value="ACCESS" defaultChecked className="mt-1" />
                           <div>
                              <div className="font-bold text-sm flex items-center gap-1"><Search className="w-4 h-4"/> Consulta (Acceso)</div>
                              <div className="text-[10px] text-muted-foreground">Conocer qué datos tenemos. Tiempo: 10 días hábiles.</div>
                           </div>
                        </label>
                        <label className="border border-border p-3 rounded-lg flex gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                           <input type="radio" name="dsr_type" value="RECTIFICATION" className="mt-1" />
                           <div>
                              <div className="font-bold text-sm flex items-center gap-1"><FileText className="w-4 h-4"/> Actualización</div>
                              <div className="text-[10px] text-muted-foreground">Corregir datos inexactos. Tiempo: 15 días hábiles.</div>
                           </div>
                        </label>
                        <label className="border border-border p-3 rounded-lg flex gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                           <input type="radio" name="dsr_type" value="DELETION" className="mt-1" />
                           <div>
                              <div className="font-bold text-sm flex items-center gap-1"><Trash2 className="w-4 h-4 text-destructive"/> Supresión</div>
                              <div className="text-[10px] text-muted-foreground">Eliminar datos (si no hay deber legal). Tiempo: 15 días hábiles.</div>
                           </div>
                        </label>
                        <label className="border border-border p-3 rounded-lg flex gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                           <input type="radio" name="dsr_type" value="COMPLAINT" className="mt-1" />
                           <div>
                              <div className="font-bold text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500"/> Reclamo</div>
                              <div className="text-[10px] text-muted-foreground">Notificar presunto incumplimiento. Tiempo: 15 días hábiles.</div>
                           </div>
                        </label>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold mb-1">Nombre Completo</label>
                        <input type="text" required className="w-full h-10 border border-border rounded px-3 bg-background" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1">Documento de Identidad</label>
                        <input type="text" required className="w-full h-10 border border-border rounded px-3 bg-background" />
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold mb-1">Correo Electrónico (para notificaciones)</label>
                     <input type="email" required className="w-full h-10 border border-border rounded px-3 bg-background" />
                  </div>

                  <div>
                     <label className="block text-sm font-bold mb-1">Descripción de la Solicitud</label>
                     <textarea required className="w-full h-32 border border-border rounded p-3 bg-background resize-none" placeholder="Describe claramente qué datos quieres consultar, actualizar o suprimir..."></textarea>
                  </div>
               </div>

               <div className="pt-4 flex gap-4 items-center justify-between border-t border-border">
                  <div className="text-xs text-muted-foreground max-w-sm">
                     Al enviar esta solicitud, autorizas el tratamiento de tus datos para darle trámite bajo nuestra Política de Privacidad (v1.2).
                  </div>
                  <button type="submit" className="h-10 px-8 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90 shrink-0">
                     Radicar Solicitud
                  </button>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
}
