/**
 * Empresa a la que pertenecen las llamadas cuando el número marcado no está registrado.
 * Debe coincidir con la del CRM (server/repositories/prisma/mappers.ts → ORGANIZATION_ID)
 * para que el cliente que llama se reconozca.
 */
export const DEFAULT_ORGANIZATION_ID = process.env.VOICE_ORGANIZATION_ID || 'org-1';
