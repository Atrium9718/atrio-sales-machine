import { getCurrentUser } from '@/lib/currentUser';

// --- TYPES ---
export interface ProductionStage {
  id: string;
  key: string;
  name: string;
  color: string;
  dot: string;
  roleNeeded: string;
  isArchivedStage: boolean;
  requiresArtworkToAdvance: boolean;
  requiresQualityApproval: boolean;
  qualityApprovalsRequired: number;
  isFinal: boolean;
  order: number;
}

export interface ProjectAssignment {
  role: string;
  user: { id: string; initial: string; color: string; name: string };
}

export interface TimeEntry {
  id: string;
  source: 'MANUAL' | 'SYSTEM_AUTO';
  description: string;
  hours: number;
  costType: 'MANO_OBRA' | 'MATERIALES' | 'TERCEROS' | 'OTROS' | null;
  costAmount: number;
  taskId: string | null;
  createdAt: string;
  registeredByName: string;
}

export interface QualityApproval {
  id: string;
  stageId: string;
  approvedById: string;
  approvedByName: string;
  approvedAt: string;
}

export interface ProjectPartialDelivery {
  id: string;
  quantity: number;
  notes: string;
  registeredById: string;
  registeredByName: string;
  registeredAt: string;
}

export interface DeliveryNote {
  id: string;
  projectId: string;
  number: string;
  client: string;
  status: 'GENERADA' | 'ENTREGADA' | 'ANULADA';
  itemsCount: number;
  elaboratedBy: string;
  notes: string;
  createdAt: string;
}

export interface ProductionTask {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  assignedRole: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  completedAt: string | null;
}

export interface ProductionProject {
  id: string;
  number: string;
  name: string;
  client: string;
  stageId: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  hasPO: boolean;
  assignments: ProjectAssignment[];
  daysLeft: number;
  
  stageEnteredAt: string;
  totalRealHours: number;
  timeEntries: TimeEntry[];
  /** Salidas de bodega cargadas a la OT (itemId/movementId desde el kárdex; las antiguas no los tienen). */
  consumedMaterials: { id: string; name: string; quantity: number; unitCost: number; totalCost: number; date: string; itemId?: string; movementId?: string; kind?: 'CONSUMO' | 'MERMA'; unit?: string; note?: string }[];
  
  artworkKeys: string[];
  completedAt: string | null;
  qualityApprovals: QualityApproval[];
  partialDeliveries: ProjectPartialDelivery[];
  systemComments: string[];
  itemsDetail: { id: string; name: string; quantity: number; material?: string; size?: string; finishings?: string; inks?: string }[];
  quoteTotal: number;
  quoteNumber: string;
  productType: string;
  
  tasks: ProductionTask[];
  laborCost: number;
  materialCost: number;
  outsourcedCost: number;
  otherCost: number;
  isBilled: boolean;
}

export interface TaskTemplate {
  productType: string;
  defaultTasks: { title: string; assignedRole: string | null; description?: string }[];
}

export interface Quote {
  id: string;
  number: string;
  client: string;
  total: number;
  items: { id: string; name: string; quantity: number; material?: string; size?: string; finishings?: string; inks?: string }[];
  status: string;
}

// --- MOCKS ---

export const EXPECTED_HOURS_PER_STAGE: Record<string, number> = {
  'POR_REVISAR': 1,
  'PRODUCCION_PROGRAMADA': 0.5,
  'EN_PRODUCCION': 4,
  'ACABADOS': 3,
  'FINALIZADO': 1,
  'ENTREGADO': 0
};

export const INITIAL_STAGES: ProductionStage[] = [
  { id: '1', order: 1, key: 'POR_REVISAR', name: 'Por Revisar', color: 'bg-slate-100', dot: 'bg-slate-500', roleNeeded: 'REVISION', isArchivedStage: false, requiresArtworkToAdvance: true, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '2', order: 2, key: 'PRODUCCION_PROGRAMADA', name: 'Programada', color: 'bg-blue-50', dot: 'bg-blue-500', roleNeeded: 'PRODUCCION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '3', order: 3, key: 'EN_PRODUCCION', name: 'En Producción', color: 'bg-indigo-50', dot: 'bg-indigo-500', roleNeeded: 'IMPRESION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '4', order: 4, key: 'ACABADOS', name: 'Acabados', color: 'bg-purple-50', dot: 'bg-purple-500', roleNeeded: 'ACABADOS', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: true, qualityApprovalsRequired: 2, isFinal: false },
  { id: '5', order: 5, key: 'FINALIZADO', name: 'Finalizado', color: 'bg-emerald-50', dot: 'bg-emerald-500', roleNeeded: 'PRODUCCION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '6', order: 6, key: 'ENTREGADO', name: 'Entregado', color: 'bg-green-50', dot: 'bg-green-500', roleNeeded: 'MONTAJE', isArchivedStage: true, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: true },
];

export const TASK_TEMPLATES: TaskTemplate[] = [
  { productType: 'Impresión Digital', defaultTasks: [{ title: 'Calibrar perfiles CMYK', assignedRole: 'IMPRESION' }, { title: 'Verificar sustrato', assignedRole: 'PRODUCCION' }] },
  { productType: 'Gran Formato', defaultTasks: [{ title: 'Tensado de prueba', assignedRole: 'ACABADOS' }] }
];

/** Persona que registra tiempos, aprobaciones y entregas: el usuario con sesión. */
export const currentProductionUser = () => {
  const u = getCurrentUser();
  return { id: u?.id || 'desconocido', name: u?.name || 'Usuario', initial: u?.initials || '?', color: 'bg-indigo-500' };
};



// Formatter Helpers (Bloque Ñ)
export const formatCOP = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;
export const formatShortDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
export const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};
