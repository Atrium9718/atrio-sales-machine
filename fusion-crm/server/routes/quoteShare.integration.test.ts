/**
 * Enlace público del PDF, reglas de aprobación y extracción con IA, por HTTP con Postgres.
 * Solo corre con TEST_DATABASE_URL (Postgres con migraciones aplicadas).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('cotizaciones: enlace del PDF y reglas de aprobación (integración)', () => {
  let base = '';
  let server: any;
  let dir = '';
  let prismaMod: typeof import('../repositories/prisma/client');
  const saved = { ...process.env };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quote-share-'));
    Object.assign(process.env, { DATABASE_URL: url, DATA_BACKEND: 'postgres', FILE_STORAGE: 'local', UPLOADS_DIR: dir, APP_URL: 'https://crm.ejemplo.co/' });
    delete process.env.GEMINI_API_KEY;
    prismaMod = await import('../repositories/prisma/client');
    const db = prismaMod.getPrisma();
    await db.quoteItem.deleteMany({});
    await db.quote.deleteMany({});
    await db.productionProject.deleteMany({});
    await db.storedDocument.deleteMany({ where: { collection: { in: ['system_config', 'quote_links'] } } });
    (await import('../services/fileStorage')).__resetFileStorage();

    const { quotesRouter } = await import('./quotes');
    const { quoteShareRouter, quotePublicRouter } = await import('./quoteShare');
    const app = express();
    app.use(express.json({ limit: '20mb' }));
    app.use('/api/portal', quotePublicRouter); // público
    app.use((req, _res, next) => {
      req.headers['x-user-id'] = 'emp-20';
      req.headers['x-user-name'] = 'Carolina Ruiz';
      req.headers['x-user-role'] = 'comercial';
      next();
    });
    app.use('/api/quotes', quoteShareRouter);
    app.use('/api/quotes', quotesRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    process.env = saved;
    (await import('../services/fileStorage')).__resetFileStorage();
    await prismaMod?.disconnectPrisma();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const call = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const item = { id: 'i1', description: 'Pendón 1x2 m', quantity: 2, unitPrice: 85000, applyVat: true, vatRate: 0.19 };
  const pdf = Buffer.from('%PDF-1.4\n% cotización de prueba\n%%EOF');

  it('guarda el PDF, da un enlace público y registra cada apertura', async () => {
    await call('POST', '/api/quotes', { id: 'q-share', status: 'Finalizada', clientName: 'Alpina', items: [item] });

    expect((await call('POST', '/api/quotes/q-share/share-link', { pdfBase64: Buffer.from('hola').toString('base64') })).status).toBe(400);
    expect((await call('POST', '/api/quotes/q-share/share-link', {})).status).toBe(400);

    const link = await call('POST', '/api/quotes/q-share/share-link', { pdfBase64: pdf.toString('base64'), fileName: 'COT 1.pdf', number: 'COT-00001' });
    expect(link.status).toBe(200);
    expect(link.body.url).toMatch(/^https:\/\/crm\.ejemplo\.co\/api\/portal\/cotizacion\/[\w-]{20,40}$/);
    const token = link.body.url.split('/').pop();

    const opened = await fetch(`${base}/api/portal/cotizacion/${token}`);
    expect(opened.status).toBe(200);
    expect(opened.headers.get('content-type')).toBe('application/pdf');
    expect(opened.headers.get('content-disposition')).toContain('COT_1.pdf');
    expect(Buffer.from(await opened.arrayBuffer()).equals(pdf)).toBe(true);

    // El registro de la apertura no bloquea la descarga: se espera a que quede guardado
    let quote: any;
    for (let i = 0; i < 20 && !quote?.viewedByClientAt; i++) {
      await new Promise((r) => setTimeout(r, 50));
      quote = (await call('GET', '/api/quotes')).body.quotes.find((q: any) => q.id === 'q-share');
    }
    expect(quote).toMatchObject({ clientViews: 1 });
    expect(quote.viewedByClientAt).toBeTruthy();

    expect((await fetch(`${base}/api/portal/cotizacion/no-existe-este-token-xx`)).status).toBe(404);
    expect((await fetch(`${base}/api/portal/cotizacion/..%2F..%2Fetc`)).status).toBe(404);
  });

  it('el enlace vencido responde 410', async () => {
    const { documentRepository } = await import('../repositories/documentStore');
    const link = await call('POST', '/api/quotes/q-share/share-link', { pdfBase64: pdf.toString('base64') });
    const token = link.body.url.split('/').pop();
    const links = documentRepository<any>('quote_links');
    await links.upsert({ ...(await links.get(token)), expiresAt: '2020-01-01T00:00:00.000Z' });
    expect((await fetch(`${base}/api/portal/cotizacion/${token}`)).status).toBe(410);
  });

  it('solo "Aprobar" aprueba (crea la OT); guardar como Finalizada no la crea', async () => {
    const viaPost = await call('POST', '/api/quotes', { id: 'q-share', status: 'Aprobada', items: [item] });
    expect(viaPost).toMatchObject({ status: 400, body: { code: 'USE_APPROVE' } });
    const viaPatch = await call('PATCH', '/api/quotes/q-share/status', { status: 'Aprobada' });
    expect(viaPatch).toMatchObject({ status: 400, body: { code: 'USE_APPROVE' } });
    expect((await call('GET', '/api/quotes/projects-sync')).body.projects).toHaveLength(0);
  });

  it('con OT, la cotización no se borra ni vuelve a otro estado, y reenviarla no la desaprueba', async () => {
    const approved = await call('POST', '/api/quotes/q-share/approve', {});
    expect(approved.status).toBe(200);
    const projectId = approved.body.project.id;

    expect(await call('DELETE', '/api/quotes/q-share')).toMatchObject({ status: 409, body: { code: 'HAS_ORDER' } });
    expect(await call('PATCH', '/api/quotes/q-share/status', { status: 'Borrador' })).toMatchObject({ status: 409, body: { code: 'HAS_ORDER' } });
    expect(await call('POST', '/api/quotes', { id: 'q-share', status: 'Enviada' })).toMatchObject({ status: 409, body: { code: 'HAS_ORDER' } });

    const resent = await call('POST', '/api/quotes/q-share/send', { channel: 'EMAIL', destination: 'compras@alpina.co' });
    expect(resent.body.quote).toMatchObject({ status: 'Aprobada', sentVia: 'EMAIL', sentDestination: 'compras@alpina.co' });

    await call('DELETE', `/api/quotes/projects/${projectId}`, { quoteId: 'q-share' });
    expect((await call('DELETE', '/api/quotes/q-share')).status).toBe(200);
  });

  it('extraer ítems con IA valida la entrada y avisa si la IA no está configurada', async () => {
    expect((await call('POST', '/api/quotes/extract-items', {})).status).toBe(400);
    expect((await call('POST', '/api/quotes/extract-items', { fileBase64: 'AAAA', mimeType: 'application/zip' })).status).toBe(400);
    const noKey = await call('POST', '/api/quotes/extract-items', { text: 'Necesito 500 volantes media carta 4x4' });
    expect(noKey.status).toBe(503);
    expect(noKey.body.error).toMatch(/GEMINI_API_KEY/);
  });
});
