import type { DocumentRepository } from './types';

/**
 * Fase 2 de la migración: colecciones que no tienen tabla propia y viven en el almacén
 * genérico (app_documents en Postgres). Se copian tal cual, con el mismo nombre.
 */
export const GENERIC_COLLECTIONS = [
  // Equipo y configuración
  'employees',
  'roles',
  'app_settings',
  'settings_history',
  'system_settings',
  'master_catalogs',
  'tariff_versions',
  'system_config',
  'inventory_movements',
  'quote_links',
  'voice_number_meta',
  'voice_ivr_drafts',
  'voice_ivr_history',
  'voice_settings',
  'access_reviews',
  'auth_sessions',
  'security_events',
  // Comercial y producción
  'appointments',
  'opportunities',
  'catalog_products',
  'inventory_items',
  'print_orders',
  'project_tombstones',
  'quote_assist_runs',
  'assist_templates',
  // Portal y omnicanal
  'client_portal_links',
  'client_requests',
  'portal_login_codes',
  'kiosk_settings',
  'kiosk_devices',
  'omni_conversations',
  'omnichannel_settings',
  'omni_stage_notices',
  'ai_usage',
  'ai_corrections',
  'ai_budget_alerts',
  'ai_evals',
  'chats',
  'files',
  // Estado de chat interno, anuncios, llamadas… (ver persistenceService)
  'state_announcements',
  'state_shoutouts',
  'state_channels',
  'state_messages',
  'state_pins',
  'state_savedReplies',
  'state_activities',
  'state_auditLogs',
  'state_homeAuditLogs',
  'state_callSessions',
  'state_callParticipants',
  'state_callInvitations',
  'state_homeUserLayouts',
  'state_homeRoleLayouts',
  'state_homeMyDayTasks',
] as const;

export interface GenericReport {
  collections: Record<string, { read: number; written: number; failed: number; error?: string }>;
  mismatches: string[];
}

/** Copia (idempotente) cada colección y verifica que en el destino estén todos los ids. */
export async function migrateGenericCollections(
  names: readonly string[],
  source: (name: string) => DocumentRepository,
  target: (name: string) => DocumentRepository,
  opts: { dryRun?: boolean; log?: (m: string) => void; batchSize?: number } = {}
): Promise<GenericReport> {
  const log = opts.log ?? (() => undefined);
  const batch = opts.batchSize ?? 200;
  const report: GenericReport = { collections: {}, mismatches: [] };

  for (const name of names) {
    const entry = { read: 0, written: 0, failed: 0 } as GenericReport['collections'][string];
    report.collections[name] = entry;
    let docs: any[];
    try {
      docs = await source(name).list();
    } catch (err: any) {
      entry.error = err?.message || String(err);
      log(`${name}: no se pudo leer (${entry.error})`);
      continue;
    }
    entry.read = docs.length;
    if (opts.dryRun || !docs.length) {
      log(`${name}: ${docs.length} documento(s)`);
      continue;
    }
    for (let i = 0; i < docs.length; i += batch) {
      const chunk = docs.slice(i, i + batch);
      try {
        await target(name).upsertMany(chunk);
        entry.written += chunk.length;
      } catch {
        // Lote fallido: se intenta uno por uno para aislar el documento con problema
        for (const d of chunk) {
          try {
            await target(name).upsert(d);
            entry.written++;
          } catch {
            entry.failed++;
          }
        }
      }
    }
    const inTarget = new Set((await target(name).list()).map((d) => d.id));
    const missing = docs.filter((d) => !inTarget.has(d.id)).length;
    if (missing) report.mismatches.push(`${name}: faltan ${missing} documento(s) en Postgres`);
    log(`${name}: ${entry.written}/${entry.read} copiados`);
  }
  return report;
}
