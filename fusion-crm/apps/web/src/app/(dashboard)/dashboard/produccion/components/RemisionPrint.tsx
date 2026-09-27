import { Printer } from "lucide-react";
import { type DeliveryNote, type ProductionProject } from '../productionModel';

export function PrintRemisionModal({ remisionId, remisiones, projects, onClose }: { remisionId: string, remisiones: DeliveryNote[], projects: ProductionProject[], onClose: () => void }) {
  const remision = remisiones.find(r => r.id === remisionId);
  const project = projects.find(p => p.id === remision?.projectId);

  if (!remision || !project) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
      {/* Hide close button when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="no-print p-4 bg-muted border-b border-border flex justify-between items-center sticky top-0 shadow-sm z-10">
        <div className="font-bold">Vista previa de impresión (Remisión {remision.number})</div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg flex items-center gap-2">
             <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-background border border-border font-bold rounded-lg hover:bg-muted text-sm">Cerrar</button>
        </div>
      </div>

      <div className="print-content w-full h-full p-4 sm:p-8 bg-white flex justify-center items-start min-h-screen">
        {/* Media Carta Landscape Layout (Two side-by-side copies) */}
        <div className="flex flex-row w-[1056px] gap-8 shrink-0 mx-auto bg-white scale-[0.65] sm:scale-100 origin-top">
          
          {/* COPY 1: PARA EL CLIENTE */}
          <RemisionCopy remision={remision} project={project} type="PARA EL CLIENTE" />

          {/* COPY 2: PARA LA EMPRESA */}
          <RemisionCopy remision={remision} project={project} type="PARA LA EMPRESA" />

        </div>
      </div>
    </div>
  );
}

function RemisionCopy({ remision, project, type }: { remision: DeliveryNote, project: ProductionProject, type: string }) {
  const itemsText = project.itemsDetail.map(i => `${i.quantity} - ${i.name} ${i.size} ${i.material} ${i.finishings}`).join(', ');
  const dateStr = new Date(remision.createdAt).toLocaleDateString('es-CO');

  return (
    <div className="flex-1 border-2 border-border p-8 flex flex-col bg-white text-black min-h-[600px]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-600 mb-6">REMISIÓN Nº {remision.number.replace('REM-', '')}</h1>
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Fusión Comunicación Gráfica S.A.S.</p>
            <p className="text-muted-foreground">NIT: 900310298-2</p>
            <p className="text-muted-foreground">Cra. 22 #24 - 47, Manizales, Caldas</p>
          </div>
        </div>
        <div className="w-24 h-24 border border-border bg-slate-50 flex flex-col items-center justify-center font-black text-slate-300 rounded-lg">
           {/* Placeholder for Logo */}
           <div className="text-2xl leading-none">FS</div>
           <div className="text-2xl leading-none">ION</div>
           <div className="text-xs text-black mt-2 tracking-widest font-bold">FUSIÓN</div>
        </div>
      </div>

      <div className="w-full h-1 bg-teal-600 mb-6"></div>

      <div className="space-y-4 text-sm mb-6 flex-1">
        <div><span className="font-bold">Fecha:</span> {dateStr}</div>
        <div><span className="font-bold">Cliente:</span> {remision.client}</div>
        
        <div className="mt-4">
          <div className="font-bold mb-1">Documento:</div>
          <div className="bg-slate-100 font-bold py-1 px-2 mb-1">DIRECCIÓN:</div>
          <div className="px-2">{project.name || 'N/A'}</div>
          <div className="mt-2"><span className="font-bold">Tel:</span> N/A</div>
        </div>

        <div className="mt-6">
          <div className="bg-slate-100 font-bold py-1 px-2 text-center mb-2">DESCRIPCIÓN</div>
          <div className="px-2 leading-relaxed">
            {dateStr} - {itemsText} - {remision.client}
          </div>
        </div>
        
        <div className="mt-8 border-t border-border pt-2">
          <div className="font-bold mb-8">OBSERVACIONES:</div>
          <div className="border-b border-border mb-6"></div>
          <div className="border-b border-border"></div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <div className="flex justify-between items-end mb-4">
           <div className="space-y-4 text-sm w-1/2">
             <div className="flex items-end gap-2"><span className="w-16">Nombre:</span><div className="flex-1 border-b border-black"></div></div>
             <div className="flex items-end gap-2"><span className="w-16">C.C.:</span><div className="flex-1 border-b border-black"></div></div>
             <div className="flex items-end gap-2"><span className="w-16">Tel:</span><div className="flex-1 border-b border-black"></div></div>
           </div>
           <div className="w-48 text-center text-sm font-bold">
             <div className="border-b-2 border-black w-full mb-1"></div>
             FIRMA CLIENTE
           </div>
        </div>

        <div className="bg-black text-white text-center py-1 text-xs font-bold tracking-widest w-48 mx-auto mt-6">
          --- {type} ---
        </div>
        
        <div className="text-center text-[10px] text-muted-foreground mt-4">
           Proyecto ID: {remision.projectId} | Despachado por: {remision.elaboratedBy}
        </div>
      </div>
    </div>
  );
}
