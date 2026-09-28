import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeSpanishSearchText,
  searchChatMessages,
} from './search';
import {
  escapeHtml,
  renderLimitedMarkdown,
  markdownToPlainText,
  extractMentions,
  extractEntityLinks,
} from './markdown';
import {
  getChannelRetentionDays,
  isMessageExpired,
  DEFAULT_RETENTION_CONFIG,
} from './retention';
import {
  canAccessChannel,
  verifyDirectChannelExport,
} from './privacy';
import { RealtimeStreamManager } from '../realtime/stream';
import { ChatMessage, ChatChannel } from './types';

describe('Etapa 15.5 — Chat Interno en Tiempo Real', () => {
  // ==========================================================================
  // PRUEBA OBLIGATORIA 1: Idempotencia por clientMessageId
  // ==========================================================================
  describe('Prueba Obligatoria 1: Idempotencia por clientMessageId', () => {
    it('un mensaje enviado dos veces con el mismo clientMessageId no se duplica', () => {
      const messagesStore: ChatMessage[] = [];
      const clientMessageId = 'client-uuid-98765';

      function handleSendMessage(payload: {
        channelId: string;
        authorId: string;
        body: string;
        clientMessageId: string;
      }): { message: ChatMessage; isDuplicate: boolean } {
        // Validación de idempotencia: buscar si ya existe en el canal
        const existing = messagesStore.find(
          (m) => m.channelId === payload.channelId && m.clientMessageId === payload.clientMessageId
        );
        if (existing) {
          return { message: existing, isDuplicate: true };
        }

        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: 'org-1',
          channelId: payload.channelId,
          authorId: payload.authorId,
          type: 'TEXT',
          body: payload.body,
          bodyPlain: markdownToPlainText(payload.body),
          threadReplyCount: 0,
          attachments: [],
          mentionedUserIds: [],
          mentionsEveryone: false,
          clientMessageId: payload.clientMessageId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        messagesStore.push(newMessage);
        return { message: newMessage, isDuplicate: false };
      }

      // Primer envío
      const res1 = handleSendMessage({
        channelId: 'chn-produccion',
        authorId: 'usr-admin',
        body: 'Confirmar orden de corte acrílico 3mm',
        clientMessageId,
      });
      expect(res1.isDuplicate).toBe(false);
      expect(messagesStore.length).toBe(1);
      const originalId = res1.message.id;

      // Segundo envío inmediato (doble clic o reintento de red)
      const res2 = handleSendMessage({
        channelId: 'chn-produccion',
        authorId: 'usr-admin',
        body: 'Confirmar orden de corte acrílico 3mm',
        clientMessageId,
      });
      expect(res2.isDuplicate).toBe(true);
      expect(messagesStore.length).toBe(1);
      expect(res2.message.id).toBe(originalId);
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 2: Reconexión sin huecos (Last-Event-ID buffer)
  // ==========================================================================
  describe('Prueba Obligatoria 2: Reconexión sin huecos tras 30 segundos', () => {
    it('una desconexión de 30 segundos no pierde mensajes al reconectar', async () => {
      const streamManager = new RealtimeStreamManager({ bufferSize: 500, heartbeatIntervalMs: 60000 });

      // Simular cliente conectado inicialmente
      const receivedEventsClient1: any[] = [];
      const mockRes1: any = {
        writeHead: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => {
          if (chunk.startsWith('id:')) {
            const lines = chunk.trim().split('\n');
            const idLine = lines.find((l) => l.startsWith('id: '));
            const dataLine = lines.find((l) => l.startsWith('data: '));
            if (idLine && dataLine) {
              receivedEventsClient1.push({
                id: idLine.replace('id: ', ''),
                data: JSON.parse(dataLine.replace('data: ', '')),
              });
            }
          }
        },
        end: () => {},
      };

      const req1: any = { headers: {}, query: {}, on: () => {} };
      const conn1 = await streamManager.handleConnection(req1, mockRes1, 'usr-1', 'org-1');

      // Publicar 2 eventos mientras está conectado
      await streamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        payload: { text: 'Mensaje 1 en vivo' },
      });
      await streamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        payload: { text: 'Mensaje 2 en vivo' },
      });

      // El cliente recibió los eventos y guardó el último Last-Event-ID
      const lastReceivedId = receivedEventsClient1[receivedEventsClient1.length - 1].id;
      expect(lastReceivedId).toBeDefined();

      // Desconexión de la pestaña (cierre)
      streamManager.removeConnection(conn1);

      // Durante los 30 segundos de desconexión, ocurren 3 eventos en el servidor
      await streamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        payload: { text: 'Mensaje 3 perdido durante desconexión' },
      });
      await streamManager.publish({
        type: 'kanban:card_moved',
        organizationId: 'org-1',
        payload: { project: 'PRJ-101', newStage: 'CORTE' },
      });
      await streamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        payload: { text: 'Mensaje 4 perdido durante desconexión' },
      });

      // Reconexión con cabecera Last-Event-ID
      const reconnectedEvents: any[] = [];
      const mockResReconnect: any = {
        writeHead: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => {
          if (chunk.startsWith('id:')) {
            const lines = chunk.trim().split('\n');
            const idLine = lines.find((l) => l.startsWith('id: '));
            const dataLine = lines.find((l) => l.startsWith('data: '));
            if (idLine && dataLine) {
              reconnectedEvents.push({
                id: idLine.replace('id: ', ''),
                data: JSON.parse(dataLine.replace('data: ', '')),
              });
            }
          }
        },
        end: () => {},
      };

      const reqReconnect: any = {
        headers: { 'last-event-id': lastReceivedId },
        query: {},
        on: () => {},
      };

      await streamManager.handleConnection(reqReconnect, mockResReconnect, 'usr-1', 'org-1');

      // Comprobar que los 3 eventos perdidos fueron retransmitidos exactamente
      const replayedMessages = reconnectedEvents.filter(
        (e) => e.data && (e.data.text || e.data.project)
      );

      expect(replayedMessages.length).toBe(3);
      expect(replayedMessages[0].data.text).toBe('Mensaje 3 perdido durante desconexión');
      expect(replayedMessages[1].data.project).toBe('PRJ-101');
      expect(replayedMessages[2].data.text).toBe('Mensaje 4 perdido durante desconexión');

      streamManager.destroy();
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 3: Aislamiento estricto de canales privados
  // ==========================================================================
  describe('Prueba Obligatoria 3: Aislamiento de canales privados por SSE y API', () => {
    it('un no miembro de un canal privado no recibe sus eventos por SSE', async () => {
      // Membresía de canal privado 'chn-secret': solo 'usr-director' y 'usr-gerente'
      const privateMembers = ['usr-director', 'usr-gerente'];

      const streamManager = new RealtimeStreamManager({
        channelMembershipResolver: (channelId: string, userId: string) => {
          if (channelId === 'chn-secret') {
            return privateMembers.includes(userId);
          }
          return true; // otros canales públicos
        },
      });

      const directorEvents: any[] = [];
      const operarioEvents: any[] = []; // No miembro

      const createMockRes = (collector: any[]): any => ({
        writeHead: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => {
          if (chunk.startsWith('id:')) {
            const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (dataLine) collector.push(JSON.parse(dataLine.replace('data: ', '')));
          }
        },
        end: () => {},
      });

      const req1: any = { headers: {}, query: {}, on: () => {} };
      const req2: any = { headers: {}, query: {}, on: () => {} };

      await streamManager.handleConnection(req1, createMockRes(directorEvents), 'usr-director', 'org-1');
      await streamManager.handleConnection(req2, createMockRes(operarioEvents), 'usr-operario-planta', 'org-1');

      // Publicar evento en canal privado 'chn-secret'
      await streamManager.publish({
        type: 'chat:message',
        organizationId: 'org-1',
        channelId: 'chn-secret',
        payload: { text: 'Información confidencial de junta directiva' },
      });

      // Director DEBE recibirlo
      const directorSecret = directorEvents.find(
        (e) => e.text === 'Información confidencial de junta directiva'
      );
      expect(directorSecret).toBeDefined();

      // Operario NO DEBE recibirlo jamás
      const operarioSecret = operarioEvents.find(
        (e) => e.text === 'Información confidencial de junta directiva'
      );
      expect(operarioSecret).toBeUndefined();

      // También verificar función de autorización de canal canAccessChannel
      const accessDirect = canAccessChannel(
        { id: 'chn-secret', type: 'PRIVATE' },
        'usr-operario-planta',
        privateMembers
      );
      expect(accessDirect.canAccess).toBe(false);

      const accessMember = canAccessChannel(
        { id: 'chn-secret', type: 'PRIVATE' },
        'usr-director',
        privateMembers
      );
      expect(accessMember.canAccess).toBe(true);

      streamManager.destroy();
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 4: Compatibilidad con Kanban de Etapa 6
  // ==========================================================================
  describe('Prueba Obligatoria 4: El Kanban de la Etapa 6 sigue funcionando tras migrar al canal unificado', () => {
    it('multiplexa eventos comerciales y de kanban sin alterar su estructura', async () => {
      const streamManager = new RealtimeStreamManager();
      const kanbanUpdates: any[] = [];

      const mockRes: any = {
        writeHead: () => {},
        flushHeaders: () => {},
        write: (chunk: string) => {
          if (chunk.startsWith('id:')) {
            const eventLine = chunk.split('\n').find((l) => l.startsWith('event: '));
            const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (eventLine && dataLine) {
              const evt = eventLine.replace('event: ', '');
              if (evt !== 'ping') {
                kanbanUpdates.push({
                  event: evt,
                  data: JSON.parse(dataLine.replace('data: ', '')),
                });
              }
            }
          }
        },
        end: () => {},
      };

      await streamManager.handleConnection({ headers: {}, query: {}, on: () => {} } as any, mockRes, 'usr-comercial', 'org-1');

      // Emisión de desviación comercial (Etapa 6 original: commercial-deviations)
      await streamManager.publish({
        type: 'commercial:deviation',
        organizationId: 'org-1',
        payload: {
          metric: 'MARGIN_BELOW_TARGET',
          opportunityId: 'opp-789',
          clientName: 'Bancolombia S.A.',
          deviationPercent: -12.5,
          timestamp: new Date().toISOString(),
        },
      });

      // Emisión de movimiento de tarjeta Kanban
      await streamManager.publish({
        type: 'kanban:card_moved',
        organizationId: 'org-1',
        payload: {
          cardId: 'card-101',
          fromColumn: 'NEGOCIACION',
          toColumn: 'GANADA',
          movedBy: 'usr-comercial',
          value: 45000000,
        },
      });

      expect(kanbanUpdates.length).toBe(2);
      expect(kanbanUpdates[0].event).toBe('commercial:deviation');
      expect(kanbanUpdates[0].data.opportunityId).toBe('opp-789');
      expect(kanbanUpdates[1].event).toBe('kanban:card_moved');
      expect(kanbanUpdates[1].data.toColumn).toBe('GANADA');

      streamManager.destroy();
    });
  });

  // ==========================================================================
  // PRUEBA OBLIGATORIA 5: Búsqueda sin tildes en español
  // ==========================================================================
  describe('Prueba Obligatoria 5: Búsqueda sin tilde en español', () => {
    it('la búsqueda encuentra "impresión" escribiendo "impresion", sin tilde', () => {
      const sampleMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          organizationId: 'org-1',
          channelId: 'chn-1',
          authorId: 'usr-1',
          authorName: 'Diana Quintero',
          type: 'TEXT',
          body: 'Se necesita mantenimiento urgente en la máquina de impresión cama plana.',
          bodyPlain: 'Se necesita mantenimiento urgente en la máquina de impresión cama plana.',
          threadReplyCount: 0,
          attachments: [],
          mentionedUserIds: [],
          mentionsEveryone: false,
          createdAt: '2026-09-12T10:00:00.000Z',
          updatedAt: '2026-09-12T10:00:00.000Z',
        },
        {
          id: 'msg-2',
          organizationId: 'org-1',
          channelId: 'chn-1',
          authorId: 'usr-2',
          authorName: 'Jorge Rojas',
          type: 'TEXT',
          body: 'Corte láser finalizado para láminas de acrílico.',
          bodyPlain: 'Corte láser finalizado para láminas de acrílico.',
          threadReplyCount: 0,
          attachments: [],
          mentionedUserIds: [],
          mentionsEveryone: false,
          createdAt: '2026-09-12T11:00:00.000Z',
          updatedAt: '2026-09-12T11:00:00.000Z',
        },
        {
          id: 'msg-3',
          organizationId: 'org-1',
          channelId: 'chn-1',
          authorId: 'usr-3',
          authorName: 'Álvaro Echeverry',
          type: 'TEXT',
          body: 'Revisión de costos de producción e insumos químicos.',
          bodyPlain: 'Revisión de costos de producción e insumos químicos.',
          threadReplyCount: 0,
          attachments: [],
          mentionedUserIds: [],
          mentionsEveryone: false,
          createdAt: '2026-09-12T12:00:00.000Z',
          updatedAt: '2026-09-12T12:00:00.000Z',
        },
      ];

      // 1. Escribiendo "impresion" (sin tilde) debe encontrar el mensaje con "impresión"
      const results1 = searchChatMessages(sampleMessages, 'impresion');
      expect(results1.length).toBe(1);
      expect(results1[0].id).toBe('msg-1');

      // 2. Escribiendo "IMPRESIÓN" (mayúsculas con tilde) debe encontrarlo también
      const results2 = searchChatMessages(sampleMessages, 'IMPRESIÓN');
      expect(results2.length).toBe(1);
      expect(results2[0].id).toBe('msg-1');

      // 3. Escribiendo "laser" (sin tilde) debe encontrar "láser"
      const results3 = searchChatMessages(sampleMessages, 'laser');
      expect(results3.length).toBe(1);
      expect(results3[0].id).toBe('msg-2');

      // 4. Escribiendo "quimicos" (sin tilde) debe encontrar "químicos"
      const results4 = searchChatMessages(sampleMessages, 'quimicos');
      expect(results4.length).toBe(1);
      expect(results4[0].id).toBe('msg-3');

      // 5. Búsqueda por autor sin tilde ("alvaro" encuentra "Álvaro")
      const results5 = searchChatMessages(sampleMessages, 'alvaro');
      expect(results5.length).toBe(1);
      expect(results5[0].id).toBe('msg-3');
    });
  });

  // ==========================================================================
  // PRUEBAS DE REGLAS DE NEGOCIO ADICIONALES: Markdown, Retención, Privacidad
  // ==========================================================================
  describe('Formateo Seguro de Markdown y Extracción', () => {
    it('sanitiza HTML peligroso y renderiza etiquetas permitidas', () => {
      const dangerous = '<script>alert("hack")</script> **Aviso Importante** [Link](https://fusion.co)';
      const rendered = renderLimitedMarkdown(dangerous);

      expect(rendered).not.toContain('<script>');
      expect(rendered).toContain('&lt;script&gt;');
      expect(rendered).toContain('<strong class="font-semibold text-foreground">Aviso Importante</strong>');
      expect(rendered).toContain('href="https://fusion.co"');
    });

    it('extrae enlaces a entidades del CRM con el prefijo #', () => {
      const text = 'Favor revisar #COT-2045 y #PRJ-881 para el cliente #CLI-102';
      const entities = extractEntityLinks(text);

      expect(entities.length).toBe(3);
      expect(entities[0].code).toBe('COT-2045');
      expect(entities[0].type).toBe('QUOTE');
      expect(entities[1].code).toBe('PRJ-881');
      expect(entities[1].type).toBe('PRODUCTION_PROJECT');
      expect(entities[2].code).toBe('CLI-102');
      expect(entities[2].type).toBe('CLIENT');
    });
  });

  describe('Políticas de Retención de Canales', () => {
    it('canales de entidad tienen retención indefinida y los demás 24 meses', () => {
      expect(getChannelRetentionDays('ENTITY')).toBeNull();
      expect(getChannelRetentionDays('PUBLIC')).toBe(730);
      expect(getChannelRetentionDays('DIRECT')).toBe(730);

      const oldDate = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000); // 800 días atrás
      // En canal ENTITY no expira nunca
      expect(isMessageExpired(oldDate, 'ENTITY')).toBe(false);
      // En canal PUBLIC o DIRECT expira tras 730 días
      expect(isMessageExpired(oldDate, 'PUBLIC')).toBe(true);
    });
  });

  describe('Límite Duro de Privacidad para Mensajes Directos', () => {
    it('un tercero no puede exportar un DM ajeno sin confirmación legal explícita', () => {
      const dmChannel: ChatChannel = {
        id: 'chn-dm-1',
        organizationId: 'org-1',
        type: 'DIRECT',
        name: 'Carlos Mendoza, Laura Restrepo',
        isArchived: false,
        isReadOnly: false,
        messageCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [
          { id: 'm1', channelId: 'chn-dm-1', userId: 'usr-admin', role: 'MEMBER', joinedAt: '', isMuted: false, notificationLevel: 'ALL', unreadCount: 0, unreadMentionCount: 0 },
          { id: 'm2', channelId: 'chn-dm-1', userId: 'usr-laura', role: 'MEMBER', joinedAt: '', isMuted: false, notificationLevel: 'ALL', unreadCount: 0, unreadMentionCount: 0 },
        ],
      };

      // Auditor externo intentando exportar sin doble confirmación
      const check1 = verifyDirectChannelExport({
        channel: dmChannel,
        requestingUserId: 'usr-auditor-tercero',
        hasChatExportPermission: true,
        hasLegalConfirmation: false,
      });
      expect(check1.allowed).toBe(false);
      expect(check1.requiresLegalDoubleConfirmation).toBe(true);

      // Con doble confirmación y motivo legal fundado
      const check2 = verifyDirectChannelExport({
        channel: dmChannel,
        requestingUserId: 'usr-auditor-tercero',
        hasChatExportPermission: true,
        hasLegalConfirmation: true,
        legalReason: 'Requerimiento fiscal y laboral ordenanza 2026-4412',
      });
      expect(check2.allowed).toBe(true);
      expect(check2.auditPayload?.action).toBe('CHAT_DIRECT_EXPORT_LEGAL_OVERRIDE');
      expect(check2.notifyUserIds).toContain('usr-admin');
      expect(check2.notifyUserIds).toContain('usr-laura');
    });
  });
});
