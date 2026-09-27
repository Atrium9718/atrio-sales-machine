import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createHmac } from 'crypto';
import { isValidMetaSignature, requireMetaSignature } from './metaSignature';

const SECRET = 'app-secret-de-prueba';
const sign = (body: string, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

describe('firma de webhooks de Meta', () => {
  it('acepta solo la firma HMAC-SHA256 correcta', () => {
    const body = Buffer.from('{"object":"page"}');
    expect(isValidMetaSignature(body, sign(body.toString()), SECRET)).toBe(true);
    expect(isValidMetaSignature(body, sign(body.toString(), 'otro'), SECRET)).toBe(false);
    expect(isValidMetaSignature(body, sign('{"object":"otro"}'), SECRET)).toBe(false);
    expect(isValidMetaSignature(body, 'sha1=abc', SECRET)).toBe(false);
    expect(isValidMetaSignature(body, undefined, SECRET)).toBe(false);
    expect(isValidMetaSignature(undefined, sign('x'), SECRET)).toBe(false);
  });

  describe('middleware', () => {
    const original = process.env.META_APP_SECRET;
    afterEach(() => { process.env.META_APP_SECRET = original; });

    const app = express();
    app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
    app.post('/hook', requireMetaSignature, (_req, res) => res.sendStatus(200));
    let server: Server;
    let url = '';
    beforeAll(async () => {
      server = app.listen(0);
      await new Promise((r) => server.once('listening', r));
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
    });
    afterAll(() => server.close());
    const post = (body: string, signature?: string) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(signature ? { 'X-Hub-Signature-256': signature } : {}) },
        body,
      }).then((r) => r.status);

    it('deja pasar un evento firmado', async () => {
      process.env.META_APP_SECRET = SECRET;
      const body = JSON.stringify({ object: 'page', entry: [] });
      expect(await post(body, sign(body))).toBe(200);
    });

    it('rechaza sin firma o con firma falsa', async () => {
      process.env.META_APP_SECRET = SECRET;
      const body = JSON.stringify({ object: 'page' });
      expect(await post(body)).toBe(401);
      expect(await post(body, sign(body, 'x'))).toBe(401);
    });

    it('no acepta nada si falta META_APP_SECRET', async () => {
      delete process.env.META_APP_SECRET;
      const body = JSON.stringify({ object: 'page' });
      expect(await post(body, sign(body))).toBe(503);
    });
  });
});
