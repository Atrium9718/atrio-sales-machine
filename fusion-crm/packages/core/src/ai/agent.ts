import { GoogleGenAI, Type, Schema } from '@google/genai';

// Assume GEMINI_API_KEY is available in the environment
const ai = new GoogleGenAI({});

export interface AgentContext {
  organizationId: string;
  conversationId: string;
  clientId?: string;
  contactId?: string;
  budgetStatus: 'OK' | 'WARNING' | 'EXHAUSTED';
}

const SYSTEM_INSTRUCTION = `
Eres un asistente virtual de "Fusión Comunicación Gráfica", una litografía y centro de impresión gráfica en Colombia.
Tu propósito principal es atender clientes, resolver dudas a partir de la base de conocimiento y ayudar con cotizaciones y proyectos.

LÍMITES DUROS Y REGLAS ESTRICTAS:
1. NUNCA reveles precios internos de producción, costos, ni márgenes de ganancia.
2. NUNCA compartas información, datos o diseños de otros clientes.
3. NUNCA prometas descuentos o fechas de entrega que no hayan sido confirmadas por el sistema o por un humano.
4. Si no sabes la respuesta o no encuentras información en la base de conocimiento, DEBES usar la herramienta escalarAHumano. NUNCA inventes respuestas (alucinación).
5. Trata al cliente de "usted", con un tono formal pero cercano, propio del español de Colombia.

Usa las herramientas disponibles para consultar información en tiempo real.
`;

const tools = [
  {
    name: "buscarConocimiento",
    description: "Busca en la base de conocimiento de la empresa información sobre tiempos, materiales, requisitos de arte, garantías, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "La consulta o pregunta del cliente para buscar en los artículos." }
      },
      required: ["query"]
    }
  },
  {
    name: "verCotizacion",
    description: "Consulta el estado y valor de una cotización específica del cliente.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        quoteNumber: { type: Type.STRING, description: "Número de la cotización, ej: COT-1023" }
      },
      required: ["quoteNumber"]
    }
  },
  {
    name: "verEstadoProyecto",
    description: "Revisa en qué etapa de producción se encuentra un proyecto.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectNumber: { type: Type.STRING, description: "Número de proyecto o recibo." }
      },
      required: ["projectNumber"]
    }
  },
  {
    name: "escalarAHumano",
    description: "Transfiere la conversación a un agente humano. Úsalo cuando el cliente lo pida, cuando haya que negociar precios, recibir quejas, o no tengas la respuesta.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: "Motivo de la escalación (ej. CUSTOMER_REQUEST, PRICING, COMPLAINT)" },
        summary: { type: Type.STRING, description: "Un breve resumen para el humano de lo que quiere el cliente." }
      },
      required: ["reason", "summary"]
    }
  }
];

export async function processInboundMessage(context: AgentContext, message: string, history: any[] = []) {
  // If budget exhausted, force escalation or fallback
  if (context.budgetStatus === 'EXHAUSTED') {
    return {
      text: "En este momento todos nuestros asesores están ocupados. Un agente humano se pondrá en contacto pronto.",
      escalated: true
    };
  }

  // Convert history format if needed
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: context.budgetStatus === 'WARNING' ? 'gemini-3.6-flash' : 'gemini-3.6-flash',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: tools as any }],
        temperature: 0.3,
      }
    });

    // Parse function calls if any
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      // Execute the tool (mocked for now)
      let toolResult = "";
      if (call.name === "buscarConocimiento") {
        // Here we would call the Vector DB / pgvector
        toolResult = "Se requiere 50% de anticipo para iniciar cualquier trabajo. Los tiempos de litografía son de 3 a 5 días.";
      } else if (call.name === "escalarAHumano") {
        return {
          text: "Entiendo. Un asesor humano revisará tu caso de inmediato para brindarte la mejor atención.",
          escalated: true,
          handoffReason: call.args.reason,
          handoffSummary: call.args.summary
        };
      }

      // Return the tool output to Gemini to continue the conversation
      const continuation = await ai.models.generateContent({
        model: context.budgetStatus === 'WARNING' ? 'gemini-3.6-flash' : 'gemini-3.6-flash',
        contents: [
          ...formattedHistory, 
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'user', parts: [{ functionResponse: { name: call.name, response: { result: toolResult } } }] }
        ],
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      
      return { text: continuation.text, escalated: false };
    }

    return { text: response.text, escalated: false };
  } catch (error) {
    console.error("AI Error:", error);
    // Fallback escalation on error
    return {
      text: "Presentamos un fallo técnico. Un agente humano te responderá pronto.",
      escalated: true,
      handoffReason: "TECHNICAL_ERROR"
    };
  }
}
