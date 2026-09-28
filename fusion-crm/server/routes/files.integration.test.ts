/** Archivos del equipo por HTTP con Postgres (TEST_DATABASE_URL), sin Drive configurado: disco. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('archivos del equipo (integración)', () => {
  let server: Server;
  let base = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'team-files-'));

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres', UPLOADS_DIR: dir });
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    prismaMod = await import('../repositories/prisma/client');
    const { filesRouter } = await import('./files');
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use((req, _res, next) => {
      req.headers['x-user-name'] = 'Laura';
      next();
    });
    app.use('/api/files', filesRouter);
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await prismaMod?.disconnectPrisma();
    process.env = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('sube un arte y cualquiera del equipo lo abre desde la app', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const up = await fetch(`${base}/api/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'arte final.png', dataBase64: png.toString('base64'), folder: ['Producción', 'OT-1 - Pintuco', 'Artes'] }),
    });
    expect(up.status).toBe(201);
    const { file } = await up.json();
    expect(file).toMatchObject({ name: 'arte final.png', size: 7, storage: 'local', uploadedBy: 'Laura', mimeType: 'image/png' });

    const dl = await fetch(`${base}/api/files/${file.id}/download`);
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-disposition')).toContain('inline');
    expect(Buffer.from(await dl.arrayBuffer()).equals(png)).toBe(true);
    expect((await fetch(`${base}/api/files/${file.id}/download?download=1`)).headers.get('content-disposition')).toContain('attachment');
    expect((await fetch(`${base}/api/files/file-noexiste123/download`)).status).toBe(404);
  });
});
