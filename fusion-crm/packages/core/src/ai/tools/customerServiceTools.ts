import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';

globalToolCatalog.register({
  key: 'buscarConocimiento',
  name: 'buscarConocimiento',
  description: 'Busca en la base de conocimiento de la empresa información sobre tiempos, materiales, requisitos de arte, garantías, etc.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    query: z.string().describe('La consulta o pregunta del cliente para buscar en los artículos.')
  }),
  execute: async (input: any) => {
    // RAG implementation mock
    return { result: "Se requiere 50% de anticipo para iniciar cualquier trabajo. Los tiempos de litografía son de 3 a 5 días." };
  }
});

globalToolCatalog.register({
  key: 'verCotizacion',
  name: 'verCotizacion',
  description: 'Consulta el estado y valor de una cotización específica del cliente.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    quoteNumber: z.string().describe('Número de la cotización, ej: COT-1023')
  }),
  execute: async (input: any) => {
    return { status: "Aprobada", value: 150000, date: "2026-09-12" };
  }
});

globalToolCatalog.register({
  key: 'verEstadoProyecto',
  name: 'verEstadoProyecto',
  description: 'Revisa en qué etapa de producción se encuentra un proyecto.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    projectNumber: z.string().describe('Número de proyecto o recibo.')
  }),
  execute: async (input: any) => {
    return { status: "En Producción", estimatedDelivery: "2026-09-15" };
  }
});

globalToolCatalog.register({
  key: 'escalarAHumano',
  name: 'escalarAHumano',
  description: 'Transfiere la conversación a un agente humano. Úsalo cuando el cliente lo pida, cuando haya que negociar precios, recibir quejas, o no tengas la respuesta.',
  isWrite: true,
  estimatedCostCop: 5,
  inputSchema: z.object({
    reason: z.string().describe('Motivo de la escalación (ej. CUSTOMER_REQUEST, PRICING, COMPLAINT)'),
    summary: z.string().describe('Un breve resumen para el humano de lo que quiere el cliente.')
  }),
  execute: async (input: any, context: any) => {
    return { escalated: true, reason: input.reason, message: "Escalado exitosamente al equipo humano." };
  }
});
