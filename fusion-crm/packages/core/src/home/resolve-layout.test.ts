import { describe, it, expect } from 'vitest';
import { resolveLayout, DashboardLayoutLike } from './resolve-layout';
import { WIDGET_CATALOG, getAllWidgets } from './widget-catalog';
import type { Permission } from '../auth/permissions';

describe('resolveLayout — Motor de resolución de widgets (Etapa 15.2)', () => {
  const allWidgets = getAllWidgets();
  const allPermissions: Permission[] = [
    'home:read',
    'home:customize',
    'opportunity:read',
    'quote:read',
    'production:read',
    'inventory:read',
    'cost:read',
    'admin:access',
    'performance:read_own',
    'performance:read_team',
    'announcement:read',
    'chat:read',
  ];

  it('1. Usuario sin layout propio: adopta el layout de su rol', () => {
    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      roleId: 'comercial',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'meta_ventas', order: 1 },
      ],
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'meta_ventas']);
    expect(resolved[0].title).toBe('Mi Día');
    expect(resolved[1].title).toBe('Meta de Ventas del Mes');
  });

  it('2. Usuario con layout propio: su personalización prevalece sobre los roles', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      userId: 'user-1',
      widgets: [
        { key: 'atajos', order: 0 },
        { key: 'mis_anclados', order: 1 },
      ],
    };

    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      roleId: 'comercial',
      widgets: [{ key: 'meta_ventas', order: 0 }],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['atajos', 'mis_anclados']);
  });

  it('3. Usuario con dos roles: fusiona layouts por prioridad sin duplicar widgetKey', () => {
    const role1: DashboardLayoutLike = {
      scope: 'ROLE',
      roleId: 'supervisor',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'meta_ventas', order: 1 },
      ],
    };

    const role2: DashboardLayoutLike = {
      scope: 'ROLE',
      roleId: 'comercial',
      widgets: [
        { key: 'meta_ventas', order: 0 }, // Duplicado de role1, debe ignorarse
        { key: 'pipeline_resumen', order: 1 },
      ],
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [role1, role2],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    const keys = resolved.map((w) => w.key);
    expect(keys).toEqual(['mi_dia', 'meta_ventas', 'pipeline_resumen']);
    expect(new Set(keys).size).toBe(keys.length); // Cero duplicados
  });

  it('4. Widget retirado o no existente en el catálogo: se ignora en silencio sin romper el Home', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'widget_inexistente_o_antiguo', order: 1 },
        { key: 'mis_notificaciones', order: 2 },
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'mis_notificaciones']);
  });

  it('5. Permiso revocado: widget financiero se descarta si falta cost:read', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'margen_real_mes', order: 1 }, // Requiere cost:read
      ],
    };

    const permissionsWithoutCost: Permission[] = ['home:read'];

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: permissionsWithoutCost,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia']);
  });

  it('6. Dispositivo MOBILE: sustituye widget con mobileFallbackKey por su versión resumida', () => {
    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      widgets: [
        { key: 'pipeline_resumen', order: 0 }, // Tiene mobileFallbackKey: 'mis_tareas_resumen'
      ],
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'MOBILE',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mis_tareas_resumen']);
  });

  it('7. Dispositivo DESKTOP: conserva el widget grande original sin aplicar mobileFallback', () => {
    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      widgets: [{ key: 'pipeline_resumen', order: 0 }],
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['pipeline_resumen']);
  });

  it('8. Widgets no disponibles en la sub-etapa actual (15.2): se descartan del layout activo', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'cumplimiento_tareas', order: 1 }, // availableFrom: '15.3'
        { key: 'tablero_anuncios', order: 2 }, // availableFrom: '15.4'
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
      currentStage: '15.2',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia']);
  });

  it('9. Usuario sin layout y sin roles: genera disposición predeterminada permitida', () => {
    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: ['home:read'],
      device: 'DESKTOP',
    });

    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((w) => w.requiredPermissions.includes('home:read'))).toBe(true);
  });

  it('10. Tamaño personalizado en layout guardado prevalece sobre defaultSize', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mi_dia', size: 'FULL', order: 0 }, // defaultSize es MEDIUM
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved[0].size).toBe('FULL');
  });

  it('11. Preserva el orden secuencial explícito del usuario', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mis_anclados', order: 20 },
        { key: 'atajos', order: 5 },
        { key: 'mi_dia', order: 1 },
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'atajos', 'mis_anclados']);
    expect(resolved[0].order).toBe(0);
    expect(resolved[1].order).toBe(1);
    expect(resolved[2].order).toBe(2);
  });

  it('12. Ítems marcados con isHidden: true son excluidos de la lista resuelta', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'mis_anclados', isHidden: true, order: 1 },
        { key: 'atajos', order: 2 },
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'atajos']);
  });

  it('13. Propaga la configuración (config) del ítem hacia ResolvedWidget', () => {
    const userLayout: DashboardLayoutLike = {
      scope: 'USER',
      widgets: [
        {
          key: 'mi_dia',
          order: 0,
          config: { showCompleted: false, maxItems: 5 },
        },
      ],
    };

    const resolved = resolveLayout({
      userLayout,
      roleLayouts: [],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved[0].config).toEqual({ showCompleted: false, maxItems: 5 });
  });

  it('14. Mobile fallback sin permisos: no se sustituye por fallback prohibido', () => {
    const customCatalog = [
      {
        ...WIDGET_CATALOG.capacidad_planta,
        mobileFallbackKey: 'proyectos_en_mi_etapa', // Requiere production:read
      },
      WIDGET_CATALOG.proyectos_en_mi_etapa,
    ];

    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      widgets: [{ key: 'capacidad_planta', order: 0 }],
    };

    // Usuario sin production:read
    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: customCatalog,
      permissions: ['home:read'],
      device: 'MOBILE',
    });

    // Ninguno debe mostrarse porque ninguno tiene permiso
    expect(resolved.length).toBe(0);
  });

  it('15. Soporte de JSON serializado en widgets de base de datos', () => {
    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      widgets: JSON.stringify([
        { key: 'mi_dia', order: 0 },
        { key: 'mi_agenda', order: 1 },
      ]),
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'DESKTOP',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'mi_agenda']);
  });

  it('16. Dispositivo KIOSK resuelve los widgets respetando orden y compatibilidad', () => {
    const roleLayout: DashboardLayoutLike = {
      scope: 'ROLE',
      widgets: [
        { key: 'mi_dia', order: 0 },
        { key: 'atajos', order: 1 },
      ],
    };

    const resolved = resolveLayout({
      userLayout: null,
      roleLayouts: [roleLayout],
      catalog: allWidgets,
      permissions: allPermissions,
      device: 'KIOSK',
    });

    expect(resolved.map((w) => w.key)).toEqual(['mi_dia', 'atajos']);
  });
});
