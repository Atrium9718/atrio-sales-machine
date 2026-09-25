import { z } from 'zod';
import { globalToolCatalog } from '../ToolCatalog';

globalToolCatalog.register({
  key: 'derivarAgente',
  name: 'derivarAgente',
  description: 'Deriva una consulta a otro agente especialista (Ej. cotizador -> capacidad). Devuelve la respuesta de ese agente.',
  isWrite: false,
  estimatedCostCop: 20,
  inputSchema: z.object({
    agenteDestino: z.enum(['comercial', 'cotizador', 'capacidad', 'inventario', 'financiero', 'datos', 'servicio']),
    pregunta: z.string().describe('Lo que necesitas que el otro agente responda. Sé específico.')
  }),
  execute: async (input: any, context: any) => {
    // In a real implementation, this would trigger an AgentRun for the destination agent
    // and wait for its output. For now, we return a mocked response based on the destination.
    
    let mockedResponse = "Respuesta de " + input.agenteDestino;
    if (input.agenteDestino === 'capacidad') {
      mockedResponse = "Análisis de capacidad: No hay espacio en la Offset esta semana. Se sugiere mover al lunes próximo.";
    } else if (input.agenteDestino === 'inventario') {
      mockedResponse = "Análisis de inventario: Faltan 500 hojas de Propalcote. Tenemos formato mayor para transformar.";
    } else if (input.agenteDestino === 'financiero') {
      mockedResponse = "Análisis financiero: El margen de este cliente ha bajado al 15% en los últimos 3 meses.";
    }
    
    return {
      exito: true,
      agente: input.agenteDestino,
      respuesta: mockedResponse,
      nota: "Debes integrar esta respuesta en tu respuesta final al usuario, citando a qué agente consultaste."
    };
  }
});
