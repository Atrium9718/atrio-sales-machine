import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();
import { emitAIEvent } from './events';

export async function runEvaluation(agentKey: string, promptVersion: number) {
  const cases = await prisma.evalCase.findMany({
    where: { agentKey, isActive: true }
  });
  
  if (cases.length === 0) return null;

  let passed = 0;
  let failed = 0;
  const failedCaseIds = [];
  
  const startTime = Date.now();
  let totalCostCop = 0;
  
  for (const c of cases) {
    // In a real system we would actually invoke the agent here
    // const result = await runAgent(agentKey, c.input, 'SYSTEM_EVAL');
    
    // For demonstration, mock evaluation
    const isSuccess = Math.random() > (c.severity === 'CRITICAL' ? 0.05 : 0.1); 
    
    if (isSuccess) {
      passed++;
    } else {
      failed++;
      failedCaseIds.push(c.id);
    }
    
    totalCostCop += 15; // Mock cost per run
  }
  
  const durationMs = Date.now() - startTime;
  const score = (passed / cases.length) * 100;
  
  const run = await prisma.evalRun.create({
    data: {
      organizationId: cases[0].organizationId,
      agentKey,
      promptVersion,
      totalCases: cases.length,
      passed,
      failed,
      score,
      failedCaseIds,
      costCop: totalCostCop,
      durationMs,
      triggeredBy: 'SYSTEM_EVAL'
    }
  });
  
  const criticalFails = cases.filter(c => failedCaseIds.includes(c.id) && c.severity === 'CRITICAL');
  
  if (criticalFails.length > 0) {
    // Blocking condition triggered!
    console.warn(`[EVAL] Agent ${agentKey} failed ${criticalFails.length} CRITICAL cases. Prompt activation BLOCKED.`);
    emitAIEvent('evaluacion.fallo_critico', { agentKey, version: promptVersion, failedCases: failedCaseIds });
    return { run, blocked: true, criticalFails };
  }
  
  emitAIEvent('evaluacion.ejecutada', { agentKey, version: promptVersion, score });
  return { run, blocked: false };
}
