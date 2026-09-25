import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

globalToolCatalog.register({
  key: 'detectarDuplicados',
  name: 'detectarDuplicados',
  description: 'Encuentra clientes o productos que parecen estar duplicados por similitud fonética o de NIT.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    entidad: z.enum(['clientes', 'productos'])
  }),
  execute: async (input: any) => {
    return {
      duplicados: [
        { grupo: 'Universidad XYZ', registros: ['Univ XYZ', 'Universidad XYZ', 'U. XYZ'] }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'detectarCamposVacios',
  name: 'detectarCamposVacios',
  description: 'Muestra qué porcentaje de registros críticos les faltan correos, NITs o teléfonos.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    entidad: z.enum(['clientes'])
  }),
  execute: async (input: any) => {
    return {
      total: 4910,
      sinCorreo: 350,
      sinSector: 1200,
      malFormateados: 45
    };
  }
});

globalToolCatalog.register({
  key: 'validarConsistencia',
  name: 'validarConsistencia',
  description: 'Detecta anomalías como párrafos en campos de nombre corto.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      anomalias: [
        { entidad: 'Producto', id: 'P-123', campo: 'nombre', error: 'Contiene 200 caracteres, parece una descripción.' }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'sugerirNormalizacion',
  name: 'sugerirNormalizacion',
  description: 'Genera un borrador de propuesta de corrección en lote (requiere aprobación).',
  isWrite: true,
  estimatedCostCop: 10,
  inputSchema: z.object({
    accion: z.string(),
    registros: z.number()
  }),
  execute: async (input: any, context: any) => {
    const task = await prisma.agentTask.create({
      data: {
        organizationId: context.organizationId || 'DEFAULT_ORG',
        agentId: context.agentId,
        type: 'DRAFT',
        status: 'PENDING',
        title: 'Normalización de Datos: ' + input.accion,
        summary: `Propuesta para limpiar ${input.registros} registros.`,
        payload: { accion: input.accion, total: input.registros },
        impact: { impacto: "Mejora calidad de la BD" }
      }
    });
    return { success: true, taskId: task.id };
  }
});

globalToolCatalog.register({
  key: 'consultarCalidadDatos',
  name: 'consultarCalidadDatos',
  description: 'Índice de salud de los datos (0-100%).',
  isWrite: false,
  estimatedCostCop: 2,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      indiceSalud: 82,
      tendencia: "+2% respecto al mes anterior",
      problemaPrincipal: "Sectores comerciales sin clasificar"
    };
  }
});
