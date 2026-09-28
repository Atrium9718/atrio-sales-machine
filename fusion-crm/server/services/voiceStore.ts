import { getPrisma } from '../repositories/prisma/client';
import { ORGANIZATION_ID } from '../repositories/prisma/mappers';
import { documentRepository } from '../repositories/documentStore';
import type { InMemExtension, InMemSecret } from '../../apps/web/src/server/services/voice/provisioning';

/**
 * Configuración de la central guardada en Postgres: las mismas tablas que lee el puente de voz
 * (apps/voice) para timbrar extensiones y enrutar números. El servidor web la tiene en memoria
 * para responder rápido y escribe cada cambio en la base.
 */

export const DEFAULT_TRUNK_ID = 'trunk-default';

/** La troncal la define el servidor (.env): es la que Asterisk registra al arrancar. */
export function trunkFromEnv(env: Record<string, string | undefined> = process.env) {
  return {
    id: DEFAULT_TRUNK_ID,
    organizationId: ORGANIZATION_ID,
    name: env.TRUNK_NAME || 'Troncal SIP principal',
    provider: env.TRUNK_PROVIDER || 'CUSTOM_SIP',
    sipHost: env.TRUNK_SIP_HOST || '',
    sipPort: Number(env.TRUNK_SIP_PORT) || 5060,
    transport: 'UDP' as const,
    username: env.TRUNK_USERNAME || '',
    register: true,
    maxChannels: Number(env.TRUNK_MAX_CHANNELS) || 10,
    codecs: ['alaw', 'ulaw'],
    callerIdDefault: env.VOICE_CALLER_ID || '',
    status: env.TRUNK_SIP_HOST ? ('ACTIVE' as const) : ('DISABLED' as const),
  };
}

/** Datos del número que la tabla no tiene (acción secundaria y horario). */
interface NumberMeta {
  id: string;
  secondaryAction?: string;
  secondaryTargetId?: string;
  scheduleId?: string;
}
const numberMeta = () => documentRepository<NumberMeta>('voice_number_meta');

export interface StoredNumber {
  id: string;
  organizationId: string;
  e164Number: string;
  displayName: string;
  countryCode: string;
  trunkId: string;
  primaryAction: 'IVR_FLOW' | 'QUEUE' | 'EXTENSION' | 'AI_AGENT' | 'VOICEMAIL';
  primaryTargetId: string;
  secondaryAction?: string;
  secondaryTargetId?: string;
  scheduleId?: string;
  status: 'ACTIVE' | 'RELEASED' | 'RESERVED';
}

export const voiceDbAvailable = () => Boolean(process.env.DATABASE_URL);

async function ensureDefaultTrunk() {
  const t = trunkFromEnv();
  await getPrisma().voiceTrunk.upsert({
    where: { id: DEFAULT_TRUNK_ID },
    create: { id: DEFAULT_TRUNK_ID, organizationId: ORGANIZATION_ID, name: t.name, provider: t.provider, sipHost: t.sipHost || 'sin-configurar', sipPort: t.sipPort, maxChannels: t.maxChannels, isDefault: true },
    update: { name: t.name, provider: t.provider, sipHost: t.sipHost || 'sin-configurar', sipPort: t.sipPort, maxChannels: t.maxChannels, isDefault: true, deletedAt: null },
  });
}

/** Carga extensiones, sus claves cifradas y los números. Se llama al arrancar el servidor. */
export async function loadVoiceStore(target: {
  extensions: Map<string, InMemExtension>;
  secrets: Map<string, InMemSecret>;
  numbers: Map<string, StoredNumber>;
}) {
  if (!voiceDbAvailable()) return;
  const db = getPrisma();
  await ensureDefaultTrunk();
  const [exts, secrets, numbers, metas] = await Promise.all([
    db.voiceExtension.findMany({ where: { organizationId: ORGANIZATION_ID, deletedAt: null } }),
    db.secret.findMany({ where: { organizationId: ORGANIZATION_ID, key: { startsWith: 'sip:secret:' }, deletedAt: null } }),
    db.voiceNumber.findMany({ where: { organizationId: ORGANIZATION_ID, deletedAt: null } }),
    numberMeta().list().catch(() => [] as NumberMeta[]),
  ]);
  target.extensions.clear();
  for (const e of exts) {
    target.extensions.set(e.extension, {
      id: e.id,
      organizationId: e.organizationId,
      userId: e.userId ?? undefined,
      extension: e.extension,
      label: e.label,
      sipUsername: e.sipUsername,
      sipPasswordSecretId: e.sipPasswordSecretId,
      type: e.type,
      status: e.status,
      ringStrategy: e.ringStrategy,
      mobileNumber: e.mobileNumber ?? undefined,
      ringTimeoutSeconds: e.ringTimeoutSeconds,
      voicemailEnabled: e.voicemailEnabled,
      recordingPolicy: e.recordingPolicy as InMemExtension['recordingPolicy'],
      lastRegisteredAt: e.lastRegisteredAt?.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    });
  }
  target.secrets.clear();
  for (const s of secrets) {
    target.secrets.set(s.id, {
      id: s.id,
      organizationId: s.organizationId,
      key: s.key,
      encryptedValue: s.encryptedValue,
      iv: s.iv,
      authTag: s.authTag ?? undefined,
      algorithm: s.algorithm,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    });
  }
  const metaById = new Map(metas.map((m) => [m.id, m]));
  target.numbers.clear();
  for (const n of numbers) {
    const meta = metaById.get(n.id);
    target.numbers.set(n.id, {
      id: n.id,
      organizationId: n.organizationId,
      e164Number: n.number,
      displayName: n.label,
      countryCode: n.number.startsWith('+57') ? '57' : '',
      trunkId: n.trunkId,
      primaryAction: n.inboundTarget,
      primaryTargetId: n.inboundTargetId ?? '',
      secondaryAction: meta?.secondaryAction,
      secondaryTargetId: meta?.secondaryTargetId,
      scheduleId: meta?.scheduleId,
      status: 'ACTIVE',
    });
  }
}

export async function saveSecret(s: InMemSecret) {
  if (!voiceDbAvailable()) return;
  await getPrisma().secret.upsert({
    where: { organizationId_key: { organizationId: s.organizationId, key: s.key } },
    create: { id: s.id, organizationId: s.organizationId, key: s.key, encryptedValue: s.encryptedValue, iv: s.iv, authTag: s.authTag, algorithm: s.algorithm },
    update: { encryptedValue: s.encryptedValue, iv: s.iv, authTag: s.authTag, algorithm: s.algorithm, deletedAt: null },
  });
}

export async function saveExtension(e: InMemExtension) {
  if (!voiceDbAvailable()) return;
  // PENDING_PROVISION es un estado solo del CRM: en la tabla queda activa y se reintenta al conciliar
  const status = e.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
  const data = {
    organizationId: e.organizationId,
    userId: e.userId ?? null,
    extension: e.extension,
    label: e.label,
    sipUsername: e.sipUsername,
    sipPasswordSecretId: e.sipPasswordSecretId,
    type: e.type,
    status,
    mobileNumber: e.mobileNumber ?? null,
    ringStrategy: e.ringStrategy,
    ringTimeoutSeconds: e.ringTimeoutSeconds,
    voicemailEnabled: e.voicemailEnabled,
    recordingPolicy: e.recordingPolicy,
  } as const;
  await getPrisma().voiceExtension.upsert({ where: { id: e.id }, create: { id: e.id, ...data }, update: data });
}

export async function saveNumber(n: StoredNumber) {
  if (!voiceDbAvailable()) return;
  await ensureDefaultTrunk();
  const data = {
    organizationId: n.organizationId,
    number: n.e164Number,
    label: n.displayName,
    trunkId: n.trunkId || DEFAULT_TRUNK_ID,
    inboundTarget: n.primaryAction,
    inboundTargetId: n.primaryTargetId || null,
    deletedAt: n.status === 'RELEASED' ? new Date() : null,
  };
  await getPrisma().voiceNumber.upsert({ where: { id: n.id }, create: { id: n.id, ...data }, update: data });
  await numberMeta().upsert({ id: n.id, secondaryAction: n.secondaryAction, secondaryTargetId: n.secondaryTargetId, scheduleId: n.scheduleId });
}

export async function deleteNumber(id: string) {
  if (!voiceDbAvailable()) return;
  await getPrisma().voiceNumber.updateMany({ where: { id }, data: { deletedAt: new Date() } });
}
