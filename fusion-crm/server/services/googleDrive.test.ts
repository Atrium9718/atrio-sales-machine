import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDriveClient, driveMode, escapeQuery } from './googleDrive';
import { createFilesService, mimeFor, cleanName } from '../routes/files';
import { createMemoryRepository } from '../repositories/documentStore';
import { createLocalStorage } from './fileStorage';

/** Google Drive simulado: carpetas y archivos en memoria. */
function fakeGoogle(opts: { tokenError?: string } = {}) {
  const items = new Map<string, { id: string; name: string; parents: string[]; folder: boolean; bytes?: Buffer }>();
  items.set('ROOT', { id: 'ROOT', name: 'Fusión Archivos', parents: [], folder: true });
  const calls: { url: string; method: string; auth?: string; body?: any }[] = [];
  let n = 0;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchImpl = (async (url: string, init: any = {}) => {
    calls.push({ url, method: init.method || 'GET', auth: init.headers?.Authorization, body: init.body });
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      if (opts.tokenError) return json(400, { error: opts.tokenError });
      return json(200, { access_token: 'ya29.token', expires_in: 3600 });
    }
    const u = new URL(url);
    if (u.pathname === '/drive/v3/files' && (init.method || 'GET') === 'GET') {
      const q = u.searchParams.get('q')!;
      const name = q.match(/name = '((?:\\.|[^'])*)'/)![1].replace(/\\'/g, "'");
      const parent = q.match(/and '([^']*)' in parents/)![1];
      return json(200, { files: [...items.values()].filter((i) => i.folder && i.name === name && i.parents.includes(parent)).map((i) => ({ id: i.id })) });
    }
    if (u.pathname === '/drive/v3/files' && init.method === 'POST') {
      const meta = JSON.parse(init.body);
      const id = `F${++n}`;
      items.set(id, { id, name: meta.name, parents: meta.parents, folder: true });
      return json(200, { id });
    }
    if (u.pathname === '/upload/drive/v3/files') {
      const raw: Buffer = init.body;
      const text = raw.toString('latin1');
      const meta = JSON.parse(text.match(/\r\n\r\n(\{.*?\})\r\n/)![1]);
      const start = raw.indexOf('\r\n\r\n', raw.indexOf('Content-Type', raw.indexOf('}'))) + 4;
      const end = raw.lastIndexOf(Buffer.from('\r\n--'));
      const id = `D${++n}`;
      items.set(id, { id, name: meta.name, parents: meta.parents, folder: false, bytes: raw.subarray(start, end) });
      return json(200, { id, name: meta.name, mimeType: meta.mimeType, webViewLink: `https://drive.google.com/file/d/${id}/view` });
    }
    const m = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
    if (m && u.searchParams.get('alt') === 'media') return new Response(items.get(m[1])!.bytes!);
    if (m) return json(200, { name: items.get(m[1])?.name, capabilities: { canAddChildren: true } });
    return json(404, { error: { message: 'no encontrado' } });
  }) as unknown as typeof fetch;
  return { fetchImpl, items, calls };
}

const oauthEnv = { GOOGLE_DRIVE_FOLDER_ID: 'ROOT', GOOGLE_DRIVE_CLIENT_ID: 'cid', GOOGLE_DRIVE_CLIENT_SECRET: 'sec', GOOGLE_DRIVE_REFRESH_TOKEN: '1//refresh' };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'files-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('Google Drive de la empresa', () => {
  it('sube a la carpeta del proyecto (creándola una sola vez) y descarga el mismo contenido', async () => {
    const g = fakeGoogle();
    const drive = createDriveClient(oauthEnv, g.fetchImpl);
    const folder = await drive.folderFor(['Producción', "D'Luxe S.A.S - Cajas"]);
    expect(await drive.folderFor(['Producción', "D'Luxe S.A.S - Cajas"])).toBe(folder);
    const file = await drive.upload(folder, 'arte.pdf', 'application/pdf', Buffer.from('%PDF-1.4 contenido'));
    expect(file.webViewLink).toContain(file.id);
    expect((await drive.download(file.id)).toString()).toBe('%PDF-1.4 contenido');
    expect([...g.items.values()].filter((i) => i.folder).map((i) => i.name)).toEqual(['Fusión Archivos', 'Producción', "D'Luxe S.A.S - Cajas"]);
    // Un solo token para todas las llamadas
    expect(g.calls.filter((c) => c.url.includes('oauth2')).length).toBe(1);
    expect(g.calls.filter((c) => !c.url.includes('oauth2')).every((c) => c.auth === 'Bearer ya29.token')).toBe(true);
    expect(await drive.check()).toContain('Fusión Archivos');
  });

  it('explica cuando la autorización venció', async () => {
    const drive = createDriveClient(oauthEnv, fakeGoogle({ tokenError: 'invalid_grant' }).fetchImpl);
    await expect(drive.check()).rejects.toThrow('GOOGLE_DRIVE_REFRESH_TOKEN');
  });

  it('cuenta de servicio: firma el JWT con su llave', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const keyFile = path.join(tmp, 'sa.json');
    fs.writeFileSync(keyFile, JSON.stringify({ client_email: 'fusion@proyecto.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
    const g = fakeGoogle();
    const drive = createDriveClient({ GOOGLE_DRIVE_FOLDER_ID: 'ROOT', GOOGLE_DRIVE_SERVICE_ACCOUNT: keyFile }, g.fetchImpl);
    await drive.check();
    const assertion = new URLSearchParams(g.calls[0].body.toString()).get('assertion')!;
    const [h, c, sig] = assertion.split('.');
    expect(JSON.parse(Buffer.from(c, 'base64url').toString())).toMatchObject({ iss: 'fusion@proyecto.iam.gserviceaccount.com', scope: 'https://www.googleapis.com/auth/drive' });
    expect(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
  });

  it('configuración', () => {
    expect(driveMode({})).toBeNull();
    expect(driveMode(oauthEnv)).toBe('oauth');
    expect(driveMode({ GOOGLE_DRIVE_FOLDER_ID: 'x', GOOGLE_DRIVE_SERVICE_ACCOUNT: '/k.json' })).toBe('service_account');
    expect(escapeQuery("D'Luxe")).toBe("D\\'Luxe");
  });
});

describe('archivos del equipo', () => {
  const service = (drive: any) =>
    createFilesService({ repo: createMemoryRepository() as any, drive: () => drive, local: () => createLocalStorage(tmp), now: () => new Date('2026-09-27T10:00:00Z') });

  it('con Drive: guarda en Drive y se lee desde la app', async () => {
    const g = fakeGoogle();
    const svc = service(createDriveClient(oauthEnv, g.fetchImpl));
    const { file, warning } = await svc.save({ name: 'orden compra.pdf', bytes: Buffer.from('%PDF oc'), folder: ['Producción', 'Pintuco - Cajas', 'Órdenes de compra'], by: 'Laura' });
    expect(warning).toBeUndefined();
    expect(file).toMatchObject({ storage: 'drive', mimeType: 'application/pdf', size: 7, uploadedBy: 'Laura' });
    expect((await svc.read(file.id))!.bytes.toString()).toBe('%PDF oc');
  });

  it('si Drive falla, el archivo no se pierde: queda en el servidor con aviso', async () => {
    const svc = service(createDriveClient(oauthEnv, fakeGoogle({ tokenError: 'invalid_grant' }).fetchImpl));
    const { file, warning } = await svc.save({ name: 'arte.png', bytes: Buffer.from('png'), folder: ['Producción'], by: 'Ana' });
    expect(file.storage).toBe('local');
    expect(warning).toContain('quedó guardado en el servidor');
    expect((await svc.read(file.id))!.bytes.toString()).toBe('png');
  });

  it('sin Drive configurado usa el disco; valida nombre, tipo y tamaño', async () => {
    const svc = service(null);
    expect((await svc.save({ name: 'a/b\\c.ai', bytes: Buffer.from('x'), folder: ['../x'], by: '' })).file).toMatchObject({ storage: 'local', name: 'a_b_c.ai', folder: ['.._x'] });
    await expect(svc.save({ name: 'virus.exe', bytes: Buffer.from('x'), folder: [], by: '' })).rejects.toThrow('no se permite');
    await expect(svc.save({ name: 'vacío.pdf', bytes: Buffer.alloc(0), folder: [], by: '' })).rejects.toThrow('vacío');
    expect(await svc.read('../../etc/passwd')).toBeNull();
    expect(mimeFor('LOGO.PNG')).toBe('image/png');
    expect(cleanName('  ')).toBe('archivo');
  });
});
