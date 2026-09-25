import { describe, it, expect } from 'vitest';
import {
  can,
  requirePermission,
  SEED_ROLE_COLLABORATION_PERMISSIONS,
  SEED_ROLE_TARIFF_PERMISSIONS,
  sanitizeQuoteAssistResult,
} from './permissions';

describe('Catálogo de Permisos y función can()', () => {
  it('permite acceso completo al rol admin', () => {
    expect(can({ role: 'admin' }, 'home:read')).toBe(true);
    expect(can({ role: 'admin' }, 'chat:export')).toBe(true);
    expect(can({ role: 'admin' }, 'call:record')).toBe(true);
    expect(can({ role: 'admin' }, ['performance:read_all', 'goal:manage'])).toBe(true);
  });

  it('gerencia tiene todos los permisos excepto chat:export', () => {
    const gerenciaPerms = SEED_ROLE_COLLABORATION_PERMISSIONS['gerencia'];
    expect(can(gerenciaPerms, 'home:read')).toBe(true);
    expect(can(gerenciaPerms, 'call:record')).toBe(true);
    expect(can(gerenciaPerms, 'chat:export')).toBe(false);
  });

  it('comercial tiene permisos definidos pero no performance:read_team ni export', () => {
    const comercialPerms = SEED_ROLE_COLLABORATION_PERMISSIONS['comercial'];
    expect(can(comercialPerms, 'home:read')).toBe(true);
    expect(can(comercialPerms, 'home:customize')).toBe(true);
    expect(can(comercialPerms, 'chat:send')).toBe(true);
    expect(can(comercialPerms, 'call:start')).toBe(true);
    expect(can(comercialPerms, 'call:join')).toBe(true);
    expect(can(comercialPerms, 'performance:read_own')).toBe(true);
    expect(can(comercialPerms, 'goal:read')).toBe(true);

    // No permitidos
    expect(can(comercialPerms, 'performance:read_team')).toBe(false);
    expect(can(comercialPerms, 'chat:export')).toBe(false);
    expect(can(comercialPerms, 'call:record')).toBe(false);
  });

  it('produccion incluye performance:read_team ademas de lo comercial', () => {
    const prodPerms = SEED_ROLE_COLLABORATION_PERMISSIONS['produccion'];
    expect(can(prodPerms, 'home:read')).toBe(true);
    expect(can(prodPerms, 'performance:read_team')).toBe(true);
    expect(can(prodPerms, 'performance:read_all')).toBe(false);
    expect(can(prodPerms, 'chat:export')).toBe(false);
  });

  it('planta tiene permisos acotados y call:join pero no call:start ni customize', () => {
    const plantaPerms = SEED_ROLE_COLLABORATION_PERMISSIONS['planta'];
    expect(can(plantaPerms, 'home:read')).toBe(true);
    expect(can(plantaPerms, 'chat:send')).toBe(true);
    expect(can(plantaPerms, 'call:join')).toBe(true);
    expect(can(plantaPerms, 'call:start')).toBe(false);
    expect(can(plantaPerms, 'home:customize')).toBe(false);
  });

  it('lectura solo puede leer home, anuncios y chat', () => {
    const lecturaPerms = SEED_ROLE_COLLABORATION_PERMISSIONS['lectura'];
    expect(can(lecturaPerms, 'home:read')).toBe(true);
    expect(can(lecturaPerms, 'announcement:read')).toBe(true);
    expect(can(lecturaPerms, 'chat:read')).toBe(true);
    expect(can(lecturaPerms, 'chat:send')).toBe(false);
    expect(can(lecturaPerms, 'home:customize')).toBe(false);
  });

  it('requirePermission lanza error 403 cuando falta el permiso', () => {
    expect(() => requirePermission(['home:read'], 'chat:send')).toThrowError(/Permiso denegado/);
    expect(() => requirePermission(['home:read', 'chat:send'], 'chat:send')).not.toThrow();
  });

  it('asigna permisos de tarifario según rol en SEED_ROLE_TARIFF_PERMISSIONS', () => {
    // Admin y gerencia tienen todos los permisos de tarifario
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['admin'], 'tariff:publish')).toBe(true);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['gerencia'], 'tariff:write')).toBe(true);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['gerencia'], 'quote:assist_cost')).toBe(true);

    // Comercial solo tiene lectura y ayuda para cotizar básica (sin desglose de costo ni publish)
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['comercial'], 'tariff:read')).toBe(true);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['comercial'], 'quote:assist')).toBe(true);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['comercial'], 'quote:assist_cost')).toBe(false);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['comercial'], 'tariff:publish')).toBe(false);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['comercial'], 'tariff:write')).toBe(false);

    // Producción tiene solo lectura
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['produccion'], 'tariff:read')).toBe(true);
    expect(can(SEED_ROLE_TARIFF_PERMISSIONS['produccion'], 'quote:assist')).toBe(false);
  });

  it('sanitizeQuoteAssistResult elimina información confidencial de costos si no tiene quote:assist_cost', () => {
    const rawResult = {
      assistRunId: 'run-123',
      tariffVersionId: 'tar-1',
      suggestedTotalSalePrice: 150000,
      internalCost: 85000,
      marginPercent: 43.33,
      marginAmount: 65000,
      breakdown: {
        paperCost: 40000,
        platesCost: 20000,
        printingCost: 25000,
      },
      items: [
        {
          quantity: 1000,
          suggestedUnitSalePrice: 150,
          internalCost: 85,
          marginPercent: 43.33,
          breakdown: { paperCost: 40 },
        },
      ],
    };

    // Usuario comercial sin quote:assist_cost
    const commercialUser = { role: 'comercial', permissions: ['quote:assist'] };
    const sanitized = sanitizeQuoteAssistResult(rawResult, commercialUser);

    expect(sanitized.suggestedTotalSalePrice).toBe(150000);
    expect((sanitized as any).internalCost).toBeUndefined();
    expect((sanitized as any).marginPercent).toBeUndefined();
    expect((sanitized as any).marginAmount).toBeUndefined();
    expect((sanitized as any).breakdown).toBeUndefined();
    expect(sanitized.items[0].suggestedUnitSalePrice).toBe(150);
    expect((sanitized.items[0] as any).internalCost).toBeUndefined();
    expect((sanitized.items[0] as any).marginPercent).toBeUndefined();
    expect((sanitized.items[0] as any).breakdown).toBeUndefined();

    // Usuario con quote:assist_cost (ej: gerencia o director_financiero)
    const managerUser = { role: 'gerencia', permissions: ['quote:assist', 'quote:assist_cost'] };
    const privilegedResult = sanitizeQuoteAssistResult(rawResult, managerUser);
    expect((privilegedResult as any).internalCost).toBe(85000);
    expect((privilegedResult as any).breakdown).toBeDefined();
    expect((privilegedResult.items[0] as any).internalCost).toBe(85);
  });
});
