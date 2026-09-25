'use client';
import { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function PreferenciasPage() {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-xl shadow-sm border border-border text-center">
           <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold mb-2">Preferencias Actualizadas</h2>
           <p className="text-muted-foreground">Tus opciones de comunicación han sido guardadas. Hemos registrado esta actualización con fines de auditoría (Habeas Data).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
         <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl font-bold">Centro de Preferencias</h1>
            <p className="text-muted-foreground text-sm">Gestiona qué tipo de mensajes deseas recibir de nosotros.</p>
         </div>

         <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
            <div>
               <h3 className="font-bold border-b border-border pb-2 mb-4">Canal: Correo Electrónico</h3>
               <div className="space-y-4">
                  <label className="flex items-start gap-3">
                     <input type="checkbox" className="mt-1" defaultChecked />
                     <div>
                        <div className="font-bold text-sm">Promociones y Ofertas (Marketing)</div>
                        <div className="text-xs text-muted-foreground">Descuentos, nuevos lanzamientos y eventos.</div>
                     </div>
                  </label>
                  <label className="flex items-start gap-3">
                     <input type="checkbox" className="mt-1" defaultChecked />
                     <div>
                        <div className="font-bold text-sm">Encuestas de Satisfacción</div>
                        <div className="text-xs text-muted-foreground">Tu opinión sobre nuestro servicio y productos.</div>
                     </div>
                  </label>
                  <label className="flex items-start gap-3 opacity-60">
                     <input type="checkbox" className="mt-1" checked disabled />
                     <div>
                        <div className="font-bold text-sm">Avisos Transaccionales (Requerido)</div>
                        <div className="text-xs text-muted-foreground">Cotizaciones, facturas, estado de producción. No se puede desactivar si tienes servicios activos.</div>
                     </div>
                  </label>
               </div>
            </div>

            <div>
               <h3 className="font-bold border-b border-border pb-2 mb-4">Canal: WhatsApp</h3>
               <div className="space-y-4">
                  <label className="flex items-start gap-3">
                     <input type="checkbox" className="mt-1" defaultChecked />
                     <div>
                        <div className="font-bold text-sm">Mensajes de Marketing</div>
                     </div>
                  </label>
                  <label className="flex items-start gap-3 opacity-60">
                     <input type="checkbox" className="mt-1" checked disabled />
                     <div>
                        <div className="font-bold text-sm">Avisos Transaccionales (Requerido)</div>
                     </div>
                  </label>
               </div>
            </div>

            <div className="pt-4 flex gap-2">
               <button onClick={() => setSaved(true)} className="flex-1 h-10 bg-primary text-primary-foreground font-bold rounded hover:bg-primary/90">Guardar Preferencias</button>
               <button onClick={() => setSaved(true)} className="flex-1 h-10 bg-destructive/10 text-destructive font-bold rounded hover:bg-destructive/20 flex items-center justify-center gap-2">
                 <ShieldAlert className="w-4 h-4" /> Date de Baja de Todo
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
