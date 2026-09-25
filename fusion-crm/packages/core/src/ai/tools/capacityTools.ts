import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';
import { estimateProcessTimeAndCost, EstimationParams } from '../../production/estimation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

globalToolCatalog.register({
  key: 'consultarCapacidad',
  name: 'consultarCapacidad',
  description: 'Consulta las horas disponibles, comprometidas y libres por máquina y por semana.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    desde: z.string().describe('Fecha inicio YYYY-MM-DD'),
    hasta: z.string().describe('Fecha fin YYYY-MM-DD'),
    maquinaId: z.string().optional().describe('ID de máquina opcional para filtrar')
  }),
  execute: async (input: any) => {
    // Mock implementation returning realistic data based on stage 9
    return {
      period: `${input.desde} a ${input.hasta}`,
      machines: [
        { name: "Offset GTO", availableHrs: 48, committedHrs: 45, freeHrs: 3 },
        { name: "Impresora Digital", availableHrs: 48, committedHrs: 20, freeHrs: 28 },
        { name: "Guillotina", availableHrs: 48, committedHrs: 40, freeHrs: 8 },
        { name: "Troqueladora", availableHrs: 48, committedHrs: 52, freeHrs: -4 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'detectarCuelloDeBotella',
  name: 'detectarCuelloDeBotella',
  description: 'Identifica la máquina o proceso con mayor utilización proyectada en un periodo.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    desde: z.string().describe('Fecha inicio YYYY-MM-DD'),
    hasta: z.string().describe('Fecha fin YYYY-MM-DD')
  }),
  execute: async (input: any) => {
    return {
      bottleneck: "Troqueladora",
      utilizationPercentage: 108.3,
      saturatingJobs: ["PROY-850 (Empaques)", "PROY-852 (Carpetas)"]
    };
  }
});

globalToolCatalog.register({
  key: 'simularTrabajo',
  name: 'simularTrabajo',
  description: 'Simula si un trabajo nuevo cabe, cuándo empezaría, terminaría y qué desplazaría.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    tipoProducto: z.string(),
    cantidad: z.number(),
    procesos: z.array(z.string()).describe('Lista de procesos ej: ["impresion", "troquelado"]'),
    fechaDeseada: z.string()
  }),
  execute: async (input: any) => {
    // We use the estimation from stage 9
    const params: EstimationParams = {
      quantity: input.cantidad,
      setupMinutes: 30, // Mocked avg setup
      minutesPerUnit: 0.05, // Mocked
      machineHourlyCost: 15, 
      efficiency: 0.85
    };
    const est = estimateProcessTimeAndCost(params);
    
    return {
      fits: false, // For testing the "no cabe" case
      estimatedHours: est.totalHours,
      suggestedStartDate: "2026-09-16",
      suggestedEndDate: "2026-09-17",
      displacedJobs: ["PROY-855 (Tarjetas)"]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarCargaEmpleado',
  name: 'consultarCargaEmpleado',
  description: 'Consulta horas asignadas vs contratadas de empleados y habilidades.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    desde: z.string(),
    hasta: z.string(),
    empleadoId: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      employees: [
        { name: "Juan Pérez", assignedHrs: 45, contractedHrs: 48, roles: ["Operador Offset"] }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarEstadoMaquinas',
  name: 'consultarEstadoMaquinas',
  description: 'Consulta el estado actual de máquinas, mantenimientos y averías.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      machines: [
        { name: "Offset GTO", status: "OPERACIONAL", nextMaintenance: "2026-09-20", recentFaults: 0 },
        { name: "Troqueladora", status: "OPERACIONAL", nextMaintenance: "2026-09-15", recentFaults: 1 },
        { name: "Guillotina", status: "MANTENIMIENTO", nextMaintenance: "N/A", recentFaults: 2 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarHistoricoTiempos',
  name: 'consultarHistoricoTiempos',
  description: 'Compara tiempo estimado vs real de trabajos históricos comparables.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    tipoProducto: z.string().optional(),
    procesoId: z.string().optional(),
    maquinaId: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      sampleSize: 858,
      avgEstimatedHours: 4.5,
      avgRealHours: 5.2,
      deviation: "+15.5%",
      conclusion: "El proceso suele tomar más tiempo del estimado debido a mermas de arranque superiores a la norma."
    };
  }
});

globalToolCatalog.register({
  key: 'consultarProyectosEnRiesgo',
  name: 'consultarProyectosEnRiesgo',
  description: 'Proyectos cuya fecha comprometida no se alcanza con la carga actual.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      atRisk: [
        { project: "PROY-840", client: "Editorial Zeta", promisedDate: "2026-09-14", estimatedCompletion: "2026-09-15", riskReason: "Cuello de botella en Troqueladora" }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'calcularOee',
  name: 'calcularOee',
  description: 'Calcula OEE (Disponibilidad, Rendimiento, Calidad) y paros.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    maquinaId: z.string(),
    desde: z.string(),
    hasta: z.string()
  }),
  execute: async (input: any) => {
    return {
      oee: 0.68,
      availability: 0.80,
      performance: 0.90,
      quality: 0.95,
      downtimeReasons: [
        { reason: "Ajuste/Arranque", minutes: 120 },
        { reason: "Falta material", minutes: 45 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'proponerReprogramacion',
  name: 'proponerReprogramacion',
  description: 'Genera una tarea de reprogramación diferida (no aplica los cambios inmediatamente, requiere aprobación humana).',
  isWrite: true,
  estimatedCostCop: 10,
  inputSchema: z.object({
    objetivo: z.string().describe('Qué se busca lograr (ej. liberar troqueladora el martes)'),
    restricciones: z.array(z.string()).describe('Lista de reglas (ej. No mover PROY-840)')
  }),
  execute: async (input: any, context: any) => {
    // Generate an agent task representing the proposal
    const task = await prisma.agentTask.create({
      data: {
        organizationId: context.organizationId,
        agentId: context.agentId,
        type: 'RESCHEDULE_PROPOSAL',
        status: 'PENDING',
        
        title: "Reprogramación Propuesta",
          summary: "Propuesta de cambio de fechas",
          payload: {
            objetivo: input.objetivo,
            restricciones: input.restricciones,
            propuesta: "Mover PROY-852 al miércoles y procesar PROY-840 el martes."
          },
          impact: {
            impacto: "Retrasa PROY-852 1 día, asegura PROY-840 a tiempo."
          }
      }
    });
    return { 
      success: true, 
      message: "Propuesta generada exitosamente. Esperando aprobación humana.", 
      taskId: task.id 
    };
  }
});
