import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secretKey = process.env.SECRET_ENCRYPTION_KEY || process.env.APP_SECRET || 'fusion-vault-encryption-secret-key-32';
  return crypto.createHash('sha256').update(secretKey).digest();
}

export interface EncryptedSecretData {
  encryptedValue: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

/**
 * Cifra un valor sensible usando AES-256-GCM.
 */
export function encryptSecret(plainText: string): EncryptedSecretData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    authTag,
    algorithm: ALGORITHM,
  };
}

/**
 * Descifra un valor sensible cifrado con AES-256-GCM.
 */
export function decryptSecret(encryptedData: {
  encryptedValue: string;
  iv: string;
  authTag?: string | null;
}): string {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  if (encryptedData.authTag) {
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  }

  let decrypted = decipher.update(encryptedData.encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Genera una contraseña SIP criptográficamente segura de 24 caracteres.
 * NUNCA elegida por el usuario, jamás igual a la extensión.
 */
export function generateSecureSipPassword(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}
