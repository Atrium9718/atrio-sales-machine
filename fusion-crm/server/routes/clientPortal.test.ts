import { describe, it, expect } from 'vitest';
import {
  buildClientProjects,
  generateToken,
  hashToken,
  NewRequestSchema,
  allowRequest,
  toClientRequestView,
} from './clientPortal';

describe('tokens del portal', () => {
  it('genera tokens únicos de 32 caracteres url-safe y guarda solo su hash', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });
});

describe('buildClientProjects', () => {
  const quotes = [
    { id: 'q1', clientNit: '900.123.456-1', clientName: 'Pintuco S.A.S' },
    { id: 'q2', clientNit: '800.555.777-9', clientName: 'Almacenes Éxito S.A.' },
  ];
  const projects = [
    { id: 'p1', quoteId: 'q1', client: 'Pintuco', number: 'OT-1', stageId: '6', updatedAt: '2026-09-10' },
    { id: 'p2', quoteId: 'q1', client: 'Pintuco', number: 'OT-2', stageId: '3', updatedAt: '2026-09-01' },
    { id: 'p3', quoteId: 'q2', client: 'Almacenes Éxito', number: 'OT-3', stageId: '2' },
    { id: 'p4', client: 'Pintuco SAS', number: 'OT-4', stageId: '1', updatedAt: '2026-09-20', laborCost: 999 },
  ];

  it('solo devuelve los proyectos del cliente del enlace, en curso primero', () => {
    const result = buildClientProjects({ clientName: 'Pintuco S.A.S', clientNit: '900123456-1' }, projects, quotes);
    expect(result.map((p) => p.number)).toEqual(['OT-4', 'OT-2', 'OT-1']);
    expect(JSON.stringify(result)).not.toContain('laborCost');
  });

  it('no mezcla clientes', () => {
    const result = buildClientProjects({ clientName: 'Almacenes Éxito', clientNit: '' }, projects, quotes);
    expect(result.map((p) => p.number)).toEqual(['OT-3']);
  });
});

describe('NewRequestSchema', () => {
  it('acepta una solicitud válida y rechaza descripciones vacías o fechas mal formadas', () => {
    expect(NewRequestSchema.safeParse({ description: 'Necesito 500 volantes', quantity: '500', desiredDate: '2026-10-05' }).success).toBe(true);
    expect(NewRequestSchema.safeParse({ description: 'hola' }).success).toBe(false);
    expect(NewRequestSchema.safeParse({ description: 'Necesito afiches', desiredDate: '05/10/2026' }).success).toBe(false);
    expect(NewRequestSchema.safeParse({ description: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('allowRequest', () => {
  it('limita a 10 solicitudes por hora por enlace', () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) expect(allowRequest('link-limit', now + i)).toBe(true);
    expect(allowRequest('link-limit', now + 11)).toBe(false);
    expect(allowRequest('otro-link', now)).toBe(true);
    expect(allowRequest('link-limit', now + 60 * 60 * 1000 + 20)).toBe(true);
  });
});

describe('toClientRequestView', () => {
  it('no expone datos internos de la solicitud', () => {
    const view = toClientRequestView({
      id: 's1', linkId: 'hash', clientName: 'X', clientNit: '1', description: 'd', quantity: 1, desiredDate: null,
      contactName: 'Ana', contactPhone: '300', status: 'NEW', response: null, createdAt: 'c', updatedAt: 'u',
    });
    expect(Object.keys(view).sort()).toEqual(['createdAt', 'description', 'desiredDate', 'id', 'quantity', 'response', 'status']);
  });
});
