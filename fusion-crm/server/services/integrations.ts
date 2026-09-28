/**
 * Estado real de las conexiones del sistema (según la configuración del servidor) y prueba de
 * cada una. Nunca se devuelven credenciales: solo si están y sus últimos 4 caracteres.
 * Las credenciales se cambian en el archivo .env del servidor (ver DEPLOY.md).
 */

export type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export interface IntegrationInfo {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
  /** Variables del .env y si están definidas (valor enmascarado). */
  settings: { key: string; present: boolean; hint?: string }[];
  testable: boolean;
}

export interface IntegrationTest {
  ok: boolean;
  latencyMs: number;
  message: string;
}

const mask = (v?: string) => (v ? (v.length > 8 ? `…${v.slice(-4)}` : 'definida') : undefined);
const setting = (env: Env, key: string, secret = true) => ({ key, present: !!env[key], hint: env[key] ? (secret ? mask(env[key]) : env[key]!.slice(0, 80)) : undefined });

export function describeIntegrations(env: Env): IntegrationInfo[] {
  return [
    {
      id: 'database',
      name: 'Base de datos',
      purpose: env.DATA_BACKEND === 'postgres' ? 'Postgres: guarda todos los datos del negocio' : 'Firestore: guarda los datos del negocio',
      configured: env.DATA_BACKEND === 'postgres' ? !!env.DATABASE_URL : true,
      settings: [setting(env, 'DATA_BACKEND', false), { key: 'DATABASE_URL', present: !!env.DATABASE_URL, hint: env.DATABASE_URL ? env.DATABASE_URL.replace(/\/\/[^@]*@/, '//***@').split('?')[0] : undefined }],
      testable: true,
    },
    {
      id: 'firebase',
      name: 'Firebase (inicio de sesión)',
      purpose: 'Inicio de sesión con Google y, si se usa, Firestore y Storage',
      configured: !!env.GOOGLE_APPLICATION_CREDENTIALS,
      settings: [setting(env, 'GOOGLE_APPLICATION_CREDENTIALS', false)],
      testable: true,
    },
    {
      id: 'drive',
      name: 'Google Drive de la empresa',
      purpose: 'Artes de producción, soportes de pago, órdenes de compra y adjuntos del chat y anuncios. Sin Drive se guardan en el disco del servidor.',
      configured: !!env.GOOGLE_DRIVE_FOLDER_ID && !!((env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_REFRESH_TOKEN) || env.GOOGLE_DRIVE_SERVICE_ACCOUNT || env.GOOGLE_DRIVE_USE_SERVICE_ACCOUNT === 'true'),
      settings: [
        setting(env, 'GOOGLE_DRIVE_FOLDER_ID', false),
        setting(env, 'GOOGLE_DRIVE_CLIENT_ID', false),
        setting(env, 'GOOGLE_DRIVE_CLIENT_SECRET'),
        setting(env, 'GOOGLE_DRIVE_REFRESH_TOKEN'),
        setting(env, 'GOOGLE_DRIVE_SERVICE_ACCOUNT', false),
      ],
      testable: true,
    },
    {
      id: 'gemini',
      name: 'Google Gemini (IA)',
      purpose: 'Agentes de atención, precotizaciones y asistente interno',
      configured: !!env.GEMINI_API_KEY,
      settings: [setting(env, 'GEMINI_API_KEY'), setting(env, 'GEMINI_MODEL_FAST', false)],
      testable: true,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business (Cloud API)',
      purpose: 'Conversaciones y avisos de cambio de etapa por WhatsApp',
      configured: !!(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN),
      settings: [setting(env, 'WHATSAPP_PHONE_NUMBER_ID', false), setting(env, 'WHATSAPP_ACCESS_TOKEN'), setting(env, 'WHATSAPP_PUBLIC_NUMBER', false)],
      testable: true,
    },
    {
      id: 'messenger',
      name: 'Messenger e Instagram',
      purpose: 'Conversaciones de la página de Facebook e Instagram',
      configured: !!env.MESSENGER_PAGE_ACCESS_TOKEN,
      settings: [setting(env, 'MESSENGER_PAGE_ID', false), setting(env, 'MESSENGER_PAGE_ACCESS_TOKEN'), setting(env, 'INSTAGRAM_BUSINESS_ACCOUNT_ID', false)],
      testable: true,
    },
    {
      id: 'meta_webhook',
      name: 'Webhook de Meta',
      purpose: 'Recibir mensajes de WhatsApp, Messenger e Instagram de forma segura',
      configured: !!env.META_APP_SECRET && !!(env.META_WEBHOOK_VERIFY_TOKEN || env.META_VERIFY_TOKEN),
      settings: [setting(env, 'META_APP_ID', false), setting(env, 'META_APP_SECRET'), setting(env, 'META_WEBHOOK_VERIFY_TOKEN')],
      testable: false,
    },
    {
      id: 'webchat',
      name: 'Chat de la página web',
      purpose: 'Widget de chat para tu sitio',
      configured: true,
      settings: [setting(env, 'WEBCHAT_ALLOWED_ORIGINS', false), setting(env, 'WEBCHAT_PUBLIC_KEY')],
      testable: false,
    },
    {
      id: 'backups_offsite',
      name: 'Copia de respaldos fuera del servidor',
      purpose: 'Sube cada respaldo diario a Google Drive, B2, etc. (rclone)',
      configured: !!env.BACKUP_RCLONE_REMOTE,
      settings: [setting(env, 'BACKUP_RCLONE_REMOTE', false)],
      testable: false,
    },
  ];
}

export interface TestDeps {
  env: Env;
  fetch: FetchLike;
  pingDatabase(): Promise<string>;
  pingFirebase(): Promise<string>;
  pingDrive?(): Promise<string>;
  now?: () => number;
}

export async function testIntegration(id: string, deps: TestDeps): Promise<IntegrationTest> {
  const now = deps.now ?? (() => Date.now());
  const t0 = now();
  const done = (ok: boolean, message: string): IntegrationTest => ({ ok, latencyMs: now() - t0, message });
  const env = deps.env;
  const graph = `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v21.0'}`;
  const metaError = (body: any, status: number) => {
    const e = body?.error;
    if (e?.code === 190) return 'El token de Meta venció o no es válido: genera uno nuevo (token permanente de usuario del sistema).';
    return e?.message ? `Meta respondió: ${e.message}` : `Meta respondió HTTP ${status}`;
  };
  try {
    switch (id) {
      case 'database':
        return done(true, await deps.pingDatabase());
      case 'firebase':
        return done(true, await deps.pingFirebase());
      case 'drive':
        if (!deps.pingDrive) return done(false, 'Google Drive no está configurado');
        return done(true, await deps.pingDrive());
      case 'gemini': {
        if (!env.GEMINI_API_KEY) return done(false, 'Falta GEMINI_API_KEY');
        const res = await deps.fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(env.GEMINI_API_KEY)}`);
        const body = await res.json().catch(() => ({}));
        return res.ok ? done(true, 'La clave de Gemini funciona') : done(false, body?.error?.message ? `Google respondió: ${body.error.message}` : `HTTP ${res.status}`);
      }
      case 'whatsapp': {
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) return done(false, 'Faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN');
        const res = await deps.fetch(`${graph}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}?fields=display_phone_number,verified_name,quality_rating`, {
          headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return done(false, metaError(body, res.status));
        const quality = body.quality_rating ? ` · calidad ${body.quality_rating}` : '';
        return done(true, `Conectado: ${body.verified_name || 'número'} ${body.display_phone_number || ''}${quality}`.trim());
      }
      case 'messenger': {
        if (!env.MESSENGER_PAGE_ACCESS_TOKEN) return done(false, 'Falta MESSENGER_PAGE_ACCESS_TOKEN');
        const res = await deps.fetch(`${graph}/me?fields=name`, { headers: { Authorization: `Bearer ${env.MESSENGER_PAGE_ACCESS_TOKEN}` } });
        const body = await res.json().catch(() => ({}));
        return res.ok ? done(true, `Conectado a la página ${body.name || ''}`.trim()) : done(false, metaError(body, res.status));
      }
      default:
        return done(false, 'Esta conexión no tiene prueba automática');
    }
  } catch (err: any) {
    return done(false, err?.message || String(err));
  }
}
