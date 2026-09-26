/**
 * Tipos y Definiciones de Anuncios — Fusion ERP / CRM (Etapa 15.4)
 */

export type AnnouncementType =
  | 'ANNOUNCEMENT'
  | 'DIRECTIVE'
  | 'RECOGNITION'
  | 'ALERT'
  | 'EVENT'
  | 'POLICY';

export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export type AnnouncementTargetType = 'EVERYONE' | 'ROLE' | 'AREA' | 'TEAM' | 'USER';

export interface AudienceTarget {
  targetType: AnnouncementTargetType;
  roleId?: string | null;
  areaKey?: string | null;
  userId?: string | null;
}

export interface AnnouncementAttachment {
  name: string;
  key: string;
  size: number;
  mimeType: string;
  url?: string;
}

export type ShoutoutValueKey = 'calidad' | 'cumplimiento' | 'servicio' | 'equipo' | 'iniciativa';

export interface ShoutoutValueDefinition {
  key: ShoutoutValueKey;
  label: string;
  description: string;
  badgeColor: string;
  iconName: string;
}

export const SHOUTOUT_VALUES: Record<ShoutoutValueKey, ShoutoutValueDefinition> = {
  calidad: {
    key: 'calidad',
    label: 'Excelencia en Calidad',
    description: 'Atención impecable al detalle y estándares de acabado',
    badgeColor: 'emerald',
    iconName: 'Award',
  },
  cumplimiento: {
    key: 'cumplimiento',
    label: 'Cumplimiento y Puntualidad',
    description: 'Entregas a tiempo y compromiso estricto con los plazos',
    badgeColor: 'blue',
    iconName: 'CheckCircle2',
  },
  servicio: {
    key: 'servicio',
    label: 'Vocación de Servicio',
    description: 'Dedicación extraordinaria hacia clientes o compañeros',
    badgeColor: 'amber',
    iconName: 'HeartHandshake',
  },
  equipo: {
    key: 'equipo',
    label: 'Trabajo en Equipo',
    description: 'Colaboración solidaria y apoyo entre áreas o líneas',
    badgeColor: 'purple',
    iconName: 'Users',
  },
  iniciativa: {
    key: 'iniciativa',
    label: 'Iniciativa y Mejora',
    description: 'Propuestas de optimización, creatividad y resolución ágil',
    badgeColor: 'rose',
    iconName: 'Sparkles',
  },
};
