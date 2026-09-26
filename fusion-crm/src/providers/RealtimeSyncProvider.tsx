/**
 * Proveedor de Sincronización en Tiempo Real (RealtimeSyncProvider) - Fase 4
 * Conecta el frontend al canal SSE (/api/realtime/stream) e implementa el patrón
 * de invalidación selectiva de caché (Query Invalidation Pattern) con React Query.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryKeys';
import { useFusionAuth } from '../context/FusionAuthContext';
import { syncProjectsFromApi } from '../../apps/web/src/lib/projectsStore';
import { syncQuotesFromApi } from '../../apps/web/src/lib/quotesStore';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface DomainEventPayload {
  type: string;
  payload: any;
  timestamp: string;
}

interface RealtimeSyncContextType {
  status: RealtimeConnectionStatus;
  isConnected: boolean;
  lastEvent: DomainEventPayload | null;
  reconnect: () => void;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType | undefined>(undefined);

export const useRealtimeSync = () => {
  const context = useContext(RealtimeSyncContext);
  if (!context) {
    throw new Error('useRealtimeSync debe usarse dentro de un RealtimeSyncProvider');
  }
  return context;
};

interface RealtimeSyncProviderProps {
  children: React.ReactNode;
}

export const RealtimeSyncProvider: React.FC<RealtimeSyncProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { currentUser, refreshEmployees } = useFusionAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<DomainEventPayload | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);

  /**
   * Mapeo de eventos de dominio a invalidación selectiva de caché
   */
  const handleDomainEvent = useCallback(
    async (domainEvent: DomainEventPayload) => {
      console.log(`[RealtimeSync 📡] Evento de dominio recibido: [${domainEvent.type}]`, domainEvent.payload);
      setLastEvent(domainEvent);

      const { type, payload } = domainEvent;

      try {
        switch (type) {
          // --- MUTACIONES DE EMPLEADOS ---
          case 'EMPLOYEE_CREATED':
          case 'EMPLOYEE_UPDATED':
          case 'EMPLOYEE_DEACTIVATED': {
            console.log(`[RealtimeSync 🔄] Invalidando consultas de empleados y directorios...`);
            
            // Invalida catálogos de empleados en React Query
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.active }),
              // Invalida chat / menciones donde participan empleados
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat.channels }),
            ]);

            const employeeId = payload?.employee?.id || payload?.employeeId;
            if (employeeId) {
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.employees.detail(employeeId),
              });
            }

            // Actualiza el SSOT de autenticación/personas del frontend
            if (typeof refreshEmployees === 'function') {
              refreshEmployees(true);
            }

            // Disparar evento en ventana para compatibilidad global
            window.dispatchEvent(
              new CustomEvent('fusion_employees_updated', {
                detail: payload,
              })
            );
            break;
          }

          // --- MUTACIONES DE PROYECTOS / KANBAN ---
          case 'PROJECT_STAGE_CHANGED': {
            console.log(
              `[RealtimeSync 🔄] Proyecto cambió de etapa: ${payload?.projectId} (${payload?.fromStage} -> ${payload?.toStage}). Invalidando caché...`
            );

            await Promise.all([
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.home }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.oee }),
            ]);

            if (payload?.fromStage) {
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.projects.byStage(payload.fromStage),
              });
            }
            if (payload?.toStage) {
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.projects.byStage(payload.toStage),
              });
            }
            if (payload?.projectId) {
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.projects.detail(payload.projectId),
              });
            }

            // Sincronizar store local y disparar evento del sistema
            try {
              await syncProjectsFromApi();
            } catch {}

            window.dispatchEvent(
              new CustomEvent('fusion_projects_updated', {
                detail: payload,
              })
            );
            break;
          }

          // --- MUTACIONES DE COTIZACIONES ---
          case 'QUOTE_APPROVED': {
            console.log(
              `[RealtimeSync 🔄] Cotización aprobada: ${payload?.quoteId}. Invalidando cotizaciones, pipeline y métricas...`
            );

            await Promise.all([
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotes.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotes.pipeline }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.salesGoals }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.home }),
            ]);

            if (payload?.quoteId) {
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.quotes.detail(payload.quoteId),
              });
            }

            try {
              await syncProjectsFromApi();
            } catch {}

            window.dispatchEvent(
              new CustomEvent('fusion_quotes_updated', {
                detail: payload,
              })
            );
            window.dispatchEvent(
              new CustomEvent('fusion_projects_updated', {
                detail: payload,
              })
            );
            break;
          }

          // --- PORTAL DEL CLIENTE ---
          case 'CLIENT_REQUEST_CREATED': {
            window.dispatchEvent(new CustomEvent('fusion_client_request_created', { detail: payload }));
            window.dispatchEvent(new Event('fusion_client_requests_updated'));
            break;
          }

          // --- PURGA Y RESETEO DE DATOS TRANSITORIOS ---
          case 'SYSTEM_TRANSIENT_DATA_PURGED': {
            console.log(
              '[RealtimeSync 🧹] Evento de purga y reseteo recibido. Limpiando almacenamiento local e invalidando cachés...',
              payload
            );

            // Recargar desde el servidor las cachés en memoria de cotizaciones y proyectos
            syncQuotesFromApi().catch(() => {});
            syncProjectsFromApi().catch(() => {});

            // Invalidar masivamente todas las consultas de entidades transitorias
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotes.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quotes.pipeline }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.all }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.home }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.salesGoals }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.metrics.oee }),
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat.channels }),
            ]);

            // Notificar reactivamente a los componentes y ventanas activas
            window.dispatchEvent(new Event('fusion_quotes_updated'));
            window.dispatchEvent(new Event('fusion_projects_updated'));
            window.dispatchEvent(new Event('fusion_announcements_updated'));
            window.dispatchEvent(new Event('fusion_chat_updated'));
            break;
          }

          case 'SSE_CONNECTED': {
            console.log('[RealtimeSync ✅] Handshake SSE confirmado por servidor:', payload);
            break;
          }

          default: {
            console.log(`[RealtimeSync ℹ️] Evento no mapeado [${type}]. Ejecutando invalidación general preventiva.`);
            break;
          }
        }
      } catch (err) {
        console.error('[RealtimeSync ❌] Error invalidando caché tras evento:', err);
      }
    },
    [queryClient, refreshEmployees]
  );

  /**
   * Conexión y gestión del ciclo de vida de EventSource
   */
  const connectSSE = useCallback(() => {
    if (isUnmountedRef.current) return;

    // Limpiar conexión previa si existiera
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {}
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const userId = currentUser?.id || 'emp-03';
    const sseUrl = `/api/realtime/stream?userId=${encodeURIComponent(userId)}&organizationId=org-1`;

    console.log(`[RealtimeSync 🔌] Conectando EventSource a ${sseUrl}...`);
    setStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isUnmountedRef.current) {
          es.close();
          return;
        }
        console.log('[RealtimeSync 🟢] Conexión SSE establecida exitosamente');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      // Escuchar eventos de dominio tipados
      es.addEventListener('domain_event', (event: MessageEvent) => {
        if (isUnmountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          handleDomainEvent(parsed);
        } catch (err) {
          console.error('[RealtimeSync ⚠️] Error parseando datos de domain_event:', err, event.data);
        }
      });

      // Escuchar heartbeat / ping
      es.addEventListener('ping', () => {
        // Heartbeat recibido, el canal sigue vivo
      });

      es.onerror = () => {
        if (isUnmountedRef.current) return;
        console.warn('[RealtimeSync 🟡] Conexión SSE interrumpida. Preparando reconexión resiliente...');
        setStatus('reconnecting');
        
        try {
          es.close();
        } catch {}
        eventSourceRef.current = null;

        // Reconexión exponencialmente acotada (1s, 2s, 4s, hasta máx 15s)
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(1.5, attempt), 15000);
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connectSSE();
          }
        }, delay);
      };
    } catch (err) {
      console.error('[RealtimeSync ❌] Error instanciando EventSource:', err);
      setStatus('disconnected');
    }
  }, [currentUser?.id, handleDomainEvent]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectSSE();

    return () => {
      isUnmountedRef.current = true;
      if (eventSourceRef.current) {
        console.log('[RealtimeSync 🛑] Desmontando RealtimeSyncProvider, cerrando conexión EventSource');
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectSSE]);

  const value = {
    status,
    isConnected: status === 'connected',
    lastEvent,
    reconnect: connectSSE,
  };

  return <RealtimeSyncContext.Provider value={value}>{children}</RealtimeSyncContext.Provider>;
};
