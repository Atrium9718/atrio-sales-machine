import { useState, useEffect } from 'react';

export interface LiveKitConfigState {
  isEnabled: boolean;
  serverUrl: string | null;
  maxParticipants: number;
  recordingEnabled: boolean;
  turnRealm?: string;
  loading: boolean;
  error?: string | null;
}

let cachedConfig: { isEnabled: boolean; serverUrl: string | null; maxParticipants: number; recordingEnabled: boolean; turnRealm?: string } | null = null;

export function useLiveKitConfig(): LiveKitConfigState {
  const [config, setConfig] = useState<LiveKitConfigState>({
    isEnabled: cachedConfig?.isEnabled ?? false,
    serverUrl: cachedConfig?.serverUrl ?? null,
    maxParticipants: cachedConfig?.maxParticipants ?? 20,
    recordingEnabled: cachedConfig?.recordingEnabled ?? false,
    turnRealm: cachedConfig?.turnRealm,
    loading: cachedConfig === null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchConfig() {
      try {
        const res = await fetch('/api/calls/config');
        if (!res.ok) {
          throw new Error('No se pudo verificar la configuración de llamadas');
        }
        const data = await res.json();
        const state = {
          isEnabled: Boolean(data.enabled),
          serverUrl: data.serverUrl || null,
          maxParticipants: data.maxParticipants || 20,
          recordingEnabled: Boolean(data.recordingEnabled),
          turnRealm: data.turnRealm,
          loading: false,
          error: null,
        };
        cachedConfig = state;
        if (isMounted) {
          setConfig(state);
        }
      } catch (err: any) {
        if (isMounted) {
          setConfig((prev) => ({
            ...prev,
            isEnabled: false,
            loading: false,
            error: err?.message || 'Error al conectar con el servidor',
          }));
        }
      }
    }

    fetchConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return config;
}
