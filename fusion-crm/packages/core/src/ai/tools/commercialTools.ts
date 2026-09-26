import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';

globalToolCatalog.register({
  key: 'consultarPipeline',
  name: 'consultarPipeline',
  description: 'Consulta el estado actual de las oportunidades comerciales (ganadas, perdidas, en progreso).',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    vendedorId: z.string().optional(),
    estado: z.string().optional()
  }),
  execute: async (input: any) => {
    return {
      pipeline: [
        { id: 'O-100', cliente: 'Editorial Zeta', monto: 12000000, probabilidad: 80, etapa: 'Negociación' },
        { id: 'O-101', cliente: 'Universidad XYZ', monto: 4500000, probabilidad: 30, etapa: 'Presentación' }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'consultarCliente',
  name: 'consultarCliente',
  description: 'Información general de un cliente, su sector, contactos y estado de cuenta básico.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    clienteId: z.string()
  }),
  execute: async (input: any) => {
    return {
      clienteId: input.clienteId,
      nombre: 'Editorial Zeta',
      sector: 'Editorial',
      riesgo: 'BAJO'
    };
  }
});

globalToolCatalog.register({
  key: 'consultarTemperatura',
  name: 'consultarTemperatura',
  description: 'Retorna el índice termodinámico de salud del cliente (frío, tibio, caliente) (Etapa 6).',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    clienteId: z.string()
  }),
  execute: async (input: any) => {
    return {
      clienteId: input.clienteId,
      temperatura: 'FRIO',
      score: 35,
      motivo: 'Patrón de compra interrumpido. Solía pedir cada 45 días, lleva 90.'
    };
  }
});

globalToolCatalog.register({
  key: 'consultarHistorialCompras',
  name: 'consultarHistorialCompras',
  description: 'Historial real de productos comprados, fechas y montos.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    clienteId: z.string()
  }),
  execute: async (input: any) => {
    return {
      clienteId: input.clienteId,
      historial: [
        { producto: 'Revistas Corporativas', ultimaFecha: '2026-06-15', frecuenciaPromedioDias: 45 }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'buscarOportunidadesEstancadas',
  name: 'buscarOportunidadesEstancadas',
  description: 'Devuelve oportunidades que no han avanzado en los últimos N días.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    diasSinMovimiento: z.number().default(15)
  }),
  execute: async (input: any) => {
    return {
      estancadas: [
        { id: 'O-098', cliente: 'Agencia ABC', diasEstancada: 22, etapa: 'Cotización Enviada' }
      ]
    };
  }
});

globalToolCatalog.register({
  key: 'sugerirSiguientePaso',
  name: 'sugerirSiguientePaso',
  description: 'Propone el siguiente paso con el cliente y ventas cruzadas basadas en comportamiento histórico.',
  isWrite: false,
  estimatedCostCop: 10,
  inputSchema: z.object({
    clienteId: z.string()
  }),
  execute: async (input: any) => {
    return {
      clienteId: input.clienteId,
      siguientePaso: 'Llamada de reactivación',
      ventaCruzada: 'Calendarios 2027 (basado en compra del año anterior en Septiembre)'
    };
  }
});

globalToolCatalog.register({
  key: 'redactarMensajeSeguimiento',
  name: 'redactarMensajeSeguimiento',
  description: 'Borrador de correo o mensaje para enviar al cliente.',
  isWrite: false,
  estimatedCostCop: 5,
  inputSchema: z.object({
    clienteId: z.string(),
    contexto: z.string()
  }),
  execute: async (input: any) => {
    return {
      borrador: `Hola, hace 90 días no producimos sus revistas. ¿Tiene disponibilidad para revisar el próximo tiraje?`
    };
  }
});

globalToolCatalog.register({
  key: 'consultarMetas',
  name: 'consultarMetas',
  description: 'Metas de ventas mensuales vs. avance actual.',
  isWrite: false,
  estimatedCostCop: 2,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      metaMes: 150000000,
      logrado: 110000000,
      porcentaje: 73.3
    };
  }
});
