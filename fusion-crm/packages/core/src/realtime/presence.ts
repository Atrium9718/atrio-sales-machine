export type AgentStatus = 'DISPONIBLE' | 'OCUPADO' | 'AUSENTE' | 'FUERA_DE_TURNO';

// Polyfill for Redis in AI Studio environment
class MockRedis {
  private store = new Map<string, { value: any, expiresAt?: number }>();

  async setex(key: string, seconds: number, value: string) {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
  }

  async get(key: string) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async scanKeys(prefix: string) {
    const keys = [];
    for (const [k, item] of this.store.entries()) {
      if (k.startsWith(prefix)) {
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.store.delete(k);
        } else {
          keys.push(k);
        }
      }
    }
    return keys;
  }
}

const redis = new MockRedis();

export const PresenceService = {
  async updateAgentStatus(agentId: string, status: AgentStatus) {
    // Latido cada 30s, expira a los 90s (BLOQUE A)
    await redis.setex(`agent_status:${agentId}`, 90, status);
  },

  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    return (await redis.get(`agent_status:${agentId}`)) as AgentStatus | null;
  },

  async openConversation(agentId: string, conversationId: string) {
    // Bloqueo suave de 2 minutos
    await redis.setex(`conv_open:${conversationId}:${agentId}`, 120, 'VIEWING');
  },

  async closeConversation(agentId: string, conversationId: string) {
    await redis.del(`conv_open:${conversationId}:${agentId}`);
    await redis.del(`conv_typing:${conversationId}:${agentId}`);
  },

  async typingConversation(agentId: string, conversationId: string) {
    // Renueva el bloqueo mientras escribe
    await redis.setex(`conv_open:${conversationId}:${agentId}`, 120, 'VIEWING');
    await redis.setex(`conv_typing:${conversationId}:${agentId}`, 10, 'TYPING');
  },

  async getConversationViewers(conversationId: string): Promise<string[]> {
    const keys = await redis.scanKeys(`conv_open:${conversationId}:`);
    return keys.map(k => k.split(':')[2]);
  },
  
  async getConversationTypers(conversationId: string): Promise<string[]> {
    const keys = await redis.scanKeys(`conv_typing:${conversationId}:`);
    return keys.map(k => k.split(':')[2]);
  }
};
