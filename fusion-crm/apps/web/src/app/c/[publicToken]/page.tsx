"use client";

import * as React from "react";
import { Check, X, FileText, Download, Printer, ArrowRight, Upload, AlertCircle, MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom"; // Simulated for our SPA layout

export default function PublicPortalPage() {
  const [status, setStatus] = React.useState<'VIEW' | 'SIGNING' | 'APPROVED' | 'REJECTED' | 'COMMENTING'>('VIEW');
  const [signature, setSignature] = React.useState("");

  // Fetches real quote or falls back to neutral client title
  const mockQuote = {
    number: "FCG-2026",
    date: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
    clientName: "Cliente Corporativo",
    contactName: "Representante Autorizado",
    status: "SENT",
    items: [
      { id: 1, desc: "Impresión y Acabados Gráficos Especiales", qty: 1, price: 0, total: 0 }
    ],
    subtotal: 0,
    vat: 0,
    total: 0
  };

  if (status === 'APPROVED') {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-xl text-center border border-border">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">¡Cotización Aprobada!</h1>
          <p className="text-muted-foreground mb-6">Hemos recibido tu confirmación para la cotización {mockQuote.number}.</p>
          <div className="bg-muted p-4 rounded-xl text-sm space-y-2 mb-6 text-left">
            <div className="flex justify-between"><span className="text-muted-foreground">Siguiente paso:</span> <span className="font-medium">Orden de Producción</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tiempo estimado:</span> <span className="font-medium">5-7 días hábiles</span></div>
          </div>
          <p className="text-xs text-muted-foreground">Te notificaremos por correo y WhatsApp cuando tu pedido esté en producción.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Topbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
               F
             </div>
             <div>
               <h1 className="font-bold text-lg leading-tight">Fusion Graphics</h1>
               <p className="text-xs text-muted-foreground">Portal del Cliente</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={() => setStatus('SIGNING')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" /> Aprobar
            </button>
            <button 
              onClick={() => setStatus('REJECTED')}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              <X className="w-4 h-4" /> Rechazar
            </button>
          </div>
        </div>

        {status === 'SIGNING' && (
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-primary/20 animate-in slide-in-from-top-4">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Check className="text-primary w-5 h-5" /> Firma de Aprobación
             </h3>
             <div className="grid sm:grid-cols-2 gap-4 mb-4">
               <div>
                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nombre Completo</label>
                 <input type="text" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Ej. Juan Pérez" />
               </div>
               <div>
                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Documento / Cédula</label>
                 <input type="text" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="Número de documento" />
               </div>
             </div>
             <div className="mb-4">
               <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Firma (Dibuja aquí)</label>
               <div className="w-full h-32 rounded-lg border-2 border-dashed border-input bg-muted/30 cursor-crosshair flex items-center justify-center relative">
                 <span className="text-muted-foreground/50 pointer-events-none">Área de firma</span>
                 {/* In a real app, react-signature-canvas goes here */}
               </div>
               <button className="text-xs text-muted-foreground hover:text-foreground mt-2">Limpiar firma</button>
             </div>
             <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setStatus('VIEW')} className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted">Cancelar</button>
                <button onClick={() => setStatus('APPROVED')} className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-sm hover:bg-primary/90">Confirmar Aprobación</button>
             </div>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-destructive/20 animate-in slide-in-from-top-4">
             <h3 className="font-bold text-lg mb-4 text-destructive flex items-center gap-2">
               <X className="w-5 h-5" /> Rechazar Cotización
             </h3>
             <div className="mb-4">
               <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Motivo del rechazo (Opcional, pero de gran ayuda)</label>
               <textarea className="w-full h-24 rounded-lg border border-input bg-background p-3 text-sm resize-none" placeholder="El precio es muy alto, los tiempos no dan, etc..." />
             </div>
             <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setStatus('VIEW')} className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted">Cancelar</button>
                <button className="px-6 py-2 bg-destructive text-destructive-foreground text-sm font-bold rounded-lg shadow-sm hover:bg-destructive/90">Confirmar Rechazo</button>
             </div>
          </div>
        )}

        {/* PDF Document View (Simulated A4) */}
        <div className="bg-white text-black p-8 sm:p-12 rounded-sm shadow-2xl mx-auto border border-gray-200" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
           
           <div className="flex justify-between items-start mb-12 border-b-2 border-gray-100 pb-8">
             <div>
               <div className="text-4xl font-black tracking-tighter text-blue-900 mb-2">FUSION.</div>
               <div className="text-sm text-gray-500">Impresión & Empaques</div>
               <div className="text-sm text-gray-500">NIT: 900.123.456-7</div>
             </div>
             <div className="text-right">
               <h2 className="text-3xl font-light text-gray-400 mb-2">COTIZACIÓN</h2>
               <div className="text-xl font-bold text-gray-800">{mockQuote.number}</div>
               <div className="text-sm text-gray-500 mt-2">Fecha: {mockQuote.date}</div>
               <div className="text-sm text-gray-500">Validez: 15 días</div>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-8 mb-12">
             <div className="bg-gray-50 p-4 rounded-lg">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Preparado para</div>
               <div className="font-bold text-lg text-gray-800">{mockQuote.clientName}</div>
               <div className="text-gray-600">{mockQuote.contactName}</div>
             </div>
             <div className="bg-gray-50 p-4 rounded-lg text-right">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ejecutivo de Cuenta</div>
               <div className="font-bold text-lg text-gray-800">Carlos Gómez</div>
               <div className="text-gray-600">carlos@fusion.com</div>
             </div>
           </div>

           <table className="w-full mb-12">
             <thead>
               <tr className="border-b-2 border-gray-800 text-left">
                 <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                 <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Cant.</th>
                 <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">V. Unit</th>
                 <th className="py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
               </tr>
             </thead>
             <tbody>
               {mockQuote.items.map(item => (
                 <tr key={item.id} className="border-b border-gray-100">
                   <td className="py-4">
                     <div className="font-bold text-gray-800">{item.desc}</div>
                     <div className="text-sm text-gray-500 mt-1">Tamaño: 21x28cm • Papel: Propalcote 150g • Acabado: Plastificado Mate</div>
                   </td>
                   <td className="py-4 text-center text-gray-800 font-medium">{item.qty}</td>
                   <td className="py-4 text-right text-gray-800">${item.price.toLocaleString()}</td>
                   <td className="py-4 text-right font-bold text-gray-900">${item.total.toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
           </table>

           <div className="flex justify-end mb-16">
             <div className="w-72 space-y-3">
               <div className="flex justify-between text-gray-600">
                 <span>Subtotal</span>
                 <span>${mockQuote.subtotal.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-gray-600">
                 <span>IVA (19%)</span>
                 <span>${mockQuote.vat.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-xl font-bold text-gray-900 border-t-2 border-gray-800 pt-3">
                 <span>TOTAL</span>
                 <span>${mockQuote.total.toLocaleString()}</span>
               </div>
               <div className="text-right text-xs text-gray-400">Pesos Colombianos (COP)</div>
             </div>
           </div>

           <div className="border-t border-gray-200 pt-8 grid grid-cols-2 gap-8 text-sm text-gray-600">
             <div>
               <h4 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-wider">Condiciones Comerciales</h4>
               <ul className="list-disc list-inside space-y-1">
                 <li>Tiempo de entrega: 5-7 días hábiles tras aprobación de artes.</li>
                 <li>Forma de pago: 50% anticipo, 50% contra entrega.</li>
                 <li>Los precios no incluyen costos de envío fuera de Bogotá.</li>
               </ul>
             </div>
             <div className="text-center pt-8">
               <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
               <div className="font-bold text-gray-800">Firma de Aprobación</div>
               <div className="text-gray-400 text-xs mt-1">Representante Legal / Autorizado</div>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
}
