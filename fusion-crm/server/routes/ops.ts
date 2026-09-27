import { Router } from 'express';
import fs from 'fs';
import { isAdminRole } from '../auth/session';
import { backupDir, listBackups, readBackupStatus, resolveBackupFile } from '../services/backupsService';
import { dataBackend } from '../repositories';
import { documentRepository } from '../repositories/documentStore';
import { getPrisma } from '../repositories/prisma/client';
import { getAdminAuth } from '../auth/firebaseAdmin';
import { eventBus } from '../events/DomainEventBus';
import { describeIntegrations, testIntegration } from '../services/integrations';
import { diskInfo, metricsSnapshot, processInfo, versionInfo } from '../services/systemHealth';
import { uploadsDir } from '../services/fileStorage';
import { budgetWatcher, stageNotifier } from '../omnichannel/runtime';
import { saveStateToFirestore } from '../services/persistenceService';

export const opsRouter = Router();

/** Todo /api/ops es de administración. */
opsRouter.use((req, res, next) => {
  if (isAdminRole(String(req.headers['x-user-role'] || ''))) return next();
  res.status(403).json({ success: false, error: 'Solo administradores' });
});

async function pingDatabase(): Promise<{ message: string; latencyMs: number; sizeMb: number | null }> {
  const t0 = Date.now();
  if (dataBackend() === 'postgres') {
    const rows: any[] = await getPrisma().$queryRawUnsafe('SELECT pg_database_size(current_database())::bigint AS size');
    const sizeMb = Math.round(Number(rows[0]?.size ?? 0) / 1024 / 1024);
    return { message: `Postgres responde (${sizeMb} MB)`, latencyMs: Date.now() - t0, sizeMb };
  }
  await documentRepository('app_settings').get('values');
  return { message: 'Firestore responde', latencyMs: Date.now() - t0, sizeMb: null };
}

async function pingFirebase(): Promise<string> {
  const auth = getAdminAuth();
  if (!auth) throw new Error('Firebase no está configurado (falta la cuenta de servicio)');
  await auth.listUsers(1);
  return 'Firebase responde (inicio de sesión disponible)';
}

// BLOQUE A: Integraciones (estado real según la configuración del servidor)
opsRouter.get('/integrations', (_req, res) => {
  res.json({ success: true, integrations: describeIntegrations(process.env) });
});

opsRouter.post('/integrations/:id/test', async (req, res) => {
  const result = await testIntegration(req.params.id, {
    env: process.env,
    fetch: fetch as any,
    pingDatabase: async () => (await pingDatabase()).message,
    pingFirebase,
  });
  res.json({ success: true, ...result });
});

// BLOQUE B: Salud del sistema
opsRouter.get('/health', async (_req, res) => {
  const db = await pingDatabase().then(
    (r) => ({ ok: true, ...r }),
    (err) => ({ ok: false, message: String(err?.message || err), latencyMs: null, sizeMb: null })
  );
  const [notices, budget, disks] = await Promise.all([
    stageNotifier().list().catch(() => []),
    budgetWatcher().check().catch(() => null),
    Promise.all([diskInfo(process.cwd()), diskInfo(uploadsDir()), diskInfo(backupDir())]),
  ]);
  const backups = listBackups(backupDir());
  const lastBackup = backups.find((b) => b.kind === 'database') ?? null;
  const events = eventBus.getRecent();
  res.json({
    success: true,
    version: versionInfo(),
    process: processInfo(),
    database: { backend: dataBackend(), ...db },
    disks: disks.filter(Boolean).filter((d, i, all) => all.findIndex((x) => x!.totalGb === d!.totalGb && x!.freeGb === d!.freeGb) === i),
    metrics: metricsSnapshot(),
    backups: { available: fs.existsSync(backupDir()), last: lastBackup, status: readBackupStatus(backupDir()) },
    notices: {
      scheduled: notices.filter((n: any) => n.status === 'scheduled').length,
      failed: notices.filter((n: any) => n.status === 'failed').length,
    },
    aiBudget: budget,
    events: { recent: events.length, withErrors: events.filter((e) => e.errors.length).length },
  });
});

// BLOQUE C: Eventos recientes del sistema (en memoria desde el último arranque)
opsRouter.get('/events', (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : '';
  const onlyErrors = req.query.errors === 'true';
  const events = eventBus
    .getRecent()
    .filter((e) => (!type || e.type === type) && (!onlyErrors || e.errors.length))
    .slice(0, 200);
  res.json({ success: true, events, types: [...new Set(eventBus.getRecent().map((e) => e.type))].sort() });
});

// BLOQUE D: Respaldos (archivos reales del servicio de respaldo)
opsRouter.get('/backups', (req, res) => {
  const dir = backupDir();
  const backups = listBackups(dir);
  res.json({ available: fs.existsSync(dir), backups, status: readBackupStatus(dir) });
});

opsRouter.get('/backups/:name/download', (req, res) => {
  if (!isAdminRole(String(req.headers['x-user-role'] || ''))) {
    return res.status(403).json({ error: 'Solo un administrador puede descargar respaldos' });
  }
  const file = resolveBackupFile(req.params.name);
  if (!file) return res.status(404).json({ error: 'Respaldo no encontrado' });
  console.log(`[respaldos] Descarga de ${req.params.name} por ${req.headers['x-user-id'] || 'desconocido'}`);
  res.download(file);
});

// BLOQUE E: Mantenimiento (tareas reales)
const MAINTENANCE: Record<string, () => Promise<string>> = {
  async process_notices() {
    const n = await stageNotifier().processDue();
    return n ? `Se enviaron ${n} aviso(s) pendientes.` : 'No había avisos pendientes para enviar ahora.';
  },
  async save_state() {
    await saveStateToFirestore(true);
    return 'Chat, anuncios y demás estado guardados en la base.';
  },
  async check_budget() {
    const b = await budgetWatcher().check(true);
    return b.budgetCop ? `Gasto del mes: ${Math.round((b.percent ?? 0) * 100)}% del tope.` : 'No hay tope mensual configurado.';
  },
  async test_integrations() {
    const results = [];
    for (const i of describeIntegrations(process.env).filter((x) => x.testable && x.configured)) {
      const r = await testIntegration(i.id, { env: process.env, fetch: fetch as any, pingDatabase: async () => (await pingDatabase()).message, pingFirebase });
      results.push(`${i.name}: ${r.ok ? 'OK' : `FALLA (${r.message})`}`);
    }
    return results.length ? results.join(' · ') : 'No hay conexiones configuradas para probar.';
  },
};

opsRouter.post('/maintenance/execute', async (req, res) => {
  const action = MAINTENANCE[String(req.body?.action || '')];
  if (!action) return res.status(400).json({ success: false, error: 'Tarea desconocida' });
  try {
    const message = await action();
    console.log(`[mantenimiento] ${req.body.action} por ${req.headers['x-user-name'] || 'desconocido'}: ${message}`);
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'La tarea falló' });
  }
});
