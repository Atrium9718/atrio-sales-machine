/**
 * Políticas de Retención de Mensajes de Chat (Etapa 15.5)
 */

import { ChatChannelType } from './types';

export interface RetentionPolicyConfig {
  defaultRetentionDays: number; // Por defecto 24 meses = 730 días
  entityRetentionDays: number | null; // null = indefinido
  directRetentionDays?: number; // Por defecto igual a defaultRetentionDays
}

export const DEFAULT_RETENTION_CONFIG: RetentionPolicyConfig = {
  defaultRetentionDays: 730, // 24 meses
  entityRetentionDays: null, // Indefinida para canales de entidad (Proyectos, Cotizaciones, Clientes)
  directRetentionDays: 730,
};

/**
 * Retorna los días de retención según el tipo de canal.
 * null indica retención indefinida (nunca se purga).
 */
export function getChannelRetentionDays(
  channelType: ChatChannelType,
  config: RetentionPolicyConfig = DEFAULT_RETENTION_CONFIG
): number | null {
  if (channelType === 'ENTITY') {
    return config.entityRetentionDays; // indefinido
  }
  if (channelType === 'DIRECT') {
    return config.directRetentionDays ?? config.defaultRetentionDays;
  }
  return config.defaultRetentionDays;
}

/**
 * Determina si un mensaje supera la antigüedad permitida por la política de retención.
 */
export function isMessageExpired(
  createdAt: Date | string,
  channelType: ChatChannelType,
  referenceDate: Date = new Date(),
  config: RetentionPolicyConfig = DEFAULT_RETENTION_CONFIG
): boolean {
  const retentionDays = getChannelRetentionDays(channelType, config);
  if (retentionDays === null || retentionDays === undefined) {
    return false; // Retención indefinida
  }

  const createdTime = new Date(createdAt).getTime();
  const cutoffTime = referenceDate.getTime() - retentionDays * 24 * 60 * 60 * 1000;

  return createdTime < cutoffTime;
}
