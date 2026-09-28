import { useState, useEffect } from 'react';

export interface VoiceConfigState {
  enabled: boolean;
  webrtcWssUrl: string | null;
  countryCode: string;
  slaWaitSeconds: number;
  loading: boolean;
  error: string | null;
}

export function useVoiceStatus() {
  const [state, setState] = useState<VoiceConfigState>({
    enabled: false,
    webrtcWssUrl: null,
    countryCode: '57',
    slaWaitSeconds: 30,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchVoiceConfig() {
      try {
        const res = await fetch('/api/voice/config');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          setState({
            enabled: Boolean(data.enabled),
            webrtcWssUrl: data.webrtcWssUrl || null,
            countryCode: data.countryCode || '57',
            slaWaitSeconds: data.slaWaitSeconds || 30,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            enabled: false,
            loading: false,
            error: err?.message || 'Error cargando estado de voz',
          }));
        }
      }
    }

    fetchVoiceConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
