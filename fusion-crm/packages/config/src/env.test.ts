import { describe, it, expect } from 'vitest';
import {
  LiveKitEnvSchema,
  isLiveKitConfigured,
  parseLiveKitEnv,
  getPublicLiveKitConfig,
} from './env';

describe('LiveKit Env Configuration & Validation', () => {
  it('permite arrancar con variables vacías sin lanzar error (opcional)', () => {
    const emptyEnv = {};
    const parsed = LiveKitEnvSchema.parse(emptyEnv);
    expect(parsed.LIVEKIT_TOKEN_TTL_MINUTES).toBe(60);
    expect(parsed.LIVEKIT_MAX_PARTICIPANTS).toBe(20);
    expect(parsed.LIVEKIT_RECORDING_ENABLED).toBe(false);
    expect(isLiveKitConfigured(emptyEnv)).toBe(false);
  });

  it('detecta correctamente cuando LiveKit está completamente configurado', () => {
    const fullEnv = {
      LIVEKIT_URL: 'http://localhost:7880',
      NEXT_PUBLIC_LIVEKIT_URL: 'wss://meet.fusioncg.com',
      LIVEKIT_API_KEY: 'devkey',
      LIVEKIT_API_SECRET: 'secret_dev_key_1234567890',
      LIVEKIT_TOKEN_TTL_MINUTES: '45',
      LIVEKIT_MAX_PARTICIPANTS: '15',
      LIVEKIT_RECORDING_ENABLED: 'true',
    };

    expect(isLiveKitConfigured(fullEnv)).toBe(true);
    const parsed = parseLiveKitEnv(fullEnv);
    expect(parsed.LIVEKIT_TOKEN_TTL_MINUTES).toBe(45);
    expect(parsed.LIVEKIT_MAX_PARTICIPANTS).toBe(15);
    expect(parsed.LIVEKIT_RECORDING_ENABLED).toBe(true);

    const publicConfig = getPublicLiveKitConfig(fullEnv);
    expect(publicConfig.enabled).toBe(true);
    expect(publicConfig.serverUrl).toBe('wss://meet.fusioncg.com');
    // Verifica que el secreto nunca se exponga en la configuración pública
    expect((publicConfig as any).LIVEKIT_API_SECRET).toBeUndefined();
    expect((publicConfig as any).apiKey).toBeUndefined();
  });

  it('deshabilita LiveKit si falta alguna de las credenciales principales', () => {
    expect(
      isLiveKitConfigured({
        LIVEKIT_URL: 'http://localhost:7880',
        LIVEKIT_API_KEY: 'devkey',
        // falta LIVEKIT_API_SECRET
      })
    ).toBe(false);

    expect(
      isLiveKitConfigured({
        LIVEKIT_API_KEY: 'devkey',
        LIVEKIT_API_SECRET: 'secret',
        // falta LIVEKIT_URL
      })
    ).toBe(false);
  });
});
