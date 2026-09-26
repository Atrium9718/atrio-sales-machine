import { z } from 'zod';

/**
 * Esquema de validación para las variables de entorno de LiveKit y TURN/WebRTC.
 * Todas las variables son estrictamente opcionales: si no están presentes,
 * el módulo de llamadas y WebRTC se apaga elegantemente y no rompe la aplicación.
 */
export const LiveKitEnvSchema = z.object({
  // URL de señalización de LiveKit (servidor interno o LiveKit Cloud)
  LIVEKIT_URL: z.string().optional(),
  // URL pública de LiveKit expuesta al cliente (ej. wss://meet.fusioncg.com)
  NEXT_PUBLIC_LIVEKIT_URL: z.string().optional(),
  // Clave API de LiveKit
  LIVEKIT_API_KEY: z.string().optional(),
  // Secreto API de LiveKit (nunca debe llegar al cliente)
  LIVEKIT_API_SECRET: z.string().optional(),
  // Vigencia del token de sala en minutos (default: 60)
  LIVEKIT_TOKEN_TTL_MINUTES: z
    .preprocess((val) => (val ? Number(val) : 60), z.number().int().positive())
    .default(60),
  // Límite configurable de participantes concurrentes por sala (default: 20)
  LIVEKIT_MAX_PARTICIPANTS: z
    .preprocess((val) => (val ? Number(val) : 20), z.number().int().positive())
    .default(20),
  // Habilitación de grabación de salas (MinIO / Egress)
  LIVEKIT_RECORDING_ENABLED: z
    .preprocess((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
      return false;
    }, z.boolean())
    .default(false),

  // Configuración de TURN Server (Coturn)
  TURN_REALM: z.string().optional(),
  TURN_SECRET: z.string().optional(),
  TURN_UDP_PORT_RANGE: z.string().optional(),
});

export type LiveKitEnv = z.infer<typeof LiveKitEnvSchema>;

export const RealtimeEnvSchema = z.object({
  REALTIME_SSE_HEARTBEAT_SECONDS: z.preprocess((val) => (val ? Number(val) : 25), z.number()).default(25),
  REALTIME_REPLAY_BUFFER_SIZE: z.preprocess((val) => (val ? Number(val) : 200), z.number()).default(200),
  REALTIME_REDIS_CHANNEL_PREFIX: z.string().default('fusion:rt'),
  REALTIME_MAX_CONNECTIONS_PER_USER: z.preprocess((val) => (val ? Number(val) : 4), z.number()).default(4),
});

export const ChatEnvSchema = z.object({
  CHAT_ATTACHMENT_MAX_MB: z.preprocess((val) => (val ? Number(val) : 25), z.number()).default(25),
  CHAT_RETENTION_MONTHS_DEFAULT: z.preprocess((val) => (val ? Number(val) : 24), z.number()).default(24),
  CHAT_MESSAGE_MAX_LENGTH: z.preprocess((val) => (val ? Number(val) : 4000), z.number()).default(4000),
});

export const PerformanceEnvSchema = z.object({
  HOME_DEFAULT_START_PAGE: z.string().default('home'),
  PERFORMANCE_TASK_GREEN_THRESHOLD: z.preprocess((val) => (val ? Number(val) : 85), z.number()).default(85),
  PERFORMANCE_TASK_AMBER_THRESHOLD: z.preprocess((val) => (val ? Number(val) : 70), z.number()).default(70),
  PERFORMANCE_TASK_GRACE_HOURS: z.preprocess((val) => (val ? Number(val) : 4), z.number()).default(4),
  CAPACITY_HEALTHY_MIN: z.preprocess((val) => (val ? Number(val) : 60), z.number()).default(60),
  CAPACITY_TIGHT_MIN: z.preprocess((val) => (val ? Number(val) : 85), z.number()).default(85),
  CAPACITY_OVERLOAD_MIN: z.preprocess((val) => (val ? Number(val) : 95), z.number()).default(95),
});

/**
 * Esquema de validación para variables de telefonía y voz (Asterisk ARI / SIP) - Etapa 17.1.
 * TODAS las variables son estrictamente opcionales: si no están presentes,
 * el módulo de voz se apaga solo y la aplicación arranca con normalidad.
 */
export const VoiceEnvSchema = z.object({
  // Asterisk ARI
  ASTERISK_ARI_URL: z.string().optional(),
  ASTERISK_ARI_WS_URL: z.string().optional(),
  ASTERISK_ARI_USERNAME: z.string().optional(),
  ASTERISK_ARI_PASSWORD: z.string().optional(),
  ASTERISK_ARI_APP: z.string().optional(),

  // Servidor SIP y WebRTC
  ASTERISK_SIP_HOST: z.string().optional(),
  ASTERISK_SIP_PORT: z
    .preprocess((val) => (val ? Number(val) : 5060), z.number().int().positive())
    .default(5060),
  ASTERISK_WEBRTC_WSS_URL: z.string().optional(),

  // Grabaciones y retención
  VOICE_RECORDINGS_PATH: z.string().default('/var/spool/asterisk/monitor'),
  VOICE_STORAGE_BUCKET: z.string().default('voice-recordings'),
  VOICE_DEFAULT_RECORDING_RETENTION_DAYS: z
    .preprocess((val) => (val ? Number(val) : 180), z.number().int())
    .default(180),

  // Parámetros por defecto
  VOICE_DEFAULT_COUNTRY_CODE: z.string().default('57'),
  VOICE_MAX_CHANNELS_PER_TRUNK: z
    .preprocess((val) => (val ? Number(val) : 30), z.number().int())
    .default(30),
  VOICE_AI_AGENT_TIMEOUT_SECONDS: z
    .preprocess((val) => (val ? Number(val) : 300), z.number().int())
    .default(300),
  VOICE_SLA_WAIT_SECONDS: z
    .preprocess((val) => (val ? Number(val) : 30), z.number().int())
    .default(30),
});

export type VoiceEnv = z.infer<typeof VoiceEnvSchema>;

/**
 * Esquema general de variables de entorno de la aplicación.
 */
export const AppEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.preprocess((val) => (val ? Number(val) : 3000), z.number()).default(3000),
    APP_URL: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
  })
  .merge(LiveKitEnvSchema)
  .merge(RealtimeEnvSchema)
  .merge(ChatEnvSchema)
  .merge(PerformanceEnvSchema)
  .merge(VoiceEnvSchema);

export type AppEnv = z.infer<typeof AppEnvSchema>;

/**
 * Determina si LiveKit está completamente configurado y operativo en el entorno.
 * Si faltan las credenciales mínimas (URL, API_KEY, API_SECRET), retorna falso
 * para que el frontend y backend deshabiliten llamadas sin errores.
 */
export function isLiveKitConfigured(envInput?: Record<string, string | undefined>): boolean {
  const env = envInput || process.env;
  return Boolean(
    env.LIVEKIT_URL &&
      env.LIVEKIT_URL.trim().length > 0 &&
      env.LIVEKIT_API_KEY &&
      env.LIVEKIT_API_KEY.trim().length > 0 &&
      env.LIVEKIT_API_SECRET &&
      env.LIVEKIT_API_SECRET.trim().length > 0
  );
}

/**
 * Parsea y valida las variables de entorno de LiveKit con valores por defecto seguros.
 */
export function parseLiveKitEnv(envInput?: Record<string, string | undefined>): LiveKitEnv {
  const env = envInput || process.env;
  return LiveKitEnvSchema.parse(env);
}

/**
 * Obtiene la configuración pública segura de LiveKit para el cliente.
 * NUNCA expone LIVEKIT_API_SECRET.
 */
export function getPublicLiveKitConfig(envInput?: Record<string, string | undefined>) {
  const env = envInput || process.env;
  const configured = isLiveKitConfigured(env);
  const parsed = parseLiveKitEnv(env);

  return {
    enabled: configured,
    serverUrl: configured
      ? env.NEXT_PUBLIC_LIVEKIT_URL || env.LIVEKIT_URL || ''
      : null,
    maxParticipants: parsed.LIVEKIT_MAX_PARTICIPANTS,
    recordingEnabled: parsed.LIVEKIT_RECORDING_ENABLED,
    turnRealm: parsed.TURN_REALM || null,
  };
}

/**
 * Determina si el módulo de telefonía y voz (Asterisk ARI) está habilitado.
 * Retorna true ÚNICAMENTE si están configuradas las 4 variables obligatorias:
 * ASTERISK_ARI_URL, ASTERISK_ARI_USERNAME, ASTERISK_ARI_PASSWORD y ASTERISK_ARI_APP.
 * Si alguna falta, retorna false para apagar el módulo limpiamente sin errores en tiempo de ejecución.
 */
export function isVoiceEnabled(envInput?: Record<string, string | undefined>): boolean {
  const env = envInput || process.env;
  return Boolean(
    env.ASTERISK_ARI_URL &&
      env.ASTERISK_ARI_URL.trim().length > 0 &&
      env.ASTERISK_ARI_USERNAME &&
      env.ASTERISK_ARI_USERNAME.trim().length > 0 &&
      env.ASTERISK_ARI_PASSWORD &&
      env.ASTERISK_ARI_PASSWORD.trim().length > 0 &&
      env.ASTERISK_ARI_APP &&
      env.ASTERISK_ARI_APP.trim().length > 0
  );
}

/**
 * Parsea y valida las variables de entorno de voz con valores seguros por defecto.
 */
export function parseVoiceEnv(envInput?: Record<string, string | undefined>): VoiceEnv {
  const env = envInput || process.env;
  return VoiceEnvSchema.parse(env);
}

/**
 * Obtiene la configuración pública segura de voz para el cliente/frontend.
 * NUNCA expone credenciales ni contraseñas ARI/SIP.
 */
export function getPublicVoiceConfig(envInput?: Record<string, string | undefined>) {
  const env = envInput || process.env;
  const enabled = isVoiceEnabled(env);
  const parsed = parseVoiceEnv(env);

  return {
    enabled,
    webrtcWssUrl: env.ASTERISK_WEBRTC_WSS_URL || null,
    countryCode: parsed.VOICE_DEFAULT_COUNTRY_CODE,
    slaWaitSeconds: parsed.VOICE_SLA_WAIT_SECONDS,
  };
}

