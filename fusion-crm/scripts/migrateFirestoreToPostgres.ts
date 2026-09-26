/**
 * Fase 1 de la migración a Postgres: copia clientes, cotizaciones y proyectos desde Firestore.
 *
 *   bun run db:migrate-data -- --dry-run   # solo cuenta lo que hay en Firestore
 *   bun run db:migrate-data                # copia (idempotente) y verifica
 *
 * Requiere DATABASE_URL (con `bun run db:migrate` ya aplicado), firebase-applet-config.json
 * y GOOGLE_APPLICATION_CREDENTIALS con la cuenta de servicio.
 */
import { authenticateServerFirestoreClient } from '../server/auth/serverFirestoreAuth';
import { createFirestoreRepository } from '../server/repositories/firestoreRepository';
import { createClientsRepository, createProjectsRepository, createQuotesRepository } from '../server/repositories/prisma/repositories';
import { disconnectPrisma } from '../server/repositories/prisma/client';
import { migratePhase1 } from '../server/repositories/migratePhase1';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!process.env.DATABASE_URL && !dryRun) throw new Error('Falta DATABASE_URL');

  const authenticated = await authenticateServerFirestoreClient();
  if (!authenticated) console.warn('Aviso: sin autenticación de servidor; con reglas cerradas Firestore no responderá.');

  const report = await migratePhase1(
    {
      clients: createFirestoreRepository('customers'),
      quotes: createFirestoreRepository('quotes'),
      projects: createFirestoreRepository('projects'),
    },
    { clients: createClientsRepository(), quotes: createQuotesRepository(), projects: createProjectsRepository() },
    { dryRun, log: (m) => console.log(`[migración] ${m}`) }
  );

  console.log('\nResumen' + (dryRun ? ' (simulación, no se escribió nada)' : ''));
  for (const [entity, r] of Object.entries(report.entities)) {
    console.log(`  ${entity.padEnd(9)} leídos ${r.read}, copiados ${r.written}, con error ${r.failed.length}`);
    for (const f of r.failed.slice(0, 20)) console.log(`     ✗ ${f.id}: ${f.error}`);
  }
  if (report.mismatches.length) {
    console.log(`\nDiferencias (${report.mismatches.length}):`);
    for (const m of report.mismatches.slice(0, 50)) console.log(`  - ${m}`);
  }

  const failed = Object.values(report.entities).some((r) => r.failed.length > 0) || report.mismatches.length > 0;
  await disconnectPrisma();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error('La migración falló:', err);
  await disconnectPrisma().catch(() => {});
  process.exit(1);
});
