export type NotificationRule = 'ALL' | 'MINE' | 'MENTIONS' | 'NONE';

export const NotificationService = {
  // Configurable per user in DB
  async getUserRule(agentId: string): Promise<NotificationRule> {
    return 'ALL'; 
  },

  async isUserOffShift(agentId: string): Promise<boolean> {
    return false;
  },

  // Agrupación: Manejado en Redis para contar mensajes no leídos por conversación
  async getUnreadCountForPush(conversationId: string): Promise<number> {
    return 5; // Mock
  },

  async sendWebPush(agentId: string, title: string, body: string, type: 'MESSAGE' | 'MENTION' | 'SLA_RISK', conversationId?: string) {
    const isOffShift = await this.isUserOffShift(agentId);
    if (isOffShift) return; // Nada mientras esté fuera de turno

    const rule = await this.getUserRule(agentId);
    if (rule === 'NONE') return;
    
    // Evaluate rules
    if (type === 'MENTION') {
      // Mención en nota interna siempre notifica
    } else if (type === 'MESSAGE' && rule === 'MENTIONS') {
      return;
    }

    // Agrupación (5 mensajes = 1 notificación)
    if (type === 'MESSAGE' && conversationId) {
      const count = await this.getUnreadCountForPush(conversationId);
      if (count > 1) {
        body = `(${count} mensajes nuevos) ${body}`;
      }
    }

    // Sonidos distintos por tipo
    const sound = type === 'MESSAGE' ? 'new_message.mp3' : type === 'MENTION' ? 'mention.mp3' : 'sla_risk.mp3';

    // In a real implementation this uses web-push VAPID payload to ServiceWorker
    const vapidPayload = {
      title,
      body,
      sound,
      icon: '/icon.png'
    };

    console.log(`[WebPush VAPID to ${agentId}] Payload:`, vapidPayload);
  },

  // Escalamiento por ausencia
  async checkAndEscalate(conversationId: string, assignedAgentId: string) {
    // Si la conversación no se ha abierto en X minutos (Redis check)
    console.log(`[Escalation] Conversation ${conversationId} unassigned for too long. Notifying supervisor.`);
    
    // Se devuelve a la cola y se notifica
    await this.sendWebPush('supervisor_id', 'Escalamiento Automático', `La conversación ${conversationId} no fue atendida a tiempo`, 'SLA_RISK');
  }
};
