import { GoogleGenAI } from '@google/genai';

/**
 * Cliente de modelo de lenguaje usado por los agentes. Es una interfaz para poder probar los
 * agentes con un modelo simulado (sin llamadas reales ni costo).
 */
export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  /** Esquema de parámetros en el formato de Gemini (type: OBJECT, properties…). */
  parameters: Record<string, unknown>;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface RunWithToolsInput {
  system: string;
  history: ChatTurn[];
  message: string;
  tools: ToolDeclaration[];
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Máximo de rondas de herramientas antes de exigir una respuesta. */
  maxSteps?: number;
}

export interface LlmClient {
  /** Respuesta de texto simple (clasificación, resúmenes). */
  complete(system: string, prompt: string): Promise<string>;
  runWithTools(input: RunWithToolsInput): Promise<{ text: string; toolCalls: ToolCallRecord[] }>;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL_FAST || 'gemini-flash-latest';
}

export function createGeminiClient(apiKey = process.env.GEMINI_API_KEY): LlmClient {
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: Number(process.env.GEMINI_TIMEOUT_MS) || 30000 } });

  return {
    async complete(system, prompt) {
      const res = await ai.models.generateContent({
        model: geminiModel(),
        contents: prompt,
        config: { systemInstruction: system, temperature: 0 },
      });
      return res.text || '';
    },

    async runWithTools({ system, history, message, tools, executeTool, maxSteps = 4 }) {
      const chat = ai.chats.create({
        model: geminiModel(),
        config: {
          systemInstruction: system,
          temperature: 0.3,
          tools: tools.length ? ([{ functionDeclarations: tools }] as any) : undefined,
        },
        history: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      });

      const toolCalls: ToolCallRecord[] = [];
      let response = await chat.sendMessage({ message });
      for (let step = 0; step < maxSteps && response.functionCalls?.length; step++) {
        const parts: any[] = [];
        for (const call of response.functionCalls) {
          const args = (call.args || {}) as Record<string, unknown>;
          let result: unknown;
          try {
            result = await executeTool(call.name || '', args);
          } catch (err: any) {
            result = { error: err?.message || String(err) };
          }
          toolCalls.push({ name: call.name || '', args, result });
          parts.push({ functionResponse: { name: call.name, response: { result } } });
        }
        response = await chat.sendMessage({ message: parts });
      }
      return { text: (response.text || '').trim(), toolCalls };
    },
  };
}
