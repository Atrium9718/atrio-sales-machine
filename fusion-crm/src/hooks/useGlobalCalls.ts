import { useState, useEffect, useCallback } from 'react';
import { IncomingCallData } from '../components/calls/IncomingCallModal';
import { useFusionAuth } from '../context/FusionAuthContext';

export function useGlobalCalls() {
  const { currentUser } = useFusionAuth();
  const currentUserId = currentUser?.id || 'emp-03';
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    // Escuchar canal SSE unificado
    const sseUrl = `/api/realtime/stream?userId=${currentUserId}&organizationId=org-1`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('call:incoming', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          const payload = data.payload;
          if (payload && payload.session) {
            setIncomingCall(payload);
          }
        } catch (err) {
          console.error('Error parsing call:incoming event', err);
        }
      });

      eventSource.addEventListener('call:rejected', () => {
        setIncomingCall(null);
      });

      eventSource.addEventListener('call:missed', () => {
        setIncomingCall(null);
      });

      eventSource.addEventListener('call:ended', () => {
        setIncomingCall(null);
      });
    } catch (err) {
      console.warn('Error conectando SSE en useGlobalCalls', err);
    }

    // Comprobar también al montar si hay llamada activa en RINGING
    fetch('/api/calls/active', {
      headers: { 'x-user-id': currentUserId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isIncoming && data.activeCall) {
          setIncomingCall({
            session: data.activeCall,
            caller: {
              id: data.activeCall.startedById,
              name: data.activeCall.startedByName || 'Colaborador',
            },
            timeoutSeconds: 30,
          });
        }
      })
      .catch(() => {});

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentUserId]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    clearIncomingCall,
  };
}
