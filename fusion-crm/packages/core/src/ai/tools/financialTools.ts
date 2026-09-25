import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';

globalToolCatalog.register({
  key: 'consultarRentabilidad',
  name: 'consultarRentabilidad',
  description: 'Muestra rentabilidad de proyectos o meses.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    mes: z.string().optional(),
    proyectoId: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      margen: 18.5,
      descomposicion: {
        precioPromedio: "+2%",
        costoMaterial: "-5% (Incremento papel)",
        horas: "Estable",
        desperdicio: "-1.5%",
        tercerizacion: "Estable"
      }
    };
  }
});

globalToolCatalog.register({
  key: 'compararPresupuestoReal',
  name: 'compararPresupuestoReal',
  description: 'Compara cotización vs costo real de ejecución.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    proyectoId: z.string()
  }),
  execute: async (input: any) => {
    return {
      proyectoId: input.proyectoId,
      presupuestado: 3375000,
      real: 3600000,
      diferencia: -225000,
      motivo: "Se consumió más tiempo en Offset y el desperdicio superó la fórmula."
    };
  }
});

globalToolCatalog.register({
  key: 'analizarMargenPorDimension',
  name: 'analizarMargenPorDimension',
  description: 'Margen por cliente, vendedor o tipo de producto.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    dimension: z.enum(['cliente', 'vendedor', 'producto'])
  }),
  execute: async (input: any) => {
    return {
      dimension: input.dimension,
      top: [
        { nombre: 'Editorial Zeta', margen: 28 },
        { nombre: 'Revistas Corporativas', margen: 25 }
      ],
      bottom: [
        { nombre: 'Agencia ABC', margen: 12 } // Alerta de rentabilidad baja sostenida
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarCartera',
  name: 'consultarCartera',
  description: 'Estado de cuentas por cobrar, días de mora.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    clienteId: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      carteraVencida: 25000000,
      mayorMora: 'Agencia ABC (60 días)'
    };
  }
});

globalToolCatalog.register({
  key: 'proyectarFlujo',
  name: 'proyectarFlujo',
  description: 'Flujo de caja basado en cobros esperados y pagos (inventario).',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      proyeccion30dias: 'SALUDABLE',
      ingresosEsperados: 120000000,
      egresosEsperados: 80000000
    };
  }
});

globalToolCatalog.register({
  key: 'detectarProyectosSinCostos',
  name: 'detectarProyectosSinCostos',
  description: 'Encuentra proyectos facturados pero que tienen 0 horas o 0 material reportado.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      proyectosFantasma: [
        { id: 'PROY-999', cliente: 'Cliente Express', facturado: 2000000, costoReportado: 0 }
      ]
    };
  }
});
