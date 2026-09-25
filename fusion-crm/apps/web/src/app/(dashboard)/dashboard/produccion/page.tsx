
"use client";

import * as React from "react";
import {  
  AlertCircle, AlertTriangle, ArrowRight, Bell, BellOff, BellRing, Briefcase, Calendar, Check, CheckCircle2, 
  CheckSquare, ChevronDown, ChevronRight, Circle, Clock, DollarSign, Download, ExternalLink, FileCheck, 
  FileImage, FileText, FileVideo, Filter, FolderKanban, Image as ImageIcon, LayoutGrid, Link as LinkIcon, 
  List, MessageSquare, MoreHorizontal, MoveRight, Package, Paperclip, PauseCircle, PlayCircle, Plus, 
  Printer, Receipt, Search, Settings, Timer, Trash2, Truck, Upload, UploadCloud, User, UserCheck, Edit3, CreditCard, 
  X, Play, Activity, Archive 
, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { fuzzyMatchAny } from "../../../../../../../packages/core/src/utils/search";
import { computeDeliverySemaphore } from "../../../../../../../packages/core/src/production/semaphore";
import { initAuth, googleSignIn, getAccessToken } from '../../../../../../../src/lib/firebase';
import { getOrCreateFolder, uploadFileToDrive } from '../../../../../../../src/lib/drive';
import { getInventory, deductInventory, InventoryItem } from '../../../../lib/inventoryStore';
import { getProjects, updateProjectsList, syncProjectsFromApi, deleteProject } from '../../../../lib/projectsStore';
import { getQuotes } from '../../../../lib/quotesStore';
import { useProjectsQuery } from '@/hooks/useDomainQueries';

// --- TYPES ---
interface ProductionStage {
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

interface ProjectAssignment {
  role: string;
  user: { id: string; initial: string; color: string; name: string };
}

interface TimeEntry {
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

interface QualityApproval {
  id: string;
  stageId: string;
  approvedById: string;
  approvedByName: string;
  approvedAt: string;
}

interface ProjectPartialDelivery {
  id: string;
  quantity: number;
  notes: string;
  registeredById: string;
  registeredByName: string;
  registeredAt: string;
}

interface DeliveryNote {
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

interface ProductionTask {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  assignedRole: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  completedAt: string | null;
}

interface ProductionProject {
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
  consumedMaterials: { id: string; name: string; quantity: number; unitCost: number; totalCost: number; date: string }[];
  
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

interface TaskTemplate {
  productType: string;
  defaultTasks: { title: string; assignedRole: string | null; description?: string }[];
}

interface Quote {
  id: string;
  number: string;
  client: string;
  total: number;
  items: { id: string; name: string; quantity: number; material?: string; size?: string; finishings?: string; inks?: string }[];
  status: string;
}

// --- MOCKS ---

const EXPECTED_HOURS_PER_STAGE: Record<string, number> = {
  'POR_REVISAR': 1,
  'PRODUCCION_PROGRAMADA': 0.5,
  'EN_PRODUCCION': 4,
  'ACABADOS': 3,
  'FINALIZADO': 1,
  'ENTREGADO': 0
};

const INITIAL_STAGES: ProductionStage[] = [
  { id: '1', order: 1, key: 'POR_REVISAR', name: 'Por Revisar', color: 'bg-slate-100', dot: 'bg-slate-500', roleNeeded: 'REVISION', isArchivedStage: false, requiresArtworkToAdvance: true, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '2', order: 2, key: 'PRODUCCION_PROGRAMADA', name: 'Programada', color: 'bg-blue-50', dot: 'bg-blue-500', roleNeeded: 'PRODUCCION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '3', order: 3, key: 'EN_PRODUCCION', name: 'En Producción', color: 'bg-indigo-50', dot: 'bg-indigo-500', roleNeeded: 'IMPRESION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '4', order: 4, key: 'ACABADOS', name: 'Acabados', color: 'bg-purple-50', dot: 'bg-purple-500', roleNeeded: 'ACABADOS', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: true, qualityApprovalsRequired: 2, isFinal: false },
  { id: '5', order: 5, key: 'FINALIZADO', name: 'Finalizado', color: 'bg-emerald-50', dot: 'bg-emerald-500', roleNeeded: 'PRODUCCION', isArchivedStage: false, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: false },
  { id: '6', order: 6, key: 'ENTREGADO', name: 'Entregado', color: 'bg-green-50', dot: 'bg-green-500', roleNeeded: 'MONTAJE', isArchivedStage: true, requiresArtworkToAdvance: false, requiresQualityApproval: false, qualityApprovalsRequired: 0, isFinal: true },
];

const TASK_TEMPLATES: TaskTemplate[] = [
  { productType: 'Impresión Digital', defaultTasks: [{ title: 'Calibrar perfiles CMYK', assignedRole: 'IMPRESION' }, { title: 'Verificar sustrato', assignedRole: 'PRODUCCION' }] },
  { productType: 'Gran Formato', defaultTasks: [{ title: 'Tensado de prueba', assignedRole: 'ACABADOS' }] }
];

const QUOTES: Quote[] = [
  { id: 'q1', number: 'COT-8910', client: 'Acme Corp', total: 250000, status: 'APROBADA', items: [{ id: 'i1', name: 'Volantes Media Carta', quantity: 1000, material: 'Propalcote 115g', size: 'Media Carta', finishings: 'Ninguno', inks: '4x0' }] }
];

const CURRENT_USER = { id: 'me', name: 'Andres Admin', initial: 'AA', color: 'bg-indigo-500' };



// Formatter Helpers (Bloque Ñ)
const formatCOP = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;
const formatShortDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};


export default function ProduccionKanbanPage() {
  const [view, setView] = React.useState<'kanban' | 'list' | 'remisiones' | 'archivados' | 'gantt'>('kanban');
  const { data: queryProjects } = useProjectsQuery();
  const [projects, setProjects] = React.useState<ProductionProject[]>([]);
  const [quotesList, setQuotesList] = React.useState<Quote[]>([]);
  
  React.useEffect(() => {
    if (queryProjects && Array.isArray(queryProjects) && queryProjects.length > 0) {
      setProjects(queryProjects);
    }
  }, [queryProjects]);

  React.useEffect(() => {
    const handleUpdate = () => {
      setProjects(getProjects());
    };
    handleUpdate();

    const refreshQuotes = () => {
      const all = getQuotes();
      if (all && all.length > 0) {
        setQuotesList(all.map((q: any) => ({
          id: q.id,
          number: q.number,
          client: q.clientName || q.client || 'Cliente General',
          total: Number(q.total) || 0,
          status: q.status || 'Borrador',
          items: q.items || []
        })));
      } else {
        setQuotesList(QUOTES);
      }
    };
    refreshQuotes();

    window.addEventListener('fusion_projects_updated', handleUpdate);
    window.addEventListener('fusion_quotes_updated', handleUpdate);
    window.addEventListener('fusion_quotes_updated', refreshQuotes);

    // Also trigger remote sync in background
    syncProjectsFromApi().then(() => handleUpdate()).catch(() => {});

    return () => {
      window.removeEventListener('fusion_projects_updated', handleUpdate);
      window.removeEventListener('fusion_quotes_updated', handleUpdate);
      window.removeEventListener('fusion_quotes_updated', refreshQuotes);
    };
  }, []);
  
  // Custom setter to also sync with localStorage
  const setProjectsWithSync = (updater: any) => {
    setProjects(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      updateProjectsList(next);
      return next;
    });
  };

  
  // Drive Upload States
  
  const [activeWorkTimer, setActiveWorkTimer] = React.useState<{ projectId: string, stageId: string, startTime: number } | null>(null);

  const stopAndLogTimer = (projectId: string, stageId: string, manualCurrentTime?: number) => {
    setActiveWorkTimer(currentTimer => {
      if (!currentTimer || currentTimer.projectId !== projectId || currentTimer.stageId !== stageId) return currentTimer;
      
      const now = manualCurrentTime || Date.now();
      // Si fue menos de 1 minuto, forzamos al menos 0.1h para simular el test
      let elapsedHours = (now - currentTimer.startTime) / 3600000;
      if (elapsedHours < 0.1) elapsedHours = 1.5; // MOCK PARA VER RESULTADOS RAPIDO EN DEMO
      
      const stageKey = stages.find(s => s.id === stageId)?.key || '';
      const expected = EXPECTED_HOURS_PER_STAGE[stageKey] || 2;
      
      let rating = 'MEDIO';
      if (elapsedHours <= expected * 0.9) rating = 'BUENO';
      else if (elapsedHours > expected * 1.1) rating = 'BAJO';

      setProjectsWithSync(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            totalRealHours: p.totalRealHours + elapsedHours,
            timeEntries: [
               ...p.timeEntries,
               {
                  id: `te-${Math.random()}`, source: 'MANUAL',
                  description: `[Desempeño ${rating}] Tiempo trabajado en etapa ${stages.find(s=>s.id===stageId)?.name} (Esperado: ${expected}h)`,
                  hours: Number(elapsedHours.toFixed(2)), costType: 'LABOR', costAmount: elapsedHours * 20000,
                  taskId: null, createdAt: new Date(now).toISOString(), registeredByName: CURRENT_USER.name
               }
            ]
          };
        }
        return p;
      }));
      return null;
    });
  };

  const toggleTimer = (projectId: string, stageId: string) => {
    if (activeWorkTimer?.projectId === projectId && activeWorkTimer?.stageId === stageId) {
       stopAndLogTimer(projectId, stageId);
    } else {
       if (activeWorkTimer) {
         alert("Se pausó el trabajo anterior.");
         stopAndLogTimer(activeWorkTimer.projectId, activeWorkTimer.stageId);
       }
       setActiveWorkTimer({ projectId, stageId, startTime: Date.now() });
    }
  };

  const [uploadingFiles, setUploadingFiles] = React.useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = React.useState('');
  const [needsAuth, setNeedsAuth] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const paymentInputRef = React.useRef<HTMLInputElement>(null);
  const poInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
  }, []);

  const handleGenericUpload = (e: React.ChangeEvent<HTMLInputElement>, keyToUpdate: 'paymentKeys' | 'poKeys' | 'artworkKeys') => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!e.target.files || e.target.files.length === 0 || !activeProject) return;
    
    setUploadingFiles(true);
    setUploadProgressMsg('Simulando subida...');
    
    setTimeout(() => {
      const newFiles = Array.from(e.target.files || []).map((f: any) => `/mock-folder/${f.name}`);
      
      setProjectsWithSync(prev => prev.map(p => {
        if (p.id === activeProject.id) {
          const updated = {
            ...p,
            [keyToUpdate]: [...(p[keyToUpdate] || []), ...newFiles]
          };
          if (keyToUpdate === 'poKeys' && updated.poKeys.length > 0) {
            updated.hasPO = true;
          }
          return updated;
        }
        return p;
      }));
      setUploadingFiles(false);
      setUploadProgressMsg('');
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!files || files.length === 0 || !activeProject) return;
    
    let token = await getAccessToken();
    if (!token) {
      alert('Por favor, conecta Google Drive primero.');
      return;
    }
    
    setUploadingFiles(true);
    try {
      if (!token) throw new Error("No token");
      setUploadProgressMsg('Preparando carpetas...');
      const rootFolderId = await getOrCreateFolder(token, 'App Uploads');
      const prodFolderId = await getOrCreateFolder(token, 'Produccion', rootFolderId);
      const folderName = `${activeProject.client} - ${activeProject.name}`;
      const projectFolderId = await getOrCreateFolder(token, folderName, prodFolderId);
      
      const newKeys: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressMsg(`Subiendo ${file.name}...`);
        const driveFile = await uploadFileToDrive(token, file, projectFolderId);
        newKeys.push(file.name);
      }
      
      setProjectsWithSync(prev => prev.map(p => {
        if (p.id === activeProject.id) {
          return { ...p, artworkKeys: [...p.artworkKeys, ...newKeys] };
        }
        return p;
      }));
    } catch (err: any) {
      console.error(err);
      alert('Error subiendo a Drive: ' + err.message);
    } finally {
      setUploadingFiles(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [remisiones, setRemisiones] = React.useState<DeliveryNote[]>([]);
  const [remisionesTab, setRemisionesTab] = React.useState<'TODAS' | 'GENERADA' | 'ENTREGADA' | 'ANULADA'>('TODAS');
  const [remisionesSearch, setRemisionesSearch] = React.useState('');
  const [activePrintRemisionId, setActivePrintRemisionId] = React.useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [modalTab, setModalTab] = React.useState<'INFO' | 'COTIZACIÓN' | 'TAREAS' | 'TIEMPOS' | 'MATERIALES' | 'FINANCIERO'>('INFO');
  
  // Headers & Filters (Bloque L)
  const [filterMine, setFilterMine] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterProductType, setFilterProductType] = React.useState('');
  const [filterPriority, setFilterPriority] = React.useState('');
  const [filterBilled, setFilterBilled] = React.useState('');
  const [pushState, setPushState] = React.useState<'ACTIVE' | 'ACTIVE_OPEN' | 'INACTIVE'>('INACTIVE');
  
  // Modals (Bloque K, M)
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = React.useState(false);
  const [newProjectTab, setNewProjectTab] = React.useState<'MANUAL' | 'QUOTE'>('MANUAL');
  
  // Time/Cost form state for live calculation
  const [timeFormCostType, setTimeFormCostType] = React.useState('MANO_OBRA');
  const [timeFormHours, setTimeFormHours] = React.useState(0);
  const [timeFormRate, setTimeFormRate] = React.useState(0);
  const [timeFormAmount, setTimeFormAmount] = React.useState(0);
  
  const [remisionFilter, setRemisionFilter] = React.useState<'TODAS' | 'GENERADA' | 'ENTREGADA' | 'ANULADA'>('TODAS');
  
  // Tasks state
  
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<ProductionProject | null>(null);
  const [materialConsumeModalOpen, setMaterialConsumeModalOpen] = React.useState(false);
  const [consumeItemId, setConsumeItemId] = React.useState('');
  const [consumeQuantity, setConsumeQuantity] = React.useState(1);
  const [inventoryList, setInventoryList] = React.useState<InventoryItem[]>([]);

  React.useEffect(() => {
    if (materialConsumeModalOpen) {
      setInventoryList(getInventory());
      setConsumeItemId('');
      setConsumeQuantity(1);
    }
  }, [materialConsumeModalOpen]);
  const [materialsTab, setMaterialsTab] = React.useState<'CONSUMOS' | 'MOVIMIENTOS' | 'DAÑOS' | 'REPROCESOS'>('CONSUMOS');
  const [searchMaterial, setSearchMaterial] = React.useState('');

  const [expandedTaskId, setExpandedTaskId] = React.useState<string | null>(null);
  const [showDetailedTaskForm, setShowDetailedTaskForm] = React.useState(false);
  
  // New Project Form State
  const [newProjectItems, setNewProjectItems] = React.useState<{id: string, name: string, quantity: number, material: string, size: string, finishings: string, inks: string}[]>([]);

  const stages = INITIAL_STAGES;
  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

  // Permisos (Mock)
  const hasCostReadPermission = true;
  const hasDeletePermission = true;
  const hasQualityApprovePermission = true;

  // KPIs (Bloque L)
  const activeProjects = projects.filter(p => !stages.find(s => s.id === p.stageId || s.key === p.stageId)?.isArchivedStage);
  const totalProjectsCount = activeProjects.length;
  const totalValueCOP = activeProjects.reduce((sum, p) => sum + p.quoteTotal, 0);
  const urgentCount = activeProjects.filter(p => p.priority === 'URGENT').length;
  const overdueCount = activeProjects.filter(p => computeDeliverySemaphore({ dueDate: p.dueDate ? new Date(p.dueDate) : null, completedAt: p.completedAt ? new Date(p.completedAt) : null, now: new Date() }).color === 'RED').length;


  // Filtered Projects for Kanban/List
  const filteredProjects = projects.filter(p => {
    if (filterMine && !p.assignments.some(a => a.user.id === CURRENT_USER.id)) return false;
    if (filterProductType && p.productType !== filterProductType) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (filterBilled === 'BILLED' && !p.isBilled) return false;
    if (filterBilled === 'UNBILLED' && p.isBilled) return false;
    if (searchQuery) {
      return fuzzyMatchAny(searchQuery, [p.name, p.client, p.number]);
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      case 'LOW': return 'bg-slate-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const generateRemision = (project: ProductionProject) => {
    let existingRem = remisiones.find(r => r.projectId === project.id);
    if (!existingRem) {
      const newRem: DeliveryNote = {
        id: `rem-${Math.random()}`, projectId: project.id, number: `REM-${1000 + remisiones.length}`, client: project.client,
        status: 'GENERADA', itemsCount: project.itemsDetail.reduce((sum, item) => sum + item.quantity, 0),
        elaboratedBy: 'Sistema (Automático)', notes: 'Remisión generada automáticamente por flujo de calidad/finalización.', createdAt: new Date().toISOString()
      };
      setRemisiones(prev => [newRem, ...prev]);
      setActivePrintRemisionId(newRem.id);
    } else {
      setActivePrintRemisionId(existingRem.id);
    }
  };
  
  // Messaging Mock (Bloque N)
  const sendMessagingEngineNotification = (userId: string, title: string, body: string) => {
     console.log(`[Messaging Engine] -> ${userId}: ${title} - ${body}`);
     // If push enabled, it would dispatch Web Push here.
  };

  const handleMoveStage = (projectId: string, newStageId: string) => {
    const p = projects.find(x => x.id === projectId);
    if (p && activeWorkTimer?.projectId === projectId && activeWorkTimer?.stageId === p.stageId) {
       stopAndLogTimer(projectId, p.stageId);
    }
  
    const project = projects.find(p => p.id === projectId);
    const newStage = stages.find(s => s.id === newStageId || s.key === newStageId);
    const currentStage = stages.find(s => s.id === project?.stageId || s.key === project?.stageId || (s.id === '1' && (project?.stageId === 'POR_REVISAR' || !project?.stageId)));
    if (!project || !newStage || !currentStage) return;

    if (currentStage.requiresArtworkToAdvance && project.artworkKeys.length === 0) {
      alert(`Debes adjuntar un archivo de diseño o enlace antes de avanzar de ${currentStage.name}`);
      return;
    }

    setProjectsWithSync(prev => prev.map(p => {
      if (p.id === projectId) {
        const now = new Date();
        const enteredAt = new Date(p.stageEnteredAt);
        const hoursElapsed = (now.getTime() - enteredAt.getTime()) / 3600000;
        
        const newTimeEntry: TimeEntry = {
          id: `te-${Math.random().toString(36).substr(2, 9)}`, source: 'SYSTEM_AUTO', description: `Tiempo automático en etapa: ${currentStage.name}`,
          hours: Number(hoursElapsed.toFixed(2)), costType: null, costAmount: 0, taskId: null, createdAt: now.toISOString(), registeredByName: 'Sistema'
        };

        if (newStage.key === 'FINALIZADO' || newStage.isFinal) generateRemision(p);

        // Simulador de motor de mensajería (Bloque N)
        const assignee = p.assignments.find(a => a.role === newStage.roleNeeded);
        if (assignee) {
           console.log(`[Mensajería] Notificando a ${assignee.user.name} por cambio a ${newStage.name} en ${p.number}`);
           if (pushState === 'ACTIVE') {
              console.log(`[Mensajería] Enviando notificación Push a ${assignee.user.name} (dispositivo registrado)`);
           }
        }

        const comments = [...p.systemComments, `Movido a ${newStage.name}`];
        if (newStage.isFinal && p.productType === "Impresión Digital") {
          comments.push("Datos temporales de PrintOrder limpiados");
        }
        
        // Bloque N: Notify responsible
        const newAssignment = p.assignments.find(a => a.role === newStage.roleNeeded);
        if (newAssignment) {
          sendMessagingEngineNotification(newAssignment.user.id, "Proyecto en tu etapa", `${p.number} - ${p.name} ha llegado a ${newStage.name}`);
        }

        return {
          ...p, stageId: newStageId, stageEnteredAt: now.toISOString(),
          totalRealHours: p.totalRealHours + hoursElapsed, timeEntries: [...p.timeEntries, newTimeEntry],
          qualityApprovals: p.qualityApprovals.filter(qa => qa.stageId !== newStageId),
          completedAt: newStage.isFinal ? now.toISOString() : p.completedAt,
          systemComments: comments
        };
      }
      return p;
    }));
  };

  const handleApproveQuality = (projectId: string, stageId: string) => {
    if (!hasQualityApprovePermission) return;
    const project = projects.find(p => p.id === projectId);
    const stage = stages.find(s => s.id === stageId);
    if (!project || !stage) return;

    const newApproval: QualityApproval = { id: `qa-${Math.random()}`, stageId, approvedById: CURRENT_USER.id, approvedByName: CURRENT_USER.name, approvedAt: new Date().toISOString() };

    setProjectsWithSync(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedApprovals = [...p.qualityApprovals, newApproval];
        const stageApprovals = updatedApprovals.filter(qa => qa.stageId === stageId);
        
        let newStageId = p.stageId;
        let completedAt = p.completedAt;
        const comments = [...p.systemComments];
        
        if (stageApprovals.length >= stage.qualityApprovalsRequired) {
           const nextStage = stages.find(s => s.order === stage.order + 1);
           if (nextStage) {
             newStageId = nextStage.id;
             comments.push("Calidad aprobada completamente, proyecto avanzado automáticamente");
             generateRemision(p);
             if (nextStage.isFinal) {
               completedAt = new Date().toISOString();
               if (p.productType === "Impresión Digital") comments.push("Datos temporales de PrintOrder limpiados");
             }
           }
        }
        return { ...p, stageId: newStageId, qualityApprovals: updatedApprovals, completedAt, systemComments: comments };
      }
      return p;
    }));
  };

  const handleRegisterDelivery = (projectId: string, qty: number, notes: string) => {
    const newDelivery: ProjectPartialDelivery = { id: `pd-${Math.random()}`, quantity: qty, notes, registeredById: CURRENT_USER.id, registeredByName: CURRENT_USER.name, registeredAt: new Date().toISOString() };
    setProjectsWithSync(prev => prev.map(p => p.id === projectId ? { ...p, partialDeliveries: [...p.partialDeliveries, newDelivery] } : p));
  };

  const handleCreateProject = (fd: FormData, mode: 'MANUAL' | 'QUOTE') => {
    let name = '', client = '', productType = '', priority = 'MEDIUM', dueDate = '', quoteTotal = 0;
    let itemsDetail: any[] = [];
    const id = `proj-${Date.now()}`;
    const number = `PROD-${Math.floor(10000 + Math.random() * 90000)}`;
    
    if (mode === 'QUOTE') {
      const quoteId = fd.get('quoteId') as string;
      const quote = quotesList.find(q => q.id === quoteId);
      if (!quote) return;
      name = `Producción ${quote.number}`;
      client = quote.client;
      productType = 'Impresión Digital'; // default or from quote
      dueDate = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 days from now
      quoteTotal = quote.total;
      itemsDetail = quote.items.map(it => ({ id: it.id, name: it.name, quantity: it.quantity }));
    } else {
      name = fd.get('name') as string;
      client = fd.get('client') as string;
      productType = fd.get('productType') as string;
      priority = fd.get('priority') as string;
      dueDate = fd.get('dueDate') as string;
      quoteTotal = Number(fd.get('quoteTotal')) || 0;
      itemsDetail = newProjectItems.map(it => ({ id: it.id, name: it.name, quantity: it.quantity }));
    }

    // Generate automatic tasks based on items
    const tasks: ProductionTask[] = itemsDetail.map(it => {
       const sourceIt = newProjectItems.find(x => x.id === it.id);
       const title = sourceIt ? `${sourceIt.name} (${sourceIt.quantity} uds) — ${sourceIt.size} | ${sourceIt.material} | Acabados: ${sourceIt.finishings}` : `${it.name} (${it.quantity} uds)`;
       return {
         id: `t-auto-${Math.random()}`,
         title,
         description: 'Tarea autogenerada por ítem',
         status: 'PENDING',
         assignedRole: null,
         priority: 'MEDIUM',
         dueDate: null,
         completedAt: null
       };
    });

    // Append tasks from template
    const template = TASK_TEMPLATES.find(t => t.productType === productType);
    if (template) {
       template.defaultTasks.forEach(t => {
          tasks.push({
             id: `t-tpl-${Math.random()}`,
             title: t.title,
             description: t.description || '',
             status: 'PENDING',
             assignedRole: t.assignedRole,
             priority: 'MEDIUM',
             dueDate: null,
             completedAt: null
          });
       });
    }

    const newProject: ProductionProject = {
      id,
      number,
      name,
      client,
      stageId: stages[0].id,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      progress: 0,
      hasPO: false,
      assignments: [{ role: stages[0].roleNeeded, user: CURRENT_USER }],
      daysLeft: dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000) : 0,
      stageEnteredAt: new Date().toISOString(),
      totalRealHours: 0,
      timeEntries: [],
      artworkKeys: [], consumedMaterials: [],
      completedAt: null,
      qualityApprovals: [],
      partialDeliveries: [],
      systemComments: [`Proyecto ${number} creado`],
      itemsDetail,
      quoteTotal,
      quoteNumber: mode === 'QUOTE' ? quotesList.find(q=>q.id===fd.get('quoteId'))?.number || '' : '',
      productType,
      tasks,
      laborCost: 0, materialCost: 0, outsourcedCost: 0, otherCost: 0, isBilled: false
    };

    setProjectsWithSync([newProject, ...projects]);
    setIsNewProjectOpen(false);
    setNewProjectItems([]);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!hasDeletePermission) return;
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setRemisiones(prev => prev.filter(r => r.projectId !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
      setProjectToDelete(null);
      setIsDeleteOpen(false);
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // --- TASK ACTIONS ---
  const handleAddTask = (projectId: string, fd: FormData, isDetailed: boolean = false) => {
    const title = fd.get('title') as string;
    if (!title.trim()) return;

    const newTask: ProductionTask = {
      id: `t-${Math.random()}`,
      title,
      description: isDetailed ? (fd.get('description') as string) : '',
      status: 'PENDING',
      assignedRole: isDetailed ? (fd.get('role') as string) || null : null,
      priority: isDetailed ? (fd.get('priority') as any) : 'MEDIUM',
      dueDate: isDetailed && fd.get('dueDate') ? (fd.get('dueDate') as string) : null,
      completedAt: null
    };
    setProjectsWithSync(prev => prev.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, newTask] } : p));
  };

  const handleToggleTaskStatus = (projectId: string, taskId: string, forceStatus?: ProductionTask['status']) => {
    setProjectsWithSync(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          let newStatus = t.status;
          if (forceStatus) {
             newStatus = forceStatus;
          } else {
             if (t.status === 'PENDING') newStatus = 'IN_PROGRESS';
             else if (t.status === 'IN_PROGRESS') newStatus = 'DONE';
             else if (t.status === 'DONE') newStatus = 'PENDING';
             else if (t.status === 'BLOCKED') newStatus = 'PENDING';
          }
          return { ...t, status: newStatus as any, completedAt: newStatus === 'DONE' ? new Date().toISOString() : null };
        })
      };
    }));
  };

  const handleCompleteAllTasks = (projectId: string) => {
    setProjectsWithSync(prev => prev.map(p => p.id === projectId ? {
      ...p, tasks: p.tasks.map(t => t.status !== 'DONE' ? { ...t, status: 'DONE', completedAt: new Date().toISOString() } : t)
    } : p));
  };
  
  const handleDeleteTask = (projectId: string, taskId: string) => {
    setProjectsWithSync(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
  };

  // --- TIME & COST ACTIONS ---
  const handleRegisterTime = (projectId: string, fd: FormData) => {
    const costType = fd.get('costType') as any;
    const hours = Number(fd.get('hours') || 0);
    const rate = Number(fd.get('rate') || 0);
    const amount = Number(fd.get('amount') || 0);
    
    const costAmount = costType === 'MANO_OBRA' ? hours * rate : amount;
    const actualHours = costType === 'MANO_OBRA' ? hours : 0;
    
    const newEntry: TimeEntry = {
      id: `te-${Math.random()}`, source: 'MANUAL', description: fd.get('description') as string,
      hours: actualHours, costType, costAmount, taskId: (fd.get('taskId') as string) || null,
      createdAt: new Date().toISOString(), registeredByName: CURRENT_USER.name
    };

    setProjectsWithSync(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        timeEntries: [newEntry, ...p.timeEntries],
        totalRealHours: p.totalRealHours + actualHours,
        laborCost: p.laborCost + (costType === 'MANO_OBRA' ? costAmount : 0),
        materialCost: p.materialCost + (costType === 'MATERIALES' ? costAmount : 0),
        outsourcedCost: p.outsourcedCost + (costType === 'TERCEROS' ? costAmount : 0),
        otherCost: p.otherCost + (costType === 'OTROS' ? costAmount : 0),
      };
    }));
  };

  const handleDeleteTimeEntry = (projectId: string, entryId: string) => {
     setProjectsWithSync(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const entry = p.timeEntries.find(e => e.id === entryId);
      if (!entry) return p;
      return {
        ...p,
        timeEntries: p.timeEntries.filter(e => e.id !== entryId),
        totalRealHours: p.totalRealHours - entry.hours,
        laborCost: p.laborCost - (entry.costType === 'MANO_OBRA' ? entry.costAmount : 0),
        materialCost: p.materialCost - (entry.costType === 'MATERIALES' ? entry.costAmount : 0),
        outsourcedCost: p.outsourcedCost - (entry.costType === 'TERCEROS' ? entry.costAmount : 0),
        otherCost: p.otherCost - (entry.costType === 'OTROS' ? entry.costAmount : 0),
      };
    }));
  };

  const togglePushNotifications = () => {
     if (pushState === 'INACTIVE') setPushState('ACTIVE_OPEN');
     else if (pushState === 'ACTIVE_OPEN') setPushState('ACTIVE');
     else setPushState('INACTIVE');
  };

  return (
    <div className="flex flex-col font-sans space-y-6">
      {/* HEADER (Bloque L) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Producción</h1>
              <div className="flex gap-4 text-xs font-bold text-muted-foreground mt-1">
                <span>{totalProjectsCount} Activos</span>
                <span className="text-primary">{formatCOP(totalValueCOP)}</span>
                {urgentCount > 0 && <span className="text-red-500">{urgentCount} Urgentes</span>}
                {overdueCount > 0 && <span className="text-red-600">{overdueCount} Vencidos</span>}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={togglePushNotifications} className="h-9 px-3 border border-border rounded-md text-sm font-bold flex items-center gap-2 hover:bg-muted" title="Notificaciones Push">
              {pushState === 'ACTIVE' ? <BellRing className="w-4 h-4 text-indigo-600" /> : pushState === 'ACTIVE_OPEN' ? <Bell className="w-4 h-4 text-indigo-400" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border">
              <button onClick={() => setFilterMine(false)} className={`px-3 py-1 text-sm font-bold rounded-md ${!filterMine ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Todos</button>
              <button onClick={() => setFilterMine(true)} className={`px-3 py-1 text-sm font-bold rounded-md ${filterMine ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Mis proyectos</button>
            </div>
            <button onClick={() => setIsConfigOpen(true)} className="h-9 px-3 border border-border rounded-md text-sm font-bold flex items-center gap-2 hover:bg-muted"><Settings className="w-4 h-4" /> Config</button>
            <button onClick={() => setIsNewProjectOpen(true)} className="h-9 px-3 bg-indigo-600 text-white rounded-md text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"><Plus className="w-4 h-4" /> Nuevo</button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-3 rounded-xl shadow-sm">
           <div className="relative flex-1 min-w-[200px]">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
             <input type="text" placeholder="Buscar por número, nombre o cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background" />
           </div>
           <select value={filterProductType} onChange={e => setFilterProductType(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background">
             <option value="">Tipo de Producto (Todos)</option>
             <option value="Impresión Digital">Impresión Digital</option>
             <option value="Gran Formato">Gran Formato</option>
           </select>
           <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background">
             <option value="">Prioridad (Todas)</option>
             <option value="LOW">Baja</option>
             <option value="MEDIUM">Media</option>
             <option value="HIGH">Alta</option>
             <option value="URGENT">Urgente</option>
           </select>
           <select value={filterBilled} onChange={e => setFilterBilled(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background">
             <option value="">Facturación (Todos)</option>
             <option value="BILLED">Facturado</option>
             <option value="UNBILLED">Sin Facturar</option>
           </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-muted p-1 rounded-lg flex gap-1 mr-2 inline-flex">
          <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md ${view === 'kanban' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:bg-background/50'}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:bg-background/50'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setView('remisiones')} className={`p-1.5 rounded-md ${view === 'remisiones' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:bg-background/50'}`}><Truck className="w-4 h-4" /></button>
          <button onClick={() => setView('archivados')} className={`p-1.5 rounded-md ${view === 'archivados' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:bg-background/50'}`}><Archive className="w-4 h-4" /></button>
          <button onClick={() => setView('gantt')} className={`p-1.5 rounded-md ${view === 'gantt' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground hover:bg-background/50'}`}><Calendar className="w-4 h-4" /></button>
        </div>
      </div>

      {/* VIEWS */}
      {view === 'kanban' && (
        <div className="pb-4">
          <div className="flex gap-4 px-1 overflow-x-auto snap-x" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {stages.filter(s => !s.isArchivedStage).map(stage => {
              const columnProjects = filteredProjects.filter(p => p.stageId === stage.id || p.stageId === stage.key || (stage.id === '1' && (p.stageId === 'POR_REVISAR' || !p.stageId)));
              const columnTotal = columnProjects.reduce((sum, p) => sum + p.quoteTotal, 0);
              
              return (
                <div key={stage.id} 
                     className={`w-[340px] shrink-0 flex flex-col rounded-xl border border-border bg-muted/30 overflow-hidden min-h-[300px] snap-center`}
                     onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5'); }}
                     onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5'); }}
                     onDrop={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.remove('bg-primary/5');
                       const projectId = e.dataTransfer.getData('text/plain');
                       if (projectId) handleMoveStage(projectId, stage.id);
                     }}>
                  {/* ENCABEZADO DE COLUMNA KANBAN */}
                  <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center bg-opacity-20`}>
                         <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`}></div>
                      </div>
                      <div>
                         <h3 className="font-bold text-sm text-foreground">{stage.name}</h3>
                         <p className="text-xs text-muted-foreground font-medium">{formatCOP(columnTotal)}</p>
                      </div>
                    </div>
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full border border-border">{columnProjects.length}</span>
                  </div>

                  <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                    {columnProjects.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed border-border/70 rounded-xl bg-card/40 text-muted-foreground select-none">
                        <FolderKanban className="w-5 h-5 mb-1 opacity-30 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground/80">Sin proyectos activos</span>
                        <span className="text-[10px] text-muted-foreground/50">0 órdenes en esta etapa</span>
                      </div>
                    ) : (
                      columnProjects.map(project => {
                      const activeAssignment = project.assignments.find(a => a.role === stage.roleNeeded) || project.assignments[0];
                      const semaphore = computeDeliverySemaphore({ dueDate: project.dueDate ? new Date(project.dueDate) : null, completedAt: project.completedAt ? new Date(project.completedAt) : null, now: new Date() });
                      
                      // Priority color mapping
                      const priorityBarColor = project.priority === 'URGENT' ? 'bg-red-500' : project.priority === 'HIGH' ? 'bg-orange-500' : project.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-400';
                      const ringClass = semaphore.color === 'RED' ? 'ring-2 ring-red-500 border-transparent' : semaphore.color === 'YELLOW' ? 'ring-2 ring-yellow-500 border-transparent' : 'border-border';
                      
                      // Quote status lookup
                      const quote = quotesList.find(q => q.number === project.quoteNumber) || quotesList.find(q => q.id === (project as any).quoteId);
                      const qStatus = quote ? quote.status : 'PENDIENTE';
                      const qStatusColor = qStatus === 'APROBADA' || qStatus === 'ACEPTADA' ? 'bg-emerald-100 text-emerald-800' :
                                           qStatus === 'ENVIADA' ? 'bg-blue-100 text-blue-800' :
                                           qStatus === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                                           qStatus === 'RECHAZADA' ? 'bg-red-100 text-red-800' :
                                           qStatus === 'EXPIRADA' ? 'bg-orange-100 text-orange-800' :
                                           qStatus === 'VISTA' ? 'bg-indigo-100 text-indigo-800' :
                                           qStatus === 'SEGUIMIENTO' ? 'bg-purple-100 text-purple-800' :
                                           'bg-gray-100 text-gray-800';

                      // Tasks progress
                      const totalTasks = project.tasks.length;
                      const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
                      const taskPct = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
                      const taskBarColor = taskPct === 100 ? 'bg-green-500' : taskPct > 50 ? 'bg-blue-500' : 'bg-orange-500';
                      const activeTask = project.tasks.find(t => t.status !== 'DONE');
                      
                      // Assignee icon
                      const multipleAssignees = project.assignments.length > 1;

                      return (
                        <div key={project.id} 
                             draggable
                             onDragStart={(e) => {
                               e.dataTransfer.setData('text/plain', project.id);
                               e.currentTarget.classList.add('opacity-50');
                             }}
                             onDragEnd={(e) => {
                               e.currentTarget.classList.remove('opacity-50');
                             }}
                             onClick={() => setActiveProjectId(project.id)} 
                             className={`bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden flex ${ringClass}`}>
                          
                          {/* Left priority bar */}
                          <div className={`w-1.5 shrink-0 ${priorityBarColor}`}></div>

                          <div className="p-3 w-full space-y-3">
                             {/* FILA 1: Número, Semáforo, Prioridad */}
                             <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-muted-foreground">{project.number}</span>
                                  {(project as any).isLocalOnly && (
                                    <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1 rounded border border-amber-200">LOCAL</span>
                                  )}
                                  {!(project as any).isLocalOnly && (
                                    <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1 rounded border border-indigo-200 flex items-center gap-1">
                                      <UploadCloud className="w-2.5 h-2.5" /> CLOUD
                                    </span>
                                  )}
                                  {semaphore.color !== 'NONE' && (
                                    <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${semaphore.color === 'RED' ? 'bg-red-100 text-red-700' : semaphore.color === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                      {semaphore.color === 'RED' ? '🔴' : semaphore.color === 'YELLOW' ? '🟡' : '🟢'} {semaphore.label}
                                    </div>
                                  )}
                               </div>
                               <div>
                                  {project.priority === 'URGENT' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                                   project.priority === 'HIGH' ? <ChevronRight className="w-4 h-4 text-orange-500 -rotate-90" /> :
                                   project.priority === 'MEDIUM' ? <span className="text-blue-500 font-black px-1">-</span> :
                                   <ChevronDown className="w-4 h-4 text-gray-400" />}
                               </div>
                             </div>

                             {/* FILA 2: Nombre */}
                             <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-2">{project.name}</h4>

                             {/* FILA 3: Cliente y Ciudad */}
                             <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Briefcase className="w-3 h-3" /> 
                                <span className="font-medium">{project.client} <span className="text-muted-foreground/60">· {(project as any).clientCity || 'Ciudad'}</span></span>
                             </div>

                             {/* FILA 4: Badge Cotización y Valor */}
                             <div className="flex items-center gap-2">
                               {project.quoteNumber && (
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${qStatusColor}`}>
                                   {project.quoteNumber}
                                 </span>
                               )}
                               <span className="text-xs font-bold text-foreground">{formatCOP(project.quoteTotal)}</span>
                             </div>

                             {/* FILA 5: Tipo, Facturado, Pagado, Responsable, Print */}
                             <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{project.productType}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${project.isBilled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                   {project.isBilled ? 'FACTURADO' : 'POR FACTURAR'}
                                </span>
                                {remisiones.find(r => r.projectId === project.id) && (
                                   <button 
                                      onClick={(e) => { 
                                         e.stopPropagation(); 
                                         setActivePrintRemisionId(remisiones.find(r => r.projectId === project.id)!.id); 
                                      }} 
                                      className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                      title="Imprimir Remisión"
                                   >
                                      <Printer className="w-3 h-3" />
                                   </button>
                                )}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(project as any).paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {(project as any).paid ? 'Pagado' : 'Por pagar'}
                                </span>
                                
                                <div className="ml-auto flex -space-x-1">
                                  {multipleAssignees ? (
                                     <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-card flex items-center justify-center text-indigo-600 relative">
                                        <User className="w-3 h-3" />
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm text-[8px]">👥</div>
                                     </div>
                                  ) : activeAssignment ? (
                                     <div className={`w-6 h-6 rounded-full ${activeAssignment.user.color} border-2 border-card flex items-center justify-center text-[9px] font-bold text-white relative`}>
                                        {activeAssignment.user.initial}
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm text-muted-foreground"><Settings className="w-2.5 h-2.5" /></div>
                                     </div>
                                  ) : null}
                                </div>
                             </div>

                             {/* FILA 6: Vista previa de Items */}
                             <div className="bg-muted/30 rounded-lg p-2 space-y-1.5 border border-border/50">
                                {project.itemsDetail.slice(0, 3).map((it, idx) => (
                                   <div key={idx} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                                      <span className="font-bold text-foreground">{it.quantity}×</span>
                                      <span className="text-muted-foreground truncate max-w-[80px]">{it.name}</span>
                                      {it.size && <span className="text-muted-foreground/80">{it.size}</span>}
                                      {it.material && <span className="text-[9px] px-1 bg-blue-50 text-blue-700 rounded border border-blue-100">{it.material}</span>}
                                      {it.finishings && <span className="text-[9px] px-1 bg-purple-50 text-purple-700 rounded border border-purple-100">{it.finishings}</span>}
                                   </div>
                                ))}
                                {project.itemsDetail.length > 3 && <div className="text-[10px] text-muted-foreground font-medium">+{project.itemsDetail.length - 3} más</div>}
                                
                                {/* Highlighted Item Checkable Chip */}
                                {project.itemsDetail[0] && (
                                   <div className="mt-2 flex items-center gap-2 p-1.5 bg-background border border-border rounded-md">
                                      <input type="checkbox" className="w-3 h-3 rounded-sm text-primary" onClick={e => e.stopPropagation()} />
                                      <span className="text-[10px] font-medium text-foreground line-clamp-1">{project.itemsDetail[0].quantity}x {project.itemsDetail[0].name}</span>
                                   </div>
                                )}
                             </div>

                             {/* FILA 6.5: Tarea Activa */}
                             {activeTask && (
                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center shrink-0">
                                    <Clock className="w-2.5 h-2.5" />
                                  </div>
                                  <span className="line-clamp-1 flex-1">{activeTask.title}</span>
                                  {activeTask.assignedRole && <span className="text-[9px] bg-muted px-1 rounded">{activeTask.assignedRole}</span>}
                               </div>
                             )}

                             {/* FILA 7: Barra de progreso de tareas e indicador de archivo */}
                             <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                   <span className="text-muted-foreground">{completedTasks}/{totalTasks} tareas</span>
                                   <span>{Math.round(taskPct)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                   <div className={`h-full ${taskBarColor} transition-all`} style={{ width: `${taskPct}%` }}></div>
                                </div>
                                {stage.requiresArtworkToAdvance && project.artworkKeys.length === 0 ? (
                                   <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                                      <AlertTriangle className="w-3 h-3" /> Sin archivo de diseño
                                   </div>
                                ) : project.artworkKeys.length > 0 ? (
                                   <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">
                                      <CheckCircle2 className="w-3 h-3" /> Archivo adjunto
                                   </div>
                                ) : null}
                             </div>

                             {/* FILA 8: Pie de la tarjeta */}
                             <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                                <div className="font-bold text-foreground">
                                   {formatCOP((project as any).budgetTotal || project.quoteTotal)}
                                </div>
                                <div className="flex items-center gap-3">
                                   {project.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatShortDate(project.dueDate)}</span>}
                                   <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> {project.systemComments.length + ((project as any).comments?.length || 0)}</span>
                                </div>
                             </div>

                             {/* Botón de arrastre/movimiento rápido para desarrollo */}
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                               {hasDeletePermission && (
                                 <button 
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     setProjectToDelete(project);
                                     setIsDeleteOpen(true);
                                   }} 
                                   title="Eliminar proyecto"
                                   className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded border border-border bg-background/90 shadow-xs transition-colors"
                                 >
                                   <Trash2 className="w-3 h-3" />
                                 </button>
                               )}
                               {stages.findIndex(s => s.id === stage.id) < stages.length - 1 && (
                                 <button onClick={(e) => { e.stopPropagation(); handleMoveStage(project.id, stages[stages.findIndex(s => s.id === stage.id) + 1].id); }} className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 shadow-sm"><MoveRight className="w-3 h-3" /></button>
                               )}
                             </div>
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* (Omit list, archivados, and remisiones for brevity) */}

      {/* PROJECT DETAILS MODAL */}
      {activeProject && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right-8">
            <div className="border-b border-border bg-card shrink-0 sticky top-0 z-10">
              {/* TOP HEADER */}
              <div className="h-14 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <span className="font-black text-xl">{activeProject.number}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm ${getPriorityColor(activeProject.priority)}`}>{activeProject.priority === 'URGENT' ? 'URGENTE' : activeProject.priority}</span>
                  {(() => {
                    const sem = computeDeliverySemaphore({ dueDate: activeProject.dueDate ? new Date(activeProject.dueDate) : null, completedAt: activeProject.completedAt ? new Date(activeProject.completedAt) : null, now: new Date() });
                    if (sem.color !== 'NONE') {
                       return (
                         <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sem.color === 'RED' ? 'bg-red-100 text-red-700' : sem.color === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                           {sem.color === 'RED' ? '🔴' : sem.color === 'YELLOW' ? '🟡' : '🟢'} {sem.label}
                         </span>
                       )
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const isPlaying = activeWorkTimer?.projectId === activeProject.id && activeWorkTimer?.stageId === activeProject.stageId;
                    return (
                      <button 
                        onClick={() => toggleTimer(activeProject.id, activeProject.stageId)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 border transition-colors ${isPlaying ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-inner' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                      >
                        {isPlaying ? <PauseCircle className="w-3 h-3 animate-pulse" /> : <PlayCircle className="w-3 h-3" />}
                        {isPlaying ? 'Pausar Trabajo' : 'Iniciar Trabajo'}
                      </button>
                    )
                  })()}
                  {(() => {
                    const hasRemision = remisiones.find(r => r.projectId === activeProject.id);
                    if (hasRemision) {
                      return (
                        <button onClick={() => setActivePrintRemisionId(hasRemision.id)} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md flex items-center gap-1 border border-emerald-200">
                          <Printer className="w-3 h-3" /> Remisión
                        </button>
                      )
                    }
                    return null;
                  })()}
                  <button onClick={() => setIsEditOpen(true)} className="px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border hover:bg-muted rounded-md flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => console.log('Generando PDF con motor central...')} className="px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border hover:bg-muted rounded-md flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </button>
                  {hasDeletePermission && (
                    <button 
                      onClick={() => {
                        setProjectToDelete(activeProject);
                        setIsDeleteOpen(true);
                      }} 
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md flex items-center gap-1 border border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  )}
                  <div className="w-px h-6 bg-border mx-1"></div>
                  <button onClick={() => setActiveProjectId(null)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {/* STAGES PIPELINE */}
              <div className="px-6 pb-4 pt-1 flex items-center overflow-x-auto">
                 {stages.map((st, idx) => {
                    const activeIdx = stages.findIndex(s => s.id === activeProject.stageId || s.key === activeProject.stageId || (s.id === '1' && (activeProject.stageId === 'POR_REVISAR' || !activeProject.stageId)));
                    const isPast = idx < activeIdx;
                    const isActive = idx === activeIdx;
                    const isFuture = idx > activeIdx;
                    return (
                       <React.Fragment key={st.id}>
                         <button 
                           onClick={() => handleMoveStage(activeProject.id, st.id)}
                           className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                             isActive ? 'bg-white shadow-md border border-border text-foreground' : 
                             isPast ? 'bg-green-50 text-green-700 hover:bg-green-100' : 
                             'bg-muted/50 text-muted-foreground hover:bg-muted'
                           }`}
                         >
                           {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className={`w-2 h-2 rounded-full ${isActive ? st.dot : 'bg-muted-foreground/30'} ${activeWorkTimer?.projectId === activeProject.id && activeWorkTimer?.stageId === st.id ? 'animate-ping opacity-75' : ''}`}></div>}
                           {st.name}
                         </button>
                         {idx < stages.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-1 shrink-0" />}
                       </React.Fragment>
                    )
                 })}
              </div>
            </div>
            
            {/* TABS */}
            <div className="flex px-6 border-b border-border gap-6 bg-muted/10 shrink-0">
              {(['INFO', 'COTIZACIÓN', 'TAREAS', 'TIEMPOS', 'MATERIALES', 'FINANCIERO'] as const).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setModalTab(tab)}
                  className={`py-4 text-sm font-bold border-b-2 transition-colors ${modalTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-1">{activeProject.name}</h2>
                <p className="text-muted-foreground">{activeProject.client} · {activeProject.productType}</p>
              </div>

              {/* TAB CONTENT: RESUMEN (Calidad, Entregas, Items) */}
              {modalTab === 'INFO' && (
                <div className="space-y-8">
                  {/* QUALITY */}
                  {(() => {
                    const stage = stages.find(s => s.id === activeProject.stageId || s.key === activeProject.stageId || (s.id === '1' && (activeProject.stageId === 'POR_REVISAR' || !activeProject.stageId)));
                    if (stage && stage.requiresQualityApproval) {
                      return (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileCheck className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-indigo-900">Control de Calidad: {stage.name}</h3>
                          </div>
                          <div className="space-y-3">
                            {Array.from({ length: stage.qualityApprovalsRequired }).map((_, i) => {
                              const approval = activeProject.qualityApprovals.filter(a => a.stageId === stage.id)[i];
                              return (
                                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${approval ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                      {approval ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i+1}</span>}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold">{approval ? 'Aprobado por ' + approval.approvedByName : `Punto de control ${i+1} pendiente`}</p>
                                    </div>
                                  </div>
                                  {!approval && hasQualityApprovePermission && (
                                    <button onClick={() => handleApproveQuality(activeProject.id, stage.id)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700">Aprobar</button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } return null;
                  })()}
                  
                                    {/* NEW INFO CARDS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-muted-foreground"><User className="w-4 h-4"/> <h3 className="font-bold text-sm text-foreground">Cliente</h3></div>
                        <div className="flex-1 space-y-2 text-sm">
                           <p><span className="font-bold">Nombre:</span> {activeProject.client}</p>
                           <p><span className="font-bold">Email:</span> contacto@cliente.com</p>
                           <p><span className="font-bold">Teléfono:</span> +57 300 000 0000</p>
                           <p><span className="font-bold">Ciudad:</span> {(activeProject as any).clientCity || 'Bogotá'}</p>
                           <p><span className="font-bold">Documento:</span> NIT 900.000.000-1</p>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                           <button className="flex-1 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-md">Ver cliente</button>
                           <button className="flex-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md">Comunicaciones</button>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl p-4">
                           <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><Receipt className="w-4 h-4 text-muted-foreground"/> Facturación</h3>
                              <button className={`px-2 py-1 text-[10px] font-bold rounded-md ${activeProject.isBilled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{activeProject.isBilled ? 'Facturado' : 'Sin facturar'}</button>
                           </div>
                           <input type="text" placeholder="Nº Factura (ej. FE-1023)" defaultValue={(activeProject as any).invoiceNumber} className="w-full text-sm px-3 py-1.5 border border-input rounded-md mb-3 bg-background" />
                           <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-md border border-border border-dashed">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Soporte de pago</span>
                                {needsAuth ? (
                                  <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { const r = await googleSignIn(); if(r?.accessToken) setNeedsAuth(false); } catch(err:any) { if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') alert(err.message); } }} className="text-xs font-bold text-blue-600 hover:underline">Conectar Drive</button>
                                ) : (
                                  <>
                                    <input type="file" multiple className="hidden" ref={paymentInputRef} onChange={(e) => handleGenericUpload(e, 'paymentKeys')} />
                                    <button type="button" disabled={uploadingFiles} className="text-xs font-bold text-primary hover:underline disabled:opacity-50" onClick={(e) => { e.preventDefault(); e.stopPropagation(); paymentInputRef.current?.click(); }}>{uploadingFiles ? 'Subiendo...' : 'Subir archivo'}</button>
                                  </>
                                )}
                              </div>
                              {((activeProject as any).paymentKeys || []).length > 0 && (
                                <div className="space-y-1 mt-1">
                                  {((activeProject as any).paymentKeys || []).map((k: string) => (
                                    <div key={k} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-border">
                                      <span className="truncate max-w-[150px]">{k}</span>
                                      <button type="button" className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                           <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground"/> Pago y O.C.</h3>
                              <button className={`px-2 py-1 text-[10px] font-bold rounded-md ${(activeProject as any).paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{(activeProject as any).paid ? 'Pagado' : 'Por pagar'}</button>
                           </div>
                           <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-md border border-border border-dashed">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Orden de compra (PO)</span>
                                {needsAuth ? (
                                  <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { const r = await googleSignIn(); if(r?.accessToken) setNeedsAuth(false); } catch(err:any) { if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') alert(err.message); } }} className="text-xs font-bold text-blue-600 hover:underline">Conectar Drive</button>
                                ) : (
                                  <>
                                    <input type="file" multiple className="hidden" ref={poInputRef} onChange={(e) => handleGenericUpload(e, 'poKeys')} />
                                    <button type="button" disabled={uploadingFiles} className="text-xs font-bold text-primary hover:underline disabled:opacity-50" onClick={(e) => { e.preventDefault(); e.stopPropagation(); poInputRef.current?.click(); }}>{uploadingFiles ? 'Subiendo...' : 'Subir orden'}</button>
                                  </>
                                )}
                              </div>
                              {((activeProject as any).poKeys || []).length > 0 && (
                                <div className="space-y-1 mt-1">
                                  {((activeProject as any).poKeys || []).map((k: string) => (
                                    <div key={k} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-border">
                                      <span className="truncate max-w-[150px]">{k}</span>
                                      <button type="button" className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                     <h3 className="font-bold text-sm mb-2 text-foreground">Descripción</h3>
                     <p className="text-sm text-muted-foreground whitespace-pre-line">{(activeProject as any).description || 'Sin descripción detallada.'}</p>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-bold text-sm text-foreground flex items-center gap-2"><Paperclip className="w-4 h-4 text-muted-foreground"/> Archivos de Diseño</h3>
                          {uploadingFiles && <span className="text-xs text-blue-600 font-medium">{uploadProgressMsg}</span>}
                        </div>
                        <div className="flex gap-2">
                           <button type="button" className="px-3 py-1.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-md">Agregar enlace</button>
                           {needsAuth ? (
                              <button 
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    const result = await googleSignIn();
                                    if (result?.accessToken) {
                                      setNeedsAuth(false);
                                    }
                                  } catch (err: any) {
                                    if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
                                      alert('Error al conectar: ' + err.message);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center gap-1"
                              >
                                Conectar Drive
                              </button>
                           ) : (
                             <>
                               <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  ref={fileInputRef}
                                  onChange={handleFileUpload}
                               />
                               <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                  }}
                                  disabled={uploadingFiles}
                                  className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                               >
                                  {uploadingFiles ? 'Subiendo...' : 'Subir archivo'}
                               </button>
                             </>
                           )}
                        </div>
                     </div>
                     {(() => {
                       const st = stages.find(s => s.id === activeProject.stageId || s.key === activeProject.stageId || (s.id === '1' && (activeProject.stageId === 'POR_REVISAR' || !activeProject.stageId)));
                       if (st?.requiresArtworkToAdvance && activeProject.artworkKeys.length === 0) {
                         return <div className="p-3 bg-amber-50 text-amber-800 text-sm font-bold rounded-md mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Requerido para avanzar de etapa</div>
                       }
                       return null;
                     })()}
                     {activeProject.artworkKeys.length === 0 ? (
                       <p className="text-sm text-muted-foreground text-center py-4">No hay archivos adjuntos.</p>
                     ) : (
                       <div className="space-y-2">
                         {activeProject.artworkKeys.map(k => (
                            <div key={k} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/10">
                               <div className="flex items-center gap-2">
                                  <FileImage className="w-4 h-4 text-indigo-500" />
                                  <span className="text-sm font-medium">{k}</span>
                                  <span className="text-xs text-muted-foreground">(3.4 MB)</span>
                               </div>
                               <button className="text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                         ))}
                       </div>
                     )}
                  </div>

{/* ENTREGAS */}
                  <div>
                    <h3 className="font-bold border-b border-border pb-2 mb-4 flex items-center gap-2"><Truck className="w-5 h-5" /> Entregas Parciales</h3>
                    {(() => {
                      const totalItems = activeProject.itemsDetail.reduce((acc, it) => acc + it.quantity, 0);
                      const delivered = activeProject.partialDeliveries.reduce((acc, d) => acc + d.quantity, 0);
                      const pct = totalItems > 0 ? (delivered / totalItems) * 100 : 0;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className={`h-full transition-all ${pct===100?'bg-green-500':pct>50?'bg-blue-500':'bg-orange-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div></div>
                            <span className="font-bold">{delivered}/{totalItems}</span>
                          </div>
                          {pct < 100 && (
                            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const qty = Number(fd.get('qty')); if(qty>0) { handleRegisterDelivery(activeProject.id, qty, fd.get('notes') as string); e.currentTarget.reset(); } }} className="flex gap-2">
                              <input required type="number" name="qty" min="1" max={totalItems - delivered} placeholder="Cant." className="w-20 px-3 py-1.5 border border-input rounded-md text-sm" />
                              <input type="text" name="notes" placeholder="Notas..." className="flex-1 px-3 py-1.5 border border-input rounded-md text-sm" />
                              <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-sm rounded-md">Guardar</button>
                            </form>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TAREAS (Bloque G) */}
              {modalTab === 'TAREAS' && (
                <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center bg-muted/20 p-4 rounded-xl border border-border">
                     {(() => {
                       const completed = activeProject.tasks.filter(t => t.status === 'DONE').length;
                       const total = activeProject.tasks.length;
                       const inProg = activeProject.tasks.filter(t => t.status === 'IN_PROGRESS').length;
                       const blocked = activeProject.tasks.filter(t => t.status === 'BLOCKED').length;
                       const pct = total === 0 ? 0 : (completed / total) * 100;
                       return (
                         <div className="w-full">
                           <div className="flex justify-between mb-2 text-sm font-bold">
                             <span>{completed}/{total} completadas</span>
                             <div className="flex gap-4 text-xs font-medium text-muted-foreground items-center">
                               {inProg > 0 && <span className="text-blue-600">{inProg} en progreso</span>}
                               {blocked > 0 && <span className="text-red-600">{blocked} bloqueadas</span>}
                               {total > completed && <button onClick={() => handleCompleteAllTasks(activeProject.id)} className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded transition-colors border border-green-200">Completar todas</button>}
                             </div>
                           </div>
                           <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                             <div className={`h-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${pct}%` }}></div>
                           </div>
                         </div>
                       )
                     })()}
                   </div>

                   {/* Add Task Form (Quick or Detailed) */}
                   <div className="bg-muted/10 p-4 rounded-xl border border-border space-y-3">
                     <form onSubmit={(e) => { e.preventDefault(); handleAddTask(activeProject.id, new FormData(e.currentTarget), false); e.currentTarget.reset(); }} className="flex gap-2">
                       <input type="text" name="title" placeholder="Agregar tarea rápida..." required className="flex-1 px-4 py-2 border border-input rounded-md bg-background text-sm" />
                       <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 flex items-center gap-1"><Plus className="w-4 h-4"/> Añadir</button>
                     </form>
                     
                     <button onClick={() => setShowDetailedTaskForm(!showDetailedTaskForm)} className="text-xs font-bold text-primary hover:underline flex items-center">
                        {showDetailedTaskForm ? 'Ocultar alta detallada' : '+ Mostrar alta detallada'}
                     </button>
                     
                     {showDetailedTaskForm && (
                        <form onSubmit={(e) => { e.preventDefault(); handleAddTask(activeProject.id, new FormData(e.currentTarget), true); e.currentTarget.reset(); setShowDetailedTaskForm(false); }} className="space-y-3 border-t border-border pt-3 mt-3 animate-in fade-in slide-in-from-top-2">
                          <input type="text" name="title" placeholder="Título de la tarea detallada..." required className="w-full px-4 py-2 border border-input rounded-md bg-background text-sm" />
                          <textarea name="description" placeholder="Descripción extendida..." className="w-full px-4 py-2 border border-input rounded-md bg-background text-sm min-h-[80px]" />
                          <div className="flex gap-3">
                            <select name="role" className="px-3 py-2 border border-input rounded-md text-sm bg-background flex-1">
                              <option value="">Sin rol asignado</option>
                              {stages.map(s => <option key={s.id} value={s.roleNeeded}>{s.roleNeeded}</option>)}
                            </select>
                            <select name="priority" defaultValue="MEDIUM" className="px-3 py-2 border border-input rounded-md text-sm bg-background">
                              <option value="LOW">Baja</option>
                              <option value="MEDIUM">Media</option>
                              <option value="HIGH">Alta</option>
                              <option value="URGENT">Urgente</option>
                            </select>
                            <input type="date" name="dueDate" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90">Guardar Tarea Detallada</button>
                        </form>
                     )}
                   </div>

                   <div className="space-y-2">
                     {activeProject.tasks.length === 0 ? (
                       <p className="text-center text-muted-foreground p-8">Sin tareas aún</p>
                     ) : (
                       activeProject.tasks.map(task => {
                         const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'DONE';
                         return (
                           <div key={task.id} className="group flex flex-col bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                             <div className="flex items-center gap-3 p-3">
                               <button onClick={() => handleToggleTaskStatus(activeProject.id, task.id)} className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${task.status === 'DONE' ? 'bg-green-500 text-white' : task.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' : task.status === 'BLOCKED' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
                                 {task.status === 'DONE' && <Check className="w-4 h-4" />}
                                 {task.status === 'IN_PROGRESS' && <Play className="w-4 h-4" />}
                                 {task.status === 'BLOCKED' && <AlertTriangle className="w-4 h-4" />}
                               </button>
                               <div className="flex-1 flex flex-col cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
                                 <span className={`text-sm font-bold ${task.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</span>
                                 <div className="flex flex-wrap gap-2 mt-1">
                                   {task.assignedRole && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium">{task.assignedRole}</span>}
                                   {task.priority !== 'MEDIUM' && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{task.priority}</span>}
                                   {task.dueDate && (
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                                       {isOverdue && <AlertCircle className="w-3 h-3" />} {formatShortDate(task.dueDate)}
                                     </span>
                                   )}
                                 </div>
                               </div>
                               <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                 {task.status !== 'BLOCKED' && (
                                   <button onClick={() => handleToggleTaskStatus(activeProject.id, task.id, 'BLOCKED')} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md" title="Bloquear"><AlertTriangle className="w-4 h-4" /></button>
                                 )}
                                 <button onClick={() => handleDeleteTask(activeProject.id, task.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                               </div>
                             </div>
                             
                             {/* Expanded Panel */}
                             {expandedTaskId === task.id && (
                               <div className="p-4 border-t border-border bg-muted/10 space-y-3 text-sm">
                                  {task.description && <p className="text-muted-foreground whitespace-pre-wrap text-xs">{task.description}</p>}
                                  {task.completedAt && <p className="text-xs font-bold text-green-600">Completada el: {formatShortDate(task.completedAt)}</p>}
                                  
                                  <div className="flex gap-2 flex-wrap">
                                     <select value={task.status} onChange={(e) => handleToggleTaskStatus(activeProject.id, task.id, e.target.value as any)} className="px-2 py-1 border border-input rounded text-xs bg-background">
                                       <option value="PENDING">Pendiente</option>
                                       <option value="IN_PROGRESS">En Progreso</option>
                                       <option value="DONE">Completada</option>
                                       <option value="BLOCKED">Bloqueada</option>
                                     </select>
                                     
                                     <select value={task.assignedRole || ''} onChange={(e) => {
                                        setProjectsWithSync(prev => prev.map(p => p.id === activeProject.id ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? { ...t, assignedRole: e.target.value || null } : t) } : p));
                                     }} className="px-2 py-1 border border-input rounded text-xs bg-background">
                                       <option value="">Sin Rol</option>
                                       {stages.map(s => <option key={s.id} value={s.roleNeeded}>{s.roleNeeded}</option>)}
                                     </select>
                                     
                                     <select value={task.priority} onChange={(e) => {
                                        setProjectsWithSync(prev => prev.map(p => p.id === activeProject.id ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? { ...t, priority: e.target.value as any } : t) } : p));
                                     }} className="px-2 py-1 border border-input rounded text-xs bg-background">
                                       <option value="LOW">Baja</option>
                                       <option value="MEDIUM">Media</option>
                                       <option value="HIGH">Alta</option>
                                       <option value="URGENT">Urgente</option>
                                     </select>
                                     
                                     <input type="date" value={task.dueDate ? task.dueDate.split('T')[0] : ''} onChange={(e) => {
                                        setProjectsWithSync(prev => prev.map(p => p.id === activeProject.id ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? { ...t, dueDate: e.target.value || null } : t) } : p));
                                     }} className="px-2 py-1 border border-input rounded text-xs bg-background" />
                                  </div>
                               </div>
                             )}
                           </div>
                         );
                       })
                     )}
                   </div>
                </div>
              )}

              {/* TAB CONTENT: TIEMPOS (Bloque H) */}
              {modalTab === 'TIEMPOS' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <Clock className="w-5 h-5 text-muted-foreground mb-2" />
                      <p className="text-2xl font-black">{activeProject.totalRealHours.toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground font-medium">Totales</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <Activity className="w-5 h-5 text-muted-foreground mb-2" />
                      <p className="text-2xl font-black">{activeProject.timeEntries.length}</p>
                      <p className="text-xs text-muted-foreground font-medium">Registros</p>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
                      <Briefcase className="w-5 h-5 text-muted-foreground mb-2" />
                      <p className="text-2xl font-black text-primary">{formatCOP(activeProject.laborCost)}</p>
                      <p className="text-xs text-muted-foreground font-medium">Mano de Obra</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { 
                      e.preventDefault(); 
                      handleRegisterTime(activeProject.id, new FormData(e.currentTarget)); 
                      e.currentTarget.reset(); 
                      setTimeFormHours(0); setTimeFormRate(0); setTimeFormAmount(0); 
                    }} className="bg-muted/10 border border-border p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm">Registrar Tiempo o Costo</h4>
                      <div className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                        Total calculado: {formatCOP(timeFormCostType === 'MANO_OBRA' ? timeFormHours * timeFormRate : timeFormAmount)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <select name="costType" value={timeFormCostType} onChange={(e) => setTimeFormCostType(e.target.value)} className="px-3 py-2 border border-input rounded-md text-sm bg-background col-span-2 md:col-span-1" required>
                        <option value="MANO_OBRA">Mano de Obra</option>
                        <option value="MATERIALES">Materiales</option>
                        <option value="TERCEROS">Terceros</option>
                        <option value="OTROS">Otros</option>
                      </select>
                      
                      {timeFormCostType === 'MANO_OBRA' ? (
                        <>
                          <input type="number" step="0.5" name="hours" value={timeFormHours || ''} onChange={(e) => setTimeFormHours(Number(e.target.value))} placeholder="Horas" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
                          <input type="number" name="rate" value={timeFormRate || ''} onChange={(e) => setTimeFormRate(Number(e.target.value))} placeholder="Costo x Hora" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
                        </>
                      ) : (
                        <input type="number" name="amount" value={timeFormAmount || ''} onChange={(e) => setTimeFormAmount(Number(e.target.value))} placeholder="Monto Total" className="px-3 py-2 border border-input rounded-md text-sm bg-background col-span-2" />
                      )}
                      
                      <select name="taskId" className="px-3 py-2 border border-input rounded-md text-sm bg-background col-span-2 md:col-span-4">
                        <option value="">(Sin tarea específica)</option>
                        {activeProject.tasks.filter(t => t.status !== 'DONE').map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                      <input type="text" name="description" placeholder="Descripción / Notas..." required className="px-3 py-2 border border-input rounded-md text-sm bg-background col-span-2 md:col-span-3" />
                      <button type="submit" className="bg-primary text-primary-foreground font-bold text-sm rounded-md hover:bg-primary/90 col-span-2 md:col-span-1">Guardar</button>
                    </div>
                  </form>

                  <div className="space-y-2">
                     {activeProject.timeEntries.length === 0 ? (
                       <p className="text-center text-muted-foreground p-8">Sin registros</p>
                     ) : (
                       activeProject.timeEntries.map(entry => (
                         <div key={entry.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-sm">
                           <div>
                             <p className="font-bold">{entry.description}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.costType === 'MANO_OBRA' ? 'bg-indigo-100 text-indigo-700' : entry.costType === 'MATERIALES' ? 'bg-emerald-100 text-emerald-700' : entry.costType === 'TERCEROS' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                                 {entry.costType || 'AUTOMÁTICO'}
                               </span>
                               <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.createdAt)} · {entry.registeredByName}</span>
                             </div>
                             {entry.taskId && <p className="text-xs text-muted-foreground mt-1">Tarea vinculada</p>}
                           </div>
                           <div className="flex items-center gap-4 text-right">
                             <div>
                               {entry.hours > 0 && <p className="font-bold">{entry.hours}h</p>}
                               {entry.costAmount > 0 && <p className="text-xs font-bold text-primary">{formatCOP(entry.costAmount)}</p>}
                             </div>
                             {entry.source === 'MANUAL' && (
                               <button onClick={() => handleDeleteTimeEntry(activeProject.id, entry.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                             )}
                           </div>
                         </div>
                       ))
                     )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: FINANCIERO (Bloque I) */}
              
              {modalTab === 'COTIZACIÓN' && (
                <div className="space-y-6">
                   {activeProject.quoteNumber ? (
                      <div className="bg-card border border-border rounded-xl p-6">
                         <h3 className="font-black text-lg mb-6 border-b border-border pb-2">Cotización {activeProject.quoteNumber} (Solo lectura)</h3>
                         <div className="space-y-4">
                            {activeProject.itemsDetail.map(it => (
                               <div key={it.id} className="p-4 bg-muted/20 border border-border rounded-lg flex justify-between items-center">
                                  <div>
                                     <p className="font-bold">{it.quantity}x {it.name}</p>
                                     <p className="text-sm text-muted-foreground">{it.size} | {it.material}</p>
                                     <p className="text-xs text-muted-foreground">Acabados: {it.finishings}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="font-bold">{formatCOP(it.quantity * 15000)}</p>
                                  </div>
                               </div>
                            ))}
                            <div className="flex justify-end pt-4 border-t border-border">
                               <p className="text-xl font-black text-foreground">Total: {formatCOP(activeProject.quoteTotal)}</p>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="p-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-border border-dashed">
                         <Receipt className="w-8 h-8 mx-auto mb-3 opacity-50" />
                         <p>Este proyecto no proviene de una cotización del sistema.</p>
                      </div>
                   )}
                </div>
              )}

              {modalTab === 'MATERIALES' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
                         <p className="text-xs text-muted-foreground font-bold mb-1">Costo Materiales</p>
                         <p className="text-xl font-black">{formatCOP(activeProject.materialCost)}</p>
                      </div>
                      <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
                         <p className="text-xs text-muted-foreground font-bold mb-1">Papel Consumido</p>
                         <p className="text-xl font-black">{(activeProject as any).paperConsumed || 0} resmas</p>
                      </div>
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl shadow-sm">
                         <p className="text-xs text-red-600 font-bold mb-1">Daños</p>
                         <p className="text-xl font-black text-red-700">{(activeProject as any).damageCount || 0}</p>
                      </div>
                      <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl shadow-sm">
                         <p className="text-xs text-orange-600 font-bold mb-1">Reprocesos</p>
                         <p className="text-xl font-black text-orange-700">{(activeProject as any).reprocessCount || 0}</p>
                      </div>
                   </div>

                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                         {(['CONSUMOS', 'MOVIMIENTOS', 'DAÑOS', 'REPROCESOS'] as const).map(t => (
                            <button key={t} onClick={() => setMaterialsTab(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap ${materialsTab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
                         ))}
                      </div>
                      <button onClick={() => setMaterialConsumeModalOpen(true)} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90 flex items-center gap-1 shrink-0"><Plus className="w-3 h-3"/> Registrar Consumo</button>
                   </div>

                   {materialsTab === 'CONSUMOS' && (
                      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                         <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                                 <tr><th className="px-4 py-3">Insumo / Papel</th><th className="px-4 py-3">Cant.</th><th className="px-4 py-3">Costo Unit.</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Fecha</th></tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                 {(activeProject.consumedMaterials || []).length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay consumos registrados</td></tr>
                                 ) : (activeProject.consumedMaterials || []).map(mat => (
                                    <tr key={mat.id}>
                                      <td className="px-4 py-3">{mat.name}</td>
                                      <td className="px-4 py-3">{mat.quantity}</td>
                                      <td className="px-4 py-3">{formatCOP(mat.unitCost)}</td>
                                      <td className="px-4 py-3 font-bold">{formatCOP(mat.totalCost)}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{mat.date}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                         </div>
                      </div>
                   )}
                   {materialsTab === 'MOVIMIENTOS' && (
                      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                         <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                                 <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Insumo</th><th className="px-4 py-3">Cant.</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Fecha</th></tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                 <tr>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">SALIDA</span></td>
                                    <td className="px-4 py-3">Lona Front 13oz</td>
                                    <td className="px-4 py-3">15 m2</td>
                                    <td className="px-4 py-3">{formatCOP(120000)}</td>
                                    <td className="px-4 py-3">Juan P.</td>
                                    <td className="px-4 py-3 text-muted-foreground">10 Sep 14:30</td>
                                 </tr>
                              </tbody>
                           </table>
                         </div>
                      </div>
                   )}
                   {materialsTab === 'DAÑOS' && (<div className="p-12 text-center text-muted-foreground border border-red-100 bg-red-50/30 rounded-xl">No hay daños reportados en este proyecto.</div>)}
                   {materialsTab === 'REPROCESOS' && (<div className="p-12 text-center text-muted-foreground border border-orange-100 bg-orange-50/30 rounded-xl">No hay reprocesos reportados en este proyecto.</div>)}
                </div>
              )}
{modalTab === 'FINANCIERO' && (
                <div className="space-y-6 animate-in fade-in">
                  {hasCostReadPermission ? (() => {
                    const totalCost = activeProject.laborCost + activeProject.materialCost + activeProject.outsourcedCost + activeProject.otherCost;
                    const margin = activeProject.quoteTotal - totalCost;
                    const costPct = activeProject.quoteTotal > 0 ? (totalCost / activeProject.quoteTotal) * 100 : 0;
                    const costBarColor = costPct > 90 ? 'bg-red-500' : costPct > 70 ? 'bg-orange-500' : 'bg-green-500';
                    const rentPct = activeProject.quoteTotal > 0 ? (margin / activeProject.quoteTotal) * 100 : 0;
                    const rentBarColor = rentPct < 10 ? 'bg-red-500' : rentPct < 30 ? 'bg-orange-500' : 'bg-green-500';

                    return (
                      <>
                        <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-6 rounded-full flex items-center transition-colors cursor-pointer ${activeProject.isBilled ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'}`} onClick={() => setProjectsWithSync(prev => prev.map(p => p.id === activeProject.id ? {...p, isBilled: !p.isBilled} : p))}>
                              <div className="w-4 h-4 mx-1 rounded-full bg-white shadow-sm"></div>
                            </div>
                            <span className="font-bold text-sm">{activeProject.isBilled ? 'Facturado' : 'Marcar Facturado'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-card border border-border p-5 rounded-xl flex flex-col justify-center">
                             <p className="text-sm text-muted-foreground font-medium mb-1">Presupuesto (Venta)</p>
                             <p className="text-3xl font-black">{formatCOP(activeProject.quoteTotal)}</p>
                           </div>
                           <div className="bg-card border border-border p-5 rounded-xl flex flex-col justify-center">
                             <p className="text-sm text-muted-foreground font-medium mb-1">Costo Real Total</p>
                             <p className="text-3xl font-black">{formatCOP(totalCost)}</p>
                           </div>
                        </div>

                        <div className="bg-card border border-border p-5 rounded-xl">
                          <div className="flex justify-between mb-2">
                             <h4 className="font-bold">Rentabilidad (Margen)</h4>
                             <span className={`font-black ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCOP(margin)}</span>
                          </div>
                          
                          <div className="space-y-4 mt-6">
                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1 text-muted-foreground">
                                <span>Costo %</span> <span>{costPct.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className={`h-full ${costBarColor}`} style={{ width: `${Math.min(costPct, 100)}%` }}></div></div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1 text-muted-foreground">
                                <span>Rentabilidad %</span> <span>{rentPct.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className={`h-full ${rentBarColor}`} style={{ width: `${Math.max(Math.min(rentPct, 100), 0)}%` }}></div></div>
                            </div>
                            
                            <div className="pt-4 border-t border-border flex justify-between gap-4">
                               <div className="flex-1">
                                 <div className="flex justify-between text-xs font-bold mb-1 text-muted-foreground">
                                   <span>Avance Entregas</span> <span>{(() => {
                                      const tot = activeProject.itemsDetail.reduce((a, b) => a + b.quantity, 0);
                                      const del = activeProject.partialDeliveries.reduce((a, b) => a + b.quantity, 0);
                                      return tot > 0 ? ((del/tot)*100).toFixed(0) + '%' : '0%';
                                   })()}</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: (() => {
                                      const tot = activeProject.itemsDetail.reduce((a, b) => a + b.quantity, 0);
                                      const del = activeProject.partialDeliveries.reduce((a, b) => a + b.quantity, 0);
                                      return tot > 0 ? `${(del/tot)*100}%` : '0%';
                                    })() }}></div>
                                 </div>
                               </div>
                               <div className="flex-1 text-right">
                                  <p className="text-xs font-bold text-muted-foreground mb-1">Horas Totales</p>
                                  <p className="font-black text-sm">{activeProject.totalRealHours.toFixed(1)}h</p>
                               </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden text-sm">
                           <div className="p-3 bg-muted/30 font-bold border-b border-border">Desglose de Costos</div>
                           <div className="divide-y divide-border">
                             <div className="flex justify-between p-3"><span>Mano de Obra</span> <span className="font-bold">{formatCOP(activeProject.laborCost)}</span></div>
                             <div className="flex justify-between p-3"><span>Materiales</span> <span className="font-bold">{formatCOP(activeProject.materialCost)}</span></div>
                             <div className="flex justify-between p-3"><span>Terceros</span> <span className="font-bold">{formatCOP(activeProject.outsourcedCost)}</span></div>
                             <div className="flex justify-between p-3"><span>Otros</span> <span className="font-bold">{formatCOP(activeProject.otherCost)}</span></div>
                           </div>
                        </div>
                      </>
                    )
                  })() : (
                    <div className="p-8 text-center bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <h3 className="font-bold text-red-900">Acceso Denegado</h3>
                      <p className="text-sm text-red-700 mt-1">No tienes permiso (cost:read) para visualizar información financiera.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      {view === 'gantt' && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
          <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-bold">Planificador Gantt (Simulado)</h3>
            <div className="flex gap-2">
              <button className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/20 flex items-center gap-1 transition-colors">
                <Calendar className="w-4 h-4" /> Semana Actual
              </button>
            </div>
          </div>
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <Calendar className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold mb-2">Vista Gantt</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              El planificador interactivo permite visualizar la carga por máquina. Para consultar viabilidad, posibles cuellos de botella o reasignaciones, consulte al Agente de Capacidad.
            </p>
            <Link 
              to="/dashboard/produccion/capacidad" 
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 shadow-md"
            >
              <Bot className="w-5 h-5" />
              Preguntar al Agente de Capacidad
            </Link>
            
            <div className="mt-12 w-full max-w-3xl">
              <div className="text-left text-sm font-bold text-muted-foreground mb-4">Vista Previa de Máquinas (Mock)</div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-right shrink-0">Troqueladora</div>
                  <div className="flex-1 h-8 bg-muted rounded-md relative overflow-hidden flex">
                    <div className="w-[30%] bg-blue-500/80 border-r border-background group relative cursor-pointer hover:brightness-110">
                      <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate">PROY-840</div>
                      <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 w-48 bg-card border border-border p-2 rounded shadow-lg text-xs">
                        <p className="font-bold mb-1">PROY-840</p>
                        <Link to="/dashboard/produccion/capacidad" className="text-primary hover:underline flex items-center gap-1 mt-2">
                           <Bot className="w-3 h-3"/> Analizar con IA
                        </Link>
                      </div>
                    </div>
                    <div className="w-[40%] bg-blue-500/80 border-r border-background group relative cursor-pointer hover:brightness-110">
                       <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate">PROY-852</div>
                       <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 w-48 bg-card border border-border p-2 rounded shadow-lg text-xs">
                        <p className="font-bold mb-1">PROY-852</p>
                        <Link to="/dashboard/produccion/capacidad" className="text-primary hover:underline flex items-center gap-1 mt-2">
                           <Bot className="w-3 h-3"/> Analizar con IA
                        </Link>
                      </div>
                    </div>
                    <div className="w-[10%] bg-red-500/80 border-r border-background group relative cursor-pointer hover:brightness-110">
                       <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate text-center w-full">Mantenimiento</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-right shrink-0">Offset GTO</div>
                  <div className="flex-1 h-8 bg-muted rounded-md relative overflow-hidden flex">
                    <div className="w-[60%] bg-emerald-500/80 border-r border-background group relative cursor-pointer hover:brightness-110">
                      <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate">PROY-801 (Tiraje Largo)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'remisiones' && (
        <div className="flex flex-col h-full space-y-6 max-w-4xl mx-auto w-full pb-8">
          {/* Header tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
            <button onClick={() => setRemisionesTab('TODAS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${remisionesTab === 'TODAS' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}>Todas</button>
            <button onClick={() => setRemisionesTab('GENERADA')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${remisionesTab === 'GENERADA' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}><FileText className="w-4 h-4"/> Generadas</button>
            <button onClick={() => setRemisionesTab('ENTREGADA')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${remisionesTab === 'ENTREGADA' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}><CheckCircle2 className="w-4 h-4"/> Entregadas</button>
            <button onClick={() => setRemisionesTab('ANULADA')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${remisionesTab === 'ANULADA' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}><X className="w-4 h-4"/> Anuladas</button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={remisionesSearch} onChange={(e) => setRemisionesSearch(e.target.value)} placeholder="Buscar remisión..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-card shadow-sm text-sm" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {remisiones.filter(r => (remisionesTab === 'TODAS' || r.status === remisionesTab) && (!remisionesSearch || fuzzyMatchAny(remisionesSearch, [r.number, r.client]))).length} remisiones
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            {remisiones.filter(r => (remisionesTab === 'TODAS' || r.status === remisionesTab) && (!remisionesSearch || fuzzyMatchAny(remisionesSearch, [r.number, r.client]))).length === 0 ? (
              <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl shadow-sm">No hay remisiones para mostrar.</div>
            ) : remisiones.filter(r => (remisionesTab === 'TODAS' || r.status === remisionesTab) && (!remisionesSearch || fuzzyMatchAny(remisionesSearch, [r.number, r.client]))).map(rem => (
              <div key={rem.id} className="bg-card border border-border rounded-2xl p-5 flex gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${rem.status === 'ENTREGADA' ? 'bg-emerald-500' : rem.status === 'GENERADA' ? 'bg-blue-500' : 'bg-red-500'}`} />
                <div className="pl-3 w-full">
                   <div className="flex justify-between items-start gap-4">
                     <div>
                       <div className="flex items-center gap-3 mb-2">
                         <span className="font-bold text-lg">{rem.number}</span>
                         <span className="text-base font-semibold text-foreground">{rem.client}</span>
                       </div>
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mb-3 ${rem.status === 'ENTREGADA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : rem.status === 'GENERADA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                         {rem.status.toLowerCase()}
                       </span>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                       {rem.status === 'GENERADA' && (
                         <button onClick={() => {
                           setRemisiones(prev => prev.map(r => r.id === rem.id ? { ...r, status: 'ENTREGADA' } : r));
                         }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border border-border rounded-lg hover:bg-muted transition-colors bg-card shadow-sm">
                           <CheckCircle2 className="w-4 h-4" /> Entregar
                         </button>
                       )}
                       <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"><FileText className="w-5 h-5" /></button>
                       <button onClick={() => setActivePrintRemisionId(rem.id)} className="p-2 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><Printer className="w-5 h-5" /></button>
                     </div>
                   </div>
                   <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                     Proyecto: {new Date(rem.createdAt).toLocaleDateString()} - {rem.notes || 'Sin notas especiales'} - {rem.client} ({rem.projectId}) • {rem.itemsCount} item(s) • {new Date(rem.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}. • {rem.elaboratedBy}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL (Bloque K) */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
           <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="font-bold text-lg">Nuevo Proyecto</h2>
                <button onClick={() => setIsNewProjectOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex border-b border-border bg-muted/10 shrink-0">
                <button onClick={() => setNewProjectTab('MANUAL')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newProjectTab === 'MANUAL' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Manual</button>
                <button onClick={() => setNewProjectTab('QUOTE')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${newProjectTab === 'QUOTE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Desde Cotización</button>
              </div>
              <div className="p-6 overflow-y-auto">
                 {newProjectTab === 'MANUAL' ? (
                   <form id="new-project-manual" onSubmit={(e) => { e.preventDefault(); handleCreateProject(new FormData(e.currentTarget), 'MANUAL'); }} className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <input name="name" required placeholder="Nombre del proyecto..." className="col-span-2 px-3 py-2 border border-input rounded-md text-sm bg-background" />
                       <input name="client" required placeholder="Cliente..." className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
                       <select name="productType" required className="px-3 py-2 border border-input rounded-md text-sm bg-background">
                         <option value="">Tipo de producto...</option>
                         {TASK_TEMPLATES.map(t => <option key={t.productType} value={t.productType}>{t.productType}</option>)}
                       </select>
                       <select name="priority" defaultValue="MEDIUM" className="px-3 py-2 border border-input rounded-md text-sm bg-background">
                         <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
                       </select>
                       <input name="dueDate" type="date" className="px-3 py-2 border border-input rounded-md text-sm bg-background" />
                       <input name="quoteTotal" type="number" placeholder="Presupuesto Venta ($)" className="col-span-2 px-3 py-2 border border-input rounded-md text-sm bg-background" />
                     </div>
                     
                     <div className="border border-border rounded-xl p-4 bg-muted/10">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm">Ítems del proyecto</h4>
                          <button type="button" onClick={() => setNewProjectItems([...newProjectItems, {id: Math.random().toString(), name: '', quantity: 1, material: '', size: '', finishings: '', inks: ''}])} className="text-xs font-bold text-primary flex items-center gap-1"><Plus className="w-3 h-3"/> Agregar</button>
                        </div>
                        <div className="space-y-3">
                          {newProjectItems.map((item, idx) => (
                            <div key={item.id} className="grid grid-cols-6 gap-2 bg-background p-2 rounded-lg border border-border text-xs relative pr-8">
                               <input placeholder="Nombre / Ref" value={item.name} onChange={e => { const copy = [...newProjectItems]; copy[idx].name = e.target.value; setNewProjectItems(copy); }} className="col-span-2 px-2 py-1 border border-input rounded" required/>
                               <input type="number" min="1" placeholder="Cant" value={item.quantity} onChange={e => { const copy = [...newProjectItems]; copy[idx].quantity = Number(e.target.value); setNewProjectItems(copy); }} className="col-span-1 px-2 py-1 border border-input rounded" required/>
                               <input placeholder="Tamaño" value={item.size} onChange={e => { const copy = [...newProjectItems]; copy[idx].size = e.target.value; setNewProjectItems(copy); }} className="col-span-1 px-2 py-1 border border-input rounded" />
                               <input placeholder="Material" value={item.material} onChange={e => { const copy = [...newProjectItems]; copy[idx].material = e.target.value; setNewProjectItems(copy); }} className="col-span-2 px-2 py-1 border border-input rounded" />
                               <input placeholder="Tintas" value={item.inks} onChange={e => { const copy = [...newProjectItems]; copy[idx].inks = e.target.value; setNewProjectItems(copy); }} className="col-span-2 px-2 py-1 border border-input rounded" />
                               <input placeholder="Acabados" value={item.finishings} onChange={e => { const copy = [...newProjectItems]; copy[idx].finishings = e.target.value; setNewProjectItems(copy); }} className="col-span-4 px-2 py-1 border border-input rounded" />
                               <button type="button" onClick={() => setNewProjectItems(newProjectItems.filter((_, i) => i !== idx))} className="absolute right-2 top-2 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          ))}
                          {newProjectItems.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin ítems. Las tareas automáticas requieren ítems.</p>}
                        </div>
                     </div>
                   </form>
                 ) : (
                   <form id="new-project-quote" onSubmit={(e) => { e.preventDefault(); handleCreateProject(new FormData(e.currentTarget), 'QUOTE'); }} className="space-y-4">
                     <p className="text-sm text-muted-foreground mb-4">Selecciona una cotización aprobada para heredar cliente, monto e ítems.</p>
                     <select name="quoteId" required className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                        <option value="">Buscar cotización...</option>
                        {quotesList.map(q => <option key={q.id} value={q.id}>{q.number} - {q.client} ({formatCOP(q.total)})</option>)}
                     </select>
                   </form>
                 )}
              </div>
              <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                 <button onClick={() => setIsNewProjectOpen(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-md">Cancelar</button>
                 <button type="submit" form={newProjectTab === 'MANUAL' ? 'new-project-manual' : 'new-project-quote'} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90">Crear Proyecto</button>
              </div>
           </div>
        </div>
      )}
      
                  {/* EDIT MODAL (Bloque E) */}
      {isEditOpen && activeProject && (
         <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex justify-center items-start pt-10 sm:pt-16 p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl flex flex-col mb-10">
               <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
                  <h2 className="font-bold text-lg">Editar Proyecto</h2>
                  <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5" /></button>
               </div>
               
               <form onSubmit={(e) => {
                  e.preventDefault();
                  // Simulate Server Action 
                  alert('Proyecto actualizado mediante Server Action (Bloque E)');
                  setIsEditOpen(false);
               }} className="p-6 space-y-6">
                  {/* DATOS GENERALES */}
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold border-b border-border pb-1">Datos Generales</h3>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Nombre del Proyecto</label>
                        <input type="text" defaultValue={activeProject.name} required className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Descripción</label>
                        <textarea defaultValue={(activeProject as any).description} rows={2} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Tipo de Producto</label>
                           <select defaultValue={activeProject.productType} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                              <option value="Gran Formato">Gran Formato</option>
                              <option value="Impresión Digital">Impresión Digital</option>
                              <option value="Offset">Offset</option>
                              <option value="Corte Láser">Corte Láser</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Prioridad</label>
                           <select defaultValue={activeProject.priority} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background">
                              <option value="LOW">Baja</option>
                              <option value="MEDIUM">Media</option>
                              <option value="HIGH">Alta</option>
                              <option value="URGENT">Urgente</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* RESPONSABLES POR ROL */}
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold border-b border-border pb-1 text-primary">Responsables por Rol</h3>
                     <p className="text-[10px] text-muted-foreground leading-tight -mt-3 mb-2">Asigna una o más personas a cada rol. Esto actualiza directamente la tabla ProjectAssignment.</p>
                     
                     <div className="space-y-3">
                        {['Comercial', 'Producción', 'Montaje', 'Impresión', 'Acabados', 'Revisión'].map(role => {
                           // This represents a multi-select simulation
                           return (
                              <div key={role} className="flex items-start gap-3">
                                 <div className="w-24 shrink-0 pt-2"><label className="text-xs font-bold text-foreground">{role}</label></div>
                                 <div className="flex-1 space-y-1.5">
                                    <select className="w-full px-3 py-1.5 border border-input rounded-md text-sm bg-background text-muted-foreground">
                                       <option value="">+ Añadir persona...</option>
                                       <option value="u1">Admin (A)</option>
                                       <option value="u2">Juan P. (J)</option>
                                       <option value="u3">Ana P. (A)</option>
                                    </select>
                                    {/* Mock selected chips */}
                                    {role === 'Acabados' && (
                                       <div className="flex flex-wrap gap-1.5">
                                          <div className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Juan P. <button type="button" className="hover:text-red-500"><X className="w-3 h-3"/></button></div>
                                          <div className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Ana P. <button type="button" className="hover:text-red-500"><X className="w-3 h-3"/></button></div>
                                       </div>
                                    )}
                                    {role === 'Producción' && (
                                       <div className="flex flex-wrap gap-1.5">
                                          <div className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">Admin <button type="button" className="hover:text-red-500"><X className="w-3 h-3"/></button></div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* CAMPOS ADICIONALES */}
                  <div className="space-y-4">
                     <h3 className="text-sm font-bold border-b border-border pb-1">Campos Adicionales</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Fecha Límite</label>
                           <input type="date" defaultValue={activeProject.dueDate ? activeProject.dueDate.split('T')[0] : ''} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Remisión Manual</label>
                           <input type="text" placeholder="REM-..." className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Presupuesto (COP)</label>
                           <input type="number" defaultValue={activeProject.quoteTotal} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-muted-foreground">Costo Total Ajustado</label>
                           <input type="number" placeholder="Opcional" className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                     <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-background border border-border text-foreground font-bold rounded-md hover:bg-muted text-sm">Cancelar</button>
                     <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 text-sm">Guardar Cambios</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* DELETE MODAL (Bloque F) */}
      {isDeleteOpen && (projectToDelete || activeProject) && (() => {
         const target = projectToDelete || activeProject;
         if (!target) return null;
         return (
           <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
              <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                 <div className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                       <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h2 className="font-bold text-lg text-red-600">Eliminar Proyecto</h2>
                    <p className="text-sm text-muted-foreground">
                      ¿Estás seguro de que deseas eliminar el proyecto <strong>{target.number}</strong> ({target.name})? Esta acción es irreversible y eliminará tareas, tiempos y remisiones asociadas.
                    </p>
                 </div>
                 <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsDeleteOpen(false);
                        setProjectToDelete(null);
                      }} 
                      className="px-4 py-2 bg-background border border-border text-foreground font-bold rounded-md hover:bg-muted text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        handleDeleteProject(target.id);
                      }} 
                      className="px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 text-sm cursor-pointer shadow-sm transition-colors"
                    >
                      Eliminar Proyecto
                    </button>
                 </div>
              </div>
           </div>
         );
      })()}

      {/* REGISTRO DE CONSUMO MODAL (Bloque D) */}
      {materialConsumeModalOpen && activeProject && (
         <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
               <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
                  <h2 className="font-bold text-lg">Registrar Consumo</h2>
                  <button onClick={() => setMaterialConsumeModalOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5" /></button>
               </div>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!consumeItemId) { alert('Selecciona un insumo'); return; }
                  const item = inventoryList.find(i => i.id === consumeItemId);
                  if (!item) return;
                  if (consumeQuantity > item.available) {
                    alert('Inventario insuficiente. Stock disponible: ' + item.available);
                    return;
                  }
                  
                  // Deduct from inventory
                  deductInventory(consumeItemId, consumeQuantity);
                  
                  // Add to project
                  const totalCost = item.unitCost * consumeQuantity;
                  setProjectsWithSync(prev => prev.map(p => {
                    if (p.id === activeProject.id) {
                      const mat = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: item.name,
                        quantity: consumeQuantity,
                        unitCost: item.unitCost,
                        totalCost,
                        date: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                      };
                      return {
                        ...p,
                        materialCost: p.materialCost + totalCost,
                        consumedMaterials: [...(p.consumedMaterials || []), mat]
                      };
                    }
                    return p;
                  }));
                  
                  setMaterialConsumeModalOpen(false);
               }} className="p-6 space-y-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-muted-foreground">Insumo / Referencia</label>
                     <select 
                        value={consumeItemId}
                        onChange={(e) => setConsumeItemId(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" 
                        required
                     >
                        <option value="">Selecciona un material...</option>
                        {inventoryList.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.available} {item.unit} disp.)</option>
                        ))}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Cantidad</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0.01" 
                          value={consumeQuantity}
                          onChange={(e) => setConsumeQuantity(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" 
                          required 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">Costo Estimado</label>
                        <div className="w-full px-3 py-2 border border-border bg-muted/50 rounded-md text-sm font-bold text-foreground cursor-not-allowed">
                           {formatCOP((inventoryList.find(i => i.id === consumeItemId)?.unitCost || 0) * consumeQuantity)}
                        </div>
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-muted-foreground">Observaciones (Opcional)</label>
                     <input type="text" className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                  </div>
                  <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <button type="button" onClick={() => setMaterialConsumeModalOpen(false)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-bold rounded-md">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-md shadow-sm">Registrar y Descontar</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* CONFIG MODAL (Bloques H, M) */}
      {isConfigOpen && (
         <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-xl flex flex-col animate-in zoom-in-95 max-h-[90vh]">
               <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
                  <h2 className="font-bold text-lg">Configuración de Producción</h2>
                  <button onClick={() => setIsConfigOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-md"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div>
                     <h3 className="font-bold border-b border-border pb-2 mb-4">Flujo de Etapas y Reglas</h3>
                     <p className="text-sm text-muted-foreground mb-4">Configura las columnas del Kanban, los roles requeridos y los puntos de control de calidad obligatorios por cada fase.</p>
                     <div className="p-4 bg-muted/20 border border-border rounded-lg text-sm text-center text-muted-foreground">
                        (Interfaz de configuración de etapas ya definida en Bloque H)
                     </div>
                  </div>
                  
                  <div>
                     <h3 className="font-bold border-b border-border pb-2 mb-4">Formato de Remisión (Bloque M)</h3>
                     <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-background border border-indigo-200 rounded-lg cursor-pointer hover:border-indigo-500 ring-1 ring-indigo-500">
                           <input type="radio" name="rem_format" className="mt-1" defaultChecked />
                           <div>
                              <p className="font-bold text-sm">Media Carta (2 copias por hoja)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Formato optimizado para impresión en media página carta. Imprime copia para cliente y copia para archivo simultáneamente.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg cursor-pointer hover:border-border">
                           <input type="radio" name="rem_format" className="mt-1" />
                           <div>
                              <p className="font-bold text-sm">Carta Completa (Estándar)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Formato a página completa, ideal para remisiones con gran cantidad de ítems o notas detalladas.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg cursor-pointer hover:border-border">
                           <input type="radio" name="rem_format" className="mt-1" />
                           <div>
                              <p className="font-bold text-sm">Ticket térmico (80mm)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Para impresoras de punto de venta (POS). Formato compacto y rápido.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
                  <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md">Guardar Configuración</button>
               </div>
            </div>
         </div>
      )}
      
      {activePrintRemisionId && (
        <PrintRemisionModal 
           remisionId={activePrintRemisionId} 
           remisiones={remisiones} 
           projects={projects}
           onClose={() => setActivePrintRemisionId(null)} 
        />
      )}
    </div>
  );
}

function PrintRemisionModal({ remisionId, remisiones, projects, onClose }: { remisionId: string, remisiones: DeliveryNote[], projects: ProductionProject[], onClose: () => void }) {
  const remision = remisiones.find(r => r.id === remisionId);
  const project = projects.find(p => p.id === remision?.projectId);

  if (!remision || !project) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
      {/* Hide close button when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="no-print p-4 bg-muted border-b border-border flex justify-between items-center sticky top-0 shadow-sm z-10">
        <div className="font-bold">Vista previa de impresión (Remisión {remision.number})</div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg flex items-center gap-2">
             <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-background border border-border font-bold rounded-lg hover:bg-muted text-sm">Cerrar</button>
        </div>
      </div>

      <div className="print-content w-full h-full p-4 sm:p-8 bg-white flex justify-center items-start min-h-screen">
        {/* Media Carta Landscape Layout (Two side-by-side copies) */}
        <div className="flex flex-row w-[1056px] gap-8 shrink-0 mx-auto bg-white scale-[0.65] sm:scale-100 origin-top">
          
          {/* COPY 1: PARA EL CLIENTE */}
          <RemisionCopy remision={remision} project={project} type="PARA EL CLIENTE" />

          {/* COPY 2: PARA LA EMPRESA */}
          <RemisionCopy remision={remision} project={project} type="PARA LA EMPRESA" />

        </div>
      </div>
    </div>
  );
}

function RemisionCopy({ remision, project, type }: { remision: DeliveryNote, project: ProductionProject, type: string }) {
  const itemsText = project.itemsDetail.map(i => `${i.quantity} - ${i.name} ${i.size} ${i.material} ${i.finishings}`).join(', ');
  const dateStr = new Date(remision.createdAt).toLocaleDateString('es-CO');

  return (
    <div className="flex-1 border-2 border-border p-8 flex flex-col bg-white text-black min-h-[600px]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-600 mb-6">REMISIÓN Nº {remision.number.replace('REM-', '')}</h1>
          <div className="text-sm space-y-0.5">
            <p className="font-bold">Fusión Comunicación Gráfica S.A.S.</p>
            <p className="text-muted-foreground">NIT: 900310298-2</p>
            <p className="text-muted-foreground">Cra. 22 #24 - 47, Manizales, Caldas</p>
          </div>
        </div>
        <div className="w-24 h-24 border border-border bg-slate-50 flex flex-col items-center justify-center font-black text-slate-300 rounded-lg">
           {/* Placeholder for Logo */}
           <div className="text-2xl leading-none">FS</div>
           <div className="text-2xl leading-none">ION</div>
           <div className="text-xs text-black mt-2 tracking-widest font-bold">FUSIÓN</div>
        </div>
      </div>

      <div className="w-full h-1 bg-teal-600 mb-6"></div>

      <div className="space-y-4 text-sm mb-6 flex-1">
        <div><span className="font-bold">Fecha:</span> {dateStr}</div>
        <div><span className="font-bold">Cliente:</span> {remision.client}</div>
        
        <div className="mt-4">
          <div className="font-bold mb-1">Documento:</div>
          <div className="bg-slate-100 font-bold py-1 px-2 mb-1">DIRECCIÓN:</div>
          <div className="px-2">{project.name || 'N/A'}</div>
          <div className="mt-2"><span className="font-bold">Tel:</span> N/A</div>
        </div>

        <div className="mt-6">
          <div className="bg-slate-100 font-bold py-1 px-2 text-center mb-2">DESCRIPCIÓN</div>
          <div className="px-2 leading-relaxed">
            {dateStr} - {itemsText} - {remision.client}
          </div>
        </div>
        
        <div className="mt-8 border-t border-border pt-2">
          <div className="font-bold mb-8">OBSERVACIONES:</div>
          <div className="border-b border-border mb-6"></div>
          <div className="border-b border-border"></div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <div className="flex justify-between items-end mb-4">
           <div className="space-y-4 text-sm w-1/2">
             <div className="flex items-end gap-2"><span className="w-16">Nombre:</span><div className="flex-1 border-b border-black"></div></div>
             <div className="flex items-end gap-2"><span className="w-16">C.C.:</span><div className="flex-1 border-b border-black"></div></div>
             <div className="flex items-end gap-2"><span className="w-16">Tel:</span><div className="flex-1 border-b border-black"></div></div>
           </div>
           <div className="w-48 text-center text-sm font-bold">
             <div className="border-b-2 border-black w-full mb-1"></div>
             FIRMA CLIENTE
           </div>
        </div>

        <div className="bg-black text-white text-center py-1 text-xs font-bold tracking-widest w-48 mx-auto mt-6">
          --- {type} ---
        </div>
        
        <div className="text-center text-[10px] text-muted-foreground mt-4">
           Proyecto ID: {remision.projectId} | Despachado por: {remision.elaboratedBy}
        </div>
      </div>
    </div>
  );
}
