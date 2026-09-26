import { PrismaClient } from '@prisma/client';
import { emitAIEvent } from './events';

const prisma = new PrismaClient();

export class SecurityMiddleware {
  static checkPromptInjection(input: string): boolean {
    const dangerousPatterns = [
      /ignore previous instructions/i,
      /olvida las instrucciones/i,
      /you are now a/i,
      /system prompt/i
    ];
    return dangerousPatterns.some(p => p.test(input));
  }

  static checkDataIsolation(agentDomain: string, userPermissions: string[], requestedAction: string): boolean {
    if (requestedAction === 'read_costs' && !userPermissions.includes('cost:read')) {
      return false;
    }
    return true;
  }
  
  static redactPII(output: string): string {
    // Basic redaction of emails and phones
    return output
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      .replace(/\+?\d{1,3}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  }

  static async enforceBudget(organizationId: string): Promise<boolean> {
    const budget = await prisma.aiBudget.findUnique({
      where: { organizationId }
    });
    
    if (!budget) return true; // No budget set, assume safe

    const percent = Number(budget.currentMonthSpend) / Number(budget.monthlyBudgetCop);
    if (percent >= 0.7 && !budget.alertAt70Sent) {
      emitAIEvent('ia.presupuesto_70', { organizationId, currentSpend: Number(budget.currentMonthSpend), limit: Number(budget.monthlyBudgetCop) });
      await prisma.aiBudget.update({ where: { id: budget.id }, data: { alertAt70Sent: true } });
    }
    if (percent >= 0.9 && !budget.alertAt90Sent) {
      emitAIEvent('ia.presupuesto_90', { organizationId, currentSpend: Number(budget.currentMonthSpend), limit: Number(budget.monthlyBudgetCop) });
      await prisma.aiBudget.update({ where: { id: budget.id }, data: { alertAt90Sent: true } });
    }
    if (percent >= 1) {
      if (!budget.exhaustedAlertSent) {
        emitAIEvent('ia.presupuesto_agotado', { organizationId, currentSpend: Number(budget.currentMonthSpend), limit: Number(budget.monthlyBudgetCop) });
        await prisma.aiBudget.update({ where: { id: budget.id }, data: { exhaustedAlertSent: true } });
      }
      return false; // Budget exhausted
    }
    return true;
  }
}
