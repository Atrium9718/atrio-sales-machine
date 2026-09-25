export type AiModelPreference = 'FAST' | 'REASONING' | 'AUTO';

export interface AiRequest {
  systemInstruction?: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  tools?: any[];
  modelPreference?: AiModelPreference;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AiResponse {
  text: string;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  inputTokens: number;
  outputTokens: number;
  costCop: number;
  model: string;
}

export interface AiStreamResponse {
  stream: AsyncIterable<{
    textChunk: string;
    isFinished: boolean;
    toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  }>;
}

export interface AiProvider {
  generate(request: AiRequest): Promise<AiResponse>;
  generateStream(request: AiRequest): Promise<AiStreamResponse>;
  embed(texts: string[]): Promise<number[][]>;
  countTokens(request: AiRequest): Promise<number>;
}

export class AiError extends Error {
  constructor(
    public readonly code: 'RATE_LIMIT' | 'SERVICE_UNAVAILABLE' | 'BUDGET_EXCEEDED' | 'VALIDATION_FAILED' | 'UNKNOWN',
    public readonly userMessage: string,
    public readonly originalError?: any
  ) {
    super(userMessage);
    this.name = 'AiError';
  }
}
