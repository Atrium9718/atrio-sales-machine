import { RoutingStrategy } from '@prisma/client';
import { PresenceService } from '../realtime/presence';
import { RoutingEvents } from './events';

export interface RouteParams {
  conversationId: string;
  clientId: string;
  channelId: string;
  assignedAgentId?: string; // previous agent
  accountOwnerId?: string; // CRM owner
  tags?: string[];
}

export interface RoutingRuleCondition {
  strategy: RoutingStrategy;
  targetUserIds: string[];
  fallbackUserId?: string;
}

export const RoutingEngine = {
  // BLOQUE B - MOTOR DE ENRUTAMIENTO
  async routeConversation(params: RouteParams, rules: RoutingRuleCondition[]) {
    console.log(`[Routing] Routing conversation ${params.conversationId}`);

    for (const rule of rules) {
      if (rule.strategy === 'STICKY_LAST_AGENT' && params.assignedAgentId) {
         const isAvailable = await this.isAgentAvailable(params.assignedAgentId);
         if (isAvailable) {
            console.log(`[Routing] Sticky agent routed to ${params.assignedAgentId}`);
            RoutingEvents.emit('conversacion.enrutada', { conversationId: params.conversationId, agentId: params.assignedAgentId, strategy: 'STICKY_LAST_AGENT' });
            return params.assignedAgentId;
         }
      }

      if (rule.strategy === 'ACCOUNT_OWNER' && params.accountOwnerId) {
         const isAvailable = await this.isAgentAvailable(params.accountOwnerId);
         if (isAvailable) {
            console.log(`[Routing] Account owner routed to ${params.accountOwnerId}`);
            RoutingEvents.emit('conversacion.enrutada', { conversationId: params.conversationId, agentId: params.accountOwnerId, strategy: 'ACCOUNT_OWNER' });
            return params.accountOwnerId;
         }
      }

      if (rule.strategy === 'LEAST_BUSY' || rule.strategy === 'ROUND_ROBIN') {
         let bestAgent = null;
         let minLoad = Infinity;

         for (const agentId of rule.targetUserIds) {
           const isAvailable = await this.isAgentAvailable(agentId);
           if (!isAvailable) continue;

           const load = await this.getAgentLoad(agentId); 
           const capacity = await this.getAgentCapacity(agentId);

           if (load < capacity && load < minLoad) {
             minLoad = load;
             bestAgent = agentId;
           }
         }

         if (bestAgent) {
           console.log(`[Routing] Least busy / round robin routed to ${bestAgent}`);
           RoutingEvents.emit('conversacion.enrutada', { conversationId: params.conversationId, agentId: bestAgent, strategy: rule.strategy });
           return bestAgent;
         } else if (rule.fallbackUserId && await this.isAgentAvailable(rule.fallbackUserId)) {
           RoutingEvents.emit('conversacion.enrutada', { conversationId: params.conversationId, agentId: rule.fallbackUserId, strategy: 'FALLBACK' });
           return rule.fallbackUserId;
         }
      }
    }

    // Unassigned (Cola general)
    console.log(`[Routing] No agent available. Sending to general queue.`);
    RoutingEvents.emit('conversacion.sin_agente_disponible', { conversationId: params.conversationId });
    return null;
  },

  async isAgentAvailable(agentId: string): Promise<boolean> {
     const onShift = true; // Mock: check AgentShift validFrom / validTo vs current time
     if (!onShift) return false;

     const status = await PresenceService.getAgentStatus(agentId);
     if (status === 'AUSENTE' || status === 'FUERA_DE_TURNO') {
        return false;
     }

     return true;
  },

  async getAgentLoad(agentId: string): Promise<number> {
     return Math.floor(Math.random() * 3);
  },

  async getAgentCapacity(agentId: string): Promise<number> {
     return 5;
  }
};
