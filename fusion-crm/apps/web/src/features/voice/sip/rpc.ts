import { SoftphoneCredentials } from '@fusion/contracts';

/**
 * Cliente RPC y API para voz y softphone (Etapa 17.4).
 * Centraliza la obtención de credenciales efímeras y el control de llamadas en el servidor.
 */
export const voiceRpc = {
  softphone: {
    /**
     * Solicita credenciales efímeras para registrar el softphone SIP.
     * Exige sesión válida y permiso voice:use.
     * NUNCA almacena la contraseña en localStorage ni sessionStorage.
     */
    async getCredentials(userId?: string): Promise<{ success: boolean; credentials: SoftphoneCredentials; error?: string }> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const res = await fetch('/api/voice/softphone/credentials', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `HTTP ${res.status}: Fallo al solicitar credenciales de softphone`;
        const err: any = new Error(errMsg);
        err.status = res.status;
        err.code = errData.code;
        throw err;
      }

      return res.json();
    },
  },

  agentStatus: {
    async get(): Promise<{ status: string; reason?: string | null }> {
      const res = await fetch('/api/voice/agent-status');
      if (!res.ok) throw new Error('Error al obtener estado de agente');
      const data = await res.json();
      return data.agentStatus;
    },

    async set(status: string, reason?: string): Promise<any> {
      const res = await fetch('/api/voice/agent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado de agente');
      return res.json();
    },

    async getDirectory(): Promise<any[]> {
      const res = await fetch('/api/voice/agents/directory');
      if (!res.ok) return [];
      const data = await res.json();
      return data.agents || [];
    },
  },

  queues: {
    async getStatus(): Promise<any[]> {
      const res = await fetch('/api/voice/queues/status');
      if (!res.ok) return [];
      const data = await res.json();
      return data.queues || [];
    },
  },

  voicemail: {
    async getUnreadCount(): Promise<number> {
      const res = await fetch('/api/voice/voicemail/unread-count');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.unreadCount || 0;
    },

    async getMessages(): Promise<any[]> {
      const res = await fetch('/api/voice/voicemail/messages');
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages || [];
    },
  },

  calls: {
    async saveNotes(callId: string, notes: string): Promise<void> {
      await fetch(`/api/voice/calls/${callId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    },

    async hold(callId: string): Promise<void> {
      await fetch(`/api/voice/calls/${callId}/hold`, { method: 'POST' });
    },

    async resume(callId: string): Promise<void> {
      await fetch(`/api/voice/calls/${callId}/resume`, { method: 'POST' });
    },

    async transfer(callId: string, target: string, type: 'BLIND' | 'ATTENDED' = 'BLIND'): Promise<any> {
      const res = await fetch(`/api/voice/calls/${callId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type }),
      });
      return res.json();
    },

    async pauseRecording(callId: string): Promise<void> {
      await fetch(`/api/voice/calls/${callId}/recording/pause`, { method: 'POST' });
    },

    async resumeRecording(callId: string): Promise<void> {
      await fetch(`/api/voice/calls/${callId}/recording/resume`, { method: 'POST' });
    },
  },

  contacts: {
    async search(query: string): Promise<any[]> {
      const res = await fetch(`/api/voice/search-contacts?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    },
  },

  mobile: {
    async getConfig(): Promise<any> {
      const res = await fetch('/api/voice/mobile-config');
      if (!res.ok) throw new Error('Error al obtener configuración móvil');
      const data = await res.json();
      return data.config;
    },

    async revealPassword(): Promise<{ extension: string; username: string; password: string }> {
      const res = await fetch('/api/voice/mobile-config/reveal', { method: 'POST' });
      if (!res.ok) throw new Error('Error al descifrar credenciales');
      return res.json();
    },

    async updateForwarding(mobileNumber: string, ringStrategy: string): Promise<any> {
      const res = await fetch('/api/voice/mobile-forwarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, ringStrategy }),
      });
      return res.json();
    },
  },
};
