'use client';
import { useState } from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle2, UserX, Database, Play, Download } from 'lucide-react';

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<'dsr' | 'retention' | 'sla'>('sla');
  const [simulating, setSimulating] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-card">
         <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Cumplimiento y Privacidad</h1>
         </div>
         <div className="ml-8 flex gap-4">
            <button onClick={() => setActiveTab('dsr')} className={`text-sm font-bold pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'dsr' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Habeas Data (PQR)</button>
            <button onClick={() => setActiveTab('retention')} className={`text-sm font-bold pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'retention' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Retención de Datos</button>
            <button onClick={() => setActiveTab('sla')} className={`text-sm font-bold pb-4 -mb-4 border-b-2 transition-colors ${activeTab === 'sla' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>SLA Operativo (V.E.A)</button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
         <div className="max-w-6xl mx-auto space-y-6">
            {activeTab === 'dsr' && (
              <>
                 <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase">Por Vencer (&lt; 3 días)</div>
                       <div className="text-3xl font-black text-foreground mt-1">0</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase">En Progreso</div>
                       <div className="text-3xl font-black text-foreground mt-1">0</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase">Nuevas Solicitudes</div>
                       <div className="text-3xl font-black text-foreground mt-1">0</div>
                    </div>
                 </div>

                 <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-muted text-muted-foreground">
                          <tr>
                             <th className="p-4 font-bold">Tipo</th>
                             <th className="p-4 font-bold">Titular</th>
                             <th className="p-4 font-bold">Radicación</th>
                             <th className="p-4 font-bold">Vencimiento (Ley 1581)</th>
                             <th className="p-4 font-bold">Estado</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                          <tr>
                             <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-1">
                                   <span className="font-semibold text-foreground">Sin solicitudes de Habeas Data pendientes</span>
                                   <span className="text-xs">Los derechos de supresión, actualización o consulta radicados por clientes aparecerán aquí.</span>
                                </div>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </>
            )}

            {activeTab === 'retention' && (
              <div className="space-y-6">
                 <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Database className="w-5 h-5" /> Políticas de Retención Activas</h2>
                    <p className="text-sm text-muted-foreground mb-6">Configuración de limpieza automatizada para cumplir con el principio de limitación de conservación.</p>
                    
                    <div className="space-y-4">
                       <div className="border border-border p-4 rounded-lg flex justify-between items-center bg-background">
                          <div>
                             <div className="font-bold">Prospectos sin actividad &gt; 24 meses</div>
                             <div className="text-xs text-muted-foreground mt-1">Acción: ANONIMIZAR (Conserva demográficos para analytics)</div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="text-right">
                                <div className="text-sm font-bold text-muted-foreground">0 registros aplicables</div>
                                <div className="text-[10px] text-muted-foreground">Período inicial limpio</div>
                             </div>
                             <button onClick={() => setSimulating(true)} className="h-9 px-4 bg-muted text-foreground font-bold text-sm rounded hover:bg-muted/80 flex items-center gap-2"><Play className="w-4 h-4"/> Ejecutar</button>
                          </div>
                       </div>
                       
                       <div className="border border-border p-4 rounded-lg flex justify-between items-center bg-background">
                          <div>
                             <div className="font-bold">Cotizaciones rechazadas &gt; 60 meses</div>
                             <div className="text-xs text-muted-foreground mt-1">Acción: ELIMINAR (No sujetas a retención contable 10 años)</div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="text-right">
                                <div className="text-sm font-bold text-muted-foreground">0 registros aplicables</div>
                                <div className="text-[10px] text-muted-foreground">Período inicial limpio</div>
                             </div>
                             <button className="h-9 px-4 bg-muted text-foreground font-bold text-sm rounded hover:bg-muted/80 flex items-center gap-2"><Play className="w-4 h-4"/> Ejecutar</button>
                          </div>
                       </div>
                    </div>
                 </div>

                 {simulating && (
                    <div className="bg-muted/30 border border-border p-6 rounded-xl shadow-sm">
                       <h3 className="font-bold flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-primary"/> Simulación de Retención</h3>
                       <p className="text-sm mb-4 text-muted-foreground">No existen registros históricos antiguos en este momento. La base de datos se encuentra al día.</p>
                       <div className="flex gap-2">
                          <button onClick={() => setSimulating(false)} className="h-9 px-4 bg-primary text-primary-foreground font-bold text-sm rounded hover:bg-primary/90">Aceptar</button>
                       </div>
                    </div>
                 )}
              </div>
            )}

            {activeTab === 'sla' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">SLA Cumplidos <span>(Hoy)</span></div>
                       <div className="text-3xl font-black text-emerald-600 mt-2">100%</div>
                       <div className="text-xs text-muted-foreground mt-1">Meta: 95%</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">SLA Vencidos <span>(Últ. 7 días)</span></div>
                       <div className="text-3xl font-black text-foreground mt-2">0</div>
                       <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sin desviaciones</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <div className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">TMO (Tiempo 1ra Respuesta)</div>
                       <div className="text-3xl font-black text-foreground mt-2">--</div>
                       <div className="text-xs text-muted-foreground mt-1">Sin llamadas ni chats pendientes</div>
                    </div>
                 </div>

                 {/* Vencimientos y Causas */}
                 <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                       <h3 className="font-bold text-sm">Conversaciones Vencidas Recientes</h3>
                    </div>
                    <table className="w-full text-left text-sm">
                       <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                          <tr>
                             <th className="p-4 font-bold">Cliente / Canal</th>
                             <th className="p-4 font-bold">Agente / Turno</th>
                             <th className="p-4 font-bold">Desviación SLA</th>
                             <th className="p-4 font-bold">Motivo (Causa Raíz)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                          <tr>
                             <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-1">
                                   <span className="font-semibold text-foreground">0 Incidencias de SLA críticas activas</span>
                                   <span className="text-xs">Los tiempos de respuesta de los agentes y canales se encuentran dentro de las metas programadas.</span>
                                </div>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
