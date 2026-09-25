import { describe, it, expect } from 'vitest';
import { toStorableDoc, isValidDocId, DATA_COLLECTIONS } from './data';

describe('data router helpers', () => {
  it('normaliza documentos para Firestore', () => {
    const doc = toStorableDoc({ a: 1, b: undefined, nested: { c: undefined, d: 2 } }, 'id-1', '2026-01-01T00:00:00.000Z');
    expect(doc).toEqual({ a: 1, nested: { d: 2 }, id: 'id-1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
    expect(toStorableDoc({ createdAt: 'x' }, 'i', 'now').createdAt).toBe('x');
  });

  it('valida IDs de documento', () => {
    expect(isValidDocId('proj-1')).toBe(true);
    for (const bad of ['', 'a/b', '.', '..', 'x'.repeat(701), 3, undefined]) {
      expect(isValidDocId(bad)).toBe(false);
    }
  });

  it('solo expone colecciones permitidas', () => {
    expect(Object.keys(DATA_COLLECTIONS).sort()).toEqual(['inventory', 'print-orders', 'project-tombstones', 'projects']);
  });
});
