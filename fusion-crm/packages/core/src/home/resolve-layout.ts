import type { Permission } from '../auth/permissions';
import { can } from '../auth/permissions';
import {
  WidgetDefinition,
  WidgetSize,
  WidgetCategory,
  WidgetDataSource,
  isWidgetAvailable,
} from './widget-catalog';

export interface LayoutWidgetItem {
  key: string;
  size?: WidgetSize;
  order?: number;
  config?: Record<string, any>;
  isHidden?: boolean;
}

export interface DashboardLayoutLike {
  id?: string;
  organizationId?: string;
  scope: 'ROLE' | 'USER';
  roleId?: string | null;
  userId?: string | null;
  name?: string;
  widgets: LayoutWidgetItem[] | any; // Json parsed or object
  isDefault?: boolean;
}

export interface ResolvedWidget {
  key: string;
  title: string;
  description: string;
  category: WidgetCategory;
  size: WidgetSize;
  order: number;
  config: Record<string, any>;
  drillDownRoute: string;
  refreshSeconds: number;
  dataSource: WidgetDataSource;
  isAvailable: boolean;
  requiredPermissions: Permission[];
}

export interface ResolveLayoutInput {
  userLayout: DashboardLayoutLike | null;
  roleLayouts: DashboardLayoutLike[];
  catalog: WidgetDefinition[];
  permissions: Permission[];
  device: 'DESKTOP' | 'MOBILE' | 'KIOSK';
  currentStage?: string;
}

/**
 * Resuelve la disposición final de widgets para el Home según las reglas de negocio:
 * 1. Si el usuario tiene layout propio, manda; si no, se fusionan los de sus roles por prioridad de rol, sin duplicar widgetKey.
 * 2. Se descartan los widgets sin permiso y los no disponibles.
 * 3. En MOBILE, todo widget con mobileFallbackKey se sustituye por su versión resumida (siempre que esté permitida).
 * 4. Si un widget del layout guardado ya no existe en el catálogo, se ignora en silencio; nunca revienta.
 */
export function resolveLayout(input: {
  userLayout: DashboardLayoutLike | null;
  roleLayouts: DashboardLayoutLike[];
  catalog: WidgetDefinition[];
  permissions: Permission[];
  device: 'DESKTOP' | 'MOBILE' | 'KIOSK';
  currentStage?: string;
}): ResolvedWidget[] {
  const {
    userLayout,
    roleLayouts,
    catalog,
    permissions,
    device,
    currentStage = '15.2',
  } = input;

  // Mapa rápido de catálogo
  const catalogMap = new Map<string, WidgetDefinition>();
  for (const def of catalog) {
    catalogMap.set(def.key, def);
  }

  // 1. Determinar lista de ítems sin procesar según precedencia: userLayout vs roleLayouts
  let rawItems: LayoutWidgetItem[] = [];

  const parseWidgets = (widgets: any): LayoutWidgetItem[] => {
    if (!widgets) return [];
    if (typeof widgets === 'string') {
      try {
        return JSON.parse(widgets);
      } catch {
        return [];
      }
    }
    if (Array.isArray(widgets)) return widgets;
    return [];
  };

  if (userLayout && userLayout.widgets) {
    const userWidgets = parseWidgets(userLayout.widgets);
    if (userWidgets.length > 0) {
      rawItems = userWidgets;
    }
  }

  // Si no hay userLayout con widgets, fusionar layouts de roles por prioridad (el orden del array determina la prioridad)
  if (rawItems.length === 0 && roleLayouts && roleLayouts.length > 0) {
    const seenKeys = new Set<string>();
    for (const rLayout of roleLayouts) {
      const rWidgets = parseWidgets(rLayout.widgets);
      for (const rw of rWidgets) {
        if (!seenKeys.has(rw.key)) {
          seenKeys.add(rw.key);
          rawItems.push(rw);
        }
      }
    }
  }

  // Si aún no hay ítems (nuevo usuario sin roles o layouts vacíos), generar lista basada en widgets de rol sugeridos
  if (rawItems.length === 0) {
    // Tomar widgets personales básicos disponibles
    const defaultKeys = ['mi_dia', 'mis_tareas_resumen', 'mi_agenda', 'atajos'];
    rawItems = defaultKeys.map((k, idx) => ({ key: k, order: idx }));
  }

  // 2. Procesar ítems, sustituciones por móvil, validaciones de catálogo, permisos y disponibilidad
  const resolved: ResolvedWidget[] = [];
  const processedKeys = new Set<string>();

  // Ordenar por orden especificado
  const sortedItems = [...rawItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let currentOrder = 0;

  for (const item of sortedItems) {
    if (item.isHidden) continue;

    let targetKey = item.key;
    let def = catalogMap.get(targetKey);

    // Si no existe en el catálogo, se ignora en silencio; nunca revienta
    if (!def) continue;

    // En MOBILE, si tiene mobileFallbackKey, sustituir por su versión resumida
    if (device === 'MOBILE' && def.mobileFallbackKey) {
      const fallbackDef = catalogMap.get(def.mobileFallbackKey);
      if (fallbackDef) {
        // Verificar si el fallback tiene permisos válidos
        const hasFallbackPerm = fallbackDef.requiredPermissions.every((p) =>
          can(permissions, p)
        );
        if (hasFallbackPerm && isWidgetAvailable(fallbackDef, currentStage)) {
          targetKey = def.mobileFallbackKey;
          def = fallbackDef;
        }
      }
    }

    // Evitar duplicados resultantes de fusiones o fallbacks
    if (processedKeys.has(targetKey)) continue;

    // Verificar disponibilidad en la sub-etapa
    if (!isWidgetAvailable(def, currentStage)) {
      continue;
    }

    // Verificar permisos obligatorios (Regla: La lista que recibe el cliente ya viene filtrada por permisos)
    const hasAllPermissions = def.requiredPermissions.every((perm) =>
      can(permissions, perm)
    );
    if (!hasAllPermissions) {
      continue;
    }

    // Resolver tamaño: personalizado en el ítem, o por defecto del catálogo
    let finalSize: WidgetSize = item.size || def.defaultSize;
    if (device === 'MOBILE') {
      // En móvil todo widget ocupa ancho completo o mediano
      finalSize = finalSize === 'SMALL' ? 'SMALL' : 'FULL';
    }

    processedKeys.add(targetKey);

    resolved.push({
      key: targetKey,
      title: def.title,
      description: def.description,
      category: def.category,
      size: finalSize,
      order: currentOrder++,
      config: item.config || {},
      drillDownRoute: def.drillDownRoute(item.config),
      refreshSeconds: def.refreshSeconds,
      dataSource: def.dataSource,
      isAvailable: true,
      requiredPermissions: def.requiredPermissions,
    });
  }

  return resolved;
}
