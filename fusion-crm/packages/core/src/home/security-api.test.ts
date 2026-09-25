import { describe, it, expect } from 'vitest';
import { resolveLayout } from './resolve-layout';
import { getAllWidgets, WIDGET_CATALOG } from './widget-catalog';
import { can } from '../auth/permissions';

describe('Seguridad Estricta de la API y Catálogo de Widgets (Etapa 15.2)', () => {
  const allWidgets = getAllWidgets();

  it('1. Un usuario sin cost:read no recibe widgets financieros en resolveLayout', () => {
    const userPermissions = ['home:read', 'opportunity:read', 'production:read'];

    const resolved = resolveLayout({
      userLayout: {
        scope: 'USER',
        widgets: [
          { key: 'mi_dia', order: 0 },
          { key: 'margen_real_mes', order: 1 }, // Financiero
          { key: 'proyectos_sin_costos', order: 2 }, // Financiero
          { key: 'rentabilidad_clientes', order: 3 }, // Financiero
        ],
      },
      roleLayouts: [],
      catalog: allWidgets,
      permissions: userPermissions,
      device: 'DESKTOP',
    });

    const keys = resolved.map((w) => w.key);
    expect(keys).toContain('mi_dia');
    expect(keys).not.toContain('margen_real_mes');
    expect(keys).not.toContain('proyectos_sin_costos');
    expect(keys).not.toContain('rentabilidad_clientes');
  });

  it('2. Un usuario con cost:read sí recibe los widgets financieros en resolveLayout', () => {
    const userPermissions = ['home:read', 'cost:read'];

    const resolved = resolveLayout({
      userLayout: {
        scope: 'USER',
        widgets: [
          { key: 'mi_dia', order: 0 },
          { key: 'margen_real_mes', order: 1 },
        ],
      },
      roleLayouts: [],
      catalog: allWidgets,
      permissions: userPermissions,
      device: 'DESKTOP',
    });

    const keys = resolved.map((w) => w.key);
    expect(keys).toContain('mi_dia');
    expect(keys).toContain('margen_real_mes');
  });

  it('3. Validación directa del guard de permisos para peticiones manuales al endpoint', () => {
    // Simular lógica de /api/home/widget-data/:key
    const verifyWidgetAccess = (widgetKey: string, permissions: string[]) => {
      const def = WIDGET_CATALOG[widgetKey];
      if (!def) return { status: 404 };
      const hasPerm = def.requiredPermissions.every((p) => can(permissions, p));
      if (!hasPerm) return { status: 403, error: 'Forbidden' };
      return { status: 200, data: 'allowed' };
    };

    // Usuario malicioso intenta pedir margen_real_mes a mano sin cost:read
    const unauthorizedResult = verifyWidgetAccess('margen_real_mes', ['home:read', 'opportunity:read']);
    expect(unauthorizedResult.status).toBe(403);

    const unauthorizedResult2 = verifyWidgetAccess('proyectos_sin_costos', ['home:read']);
    expect(unauthorizedResult2.status).toBe(403);

    const unauthorizedResult3 = verifyWidgetAccess('rentabilidad_clientes', ['production:read']);
    expect(unauthorizedResult3.status).toBe(403);

    // Usuario autorizado con cost:read
    const authorizedResult = verifyWidgetAccess('margen_real_mes', ['home:read', 'cost:read']);
    expect(authorizedResult.status).toBe(200);
  });

  it('4. Widgets con sub-etapa futura se bloquean en la resolución de la etapa actual', () => {
    const userPermissions = ['*']; // Admin

    const resolved = resolveLayout({
      userLayout: {
        scope: 'USER',
        widgets: [
          { key: 'mi_dia', order: 0 },
          { key: 'cumplimiento_tareas', order: 1 }, // 15.3
          { key: 'tablero_anuncios', order: 2 }, // 15.4
          { key: 'mis_menciones', order: 3 }, // 15.5
        ],
      },
      roleLayouts: [],
      catalog: allWidgets,
      permissions: userPermissions,
      device: 'DESKTOP',
      currentStage: '15.2',
    });

    const keys = resolved.map((w) => w.key);
    expect(keys).toEqual(['mi_dia']);
  });
});
