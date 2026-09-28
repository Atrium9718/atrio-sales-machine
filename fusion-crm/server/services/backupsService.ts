import fs from 'fs';
import path from 'path';

/**
 * Respaldos de la base que hace el servicio "backup" (infra/backup) en el volumen compartido.
 * La app lo monta en solo lectura en BACKUP_DIR (por defecto /backups).
 */
export const backupDir = () => process.env.BACKUP_DIR || '/backups';

const DUMP_RE = /^fusion-[A-Za-z0-9_]+-(\d{8})-(\d{6})\.dump$/;
const FILES_RE = /^fusion-uploads-(\d{8})-(\d{6})\.tar\.gz$/;
/** Fecha del nombre (AAAAMMDDHHMMSS): ordena aunque el archivo se haya copiado después. */
const stampOf = (f: string) => { const m = f.match(DUMP_RE) || f.match(FILES_RE); return m ? m[1] + m[2] : ''; };
const isBackupName = (f: string) => DUMP_RE.test(f) || FILES_RE.test(f);

export interface BackupFile {
  id: string;
  /** Base de datos o archivos subidos (adjuntos). */
  kind: 'database' | 'files';
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
    .filter(isBackupName)
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { id: f, kind: FILES_RE.test(f) ? ('files' as const) : ('database' as const), date: stat.mtime.toISOString(), sizeBytes: stat.size };
    })
    .sort((a, b) => stampOf(b.id).localeCompare(stampOf(a.id)) || a.kind.localeCompare(b.kind));
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
  if (!isBackupName(name)) return null;
  const file = path.join(dir, name);
  return fs.existsSync(file) ? file : null;
}
