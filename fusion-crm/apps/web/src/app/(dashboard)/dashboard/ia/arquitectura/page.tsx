import React from 'react';
import { Network, Bot, Database, ArrowRight, Server, MessageSquare, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function ArquitecturaIAPage() {
  const agents = [
    {
      id: 'comercial',
      name: 'Agente Comercial',
      icon: MessageSquare,
      color: 'bg-blue-500/10 text-blue-500',
      border: 'border-blue-200 dark:border-blue-800',
      description: 'Interactúa con clientes, perfila leads y responde dudas básicas.',
      inputs: ['Historial del cliente', 'Mensajes de WhatsApp/Meta', 'Catálogo base'],
      outputs: ['Leads calificados en CRM', 'Solicitudes de cotización', 'Actualización de preferencias del cliente']
    },
    {
      id: 'cotizador',
      name: 'Agente Cotizador',
      icon: FileText,
      color: 'bg-indigo-500/10 text-indigo-500',
      border: 'border-indigo-200 dark:border-indigo-800',
      description: 'Toma las solicitudes del Agente Comercial y genera propuestas económicas estructuradas.',
      inputs: ['Solicitud de cotización', 'Precios maestros', 'Reglas de negocio'],
      outputs: ['Borrador de cotización (PDF/JSON)', 'Notificación al equipo de ventas', 'Alerta de costos atípicos']
    },
    {
      id: 'capacidad',
      name: 'Agente de Capacidad',
      icon: Layers,
      color: 'bg-orange-500/10 text-orange-500',
      border: 'border-orange-200 dark:border-orange-800',
      description: 'Evalúa si la planta puede asumir los pedidos aprobados basándose en tiempos y maquinaria.',
      inputs: ['Cotizaciones aprobadas', 'Gantt de producción actual', 'Capacidad instalada'],
      outputs: ['Fechas estimadas de entrega', 'Alertas de cuellos de botella', 'Recomendación de turnos extra']
    },
    {
      id: 'abastecimiento',
      name: 'Agente de Abastecimiento',
      icon: Database,
      color: 'bg-emerald-500/10 text-emerald-500',
      border: 'border-emerald-200 dark:border-emerald-800',
      description: 'Revisa el inventario necesario para la producción aprobada y sugiere compras.',
      inputs: ['Inventario actual', 'BOM (Lista de materiales)', 'Tiempos de proveedores'],
      outputs: ['Órdenes de compra sugeridas', 'Alertas de stock bajo', 'Proyección de quiebre de stock']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Network className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ecosistema de Agentes IA</h1>
          <p className="text-sm text-muted-foreground">Flujo de datos y responsabilidades en el sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className={`bg-card border ${agent.border} rounded-xl p-6 shadow-sm`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${agent.color}`}>
                <agent.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4" /> Entradas (Lo que lee)
                </h4>
                <ul className="space-y-1">
                  {agent.inputs.map((input, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 shrink-0" />
                      <span>{input}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Salidas (Lo que deja listo)
                </h4>
                <ul className="space-y-1">
                  {agent.outputs.map((output, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      <span className="font-medium">{output}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 border rounded-xl p-6 mt-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Flujo de Trabajo Automatizado
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <div className="bg-background border rounded-lg p-4 flex-1 w-full">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium">1. Captura & Perfilado</p>
            <p className="text-xs text-muted-foreground mt-1">(Agente Comercial)</p>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block shrink-0" />
          <div className="bg-background border rounded-lg p-4 flex-1 w-full">
            <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-sm font-medium">2. Cotización</p>
            <p className="text-xs text-muted-foreground mt-1">(Agente Cotizador)</p>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block shrink-0" />
          <div className="bg-background border rounded-lg p-4 flex-1 w-full">
            <Layers className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm font-medium">3. Análisis de Capacidad</p>
            <p className="text-xs text-muted-foreground mt-1">(Agente de Capacidad)</p>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block shrink-0" />
          <div className="bg-background border rounded-lg p-4 flex-1 w-full">
            <Database className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium">4. Compras Sugeridas</p>
            <p className="text-xs text-muted-foreground mt-1">(Agente de Abastecimiento)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
