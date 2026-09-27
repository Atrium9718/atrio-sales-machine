import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createLocalStorage, safeKey } from './fileStorage';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('almacenamiento de archivos en disco', () => {
  it('guarda y lee dentro de la carpeta', async () => {
    const s = createLocalStorage(root);
    await s.save('client-requests/sol-1/1-plano.pdf', Buffer.from('%PDF'), 'application/pdf');
    expect((await s.read('client-requests/sol-1/1-plano.pdf')).toString()).toBe('%PDF');
    expect(fs.existsSync(path.join(root, 'client-requests/sol-1/1-plano.pdf'))).toBe(true);
  });

  it('rechaza rutas que salen de la carpeta', async () => {
    const s = createLocalStorage(root);
    for (const bad of ['../x', '/etc/passwd', 'a/../../x', '..', '']) {
      await expect(s.save(bad, Buffer.from('x'), 'text/plain')).rejects.toThrow('Ruta de archivo inválida');
    }
    expect(safeKey('a/./b')).toBe('a/b');
  });
});
