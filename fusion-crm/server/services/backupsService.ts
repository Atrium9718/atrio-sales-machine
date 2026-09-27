import fs from 'fs';
import path from 'path';

/**
 * Respaldos de la base que hace el servicio "backup" (infra/backup) en el volumen compartido.
 * La app lo monta en solo lectura en BACKUP_DIR (por defecto /backups).
 */
export const backupDir = () => process.env.BACKUP_DIR || '/backups';

const FILE_RE = /^fusion-[A-Za-z0-9_]+-(\d{8})-(\d{6})\.dump$/;

export interface BackupFile {
  id: string;
  date: string;
  sizeBytes: number;
}

export interface BackupStatus {
  ok: boolean;
  at: string;
  file?: string;
  error?: string;
  remote?: string;
  remoteOk?: boolean;
}

export function listBackups(dir = backupDir()): BackupFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { id: f, date: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export function readBackupStatus(dir = backupDir()): BackupStatus | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'last-status.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Ruta del archivo si el nombre es válido y existe (evita salir de la carpeta). */
export function resolveBackupFile(name: string, dir = backupDir()): string | null {
  if (!FILE_RE.test(name)) return null;
  const file = path.join(dir, name);
  return fs.existsSync(file) ? file : null;
}
