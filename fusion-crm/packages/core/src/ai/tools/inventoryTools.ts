import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

globalToolCatalog.register({
  key: 'consultarStock',
  name: 'consultarStock',
  description: 'Consulta la existencia actual, reservado, disponible, por lote, costo y ubicación de papeles o insumos.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    tipoPapel: z.string().optional().describe('Filtro por tipo de papel (ej. Propalcote, Bond)'),
    tamano: z.string().optional().describe('Filtro por tamaño (ej. 70x100)'),
    insumo: z.string().optional().describe('Filtro por nombre de insumo (ej. Tinta Cyan)')
  }),
  execute: async (input: any) => {
    // Mocked response for agent
    return {
      paper: [
        { 
          id: 'inv-1', type: 'Propalcote 150g', size: '70x100', 
          currentSheets: 4500, reservedSheets: 3000, availableSheets: 1500, 
          averageCost: 450, 
          lots: [
            { lotNumber: 'L2023-09-01', location: 'Estante A1', remaining: 4500 }
          ]
        },
        { 
          id: 'inv-2', type: 'Cartón Kraft 300g', size: '70x100', 
          currentSheets: 800, reservedSheets: 800, availableSheets: 0, 
          averageCost: 850, 
          lots: [
             { lotNumber: 'L2023-08-15', location: 'Estante B2', remaining: 800 }
          ]
        }
      ],
      supplies: [
        { name: 'Tinta Cyan UV', currentStock: 15.5, unit: 'KG', averageCost: 45000 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'verificarDisponibilidadProyecto',
  name: 'verificarDisponibilidadProyecto',
  description: 'Verifica si un proyecto tiene material suficiente, o si falta, y si se puede usar transformación.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    proyectoId: z.string().describe('ID o nombre del proyecto')
  }),
  execute: async (input: any) => {
    return {
      project: input.proyectoId,
      required: [
        { item: 'Propalcote 150g 70x100', qty: 2500 }
      ],
      availability: 'INSUFFICIENT',
      missing: [
        { item: 'Propalcote 150g 70x100', shortage: 1000 }
      ],
      transformationAlternative: {
        viable: true,
        source: 'Propalcote 150g 100x140',
        available: 3000,
        estimatedWaste: '2%',
        notes: 'Se sugiere cortar pliegos de 100x140. Requiere orden de transformación.'
      }
    };
  }
});

globalToolCatalog.register({
  key: 'calcularCobertura',
  name: 'calcularCobertura',
  description: 'Días de cobertura según consumo histórico y reservas vigentes.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    itemId: z.string(),
    dias: z.number().optional().describe('Días para promedio de consumo. Default: 30')
  }),
  execute: async (input: any) => {
    return {
      itemId: input.itemId,
      dailyConsumptionAvg: 250,
      currentAvailable: 1500,
      coverageDays: 6,
      status: 'CRITICAL', // CRITICAL si < tiempo de entrega del proveedor
      supplierLeadTimeDays: 7
    };
  }
});

globalToolCatalog.register({
  key: 'consultarConsumoHistorico',
  name: 'consultarConsumoHistorico',
  description: 'Consumo por período (tendencias y estacionalidad).',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    itemId: z.string(),
    desde: z.string(),
    hasta: z.string(),
    agrupacion: z.enum(['day', 'week', 'month'])
  }),
  execute: async (input: any) => {
    return {
      period: `${input.desde} a ${input.hasta}`,
      aggregation: input.agrupacion,
      data: [
        { period: '2026-08', consumed: 5500 },
        { period: '2026-09', consumed: 6200 }
      ],
      seasonalityDetected: true,
      notes: "Aumento del 12% por temporada escolar."
    };
  }
});

globalToolCatalog.register({
  key: 'proyectarDemanda',
  name: 'proyectarDemanda',
  description: 'Proyección basada en consumo histórico más proyectos comprometidos y pipeline.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    itemId: z.string(),
    horizonteDias: z.number()
  }),
  execute: async (input: any) => {
    return {
      itemId: input.itemId,
      horizonDays: input.horizonteDias,
      projectionRange: { min: 8000, max: 9500, unit: 'sheets' },
      method: "Promedio ponderado 30 días + Suma de Cotizaciones 'Aprobadas' y 'Cierre 80%'",
      committedDemands: 4500,
      pipelinePotential: 2500
    };
  }
});

globalToolCatalog.register({
  key: 'analizarDesperdicio',
  name: 'analizarDesperdicio',
  description: 'Desperdicio real contra WasteFormula, con la brecha por causa.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    desde: z.string(),
    hasta: z.string(),
    tipoProducto: z.string().optional(),
    maquinaId: z.string().optional(),
    empleadoId: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      totalJobsAnalyzed: 124,
      theoreticalWasteSheets: 2480,
      realWasteSheets: 3100,
      gapSheets: 620,
      financialImpactCOP: 279000,
      gapPercentage: 25,
      causes: [
        { reason: 'Fallas de registro Offset', sheets: 400 },
        { reason: 'Arranque prolongado', sheets: 220 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarProveedores',
  name: 'consultarProveedores',
  description: 'Proveedores del ítem con calificación, plazo de entrega, último precio y variación.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    itemId: z.string()
  }),
  execute: async (input: any) => {
    return {
      itemId: input.itemId,
      suppliers: [
        { name: 'Papeles Nacionales', rating: 4.8, leadTimeDays: 7, lastPrice: 450, priceVariation: '+2% (3 meses)' },
        { name: 'Importadora Andina', rating: 3.5, leadTimeDays: 14, lastPrice: 420, priceVariation: 'Estable' }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'evaluarTransformacion',
  name: 'evaluarTransformacion',
  description: 'Si conviene cortar un formato mayor en lugar de comprar: rendimiento, desperdicio, costo.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    loteOrigenId: z.string(),
    tamanoDestino: z.string(),
    cantidad: z.number()
  }),
  execute: async (input: any) => {
    return {
      viable: true,
      yieldPerSheet: 2, // e.g. 100x140 -> two 70x100
      requiredSourceSheets: Math.ceil(input.cantidad / 2),
      wasteExpected: '10% (refile)',
      costComparedToPurchase: {
        transformationCost: 225, // cost of half sheet + labor
        purchaseCost: 250,
        saving: 25
      },
      conclusion: 'Conviene transformar el formato mayor disponible.'
    };
  }
});

globalToolCatalog.register({
  key: 'detectarInventarioMuerto',
  name: 'detectarInventarioMuerto',
  description: 'Lotes sin movimiento, con su valor inmovilizado y antigüedad.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    diasSinMovimiento: z.number().describe('Días para considerar muerto')
  }),
  execute: async (input: any) => {
    return {
      thresholdDays: input.diasSinMovimiento,
      deadLots: [
        { id: 'L-OLD-1', item: 'Cartulina Bristol 200g', daysNoMovement: 185, quantity: 2000, valueCOP: 800000 }
      ],
      totalValueTiedUpCOP: 800000
    };
  }
});

globalToolCatalog.register({
  key: 'calcularCostoRealMaterial',
  name: 'calcularCostoRealMaterial',
  description: 'Costo FIFO real consumido contra el presupuestado en la cotización.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    proyectoId: z.string()
  }),
  execute: async (input: any) => {
    return {
      projectId: input.proyectoId,
      budgetedMaterialCost: 1500000,
      realFifoCost: 1650000,
      variance: -150000,
      reason: "Se consumió un lote reciente comprado con sobreprecio por urgencia."
    };
  }
});

globalToolCatalog.register({
  key: 'proponerCompra',
  name: 'proponerCompra',
  description: 'Genera un borrador de Orden de Compra diferida (requiere aprobación humana).',
  isWrite: true,
  estimatedCostCop: 10,
  inputSchema: z.object({
    items: z.array(z.object({
      itemId: z.string(),
      cantidad: z.number(),
      proveedorSugerido: z.string()
    })),
    justificacion: z.string().describe('Explicación detallada de la necesidad y urgencia')
  }),
  execute: async (input: any, context: any) => {
    const task = await prisma.agentTask.create({
      data: {
        organizationId: context.organizationId,
        agentId: context.agentId,
        type: 'PURCHASE_PROPOSAL',
        status: 'PENDING',
        title: 'Borrador de Orden de Compra',
        summary: input.justificacion,
        payload: {
          items: input.items,
          justificacion: input.justificacion
        },
        impact: {
          impacto: "Asegura cobertura para la próxima semana. Evita retraso en PROY-840."
        }
      }
    });
    return { 
      success: true, 
      message: "Propuesta de compra generada exitosamente. Esperando aprobación humana.", 
      taskId: task.id 
    };
  }
});
