import { PrismaClient } from '@prisma/client';
import { AiProvider, AiRequest, AiModelPreference } from './types';
import { GeminiProvider } from './GeminiProvider';
import { globalToolCatalog } from './ToolCatalog';
import { SecurityMiddleware } from './security';
import { emitAIEvent } from './events';
import { AgentMemoryService } from './AgentMemoryService';
import { SemanticRetrieval } from './SemanticRetrieval';

const MAX_ITERATIONS = 8;
const MAX_DEPTH = 2;

export interface OrchestratorContext {
  organizationId: string;
  userId: string;
  conversationId?: string;
  depth?: number;
  trigger: 'USER_MESSAGE' | 'EVENT' | 'SCHEDULE' | 'ANOTHER_AGENT' | 'MANUAL';
  triggerRef?: string;
}

export class AgentOrchestrator {
  private memoryService: AgentMemoryService;
  private semanticRetrieval: SemanticRetrieval;

  constructor(
    private prisma: PrismaClient,
    private aiProvider: AiProvider = new GeminiProvider()
  ) {
    this.memoryService = new AgentMemoryService(prisma, aiProvider);
    this.semanticRetrieval = new SemanticRetrieval(prisma, aiProvider);
  }
  
  async runAgent(agentKey: string, input: string, context: OrchestratorContext): Promise<{ text: string, runId: string, escalated?: boolean }> {
    const depth = context.depth || 0;
    if (depth > MAX_DEPTH) {
      throw new Error(`Max agent delegation depth exceeded (${MAX_DEPTH})`);
    }

    const agent = await this.prisma.agent.findUnique({ where: { key: agentKey } });
    
    if (SecurityMiddleware.checkPromptInjection(input)) {
        emitAIEvent('ia.inyeccion_detectada', { 
            userId: context.userId, 
            input: input, 
            agentKey: agent?.key || agentKey 
        });
        throw new Error('SECURITY_VIOLATION: Prompt injection detected');
    }
    
    const isBudgetSafe = await SecurityMiddleware.enforceBudget(context.organizationId);
    if (!isBudgetSafe && agent?.key !== 'servicio') {
        throw new Error('BUDGET_EXHAUSTED: Agent execution blocked due to budget limits.');
    }

    if (!agent || !agent.isActive) {
      throw new Error(`Agent ${agentKey} not found or inactive`);
    }

    const promptVersion = await this.prisma.agentPromptVersion.findFirst({
      where: { agentId: agent.id, version: agent.promptVersion }
    });
    const systemPrompt = promptVersion?.systemPrompt || agent.systemPrompt;

    const memories = await this.memoryService.searchMemories(context.organizationId, agent.id, input, 5);
    const memoryContext = memories.map(m => `- ${JSON.stringify(m.value)} (Confianza: ${m.confidence})`).join('\n');

    // BLOCK F & D: Retrieve semantic context IF it's not a highly volatile query that requires tools.
    // If it requires tools, we still provide basic semantic context but rely heavily on tools for numbers.
    let retrievedContext = "";
    const needsFresh = this.semanticRetrieval.requiresFreshContext(input);
    if (needsFresh) {
      retrievedContext = "NOTA: La consulta involucra datos altamente variables (stock, estado, etc.). El agente DEBE usar herramientas para obtener la información más reciente.";
    } else {
      retrievedContext = await this.semanticRetrieval.retrieveContext(context.organizationId, input);
    }

    const run = await this.prisma.agentRun.create({
      data: {
        organizationId: context.organizationId,
        agentId: agent.id,
        promptVersion: agent.promptVersion,
        trigger: context.trigger,
        triggerRef: context.triggerRef,
        userId: context.userId,
        conversationId: context.conversationId,
        input: { text: input },
        status: 'PARTIAL',
      }
    });

    const messages: Array<{ role: 'user' | 'model', content: string }> = [];

    const fullSystemInstruction = `
      ${systemPrompt}
      
      === MEMORIA CORPORATIVA Y DE ENTIDAD ===
      ${memoryContext}
      
      === CONTEXTO SEMÁNTICO Y DE CONOCIMIENTO ===
      ${retrievedContext}
      
      === REGLAS ESTRICTAS (BLOQUE F) ===
      - Lo que CAMBIA (stock, capacidad, estado de proyecto, saldo) se consulta SIEMPRE con herramientas. NO te fies de memoria.
      - NUNCA reveles costos internos, márgenes, precios de proveedor ni datos de otro cliente.
      - NUNCA prometas fechas o descuentos que el sistema no haya confirmado.
      - TODO cálculo numérico debe provenir de herramientas.
    `.trim();

    messages.push({ role: 'user', content: input });

    let iterations = 0;
    let finalOutput = '';
    const executedToolCalls: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostCop = 0;
    let currentModel = '';
    let escalated = false;
    
    const tools = globalToolCatalog.toGeminiDeclarations(agent.allowedToolKeys);

    const toolContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      agentId: agent.id,
      runId: run.id,
      can: async (perm: string) => true
    };

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      try {
        const request: AiRequest = {
          systemInstruction: fullSystemInstruction,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          modelPreference: agent.modelPreference as AiModelPreference,
          temperature: Number(agent.temperature),
          maxOutputTokens: agent.maxOutputTokens
        };

        const response = await this.aiProvider.generate(request);
        
        totalInputTokens += response.inputTokens;
        totalOutputTokens += response.outputTokens;
        totalCostCop += response.costCop;
        currentModel = response.model;

        if (response.text) {
          messages.push({ role: 'model', content: response.text });
          finalOutput += response.text + '\n';
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
          let toolResultsCombined = '';
          for (const tc of response.toolCalls) {
            const toolDef = globalToolCatalog.get(tc.name);
            let result;
            const start = Date.now();
            try {
              if (!toolDef) throw new Error(`Tool ${tc.name} not found`);
              result = await toolDef.execute(tc.args, toolContext);
              if (result?.escalated) {
                escalated = true;
              }
            } catch (err: any) {
              result = { error: err.message };
            }
            
            const duration = Date.now() - start;
            executedToolCalls.push({ tool: tc.name, args: tc.args, result, duration });
            toolResultsCombined += `[Tool Result: ${tc.name}]\n${JSON.stringify(result)}\n\n`;
          }
          
          messages.push({ role: 'user', content: `Resultados de herramientas:\n${toolResultsCombined}` });
          
          if (escalated) {
             finalOutput += "\n(La conversación ha sido escalada a un agente humano)";
             break;
          }
          
          continue;
        }
        
        break;

      } catch (err: any) {
        await this.prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: err.code === 'BUDGET_EXCEEDED' ? 'BUDGET_BLOCKED' : 'FAILED',
            errorDetail: err.message || JSON.stringify(err)
          }
        });
        throw err;
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(`Agent run ${run.id} hit max iterations (${MAX_ITERATIONS})`);
    }

    await this.prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { text: finalOutput.trim() },
        toolCalls: executedToolCalls,
        model: currentModel,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costCop: totalCostCop,
      }
    });

    return { text: finalOutput.trim(), runId: run.id, escalated };
  }
}
