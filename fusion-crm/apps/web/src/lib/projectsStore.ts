import { createServerCollection, dataApiAdapter } from '@/lib/serverCollection';
import { getQuotes, quotesCollection } from './quotesStore';

export const INITIAL_PROJECTS: any[] = [];

export interface ProductionItemDetail {
  id: string;
  name: string;
  quantity: number;
  material?: string;
  size?: string;
  finishings?: string;
  inks?: string;
}

export function buildProjectFromQuote(quote: any, additional?: any) {
  const quoteNumber = quote.number || `COT-${Date.now().toString().slice(-4)}`;
  const cleanNumber = quoteNumber.replace(/\D/g, '') || Math.floor(1000 + Math.random() * 9000).toString();
  const projectNumber = `OT-${cleanNumber}`;
  const firstItem = quote.items?.[0];
  const projectName = firstItem?.name || firstItem?.description || `Producción ${quoteNumber}`;
  const clientName = quote.clientName || quote.client || 'Cliente General';
  const total = Number(additional?.total ?? quote.total) || 0;

  const itemsDetail: ProductionItemDetail[] = Array.isArray(quote.items)
    ? quote.items.map((it: any, idx: number) => ({
        id: it.id || `it-${idx + 1}`,
        name: it.name || it.description || 'Ítem de impresión',
        quantity: Number(it.quantity) || 1,
        material: it.material || '',
        size: it.size || '',
        finishings: it.finishings || '',
        inks: it.inks || ''
      }))
    : [];

  const tasks = itemsDetail.map((it, idx) => ({
    id: `t-auto-${it.id || idx + 1}-${Date.now()}`,
    title: `${it.name} (${it.quantity.toLocaleString()} uds)${it.material ? ` — ${it.material}` : ''}`,
    description: 'Revisión y preparación de archivo para producción',
    status: 'PENDING' as const,
    assignedRole: 'REVISION',
    priority: 'MEDIUM' as const,
    dueDate: null,
    completedAt: null
  }));

  return {
    id: `proj-${quote.id || Date.now()}`,
    quoteId: quote.id,
    quoteNumber: quoteNumber,
    number: projectNumber,
    name: projectName,
    client: clientName,
    stageId: '1', // "Por Revisar" (Etapa 1)
    priority: 'MEDIUM',
    dueDate: additional?.deliveryTime || quote.deliveryTime || null,
    progress: 0,
    hasPO: false,
    // Sin responsable hasta que producción lo asigne
    assignments: [],
    daysLeft: 0,
    stageEnteredAt: new Date().toISOString(),
    totalRealHours: 0,
    timeEntries: [],
    consumedMaterials: [],
    artworkKeys: [],
    completedAt: null,
    qualityApprovals: [],
    partialDeliveries: [],
    systemComments: [
      `Orden de trabajo generada automáticamente desde cotización ganada ${quoteNumber}`
    ],
    itemsDetail,
    quoteTotal: total,
    productType: quote.productType || 'Impresión Digital',
    tasks,
    laborCost: 0,
    materialCost: 0,
    outsourcedCost: 0,
    otherCost: 0,
    isBilled: false,
    createdAt: quote.approvedAt || quote.date || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Proyectos (OT de producción): fuente de verdad en el servidor (/api/data/projects,
 * colección `projects` de Firestore), caché en memoria en el navegador.
 */
export const projectsCollection = createServerCollection<any>({
  updatedEvent: 'fusion_projects_updated',
  legacyStorageKey: 'fusion_projects',
  adapter: dataApiAdapter('projects'),
});

/**
 * Claves de proyectos eliminados explícitamente, para no volver a crearlos a partir de
 * su cotización ganada. Se guardan en el servidor para que valga en todos los equipos.
 */
interface ProjectTombstone {
  id: string;
  key: string;
}

const tombstoneId = (key: string) => key.trim().toLowerCase().replace(/\//g, '_').slice(0, 500);

const tombstonesCollection = createServerCollection<ProjectTombstone>({
  updatedEvent: 'fusion_project_tombstones_updated',
  legacyStorageKey: 'fusion_deleted_project_ids',
  fromLegacy: (raw) => (typeof raw === 'string' && raw.trim() ? { id: tombstoneId(raw), key: raw } : null),
  adapter: dataApiAdapter('project-tombstones'),
});

const normalizeStage = (p: any) => (p.stageId === 'POR_REVISAR' || !p.stageId ? { ...p, stageId: '1' } : p);

export const getDeletedProjectKeys = (): Set<string> => {
  const keys = new Set<string>();
  for (const t of tombstonesCollection.getAll()) {
    keys.add(t.key);
    keys.add(t.key.trim().toLowerCase());
  }
  return keys;
};

const isDeletedProject = (p: any, deletedKeys: Set<string>) => {
  const pId = p.id ? String(p.id) : '';
  const qId = p.quoteId ? String(p.quoteId) : '';
  const qNum = (p.quoteNumber || '').trim().toLowerCase();
  const pNum = (p.number || '').trim().toLowerCase();
  return deletedKeys.has(pId) || deletedKeys.has(qId) || deletedKeys.has(qNum) || deletedKeys.has(pNum);
};

export const markProjectAsDeleted = (keys: string[]) => {
  const byId = new Map<string, ProjectTombstone>();
  for (const k of keys) {
    if (k && typeof k === 'string' && k.trim()) byId.set(tombstoneId(k), { id: tombstoneId(k), key: k });
  }
  if (byId.size === 0) return;
  tombstonesCollection
    .save(Array.from(byId.values()))
    .catch((err) => console.warn('Error saving deleted project keys:', err));
};

const isWonQuote = (q: any) => {
  const s = (q.status || '').toLowerCase().trim();
  return s === 'aprobada' || s === 'ganada' || s === 'ganado' || s === 'aceptada';
};

/** Proyectos y cotizaciones ya cargados del servidor (condición para reconciliar sin pisar datos). */
const isReadyToReconcile = () =>
  projectsCollection.isHydrated() && tombstonesCollection.isHydrated() && quotesCollection.isHydrated();

export const syncWonQuotesToProjects = (existingProjects?: any[]) => {
  const projects: any[] = [...(existingProjects ?? projectsCollection.getAll())];
  if (!isReadyToReconcile()) return projects;

  try {
    const wonQuotes = getQuotes().filter(isWonQuote);
    if (wonQuotes.length === 0) return projects;

    const deletedKeys = getDeletedProjectKeys();
    let hasChanges = false;

    // 1. Normalize any projects where stageId was saved as 'POR_REVISAR'
    for (let i = 0; i < projects.length; i++) {
      const normalized = normalizeStage(projects[i]);
      if (normalized !== projects[i]) {
        projects[i] = normalized;
        hasChanges = true;
      }
    }

    // 2. Ensure every won quote has a project in the pipeline UNLESS explicitly deleted by user
    wonQuotes.forEach((q: any) => {
      const qId = q.id ? String(q.id) : '';
      const qNum = (q.number || '').trim().toLowerCase();

      if (
        (qId && (deletedKeys.has(qId) || deletedKeys.has(`proj-${qId}`))) ||
        (qNum && deletedKeys.has(qNum))
      ) {
        return;
      }

      const alreadyHasProject = projectsCollection.getAll().concat(projects).some((p: any) =>
        (p.quoteId && String(p.quoteId) === qId) ||
        (p.quoteNumber && q.number && p.quoteNumber.trim().toLowerCase() === qNum) ||
        (p.id === `proj-${q.id}`)
      );

      if (!alreadyHasProject) {
        projects.unshift(buildProjectFromQuote(q));
        hasChanges = true;
      }
    });

    if (hasChanges) {
      const merged = [
        ...projects,
        ...projectsCollection.getAll().filter((p: any) => !projects.some((x: any) => x.id === p.id)),
      ];
      projectsCollection.saveChanged(merged).catch((err) => console.warn('Error saving reconciled projects:', err));
    }

    return projects;
  } catch (err) {
    console.warn('Error syncing won quotes to projects:', err);
    return projects;
  }
};

export const createOrEnsureProjectForQuote = (quote: any, additional?: any) => {
  if (!quote) return null;
  const projects = getProjects();
  const existing = projects.find((p: any) =>
    (p.quoteId && p.quoteId === quote.id) ||
    (p.quoteNumber && quote.number && p.quoteNumber.trim().toLowerCase() === quote.number.trim().toLowerCase()) ||
    (p.id === `proj-${quote.id}`)
  );

  if (existing) {
    if (existing.stageId === 'POR_REVISAR') {
      addProject(existing);
    }
    return existing;
  }

  const newProj = buildProjectFromQuote(quote, additional);
  addProject(newProj);
  return newProj;
};

let autoHydrationRequested = false;

const getVisibleProjects = () => {
  const deletedKeys = getDeletedProjectKeys();
  return projectsCollection.getAll().filter((p: any) => !isDeletedProject(p, deletedKeys));
};

export const getProjects = () => {
  if (typeof window === 'undefined') return [];

  // Carga inicial desde el servidor (una sola vez por carga de página)
  if (!projectsCollection.isHydrated() && !autoHydrationRequested) {
    autoHydrationRequested = true;
    syncProjectsFromApi();
  }

  const deletedKeys = getDeletedProjectKeys();
  const visible = projectsCollection.getAll().filter((p: any) => !isDeletedProject(p, deletedKeys));

  // Auto-reconcile won quotes into projects so they appear in "Por Revisar"
  return syncWonQuotesToProjects(visible);
};

export const addProject = (project: any) => {
  projectsCollection
    .save(normalizeStage(project))
    .catch((err) => console.warn('Error saving project:', err));
};

export const updateProjectsList = (projects: any[]) => {
  projectsCollection
    .saveChanged((projects || []).map(normalizeStage))
    .catch((err) => console.warn('Error saving projects:', err));
};

export const deleteProject = async (projectId: string) => {
  if (typeof window === 'undefined') return [];
  try {
    const projects: any[] = projectsCollection.getAll();
    const target = projects.find((p: any) => p.id === projectId);

    const keysToMark = [projectId];
    if (target?.quoteId) keysToMark.push(String(target.quoteId));
    if (target?.quoteNumber) keysToMark.push(target.quoteNumber);
    if (target?.number) keysToMark.push(target.number);
    if (target?.id) keysToMark.push(target.id);
    if (target?.quoteId) keysToMark.push(`proj-${target.quoteId}`);

    markProjectAsDeleted(keysToMark);

    const remaining = projects.filter((p: any) =>
      p.id !== projectId &&
      (!target?.quoteId || p.quoteId !== target.quoteId) &&
      (!target?.quoteNumber || p.quoteNumber !== target.quoteNumber)
    );
    projectsCollection.replaceLocal(remaining);

    // El servidor elimina el proyecto y los relacionados por cotización/número
    fetch(`/api/quotes/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId: target?.quoteId,
        quoteNumber: target?.quoteNumber,
        number: target?.number
      })
    }).catch(err => console.warn('Backend delete project error:', err));

    return remaining;
  } catch (err) {
    console.error('Error deleting project:', err);
    return [];
  }
};

export const syncProjectsFromApi = async () => {
  try {
    await Promise.all([projectsCollection.hydrate(), tombstonesCollection.hydrate()]);
  } catch (err) {
    console.warn('Could not sync projects from API:', err);
  }
  return syncWonQuotesToProjects(getVisibleProjects());
};
