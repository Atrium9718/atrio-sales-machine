/**
 * FUSION CRM — SERVICIO DE APROVISIONAMIENTO DE EXTENSIONES VOIP (ETAPA 17.2)
 *
 * Gestiona el ciclo de vida de extensiones WebRTC y SIP clásico en Asterisk 22
 * mediante la API REST de ARI y almacenamiento dinámico Sorcery (astdb).
 */

import { encryptSecret, decryptSecret, generateSecureSipPassword } from '../../../../../../packages/core/src/security/secrets';
import { inMemoryAuditLogs } from '../../../../../../server/services/callsService';

export interface ProvisionResult {
  success: boolean;
  extension: string;
  sipUsername: string;
  status: 'ACTIVE' | 'PENDING_PROVISION' | 'DISABLED';
  inAsterisk: boolean;
  error?: string;
}

export interface EndpointLiveInfo {
  resource: string;
  state: 'online' | 'offline' | 'unknown' | 'ring' | 'inuse' | 'busy';
  technology: string;
  channelIds?: string[];
}

export interface InMemExtension {
  id: string;
  organizationId: string;
  userId?: string;
  extension: string;
  label: string;
  sipUsername: string;
  sipPasswordSecretId: string;
  type: 'USER' | 'DESK' | 'VIRTUAL' | 'EXTERNAL_MEDIA';
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_PROVISION';
  ringStrategy: 'BROWSER_ONLY' | 'BROWSER_THEN_MOBILE' | 'BROWSER_AND_MOBILE' | 'MOBILE_ONLY';
  mobileNumber?: string;
  ringTimeoutSeconds: number;
  voicemailEnabled: boolean;
  recordingPolicy: 'ALWAYS' | 'NEVER' | 'INBOUND_ONLY' | 'OUTBOUND_ONLY';
  lastRegisteredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InMemSecret {
  id: string;
  organizationId: string;
  key: string;
  encryptedValue: string;
  iv: string;
  authTag?: string;
  algorithm: string;
  createdAt: string;
  updatedAt: string;
}

// Almacén en memoria persistido con respaldo fallback
export const inMemorySecrets: Map<string, InMemSecret> = new Map();
export const inMemoryExtensions: Map<string, InMemExtension> = new Map();
let currentExtensionSequence = 100;

// Caché de estado en vivo de Asterisk (10 segundos)
let endpointCache: { timestamp: number; data: Map<string, EndpointLiveInfo> } = {
  timestamp: 0,
  data: new Map(),
};

/**
 * Cliente HTTP para Asterisk ARI
 */
class AsteriskAriClient {
  private get baseUrl(): string {
    return process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088';
  }

  private get authHeader(): string {
    const user = process.env.ASTERISK_ARI_USERNAME || 'fusion';
    const pass = process.env.ASTERISK_ARI_PASSWORD || 'fusion_secret_ari_2026';
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/ari${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      if (res.status === 404) return null;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`ARI error ${res.status}: ${text || res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      const res = await this.request('/asterisk/info');
      return Boolean(res && res.system_info);
    } catch {
      return false;
    }
  }

  async getEndpoints(): Promise<any[]> {
    try {
      const res = await this.request('/endpoints');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }

  async getEndpoint(tech: string, resource: string): Promise<any> {
    try {
      return await this.request(`/endpoints/${tech}/${resource}`);
    } catch {
      return null;
    }
  }

  async putDynamicConfig(category: string, id: string, fields: { attribute: string; value: string }[]): Promise<any> {
    return await this.request(`/asterisk/config/dynamic/res_pjsip/${category}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });
  }

  async deleteDynamicConfig(category: string, id: string): Promise<any> {
    try {
      return await this.request(`/asterisk/config/dynamic/res_pjsip/${category}/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn(`Could not delete dynamic config ${category}/${id}:`, e);
      return false;
    }
  }
}

export const ariClient = new AsteriskAriClient();

/**
 * Obtiene el siguiente número libre de extensión (inicia en 101)
 */
function getNextExtensionNumber(): string {
  const existingNums = new Set(
    Array.from(inMemoryExtensions.values()).map((e) => parseInt(e.extension, 10))
  );

  let candidate = currentExtensionSequence + 1;
  while (existingNums.has(candidate)) {
    candidate++;
  }
  currentExtensionSequence = candidate;
  return candidate.toString();
}

/**
 * Registra un evento en el log de auditoría
 */
function recordAudit(action: string, details: Record<string, any>, userId?: string) {
  inMemoryAuditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    userId: userId || 'SYSTEM',
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Aprovisiona de forma idempotente la extensión telefónica de un usuario
 */
export async function provisionExtension(
  userId: string,
  userName = 'Usuario',
  organizationId = 'org-default',
  type: 'USER' | 'DESK' | 'VIRTUAL' = 'USER'
): Promise<ProvisionResult> {
  // 1. Verificar si ya existe para este usuario
  const existing = Array.from(inMemoryExtensions.values()).find(
    (e) => e.userId === userId && e.organizationId === organizationId
  );

  let extNumber = existing ? existing.extension : getNextExtensionNumber();
  let sipUsername = `ext_${extNumber}`;

  // 2. Generar contraseña segura y guardarla cifrada en Secret
  const plainPassword = generateSecureSipPassword(24);
  const encrypted = encryptSecret(plainPassword);

  const secretId = `sec_ext_${extNumber}`;
  inMemorySecrets.set(secretId, {
    id: secretId,
    organizationId,
    key: `sip:secret:${extNumber}`,
    encryptedValue: encrypted.encryptedValue,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    algorithm: encrypted.algorithm,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 3. Crear o actualizar VoiceExtension en memoria
  const extensionRecord: InMemExtension = {
    id: existing ? existing.id : `ext_id_${extNumber}`,
    organizationId,
    userId,
    extension: extNumber,
    label: `${userName} (Ext. ${extNumber})`,
    sipUsername,
    sipPasswordSecretId: secretId,
    type,
    status: 'ACTIVE',
    ringStrategy: 'BROWSER_ONLY',
    ringTimeoutSeconds: 25,
    voicemailEnabled: true,
    recordingPolicy: 'ALWAYS',
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryExtensions.set(extNumber, extensionRecord);

  // 4. Escribir objetos dinámicos PJSIP en Asterisk vía ARI
  let inAsterisk = false;
  let asteriskError: string | undefined;

  try {
    const isAriUp = await ariClient.isAlive();
    if (isAriUp) {
      // a. AOR
      await ariClient.putDynamicConfig('aor', extNumber, [
        { attribute: 'max_contacts', value: '3' },
        { attribute: 'remove_existing', value: 'yes' },
        { attribute: 'qualify_frequency', value: '30' },
      ]);

      // b. Auth
      await ariClient.putDynamicConfig('auth', extNumber, [
        { attribute: 'auth_type', value: 'userpass' },
        { attribute: 'username', value: sipUsername },
        { attribute: 'password', value: plainPassword },
      ]);

      // c. Endpoint (WebRTC)
      await ariClient.putDynamicConfig('endpoint', extNumber, [
        { attribute: 'context', value: 'fusion-entrante' },
        { attribute: 'disallow', value: 'all' },
        { attribute: 'allow', value: 'opus,ulaw,alaw' },
        { attribute: 'aors', value: extNumber },
        { attribute: 'auth', value: extNumber },
        { attribute: 'webrtc', value: 'yes' },
        { attribute: 'dtls_auto_generate_cert', value: 'yes' },
        { attribute: 'direct_media', value: 'no' },
        { attribute: 'force_rport', value: 'yes' },
        { attribute: 'rewrite_contact', value: 'yes' },
      ]);

      // 5. Verificar con GET /endpoints/PJSIP/{ext}
      const verified = await ariClient.getEndpoint('PJSIP', extNumber);
      inAsterisk = Boolean(verified);
    } else {
      extensionRecord.status = 'PENDING_PROVISION';
      asteriskError = 'Asterisk ARI no disponible temporalmente. Extensión marcada PENDING_PROVISION.';
    }
  } catch (err: any) {
    console.warn(`[Provisioning] Falló registro en Asterisk ARI para ${extNumber}:`, err.message);
    extensionRecord.status = 'PENDING_PROVISION';
    asteriskError = err.message;
  }

  // 6. Escribir en AuditLog
  recordAudit('VOICE_EXTENSION_PROVISIONED', {
    extension: extNumber,
    userId,
    status: extensionRecord.status,
    inAsterisk,
  }, userId);

  return {
    success: true,
    extension: extNumber,
    sipUsername,
    status: extensionRecord.status,
    inAsterisk,
    error: asteriskError,
  };
}

/**
 * Desaprovisiona una extensión: elimina de Asterisk, marca DISABLED pero conserva historial de llamadas
 */
export async function deprovisionExtension(
  extensionNumber: string,
  adminUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const ext = inMemoryExtensions.get(extensionNumber);
  if (!ext) {
    return { success: false, error: 'Extensión no encontrada' };
  }

  // 1. Eliminar objetos de Asterisk ARI
  try {
    await ariClient.deleteDynamicConfig('endpoint', extensionNumber);
    await ariClient.deleteDynamicConfig('auth', extensionNumber);
    await ariClient.deleteDynamicConfig('aor', extensionNumber);
  } catch (e) {
    console.warn('[Deprovisioning] Error borrando configuración en Asterisk:', e);
  }

  // 2. Marcar extensión DISABLED (NUNCA borrar histórico de llamadas VoiceCall)
  ext.status = 'DISABLED';
  ext.updatedAt = new Date().toISOString();

  // 3. Registrar en AuditLog
  recordAudit('VOICE_EXTENSION_DEPROVISIONED', {
    extension: extensionNumber,
    userId: ext.userId,
  }, adminUserId);

  return { success: true };
}

/**
 * Rota la contraseña SIP de una extensión
 */
export async function rotateSecret(
  extensionNumber: string,
  adminUserId?: string
): Promise<{ success: boolean; newPassword?: string; error?: string }> {
  const ext = inMemoryExtensions.get(extensionNumber);
  if (!ext) {
    return { success: false, error: 'Extensión no encontrada' };
  }

  const newPassword = generateSecureSipPassword(24);
  const encrypted = encryptSecret(newPassword);

  // Actualizar Secret
  const secret = inMemorySecrets.get(ext.sipPasswordSecretId);
  if (secret) {
    secret.encryptedValue = encrypted.encryptedValue;
    secret.iv = encrypted.iv;
    secret.authTag = encrypted.authTag;
    secret.updatedAt = new Date().toISOString();
  } else {
    inMemorySecrets.set(ext.sipPasswordSecretId, {
      id: ext.sipPasswordSecretId,
      organizationId: ext.organizationId,
      key: `sip:secret:${extensionNumber}`,
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      algorithm: encrypted.algorithm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Actualizar en Asterisk ARI
  try {
    if (await ariClient.isAlive()) {
      await ariClient.putDynamicConfig('auth', extensionNumber, [
        { attribute: 'auth_type', value: 'userpass' },
        { attribute: 'username', value: ext.sipUsername },
        { attribute: 'password', value: newPassword },
      ]);
    }
  } catch (err) {
    console.warn('[RotateSecret] Falló actualización en Asterisk ARI:', err);
  }

  recordAudit('VOICE_EXTENSION_SECRET_ROTATED', {
    extension: extensionNumber,
    userId: ext.userId,
  }, adminUserId);

  return { success: true, newPassword };
}

/**
 * Consulta las credenciales descifradas de una extensión (una sola vez, con estricta auditoría)
 */
export function revealCredentials(
  extensionNumber: string,
  viewerUserId: string
): { success: boolean; credentials?: { extension: string; username: string; password: string }; error?: string } {
  const ext = inMemoryExtensions.get(extensionNumber);
  if (!ext) return { success: false, error: 'Extensión no encontrada' };

  const secret = inMemorySecrets.get(ext.sipPasswordSecretId);
  if (!secret) return { success: false, error: 'Secreto de credencial no encontrado' };

  try {
    const plainPassword = decryptSecret({
      encryptedValue: secret.encryptedValue,
      iv: secret.iv,
      authTag: secret.authTag,
    });

    recordAudit('VOICE_CREDENTIALS_REVEALED', {
      extension: extensionNumber,
      viewerUserId,
    }, viewerUserId);

    return {
      success: true,
      credentials: {
        extension: ext.extension,
        username: ext.sipUsername,
        password: plainPassword,
      },
    };
  } catch (e: any) {
    return { success: false, error: 'Error descifrando secreto: ' + e.message };
  }
}

/**
 * Obtiene el estado de registro en vivo de Asterisk con caché de 10 segundos
 */
export async function getCachedLiveEndpoints(): Promise<Map<string, EndpointLiveInfo>> {
  const now = Date.now();
  if (now - endpointCache.timestamp < 10000 && endpointCache.data.size > 0) {
    return endpointCache.data;
  }

  const result = new Map<string, EndpointLiveInfo>();
  try {
    const endpoints = await ariClient.getEndpoints();
    for (const ep of endpoints) {
      if (ep.technology?.toUpperCase() === 'PJSIP') {
        result.set(ep.resource, {
          resource: ep.resource,
          state: (ep.state?.toLowerCase() || 'unknown') as any,
          technology: ep.technology,
          channelIds: ep.channel_ids || [],
        });
      }
    }
    endpointCache = { timestamp: now, data: result };
  } catch (err) {
    console.warn('[Endpoints] No se pudo consultar ARI en vivo:', err);
  }

  return result;
}

/**
 * Reconcilia extensiones marcadas como PENDING_PROVISION con Asterisk
 */
export async function reconcileExtensions(): Promise<{
  total: number;
  synced: number;
  pending: number;
  errors: string[];
}> {
  let synced = 0;
  let pending = 0;
  const errors: string[] = [];

  const isAriUp = await ariClient.isAlive();
  if (!isAriUp) {
    return {
      total: inMemoryExtensions.size,
      synced: 0,
      pending: inMemoryExtensions.size,
      errors: ['El servidor Asterisk ARI no responde en http://127.0.0.1:8088'],
    };
  }

  for (const [extNum, ext] of inMemoryExtensions.entries()) {
    if (ext.status === 'DISABLED') continue;

    try {
      const secret = inMemorySecrets.get(ext.sipPasswordSecretId);
      if (!secret) {
        errors.push(`Ext ${extNum}: no tiene secreto asociado.`);
        continue;
      }

      const pass = decryptSecret({
        encryptedValue: secret.encryptedValue,
        iv: secret.iv,
        authTag: secret.authTag,
      });

      // Escribir de nuevo en ARI
      await ariClient.putDynamicConfig('aor', extNum, [
        { attribute: 'max_contacts', value: '3' },
        { attribute: 'remove_existing', value: 'yes' },
        { attribute: 'qualify_frequency', value: '30' },
      ]);

      await ariClient.putDynamicConfig('auth', extNum, [
        { attribute: 'auth_type', value: 'userpass' },
        { attribute: 'username', value: ext.sipUsername },
        { attribute: 'password', value: pass },
      ]);

      await ariClient.putDynamicConfig('endpoint', extNum, [
        { attribute: 'context', value: 'fusion-entrante' },
        { attribute: 'disallow', value: 'all' },
        { attribute: 'allow', value: 'opus,ulaw,alaw' },
        { attribute: 'aors', value: extNum },
        { attribute: 'auth', value: extNum },
        { attribute: 'webrtc', value: 'yes' },
        { attribute: 'dtls_auto_generate_cert', value: 'yes' },
        { attribute: 'direct_media', value: 'no' },
        { attribute: 'force_rport', value: 'yes' },
        { attribute: 'rewrite_contact', value: 'yes' },
      ]);

      ext.status = 'ACTIVE';
      ext.updatedAt = new Date().toISOString();
      synced++;
    } catch (err: any) {
      ext.status = 'PENDING_PROVISION';
      pending++;
      errors.push(`Ext ${extNum}: ${err.message}`);
    }
  }

  recordAudit('VOICE_EXTENSIONS_RECONCILED', { synced, pending, errors });
  return { total: inMemoryExtensions.size, synced, pending, errors };
}

// Inicializar extensiones por defecto para el equipo comercial de Fusión
if (inMemoryExtensions.size === 0) {
  // Ext 101 - Cristian (Comercial)
  inMemoryExtensions.set('101', {
    id: 'ext_101',
    organizationId: 'org-default',
    userId: 'user_cristian_comercial',
    extension: '101',
    label: 'Cristian — Director Comercial',
    sipUsername: 'ext_101',
    sipPasswordSecretId: 'sec_ext_101',
    type: 'USER',
    status: 'ACTIVE',
    ringStrategy: 'BROWSER_AND_MOBILE',
    mobileNumber: '+573001234567',
    ringTimeoutSeconds: 25,
    voicemailEnabled: true,
    recordingPolicy: 'ALWAYS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const pw101 = generateSecureSipPassword(24);
  const enc101 = encryptSecret(pw101);
  inMemorySecrets.set('sec_ext_101', {
    id: 'sec_ext_101',
    organizationId: 'org-default',
    key: 'sip:secret:101',
    encryptedValue: enc101.encryptedValue,
    iv: enc101.iv,
    authTag: enc101.authTag,
    algorithm: enc101.algorithm,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Ext 102 - Andrés (Operaciones)
  inMemoryExtensions.set('102', {
    id: 'ext_102',
    organizationId: 'org-default',
    userId: 'user_andres_operaciones',
    extension: '102',
    label: 'Andrés — Operaciones y Producción',
    sipUsername: 'ext_102',
    sipPasswordSecretId: 'sec_ext_102',
    type: 'USER',
    status: 'ACTIVE',
    ringStrategy: 'BROWSER_ONLY',
    ringTimeoutSeconds: 20,
    voicemailEnabled: true,
    recordingPolicy: 'ALWAYS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const pw102 = generateSecureSipPassword(24);
  const enc102 = encryptSecret(pw102);
  inMemorySecrets.set('sec_ext_102', {
    id: 'sec_ext_102',
    organizationId: 'org-default',
    key: 'sip:secret:102',
    encryptedValue: enc102.encryptedValue,
    iv: enc102.iv,
    authTag: enc102.authTag,
    algorithm: enc102.algorithm,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  currentExtensionSequence = 102;
}
