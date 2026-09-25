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
    assignments: [
      {
        role: 'REVISION',
        user: { id: 'me', name: 'Andres Admin', initial: 'AA', color: 'bg-indigo-500' }
      }
    ],
    daysLeft: 5,
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

// Helpers for tracking explicitly deleted projects so they are not auto-resurrected
export const getDeletedProjectKeys = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('fusion_deleted_project_ids');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const markProjectAsDeleted = (keys: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedProjectKeys();
    keys.forEach(k => {
      if (k && typeof k === 'string') {
        current.add(k);
        current.add(k.trim().toLowerCase());
      }
    });
    localStorage.setItem('fusion_deleted_project_ids', JSON.stringify(Array.from(current)));
  } catch (err) {
    console.warn('Error saving deleted project keys:', err);
  }
};

export const syncWonQuotesToProjects = (existingProjects?: any[]) => {
  if (typeof window === 'undefined') return existingProjects || [];
  try {
    const rawQuotes = localStorage.getItem('fusion_quotes');
    if (!rawQuotes) return existingProjects || [];
    const quotes = JSON.parse(rawQuotes);
    if (!Array.isArray(quotes)) return existingProjects || [];

    const deletedKeys = getDeletedProjectKeys();

    // Filter quotes that are approved / won
    const wonQuotes = quotes.filter((q: any) => {
      const s = (q.status || '').toLowerCase().trim();
      return s === 'aprobada' || s === 'ganada' || s === 'ganado' || s === 'aceptada';
    });

    if (wonQuotes.length === 0) return existingProjects || [];

    const projects: any[] = existingProjects 
      ? [...existingProjects] 
      : (() => {
          const stored = localStorage.getItem('fusion_projects');
          return stored ? JSON.parse(stored) : [];
        })();

    let hasChanges = false;

    // 1. Normalize any projects where stageId was saved as 'POR_REVISAR'
    projects.forEach((p: any) => {
      if (p.stageId === 'POR_REVISAR' || !p.stageId) {
        p.stageId = '1';
        hasChanges = true;
      }
    });

    // 2. Ensure every won quote has a project in the pipeline UNLESS explicitly deleted by user
    wonQuotes.forEach((q: any) => {
      const qId = q.id ? String(q.id) : '';
      const qNum = (q.number || '').trim().toLowerCase();
      
      // If user deleted this project previously, do NOT resurrect it!
      if (
        (qId && (deletedKeys.has(qId) || deletedKeys.has(`proj-${qId}`))) ||
        (qNum && deletedKeys.has(qNum))
      ) {
        return;
      }

      const alreadyHasProject = projects.some((p: any) => 
        (p.quoteId && String(p.quoteId) === qId) ||
        (p.quoteNumber && q.number && p.quoteNumber.trim().toLowerCase() === qNum) ||
        (p.id === `proj-${q.id}`)
      );

      if (!alreadyHasProject) {
        const newProject = buildProjectFromQuote(q);
        projects.unshift(newProject);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem('fusion_projects', JSON.stringify(projects));
      window.dispatchEvent(new Event('fusion_projects_updated'));
    }

    return projects;
  } catch (err) {
    console.warn('Error syncing won quotes to projects:', err);
    return existingProjects || [];
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
    // If it was in stage 'POR_REVISAR', normalize to '1'
    if (existing.stageId === 'POR_REVISAR') {
      existing.stageId = '1';
      updateProjectsList(projects);
    }
    return existing;
  }

  const newProj = buildProjectFromQuote(quote, additional);
  addProject(newProj);
  return newProj;
};

export const getProjects = () => {
  if (typeof window === 'undefined') return [];
  
  // Trigger background sync if not already done in this session
  if (!(window as any)._projectsSynced) {
    (window as any)._projectsSynced = true;
    syncProjectsFromApi();
  }

  let projects: any[] = [];
  const stored = localStorage.getItem('fusion_projects');
  if (stored) {
    try {
      projects = JSON.parse(stored);
    } catch {
      projects = [];
    }
  }

  // Filter out any explicitly deleted projects in case old state remained
  const deletedKeys = getDeletedProjectKeys();
  if (deletedKeys.size > 0) {
    projects = projects.filter((p: any) => {
      const pId = p.id ? String(p.id) : '';
      const qId = p.quoteId ? String(p.quoteId) : '';
      const qNum = (p.quoteNumber || '').trim().toLowerCase();
      const pNum = (p.number || '').trim().toLowerCase();
      return !deletedKeys.has(pId) && !deletedKeys.has(qId) && !deletedKeys.has(qNum) && !deletedKeys.has(pNum);
    });
  }

  // Auto-reconcile won quotes into projects so they appear in "Por Revisar"
  const reconciled = syncWonQuotesToProjects(projects);
  return reconciled;
};

export const addProject = (project: any) => {
  const projects = getProjects();
  const normalized = {
    ...project,
    stageId: project.stageId === 'POR_REVISAR' || !project.stageId ? '1' : project.stageId
  };
  const updated = [normalized, ...projects.filter((p: any) => p.id !== normalized.id)];
  localStorage.setItem('fusion_projects', JSON.stringify(updated));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_projects_updated'));
};

export const updateProjectsList = (projects: any[]) => {
  const normalizedList = (projects || []).map((p: any) => ({
    ...p,
    stageId: p.stageId === 'POR_REVISAR' || !p.stageId ? '1' : p.stageId
  }));
  localStorage.setItem('fusion_projects', JSON.stringify(normalizedList));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fusion_projects_updated'));
};

export const deleteProject = async (projectId: string) => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('fusion_projects');
    const projects: any[] = raw ? JSON.parse(raw) : [];
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

    localStorage.setItem('fusion_projects', JSON.stringify(remaining));
    window.dispatchEvent(new Event('fusion_projects_updated'));

    // Asynchronously delete from backend / Firestore
    try {
      fetch(`/api/quotes/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quoteId: target?.quoteId,
          quoteNumber: target?.quoteNumber,
          number: target?.number 
        })
      }).catch(err => console.warn('Backend delete project error:', err));
    } catch (e) {
      console.warn('Network call error on deleteProject:', e);
    }

    return remaining;
  } catch (err) {
    console.error('Error deleting project:', err);
    return [];
  }
};

export const syncProjectsFromApi = async () => {
  try {
    const res = await fetch('/api/quotes/projects-sync');
    if (!res.ok) return getProjects();
    const data = await res.json();
    
    if (data.success && Array.isArray(data.projects)) {
      const deletedKeys = getDeletedProjectKeys();
      const local = getProjects();
      const map = new Map<string, any>();
      
      // Mark local projects for identification (ignoring deleted)
      local.forEach((p: any) => {
        const pId = p.id ? String(p.id) : '';
        const qId = p.quoteId ? String(p.quoteId) : '';
        const qNum = (p.quoteNumber || '').trim().toLowerCase();
        const pNum = (p.number || '').trim().toLowerCase();
        if (deletedKeys.has(pId) || deletedKeys.has(qId) || deletedKeys.has(qNum) || deletedKeys.has(pNum)) {
          return;
        }
        const normStage = p.stageId === 'POR_REVISAR' || !p.stageId ? '1' : p.stageId;
        map.set(p.id, { ...p, stageId: normStage, isLocalOnly: true });
      });
      
      // Overwrite or add remote (ignoring deleted)
      data.projects.forEach((p: any) => {
        const pId = p.id ? String(p.id) : '';
        const qId = p.quoteId ? String(p.quoteId) : '';
        const qNum = (p.quoteNumber || '').trim().toLowerCase();
        const pNum = (p.number || '').trim().toLowerCase();
        if (deletedKeys.has(pId) || deletedKeys.has(qId) || deletedKeys.has(qNum) || deletedKeys.has(pNum)) {
          return;
        }
        const normStage = p.stageId === 'POR_REVISAR' || !p.stageId ? '1' : p.stageId;
        map.set(p.id, { ...p, stageId: normStage, isLocalOnly: false });
      });
      
      const merged = Array.from(map.values());
      updateProjectsList(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync projects from API:', err);
  }
  return getProjects();
};

