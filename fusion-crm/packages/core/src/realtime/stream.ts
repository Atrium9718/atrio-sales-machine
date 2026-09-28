/**
 * Gestor de Canal de Tiempo Real Unificado por Server-Sent Events (SSE) (Etapa 15.5)
 * Multiplexa: Chat, Presencia, Indicadores de Escritura, Anuncios, Notificaciones y Kanban
 */

import { Response, Request } from 'express';
import { EventEmitter } from 'events';
import { RealtimeEvent, PresenceStatus } from '../chat/types';

export interface SSEConnection {
  id: string;
  userId: string;
  userRole?: string;
  organizationId: string;
  res: Response;
  connectedAt: Date;
  lastPingAt: Date;
}

export interface StreamManagerOptions {
  maxConnectionsPerUser?: number;
  bufferSize?: number;
  heartbeatIntervalMs?: number;
  channelMembershipResolver?: (channelId: string, userId: string) => Promise<boolean> | boolean;
}

export class RealtimeStreamManager {
  private connections = new Map<string, Set<SSEConnection>>(); // userId -> Set<SSEConnection>
  private eventBuffer: RealtimeEvent[] = []; // Buffer circular para reconexión sin huecos
  private currentEventId = 0;
  private maxConnectionsPerUser: number;
  private bufferSize: number;
  private heartbeatIntervalMs: number;
  private heartbeatTimer?: NodeJS.Timeout;
  private eventBus = new EventEmitter();
  private typingMap = new Map<string, { userId: string; userName: string; expiresAt: number }>();
  private channelMembershipResolver?: (channelId: string, userId: string) => Promise<boolean> | boolean;

  constructor(options: StreamManagerOptions = {}) {
    this.maxConnectionsPerUser = options.maxConnectionsPerUser || 5;
    this.bufferSize = options.bufferSize || 2000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 25000; // 25s obligatorio para Traefik/proxies
    this.channelMembershipResolver = options.channelMembershipResolver;

    this.startHeartbeat();
  }

  public setMembershipResolver(resolver: (channelId: string, userId: string) => Promise<boolean> | boolean) {
    this.channelMembershipResolver = resolver;
  }

  /**
   * Registra una nueva conexión SSE para un usuario
   */
  public async handleConnection(
    req: Request,
    res: Response,
    userId: string,
    organizationId: string,
    userRole = 'comercial'
  ): Promise<SSEConnection> {
    // Configurar cabeceras obligatorias para SSE
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Para Nginx / Traefik
      });
      res.flushHeaders?.();
    }

    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const conn: SSEConnection = {
      id: connectionId,
      userId,
      userRole,
      organizationId,
      res,
      connectedAt: new Date(),
      lastPingAt: new Date(),
    };

    // Control de conexiones máximas por usuario (cierra la más antigua si supera el límite)
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    const userConns = this.connections.get(userId)!;

    if (userConns.size >= this.maxConnectionsPerUser) {
      const oldest = Array.from(userConns)[0];
      try {
        oldest.res.write('event: superseded\ndata: {"message":"Nueva sesión iniciada"}\n\n');
        oldest.res.end();
      } catch {
        // Ignorar si ya estaba cerrada
      }
      userConns.delete(oldest);
    }

    userConns.add(conn);

    // Saludo inicial y sincronización
    this.writeEvent(conn, {
      id: String(this.currentEventId),
      timestamp: new Date().toISOString(),
      type: 'ping',
      organizationId,
      payload: { status: 'connected', connectionId, serverTime: new Date().toISOString() },
    });

    // RECONEXIÓN SIN HUECOS:
    // Leer Last-Event-ID de la cabecera o query string
    const lastEventIdHeader = req.headers['last-event-id'] || req.query.lastEventId;
    if (lastEventIdHeader && typeof lastEventIdHeader === 'string') {
      const lastIdNum = parseInt(lastEventIdHeader, 10);
      if (!isNaN(lastIdNum)) {
        await this.replayMissedEvents(conn, lastIdNum);
      }
    }

    // Cierre limpio al desconectar la pestaña o cliente
    req.on('close', () => {
      this.removeConnection(conn);
    });

    return conn;
  }

  /**
   * Remueve una conexión cerrada
   */
  public removeConnection(conn: SSEConnection) {
    const userConns = this.connections.get(conn.userId);
    if (userConns) {
      userConns.delete(conn);
      if (userConns.size === 0) {
        this.connections.delete(conn.userId);
      }
    }
  }

  /**
   * Publica y difunde un evento a todos los suscriptores autorizados
   */
  public async publish(
    event: Omit<RealtimeEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<RealtimeEvent> {
    this.currentEventId++;
    const fullEvent: RealtimeEvent = {
      id: String(this.currentEventId),
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Guardar en buffer circular para replay en reconexión
    this.eventBuffer.push(fullEvent);
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.shift();
    }

    // Difundir a las conexiones activas
    for (const [userId, userConns] of this.connections.entries()) {
      // Filtrar destinatarios específicos si aplica
      if (fullEvent.targetUserIds && fullEvent.targetUserIds.length > 0) {
        if (!fullEvent.targetUserIds.includes(userId)) {
          continue;
        }
      }
      if (fullEvent.skipUserIds && fullEvent.skipUserIds.includes(userId)) {
        continue;
      }

      // Verificación de seguridad para canales privados / directos
      if (fullEvent.channelId && this.channelMembershipResolver) {
        const hasAccess = await this.channelMembershipResolver(fullEvent.channelId, userId);
        if (!hasAccess) {
          continue;
        }
      }

      // Enviar a todas las pestañas activas del usuario
      for (const conn of userConns) {
        if (conn.organizationId === fullEvent.organizationId) {
          this.writeEvent(conn, fullEvent);
        }
      }
    }

    this.eventBus.emit('event', fullEvent);
    return fullEvent;
  }

  /**
   * Reenvía eventos perdidos durante una desconexión (Reconexión sin huecos)
   */
  public async replayMissedEvents(conn: SSEConnection, lastEventId: number) {
    const missedEvents = this.eventBuffer.filter((e) => {
      const eId = parseInt(e.id, 10);
      return !isNaN(eId) && eId > lastEventId && e.organizationId === conn.organizationId;
    });

    for (const event of missedEvents) {
      if (event.targetUserIds && event.targetUserIds.length > 0) {
        if (!event.targetUserIds.includes(conn.userId)) continue;
      }
      if (event.skipUserIds && event.skipUserIds.includes(conn.userId)) {
        continue;
      }

      // Verificación de seguridad de canal
      if (event.channelId && this.channelMembershipResolver) {
        const hasAccess = await this.channelMembershipResolver(event.channelId, conn.userId);
        if (!hasAccess) continue;
      }

      this.writeEvent(conn, event);
    }
  }

  /**
   * Escribe un evento en el formato estándar de Server-Sent Events
   */
  private writeEvent(conn: SSEConnection, event: RealtimeEvent) {
    try {
      const payloadString = JSON.stringify(event.payload);
      conn.res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${payloadString}\n\n`);
    } catch {
      this.removeConnection(conn);
    }
  }

  /**
   * Inicia el latido cada 25 segundos para mantener las conexiones abiertas
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      for (const [userId, userConns] of this.connections.entries()) {
        for (const conn of userConns) {
          try {
            // Latido en formato de comentario SSE ':keep-alive' y evento ping
            conn.res.write(`:keep-alive ${now.toISOString()}\n\n`);
            conn.lastPingAt = now;
          } catch {
            userConns.delete(conn);
          }
        }
        if (userConns.size === 0) {
          this.connections.delete(userId);
        }
      }
      // Limpiar estados de escritura expirados (> 5 segundos)
      this.cleanupTypingStates();
    }, this.heartbeatIntervalMs);
  }

  /**
   * Registra indicador de escritura con expiración de 5 segundos
   */
  public setTyping(channelId: string, userId: string, userName: string, isTyping: boolean) {
    const key = `${channelId}:${userId}`;
    const now = Date.now();

    if (!isTyping) {
      this.typingMap.delete(key);
      this.publish({
        type: 'chat:typing',
        organizationId: 'org-1',
        channelId,
        skipUserIds: [userId],
        payload: { channelId, userId, userName, isTyping: false },
      });
      return;
    }

    this.typingMap.set(key, {
      userId,
      userName,
      expiresAt: now + 5000, // 5 segundos
    });

    this.publish({
      type: 'chat:typing',
      organizationId: 'org-1',
      channelId,
      skipUserIds: [userId],
      payload: { channelId, userId, userName, isTyping: true },
    });
  }

  public getActiveTypers(channelId: string): string[] {
    const now = Date.now();
    const typers: string[] = [];
    for (const [key, val] of this.typingMap.entries()) {
      if (key.startsWith(`${channelId}:`)) {
        if (val.expiresAt > now) {
          typers.push(val.userName);
        } else {
          this.typingMap.delete(key);
        }
      }
    }
    return typers;
  }

  private cleanupTypingStates() {
    const now = Date.now();
    for (const [key, val] of this.typingMap.entries()) {
      if (val.expiresAt <= now) {
        this.typingMap.delete(key);
      }
    }
  }

  public getActiveUserIds(): string[] {
    return Array.from(this.connections.keys());
  }

  public isUserOnline(userId: string): boolean {
    const conns = this.connections.get(userId);
    return !!conns && conns.size > 0;
  }

  public getConnectionsCount(): number {
    let count = 0;
    for (const conns of this.connections.values()) {
      count += conns.size;
    }
    return count;
  }

  public destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    for (const userConns of this.connections.values()) {
      for (const conn of userConns) {
        try {
          conn.res.end();
        } catch {}
      }
    }
    this.connections.clear();
  }
}

// Instancia singleton para toda la aplicación
export const realtimeStreamManager = new RealtimeStreamManager();
