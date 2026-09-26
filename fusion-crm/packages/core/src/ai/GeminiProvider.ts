import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AiProvider, AiRequest, AiResponse, AiStreamResponse, AiError } from './types';

const FAST_MODEL = process.env.GEMINI_MODEL_FAST || 'gemini-flash-latest';
const REASONING_MODEL = process.env.GEMINI_MODEL_REASONING || 'gemini-pro-latest';
const EMBEDDING_MODEL = process.env.GEMINI_MODEL_EMBEDDING || 'text-embedding-004';
const MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192', 10);
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);

const COST_PER_1M_TOKENS_COP_FAST = 500;
const COST_PER_1M_TOKENS_COP_REASONING = 5000;

export class GeminiProvider implements AiProvider {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  private resolveModel(preference?: string, fallback = false): string {
    if (fallback || preference === 'FAST') return FAST_MODEL;
    if (preference === 'REASONING') return REASONING_MODEL;
    return FAST_MODEL; 
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rate = model.includes('pro') ? COST_PER_1M_TOKENS_COP_REASONING : COST_PER_1M_TOKENS_COP_FAST;
    return ((inputTokens + outputTokens) / 1000000) * rate;
  }

  private mapError(err: any): AiError {
    const status = err?.status || err?.response?.status;
    if (status === 429) {
      return new AiError('RATE_LIMIT', 'Estamos experimentando alta demanda. Por favor, intenta en un momento.', err);
    }
    if (status === 503) {
      return new AiError('SERVICE_UNAVAILABLE', 'El servicio de IA no está disponible en este momento.', err);
    }
    return new AiError('UNKNOWN', 'Ocurrió un error inesperado al consultar la IA.', err);
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRetryable = error?.status === 429 || error?.status === 503;
        if (!isRetryable || attempt === maxRetries) {
          throw this.mapError(error);
        }
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new AiError('UNKNOWN', 'Fallo después de múltiples reintentos.');
  }

  private getCacheKey(request: AiRequest): string {
    const lastMessage = request.messages[request.messages.length - 1];
    if (request.tools && request.tools.length > 0) return '';
    return `semantic_cache:${Buffer.from(lastMessage.content).toString('base64').substring(0, 50)}`;
  }

  async generate(request: AiRequest): Promise<AiResponse> {
    const cacheKey = this.getCacheKey(request);

    let currentModel = this.resolveModel(request.modelPreference);
    
    const callGemini = async (model: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs || DEFAULT_TIMEOUT_MS);
      
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: request.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
          })),
          config: {
            systemInstruction: request.systemInstruction,
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
            tools: request.tools ? [{ functionDeclarations: request.tools }] : undefined,
          }
        });
        
        clearTimeout(timeoutId);
        
        // Use getter response.text (it's a getter in newer version, not a function)
        let text = '';
        try {
           text = response.text || '';
        } catch(e) {
           // when there are only function calls
           text = '';
        }
        
        const functionCalls = response.functionCalls;
        
        let toolCalls = undefined;
        if (functionCalls && functionCalls.length > 0) {
          toolCalls = functionCalls.map(fc => ({
            name: fc.name,
            args: fc.args as Record<string, any>
          }));
        }

        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

        return {
          text,
          toolCalls,
          inputTokens,
          outputTokens,
          costCop: this.calculateCost(model, inputTokens, outputTokens),
          model
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const result = await this.retryWithBackoff(() => callGemini(currentModel));
      return result;
    } catch (error: any) {
      if (currentModel === REASONING_MODEL) {
        console.warn('Reasoning model failed, falling back to fast model', error);
        currentModel = this.resolveModel('FAST');
        return await this.retryWithBackoff(() => callGemini(currentModel));
      }
      throw error;
    }
  }

  async generateStream(request: AiRequest): Promise<AiStreamResponse> {
    const currentModel = this.resolveModel(request.modelPreference);
    
    const stream = await this.ai.models.generateContentStream({
      model: currentModel,
      contents: request.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
        tools: request.tools ? [{ functionDeclarations: request.tools }] : undefined,
      }
    });

    async function* makeAsyncIterable() {
      for await (const chunk of stream) {
        const functionCalls = chunk.functionCalls;
        let toolCalls = undefined;
        if (functionCalls && functionCalls.length > 0) {
          toolCalls = functionCalls.map(fc => ({
            name: fc.name,
            args: fc.args as Record<string, any>
          }));
        }
        
        let textChunk = '';
        try {
          textChunk = chunk.text || '';
        } catch(e) {}
        
        yield {
          textChunk,
          isFinished: false,
          toolCalls
        };
      }
    }

    return { stream: makeAsyncIterable() };
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: texts
        });
        if (response.embeddings) {
            return response.embeddings.map(e => e.values);
        }
      } catch(e) {
        console.warn("Embedding error mock handled");
      }
      return [];
    });
  }

  async countTokens(request: AiRequest): Promise<number> {
    const model = this.resolveModel(request.modelPreference);
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.ai.models.countTokens({
          model,
          contents: request.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
          }))
        });
        return response.totalTokens || 0;
      } catch (e) {
        return 0;
      }
    });
  }
}
