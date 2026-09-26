import { describe, it, expect } from 'vitest';
import { validateClientAttachment, sanitizeFileName, MAX_CLIENT_ATTACHMENT_BYTES } from './attachments';

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? Array.from(p, (c) => c.charCodeAt(0)) : p)));

describe('validateClientAttachment', () => {
  it('reconoce los formatos permitidos por su contenido', () => {
    expect(validateClientAttachment('arte.pdf', bytes('%PDF-1.7 ...'))).toEqual({ ok: true, mime: 'application/pdf' });
    expect(validateClientAttachment('logo.ai', bytes('%PDF-1.5'))).toEqual({ ok: true, mime: 'application/pdf' });
    expect(validateClientAttachment('logo.eps', bytes('%!PS-Adobe-3.0 EPSF'))).toEqual({ ok: true, mime: 'application/postscript' });
    expect(validateClientAttachment('foto.PNG', bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toEqual({ ok: true, mime: 'image/png' });
    expect(validateClientAttachment('foto.jpeg', bytes([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ ok: true, mime: 'image/jpeg' });
    expect(validateClientAttachment('x.webp', bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toEqual({ ok: true, mime: 'image/webp' });
    expect(validateClientAttachment('x.tif', bytes([0x49, 0x49, 0x2a, 0x00, 1]))).toEqual({ ok: true, mime: 'image/tiff' });
  });

  it('rechaza contenido no permitido aunque la extensión lo sea', () => {
    expect(validateClientAttachment('arte.pdf', bytes('<html><script>'))).toMatchObject({ ok: false });
    expect(validateClientAttachment('virus.exe', bytes('MZ\x90\x00'))).toMatchObject({ ok: false });
    expect(validateClientAttachment('logo.svg', bytes('<svg onload=alert(1)>'))).toMatchObject({ ok: false });
  });

  it('rechaza extensiones que no coinciden con el contenido', () => {
    expect(validateClientAttachment('foto.pdf', bytes([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ ok: false });
    expect(validateClientAttachment('arte.html', bytes('%PDF-1.7'))).toMatchObject({ ok: false });
  });

  it('rechaza archivos vacíos o muy grandes', () => {
    expect(validateClientAttachment('a.pdf', new Uint8Array())).toMatchObject({ ok: false });
    const big = new Uint8Array(MAX_CLIENT_ATTACHMENT_BYTES + 1);
    big.set(bytes('%PDF-'));
    expect(validateClientAttachment('a.pdf', big)).toMatchObject({ ok: false });
  });
});

describe('sanitizeFileName', () => {
  it('quita rutas, tildes y caracteres especiales', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\Users\\Ana\\Diseño final (v2).pdf')).toBe('Diseno_final_v2_.pdf');
    expect(sanitizeFileName('.htaccess')).toBe('htaccess');
    expect(sanitizeFileName('')).toBe('archivo');
  });

  it('limita la longitud conservando la extensión', () => {
    const name = sanitizeFileName(`${'a'.repeat(300)}.pdf`);
    expect(name.length).toBe(100);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});
