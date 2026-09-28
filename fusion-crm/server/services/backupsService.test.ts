import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { listBackups, readBackupStatus, resolveBackupFile } from './backupsService';

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'respaldos-'));
  fs.writeFileSync(path.join(dir, 'fusion-fusion_crm-20260926-020000.dump'), 'a');
  fs.writeFileSync(path.join(dir, 'fusion-fusion_crm-20260927-020000.dump'), 'abc');
  fs.writeFileSync(path.join(dir, 'fusion-fusion_crm-20260927-030000.dump.part'), 'x'); // a medio hacer
  fs.writeFileSync(path.join(dir, 'otra-cosa.txt'), 'x');
  fs.writeFileSync(path.join(dir, 'fusion-uploads-20260927-020000.tar.gz'), 'tgz');
  fs.writeFileSync(path.join(dir, 'last-status.json'), JSON.stringify({ ok: true, at: '2026-09-27T02:00:05-05:00', remote: '', remoteOk: false }));
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('respaldos', () => {
  it('lista solo los respaldos terminados, el más reciente primero', () => {
    const list = listBackups(dir).filter((b) => b.kind === 'database');
    expect(list.map((b) => b.id)).toEqual(['fusion-fusion_crm-20260927-020000.dump', 'fusion-fusion_crm-20260926-020000.dump']);
    expect(list[0].sizeBytes).toBe(3);
    expect(listBackups(dir).find((b) => b.kind === 'files')?.id).toBe('fusion-uploads-20260927-020000.tar.gz');
  });

  it('lee el estado del último respaldo', () => {
    expect(readBackupStatus(dir)).toMatchObject({ ok: true });
    expect(readBackupStatus(path.join(dir, 'no-existe'))).toBeNull();
  });

  it('solo permite descargar archivos de respaldo de la carpeta', () => {
    expect(resolveBackupFile('fusion-fusion_crm-20260927-020000.dump', dir)).toBe(path.join(dir, 'fusion-fusion_crm-20260927-020000.dump'));
    expect(resolveBackupFile('../etc/passwd', dir)).toBeNull();
    expect(resolveBackupFile('last-status.json', dir)).toBeNull();
    expect(resolveBackupFile('fusion-fusion_crm-20200101-000000.dump', dir)).toBeNull();
  });

  it('sin carpeta devuelve lista vacía', () => {
    expect(listBackups(path.join(dir, 'nada'))).toEqual([]);
  });
});
