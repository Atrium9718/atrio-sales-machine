import type { AppDocument, DocumentRepository } from './types';

/**
 * Copia clientes, cotizaciones y proyectos de un origen (Firestore) a un destino (Postgres).
 * Es idempotente: cada documento se guarda por su id, así que puede repetirse sin duplicar.
 */
export interface PhaseRepos {
  clients: DocumentRepository;
  quotes: DocumentRepository;
  projects: DocumentRepository;
}

export interface EntityReport {
  read: number;
  written: number;
  failed: { id: string; error: string }[];
}

export interface MigrationReport {
  dryRun: boolean;
  entities: Record<keyof PhaseRepos, EntityReport>;
  /** Diferencias encontradas al comparar origen y destino después de copiar. */
  mismatches: string[];
}

const ORDER: (keyof PhaseRepos)[] = ['clients', 'quotes', 'projects'];

export async function migratePhase1(
  source: PhaseRepos,
  target: PhaseRepos,
  opts: { dryRun?: boolean; log?: (msg: string) => void } = {}
): Promise<MigrationReport> {
  const log = opts.log ?? (() => {});
  const report: MigrationReport = {
    dryRun: !!opts.dryRun,
    entities: {} as MigrationReport['entities'],
    mismatches: [],
  };

  const sourceDocs: Partial<Record<keyof PhaseRepos, AppDocument[]>> = {};

  for (const entity of ORDER) {
    const docs = await source[entity].list();
    sourceDocs[entity] = docs;
    const entry: EntityReport = { read: docs.length, written: 0, failed: [] };
    report.entities[entity] = entry;
    log(`${entity}: ${docs.length} en el origen`);
    if (opts.dryRun) continue;

    for (const doc of docs) {
      try {
        await target[entity].upsert(doc, { actorName: 'Migración desde Firestore' });
        entry.written++;
      } catch (err: any) {
        entry.failed.push({ id: doc.id, error: String(err?.message || err).split('\n').pop()!.slice(0, 300) });
      }
    }
    log(`${entity}: ${entry.written} copiados, ${entry.failed.length} con error`);
  }

  if (!opts.dryRun) {
    for (const entity of ORDER) {
      const failedIds = new Set(report.entities[entity].failed.map((f) => f.id));
      const targetById = new Map((await target[entity].list()).map((d) => [d.id, d]));
      for (const doc of sourceDocs[entity] || []) {
        if (failedIds.has(doc.id)) continue;
        const copy = targetById.get(doc.id);
        if (!copy) {
          report.mismatches.push(`${entity}/${doc.id}: no está en el destino`);
          continue;
        }
        if (entity === 'quotes') {
          const a = Number(doc.total) || 0;
          const b = Number(copy.total) || 0;
          if (Math.abs(a - b) > 0.01) report.mismatches.push(`quotes/${doc.id}: total ${a} en origen vs ${b} en destino`);
          const ai = Array.isArray(doc.items) ? doc.items.length : 0;
          const bi = Array.isArray(copy.items) ? copy.items.length : 0;
          if (ai !== bi) report.mismatches.push(`quotes/${doc.id}: ${ai} ítems en origen vs ${bi} en destino`);
        }
      }
    }
  }

  return report;
}
