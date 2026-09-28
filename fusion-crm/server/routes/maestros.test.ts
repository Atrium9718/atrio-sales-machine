import { describe, it, expect } from 'vitest';
import { NewMasterRecordSchema, DEFAULT_CATALOGS, docIdFor } from './maestros';

describe('maestros', () => {
  it('normaliza y valida el código', () => {
    expect(NewMasterRecordSchema.parse({ code: ' educ ', name: 'Educación' })).toMatchObject({ code: 'EDUC', name: 'Educación' });
    expect(NewMasterRecordSchema.safeParse({ code: 'con espacio', name: 'X' }).success).toBe(false);
    expect(NewMasterRecordSchema.safeParse({ code: 'OK', name: '' }).success).toBe(false);
  });

  it('los valores base no traen cifras de uso inventadas', () => {
    for (const items of Object.values(DEFAULT_CATALOGS)) {
      for (const item of items) expect(Object.keys(item).sort()).toEqual(['code', 'name']);
    }
    expect(docIdFor('Sector', 'TECH')).toBe('Sector__TECH');
  });
});
