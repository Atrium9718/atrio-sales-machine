import { NotificationService } from '../realtime/notifications';
import { RoutingEvents } from './events';

// BLOQUE D - ESCALAMIENTO EN CASCADA
export const EscalationService = {
  // Se ejecutaría vía Cron/Worker cada minuto
  async evaluateSLARisk(conversationId: string, assignedAgentId: string | null, elapsedMinutes: number, targetMinutes: number, isVip: boolean = false) {
    const ratio = elapsedMinutes / targetMinutes;
    
    // Los umbrales bajan un nivel si es VIP (ej: VIP avisa al 50% en vez de 75%)
    const thresholdWarning = isVip ? 0.5 : 0.75;
    const thresholdBreach = isVip ? 0.75 : 1.0;
    const thresholdCritical = isVip ? 1.0 : 1.5;

    if (ratio >= thresholdCritical) {
       // 150%: Reasignación automática y notificar gerencia
       console.log(`[Escalation] Critical SLA breach on conv ${conversationId} (Ratio: ${ratio}). Reassigning...`);
       RoutingEvents.emit('escalamiento.ejecutado', { conversationId, level: 'CRITICAL', assignedAgentId });
       await NotificationService.sendWebPush('gerencia', 'SLA Crítico', `Reasignando converesación ${conversationId}`, 'SLA_RISK');
    } 
    else if (ratio >= thresholdBreach) {
       // 100%: SLA Vencido, notificar supervisor
       console.log(`[Escalation] SLA Breach on conv ${conversationId}. Notifying supervisor.`);
       RoutingEvents.emit('sla.incumplido', { conversationId, assignedAgentId });
       await NotificationService.sendWebPush('supervisor', 'SLA Incumplido', `Conversación ${conversationId} vencida`, 'SLA_RISK');
    }
    else if (ratio >= thresholdWarning && assignedAgentId) {
       // 75%: Riesgo, avisar al agente
       console.log(`[Escalation] SLA at risk on conv ${conversationId}. Notifying agent ${assignedAgentId}.`);
       RoutingEvents.emit('sla.en_riesgo', { conversationId, assignedAgentId });
       await NotificationService.sendWebPush(assignedAgentId, 'SLA en Riesgo', `Conversación ${conversationId} por vencer`, 'SLA_RISK', conversationId);
    }
  }
};
