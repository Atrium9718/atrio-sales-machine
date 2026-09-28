import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/firebase', () => ({ auth: {} }));
const { isPublicPath } = await import('./LoginScreen');

describe('isPublicPath', () => {
  it('permite las páginas públicas', () => {
    for (const p of ['/portal', '/portal/tok', '/kiosko/tok', '/preferencias/tok', '/habeas-data']) {
      expect(isPublicPath(p)).toBe(true);
    }
  });

  it('exige sesión en el resto, incluidos /kiosko sin enlace y el antiguo kiosco de planta', () => {
    for (const p of ['/', '/c/abc123', '/kiosko', '/kiosko-planta', '/dashboard/produccion', '/cotizaciones', '/habeas-data-admin']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });
});
