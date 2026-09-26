import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';

globalToolCatalog.register({
  key: 'calcularPrecio',
  name: 'calcularPrecio',
  description: 'Motor de precios (Etapa 7). Evalúa el costo de materiales, margen y procesos para dar un precio base.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    especificaciones: z.any()
  }),
  execute: async (input: any) => {
    return {
      precioSugerido: 4500000,
      margenEstimado: 25,
      costoDirecto: 3375000
    };
  }
});

globalToolCatalog.register({
  key: 'buscarCotizacionSimilar',
  name: 'buscarCotizacionSimilar',
  description: 'Busca cotizaciones históricas para trabajos de características similares (vector/semántica).',
  isWrite: false,
  estimatedCostCop: 15,
  inputSchema: z.object({
    descripcion: z.string()
  }),
  execute: async (input: any) => {
    return {
      similares: [
        { id: 'COT-882', cliente: 'Editorial Zeta', fecha: '2026-03-10', precio: 4300000, especificaciones: 'Revistas 64p, 150g' }
      ],
      rangoPreciosHistorico: { min: 4200000, max: 4800000 }
    };
  }
});

globalToolCatalog.register({
  key: 'consultarMaterialDisponible',
  name: 'consultarMaterialDisponible',
  description: 'Verifica stock de papel y tintas necesarias para una cotización (deriva a inventario internamente).',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    materiales: z.array(z.string())
  }),
  execute: async (input: any) => {
    return {
      disponible: false,
      faltantes: ['Propalcote 150g 70x100'],
      nota: 'Derivar a Agente de Inventario para consultar cobertura y opciones.'
    };
  }
});

globalToolCatalog.register({
  key: 'simularTrabajo',
  name: 'simularTrabajo',
  description: 'Verifica si hay capacidad en planta para entregar en la fecha solicitada.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    horasEstimadas: z.number(),
    fechaEntregaSolicitada: z.string()
  }),
  execute: async (input: any) => {
    return {
      cabeEnPlanta: false,
      nota: 'Derivar a Agente de Capacidad para simular alternativas de programación.'
    };
  }
});

globalToolCatalog.register({
  key: 'consultarMargen',
  name: 'consultarMargen',
  description: 'Evalúa el margen financiero de este tipo de trabajos (deriva a financiero).',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    tipoProducto: z.string()
  }),
  execute: async (input: any) => {
    return { margenHistorico: 22.5, nota: 'Margen ligeramente inferior al objetivo de la compañía.' };
  }
});

globalToolCatalog.register({
  key: 'extraerRequerimientosDeTexto',
  name: 'extraerRequerimientosDeTexto',
  description: 'Toma un correo o texto libre y extrae cantidades, materiales y acabados.',
  isWrite: false,
  estimatedCostCop: 15,
  inputSchema: z.object({
    textoLibre: z.string()
  }),
  execute: async (input: any) => {
    return {
      cantidad: 5000,
      materialInterior: 'Bond 75g',
      materialCubierta: 'Propalcote 200g',
      asunciones: ['Tamaño carta (asumido estándar)', 'Impresión 4x4 (asumido estándar)']
    };
  }
});
