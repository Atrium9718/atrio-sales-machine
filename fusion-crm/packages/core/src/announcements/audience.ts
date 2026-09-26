/**
 * Resolución y Sincronización de Audiencias — Tablero de Anuncios (Etapa 15.4)
 */

import { AudienceTarget } from './types';

export interface UserAudienceProfile {
  id: string;
  role: string;
  areaKey?: string | null;
  teamKey?: string | null;
  isActive?: boolean;
}

/**
 * Resuelve una lista de objetivos de audiencia a un conjunto único de IDs de usuario.
 * Regla: Exactamente un destinatario por usuario, sin duplicados.
 */
export function resolveAudienceUserIds(
  audiences: AudienceTarget[],
  allUsers: UserAudienceProfile[]
): string[] {
  const activeUsers = allUsers.filter((u) => u.isActive !== false);

  if (audiences.length === 0) {
    return [];
  }

  // Si incluye 'EVERYONE', abarca a todos los usuarios activos
  const hasEveryone = audiences.some((a) => a.targetType === 'EVERYONE');
  if (hasEveryone) {
    return activeUsers.map((u) => u.id);
  }

  const matchedUserIds = new Set<string>();

  for (const aud of audiences) {
    switch (aud.targetType) {
      case 'ROLE':
        if (aud.roleId) {
          const targetRole = aud.roleId.toLowerCase();
          for (const u of activeUsers) {
            if (u.role.toLowerCase() === targetRole) {
              matchedUserIds.add(u.id);
            }
          }
        }
        break;

      case 'AREA':
        if (aud.areaKey) {
          const targetArea = aud.areaKey.toLowerCase();
          for (const u of activeUsers) {
            if (u.areaKey && u.areaKey.toLowerCase() === targetArea) {
              matchedUserIds.add(u.id);
            }
          }
        }
        break;

      case 'TEAM':
        if (aud.roleId || aud.areaKey) {
          const targetTeam = (aud.roleId || aud.areaKey || '').toLowerCase();
          for (const u of activeUsers) {
            if (u.teamKey && u.teamKey.toLowerCase() === targetTeam) {
              matchedUserIds.add(u.id);
            }
          }
        }
        break;

      case 'USER':
        if (aud.userId) {
          const userExists = activeUsers.some((u) => u.id === aud.userId);
          if (userExists) {
            matchedUserIds.add(aud.userId);
          }
        }
        break;
    }
  }

  return Array.from(matchedUserIds);
}

/**
 * Calcula qué usuarios deben recibir un nuevo acuse al actualizar la audiencia.
 * Regla del CONTEXTO MAESTRO:
 * "Cambiar la audiencia de un anuncio ya publicado agrega receipts nuevos y no borra los existentes".
 */
export function calculateNewReceiptUserIds(
  existingReceiptUserIds: string[],
  newAudienceUserIds: string[]
): string[] {
  const existingSet = new Set(existingReceiptUserIds);
  return newAudienceUserIds.filter((userId) => !existingSet.has(userId));
}
