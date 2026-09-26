import Redis from 'ioredis';
import {
  UserCallNotification,
  UserCallNotificationSchema,
  QueueStateNotification,
  QueueStateNotificationSchema,
  OrgSupervisorNotification,
  OrgSupervisorNotificationSchema,
} from '@fusion/contracts/voice';
import { telemetry } from '../telemetry';

class VoiceBroadcastService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          return Math.min(times * 200, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        telemetry.log('INFO', 'Conexión a Redis para difusión de voz establecida.');
      });

      this.redis.on('error', (err) => {
        this.isConnected = false;
        telemetry.log('WARN', `Redis difusión no disponible temporalmente: ${err.message}`);
      });
    } catch (e: any) {
      this.isConnected = false;
    }
  }

  /**
   * Difunde un evento al canal privado de un usuario específico: voice:user:{userId}
   * Solo envía lo que ese usuario tiene autorización de ver.
   */
  public async publishToUser(userId: string, notification: UserCallNotification): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      // Validar esquema de contrato Zod antes de emitir
      const validData = UserCallNotificationSchema.parse(notification);
      const channel = `voice:user:${userId}`;
      await this.redis.publish(channel, JSON.stringify(validData));
    } catch (err: any) {
      telemetry.log('ERROR', `Error publicando a ${userId}: ${err.message}`);
    }
  }

  /**
   * Difunde el estado de una cola a sus agentes y supervisores: voice:queue:{queueId}
   */
  public async publishToQueue(queueId: string, notification: QueueStateNotification): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      const validData = QueueStateNotificationSchema.parse(notification);
      const channel = `voice:queue:${queueId}`;
      await this.redis.publish(channel, JSON.stringify(validData));
    } catch (err: any) {
      telemetry.log('ERROR', `Error publicando a cola ${queueId}: ${err.message}`);
    }
  }

  /**
   * Difunde métricas y eventos en vivo al panel de supervisores de la organización: voice:org:{orgId}
   */
  public async publishToOrg(orgId: string, notification: OrgSupervisorNotification): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      const validData = OrgSupervisorNotificationSchema.parse(notification);
      const channel = `voice:org:${orgId}`;
      await this.redis.publish(channel, JSON.stringify(validData));
    } catch (err: any) {
      telemetry.log('ERROR', `Error publicando a org ${orgId}: ${err.message}`);
    }
  }

  public getStatus(): { connected: boolean } {
    return { connected: this.isConnected };
  }
}

export const broadcaster = new VoiceBroadcastService();
