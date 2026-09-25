import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  Firestore,
} from 'firebase/firestore';
import { eventBus } from '../events/DomainEventBus';
import { getRequestAuth } from '../auth/requestContext';

export type ContractType = 'PLANTA' | 'SUPERNUMERARIO';
export type UserStatus = 'ACTIVO' | 'INACTIVO';

/**
 * Interfaz canónica universal de Empleado (SSOT)
 */
export interface Employee {
  id: string;
  initials: string;
  name: string;
  jobTitle: string;
  status: UserStatus;
  contractType: ContractType;
  email: string;
  phone?: string;
  extension?: string;
  roleKey: string;
  roleName: string;
  area?: string;
  customAllowedModules?: string[];
  customDeniedModules?: string[];
  customPermissions?: string[];
  mfaEnabled?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Compatibilidad retroactiva con módulos existentes
export type FusionEmployee = Employee;

export interface FusionRole {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  allowedModules: string[];
  permissions: string[];
}

export const INITIAL_ROLES: FusionRole[] = [
  {
    id: 'role-superadmin',
    key: 'super_admin',
    name: 'Super Administrador',
    description: 'Acceso total y sin restricciones. Control de usuarios, roles, seguridad y visibilidad de todo el sistema.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'produccion', 'costos', 'voz', 'comunicaciones', 'configuracion', 'auditoria', 'ia', 'sistema'],
    permissions: ['*'],
  },
  {
    id: 'role-gerente',
    key: 'gerente_general',
    name: 'Gerencia General',
    description: 'Visión ejecutiva integral de la empresa: comercial, producción, rentabilidad, costos e indicadores estratégicos.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'produccion', 'costos', 'voz', 'comunicaciones', 'configuracion', 'auditoria', 'ia'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'performance:read_all', 'goal:read', 'voice:use', 'voice:supervise'],
  },
  {
    id: 'role-dircomercial',
    key: 'director_comercial',
    name: 'Dirección Comercial',
    description: 'Control de ventas, cotizaciones, CRM, pipeline de clientes, metas y telefonía comercial.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'voz', 'comunicaciones', 'ia'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_team', 'goal:read', 'voice:use'],
  },
  {
    id: 'role-dirproyectos',
    key: 'director_proyectos',
    name: 'Dirección de Proyectos',
    description: 'Gestión de proyectos y cronogramas, articulación entre clientes, producción y taller gráfico.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'produccion', 'comunicaciones'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_team', 'goal:read'],
  },
  {
    id: 'role-jefeproduccion',
    key: 'jefe_produccion',
    name: 'Jefatura de Producción',
    description: 'Supervisión del taller, kanban de órdenes, rituales V.E.A., capacidad, inventario y costos de producción.',
    isSystem: true,
    allowedModules: ['equipo', 'produccion', 'costos', 'voz', 'comunicaciones'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_team', 'goal:read', 'voice:use'],
  },
  {
    id: 'role-dirfinanciero',
    key: 'director_financiero',
    name: 'Dirección Financiera',
    description: 'Control de costos reales, márgenes de utilidad, facturación, auditoría y parámetros económicos.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'produccion', 'costos', 'configuracion', 'auditoria'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'performance:read_all', 'goal:read'],
  },
  {
    id: 'role-auxadmin',
    key: 'auxiliar_admin',
    name: 'Auxiliar Administrativo y Financiero',
    description: 'Facturación diaria, compras, inventario, apoyo administrativo y atención de clientes.',
    isSystem: true,
    allowedModules: ['equipo', 'comercial', 'produccion', 'configuracion'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_own', 'goal:read'],
  },
  {
    id: 'role-liderprocesos',
    key: 'lider_procesos',
    name: 'Líder de Procesos y Calidad',
    description: 'Estandarización de procesos, control de calidad, eficiencia en planta y rituales V.E.A.',
    isSystem: true,
    allowedModules: ['equipo', 'produccion', 'configuracion', 'ia'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_team', 'goal:read'],
  },
  {
    id: 'role-diseno',
    key: 'diseno_preprensa',
    name: 'Diseño Senior y Pre-Prensa',
    description: 'Preparación de archivos, pre-prensa digital y offset, especificaciones técnicas y producción gráfica.',
    isSystem: true,
    allowedModules: ['equipo', 'produccion'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_own'],
  },
  {
    id: 'role-postprensa',
    key: 'post_prensa',
    name: 'Auxiliar Post Prensa',
    description: 'Acabados, guillotinado, laminación, troquelado, empaque y despacho de trabajos.',
    isSystem: true,
    allowedModules: ['equipo', 'produccion'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_own'],
  },
  {
    id: 'role-operario',
    key: 'operario_planta',
    name: 'Encuadernador / Impresor (Planta)',
    description: 'Operación en taller de encuadernación e impresión, kiosko de planta, tablero Mi Día y ejecución de órdenes.',
    isSystem: true,
    allowedModules: ['equipo', 'produccion'],
    permissions: ['home:read', 'announcement:read', 'chat:read', 'chat:send', 'performance:read_own'],
  },
];

export const INITIAL_EMPLOYEES: FusionEmployee[] = [
  {
    id: 'emp-admin',
    initials: 'SA',
    name: 'Super Administrador (Fusión)',
    jobTitle: 'Administrador del Sistema',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'admin@fusiongrafica.com.co',
    phone: '+57 300 000 0000',
    extension: '100',
    roleKey: 'super_admin',
    roleName: 'Super Administrador',
    mfaEnabled: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'emp-01',
    initials: 'AL',
    name: 'Alba Lucía Echeverri Echeverri',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'alba.echeverri@fusiongrafica.com.co',
    phone: '+57 311 201 4410',
    extension: '211',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-18T14:30:00.000Z',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T14:30:00.000Z',
  },
  {
    id: 'emp-02',
    initials: 'CA',
    name: 'Clara Alicia Vasco de Londoño',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'clara.vasco@fusiongrafica.com.co',
    phone: '+57 312 405 8892',
    extension: '212',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T07:15:00.000Z',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-19T07:15:00.000Z',
  },
  {
    id: 'emp-03',
    initials: 'CS',
    name: 'Cristian Andrés Sepúlveda',
    jobTitle: 'Director de Proyectos / Super Administrador',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'andresepulveda718@gmail.com',
    phone: '+57 300 488 2211',
    extension: '100',
    roleKey: 'super_admin',
    roleName: 'Super Administrador',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T09:20:00.000Z',
    createdAt: '2025-06-01T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'emp-04',
    initials: 'DP',
    name: 'Diana Pulina Barreto Muñoz',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'diana.barreto@fusiongrafica.com.co',
    phone: '+57 315 789 3320',
    extension: '213',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T08:00:00.000Z',
    createdAt: '2025-08-10T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  },
  {
    id: 'emp-05',
    initials: 'EE',
    name: 'Elizabeth Echeverry',
    jobTitle: 'Jefe de Producción',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'elizabeth.echeverry@fusiongrafica.com.co',
    phone: '+57 301 654 9901',
    extension: '105',
    roleKey: 'jefe_produccion',
    roleName: 'Jefatura de Producción',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T07:45:00.000Z',
    createdAt: '2025-03-01T08:00:00.000Z',
    updatedAt: '2026-09-19T07:45:00.000Z',
  },
  {
    id: 'emp-06',
    initials: 'JE',
    name: 'Jorge Enrique Escobar Gaviria',
    jobTitle: 'Gerente General',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'jorge.escobar@fusiongrafica.com.co',
    phone: '+57 300 111 8899',
    extension: '101',
    roleKey: 'gerente_general',
    roleName: 'Gerencia General',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T08:30:00.000Z',
    createdAt: '2024-01-01T08:00:00.000Z',
    updatedAt: '2026-09-19T08:30:00.000Z',
  },
  {
    id: 'emp-07',
    initials: 'JM',
    name: 'Jorge Luis Marín Galvis',
    jobTitle: 'Director Comercial',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'jorge.marin@fusiongrafica.com.co',
    phone: '+57 314 887 5544',
    extension: '102',
    roleKey: 'director_comercial',
    roleName: 'Dirección Comercial',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T09:10:00.000Z',
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2026-09-19T09:10:00.000Z',
  },
  {
    id: 'emp-08',
    initials: 'JC',
    name: 'José Leonardo Chirino Yanes',
    jobTitle: 'Auxiliar Grado 1 Post Prensa',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'jose.chirino@fusiongrafica.com.co',
    phone: '+57 318 672 1109',
    extension: '214',
    roleKey: 'post_prensa',
    roleName: 'Auxiliar Post Prensa',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T07:30:00.000Z',
    createdAt: '2025-10-01T08:00:00.000Z',
    updatedAt: '2026-09-19T07:30:00.000Z',
  },
  {
    id: 'emp-09',
    initials: 'JD',
    name: 'Juan David Cifuentes López',
    jobTitle: 'Diseñadora Senior - Impresora',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'juandavid.cifuentes@fusiongrafica.com.co',
    phone: '+57 310 998 4422',
    extension: '108',
    roleKey: 'diseno_preprensa',
    roleName: 'Diseño Senior y Pre-Prensa',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T08:15:00.000Z',
    createdAt: '2025-05-15T08:00:00.000Z',
    updatedAt: '2026-09-19T08:15:00.000Z',
  },
  {
    id: 'emp-10',
    initials: 'LS',
    name: 'Lorena Silva Henao',
    jobTitle: 'Líder de Procesos',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'lorena.silva@fusiongrafica.com.co',
    phone: '+57 316 443 2210',
    extension: '107',
    roleKey: 'lider_procesos',
    roleName: 'Líder de Procesos y Calidad',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T08:45:00.000Z',
    createdAt: '2025-07-01T08:00:00.000Z',
    updatedAt: '2026-09-19T08:45:00.000Z',
  },
  {
    id: 'emp-11',
    initials: 'ML',
    name: 'Magda Liliana Aguirre Herrera',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'magda.aguirre@fusiongrafica.com.co',
    phone: '+57 313 771 9088',
    extension: '215',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-18T16:00:00.000Z',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-09-18T16:00:00.000Z',
  },
  {
    id: 'emp-12',
    initials: 'MR',
    name: 'Maria Rocio Acosta Wilches',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'rocio.acosta@fusiongrafica.com.co',
    phone: '+57 317 220 5433',
    extension: '216',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-18T15:20:00.000Z',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-09-18T15:20:00.000Z',
  },
  {
    id: 'emp-13',
    initials: 'MA',
    name: 'Mónica Andrea Taborda',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'monica.taborda@fusiongrafica.com.co',
    phone: '+57 319 883 1144',
    extension: '217',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T07:20:00.000Z',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-09-19T07:20:00.000Z',
  },
  {
    id: 'emp-14',
    initials: 'NG',
    name: 'Nataly Galvez Lopez',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'nataly.galvez@fusiongrafica.com.co',
    phone: '+57 320 651 8877',
    extension: '218',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T07:10:00.000Z',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-09-19T07:10:00.000Z',
  },
  {
    id: 'emp-15',
    initials: 'OE',
    name: 'Omaira Echeverri Echeverri',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'omaira.echeverri@fusiongrafica.com.co',
    phone: '+57 311 390 6655',
    extension: '219',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-18T17:00:00.000Z',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T17:00:00.000Z',
  },
  {
    id: 'emp-16',
    initials: 'OG',
    name: 'Oscar Gaviria Giraldo',
    jobTitle: 'Director Financiero',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'oscar.gaviria@fusiongrafica.com.co',
    phone: '+57 301 229 8811',
    extension: '103',
    roleKey: 'director_financiero',
    roleName: 'Dirección Financiera',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T09:00:00.000Z',
    createdAt: '2024-03-01T08:00:00.000Z',
    updatedAt: '2026-09-19T09:00:00.000Z',
  },
  {
    id: 'emp-17',
    initials: 'SS',
    name: 'Sandra Sanchez',
    jobTitle: 'Encuadernadora / Impresora',
    status: 'ACTIVO',
    contractType: 'SUPERNUMERARIO',
    email: 'sandra.sanchez@fusiongrafica.com.co',
    phone: '+57 314 660 7733',
    extension: '220',
    roleKey: 'operario_planta',
    roleName: 'Encuadernador / Impresor (Planta)',
    mfaEnabled: false,
    lastLoginAt: '2026-09-19T07:40:00.000Z',
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-09-19T07:40:00.000Z',
  },
  {
    id: 'emp-18',
    initials: 'XV',
    name: 'Xiomara Valencia Arias',
    jobTitle: 'Auxiliar Administrativo y Financiero',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'xiomara.valencia@fusiongrafica.com.co',
    phone: '+57 312 908 1145',
    extension: '106',
    roleKey: 'auxiliar_admin',
    roleName: 'Auxiliar Administrativo y Financiero',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T08:50:00.000Z',
    createdAt: '2025-09-01T08:00:00.000Z',
    updatedAt: '2026-09-19T08:50:00.000Z',
  },
  {
    id: 'emp-19',
    initials: 'YA',
    name: 'Yenifer Arenas González',
    jobTitle: 'Diseñadora Senior - Impresora',
    status: 'ACTIVO',
    contractType: 'PLANTA',
    email: 'yenifer.arenas@fusiongrafica.com.co',
    phone: '+57 310 442 8819',
    extension: '109',
    roleKey: 'diseno_preprensa',
    roleName: 'Diseño Senior y Pre-Prensa',
    mfaEnabled: true,
    lastLoginAt: '2026-09-19T08:05:00.000Z',
    createdAt: '2025-06-15T08:00:00.000Z',
    updatedAt: '2026-09-19T08:05:00.000Z',
  },
];

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in employeeService', e);
}

function getDb(): Firestore | null {
  try {
    if (!getApps().length) {
      if (firebaseConfig.projectId) {
        initializeApp(firebaseConfig);
      } else {
        return null;
      }
    }
    return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error('Failed to get Firestore in employeeService', err);
    return null;
  }
}

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// In-memory cache synchronized with Firestore (Single Source of Truth)
const employeesCache = new Map<string, Employee>();
const rolesCache = new Map<string, FusionRole>();
let isInitialized = false;
let activeSimulatedUser: Employee | null = null;

// Populate initial defaults in memory immediately to prevent cold-start race conditions
INITIAL_ROLES.forEach((r) => rolesCache.set(r.id, { ...r }));
INITIAL_EMPLOYEES.forEach((e) => employeesCache.set(e.id, { ...e }));

async function syncWithFirestore(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.warn('[employeeService] Firestore no disponible, operando en memoria.');
    return;
  }

  try {
    // 1. Sincronizar roles desde Firestore
    const rolesSnap = await getDocs(collection(db, 'roles'));
    if (!rolesSnap.empty) {
      rolesCache.clear();
      rolesSnap.forEach((d) => {
        const role = d.data() as FusionRole;
        rolesCache.set(role.id, role);
      });
    } else {
      for (const r of INITIAL_ROLES) {
        rolesCache.set(r.id, { ...r });
        await setDoc(doc(db, 'roles', r.id), cleanObject(r), { merge: true });
      }
    }

    // 2. Sincronizar empleados desde Firestore
    const empsSnap = await getDocs(collection(db, 'employees'));
    if (!empsSnap.empty) {
      // Cargar plantilla canónica y sobreescribir con Firestore
      INITIAL_EMPLOYEES.forEach((e) => employeesCache.set(e.id, { ...e }));
      empsSnap.forEach((d) => {
        const emp = d.data() as Employee;
        employeesCache.set(emp.id, emp);
      });
      // Persistir en Firestore si alguno de los colaboradores base faltaba
      for (const emp of INITIAL_EMPLOYEES) {
        if (!empsSnap.docs.some((d) => d.id === emp.id)) {
          await setDoc(doc(db, 'employees', emp.id), cleanObject(emp), { merge: true });
        }
      }
    } else {
      console.log('[employeeService] Inicializando colección "employees" en Firestore...');
      for (const emp of INITIAL_EMPLOYEES) {
        employeesCache.set(emp.id, { ...emp });
        await setDoc(doc(db, 'employees', emp.id), cleanObject(emp), { merge: true });
      }
    }

    // Inmunidad de Super Administrador para Cristian Andrés Sepúlveda (emp-03)
    const cristian = employeesCache.get('emp-03');
    if (cristian) {
      cristian.roleKey = 'super_admin';
      cristian.roleName = 'Super Administrador';
      cristian.status = 'ACTIVO';
      cristian.contractType = 'PLANTA';
      cristian.email = 'andresepulveda718@gmail.com';
      cristian.name = 'Cristian Andrés Sepúlveda';
      employeesCache.set('emp-03', cristian);
      await setDoc(doc(db, 'employees', 'emp-03'), cleanObject(cristian), { merge: true });
    }

    isInitialized = true;
    console.log(`[employeeService] SSOT Firestore sincronizada: ${employeesCache.size} empleados cargados.`);
  } catch (err) {
    console.error('[employeeService] Error al sincronizar con Firestore:', err);
  }
}

// Iniciar sincronización de fondo
syncWithFirestore().catch((err) => {
  console.error('[employeeService] Error en sincronización inicial:', err);
});

// Service methods (SSOT)
export const employeeService = {
  getRoles(): FusionRole[] {
    return Array.from(rolesCache.values());
  },

  getRoleByKey(key: string): FusionRole | undefined {
    return this.getRoles().find((r) => r.key === key);
  },

  saveRole(roleData: Partial<FusionRole>): FusionRole {
    const roles = this.getRoles();
    const existingIndex = roles.findIndex((r) => r.id === roleData.id || r.key === roleData.key);
    let savedRole: FusionRole;

    if (existingIndex >= 0) {
      savedRole = {
        ...roles[existingIndex],
        ...roleData,
      } as FusionRole;
    } else {
      savedRole = {
        id: roleData.id || `role-${Date.now()}`,
        key: roleData.key || `custom_${Date.now()}`,
        name: roleData.name || 'Nuevo Rol',
        description: roleData.description || '',
        isSystem: false,
        allowedModules: roleData.allowedModules || ['equipo'],
        permissions: roleData.permissions || ['home:read'],
      };
    }

    rolesCache.set(savedRole.id, savedRole);

    // Persistir asíncronamente en Firestore
    const db = getDb();
    if (db) {
      setDoc(doc(db, 'roles', savedRole.id), cleanObject(savedRole), { merge: true }).catch(console.error);
    }

    return savedRole;
  },

  /**
   * Obtiene los empleados de la SSOT.
   * Por defecto (sin opciones o includeInactive=false) lista ESTRICTAMENTE empleados con status === 'ACTIVO'.
   * Si se especifica includeInactive: true, devuelve todos para auditoría o gestión de personal.
   */
  getEmployees(options?: { includeInactive?: boolean }): Employee[] {
    // Auto-recuperación estricta: asegurar que la nómina canónica completa de 20 colaboradores esté en memoria
    if (employeesCache.size < INITIAL_EMPLOYEES.length) {
      for (const e of INITIAL_EMPLOYEES) {
        if (!employeesCache.has(e.id)) {
          employeesCache.set(e.id, { ...e });
        }
      }
    }
    const all = Array.from(employeesCache.values());
    if (options?.includeInactive === true) {
      return all;
    }
    return all.filter((e) => e.status === 'ACTIVO');
  },

  getActiveEmployees(): Employee[] {
    return this.getEmployees({ includeInactive: false });
  },

  getAllEmployees(): Employee[] {
    return this.getEmployees({ includeInactive: true });
  },

  getEmployeeById(id: string): Employee | undefined {
    return employeesCache.get(id);
  },

  saveEmployee(data: Partial<Employee>): Employee {
    const roles = this.getRoles();
    const matchedRole = roles.find((r) => r.key === data.roleKey);
    const roleName = matchedRole ? matchedRole.name : (data.roleName || 'Sin Rol');

    const generateInitials = (name: string): string => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const targetId = data.id || `emp-${Date.now()}`;
    const existing = employeesCache.get(targetId);
    const isNew = !existing;
    const previousState = existing ? { ...existing } : undefined;

    // Inmunidad de Super Administrador para Cristian Andrés Sepúlveda
    const isCristian =
      targetId === 'emp-03' ||
      (existing && (existing.id === 'emp-03' || existing.email?.includes('andresepulveda718'))) ||
      (data.email && data.email.includes('andresepulveda718'));

    let savedEmployee: Employee;

    if (existing) {
      savedEmployee = {
        ...existing,
        ...data,
        id: existing.id,
        roleKey: isCristian ? 'super_admin' : (data.roleKey || existing.roleKey),
        roleName: isCristian ? 'Super Administrador' : roleName,
        status: isCristian ? 'ACTIVO' : (data.status || existing.status),
        initials: data.initials || existing.initials || generateInitials(data.name || existing.name),
        updatedAt: new Date().toISOString(),
      };
    } else {
      savedEmployee = {
        id: targetId,
        initials: data.initials || generateInitials(data.name || 'Nuevo Empleado'),
        name: data.name || 'Nuevo Empleado',
        jobTitle: data.jobTitle || 'Operario',
        status: isCristian ? 'ACTIVO' : (data.status || 'ACTIVO'),
        contractType: data.contractType || 'PLANTA',
        email: data.email || `empleado_${Date.now()}@fusiongrafica.com.co`,
        phone: data.phone || '',
        extension: data.extension || '',
        roleKey: isCristian ? 'super_admin' : (data.roleKey || 'operario_planta'),
        roleName: isCristian ? 'Super Administrador' : roleName,
        area: data.area || undefined,
        customAllowedModules: data.customAllowedModules || undefined,
        customDeniedModules: data.customDeniedModules || undefined,
        customPermissions: isCristian ? ['*'] : (data.customPermissions || undefined),
        mfaEnabled: !!data.mfaEnabled,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    employeesCache.set(savedEmployee.id, savedEmployee);

    if (activeSimulatedUser && activeSimulatedUser.id === savedEmployee.id) {
      activeSimulatedUser = savedEmployee;
    }

    // Persistir asíncronamente en Firestore
    const db = getDb();
    if (db) {
      setDoc(doc(db, 'employees', savedEmployee.id), cleanObject(savedEmployee), { merge: true }).catch((err) => {
        console.error(`[employeeService] Error guardando empleado ${savedEmployee.id} en Firestore:`, err);
      });
    }

    // Publicar evento en el bus desacoplado
    if (isNew) {
      eventBus.publish('EMPLOYEE_CREATED', { employee: savedEmployee });
    } else {
      eventBus.publish('EMPLOYEE_UPDATED', { employee: savedEmployee, previousState });
    }

    return savedEmployee;
  },

  /**
   * Soft-Delete: Inactiva al empleado sin remover físicamente el registro (integridad referencial).
   */
  softDeleteEmployee(id: string): Employee | null {
    if (id === 'emp-03') {
      console.warn('[employeeService] No se puede inactivar al Super Administrador principal (Cristian Andrés Sepúlveda)');
      return null;
    }

    const employee = employeesCache.get(id);
    if (!employee) return null;

    employee.status = 'INACTIVO';
    employee.updatedAt = new Date().toISOString();
    employeesCache.set(id, employee);

    if (activeSimulatedUser && activeSimulatedUser.id === id) {
      activeSimulatedUser = this.getActiveUser();
    }

    // Actualizar en Firestore mediante soft-delete (NO deleteDoc)
    const db = getDb();
    if (db) {
      updateDoc(doc(db, 'employees', id), {
        status: 'INACTIVO',
        updatedAt: employee.updatedAt,
      }).catch((err) => {
        console.error(`[employeeService] Error en soft-delete Firestore de ${id}:`, err);
      });
    }

    // Publicar evento de inactivación
    eventBus.publish('EMPLOYEE_DEACTIVATED', {
      employeeId: id,
      timestamp: employee.updatedAt,
    });

    return employee;
  },

  /**
   * Reemplazo estricto de borrado por soft-delete (status = 'INACTIVO')
   */
  deleteEmployee(id: string): boolean {
    const result = this.softDeleteEmployee(id);
    return result !== null;
  },

  deactivateEmployee(id: string): Employee | null {
    return this.softDeleteEmployee(id);
  },

  async seedTeam(): Promise<Employee[]> {
    employeesCache.clear();
    rolesCache.clear();

    const db = getDb();

    for (const role of INITIAL_ROLES) {
      rolesCache.set(role.id, { ...role });
      if (db) {
        await setDoc(doc(db, 'roles', role.id), cleanObject(role), { merge: true });
      }
    }

    for (const emp of INITIAL_EMPLOYEES) {
      employeesCache.set(emp.id, { ...emp });
      if (db) {
        await setDoc(doc(db, 'employees', emp.id), cleanObject(emp), { merge: true });
      }
    }

    return Array.from(employeesCache.values());
  },

  /**
   * Usuario de la petición en curso (verificado por la sesión). Fuera de una petición
   * (jobs, arranque) conserva el comportamiento anterior.
   */
  getActiveUser(): Employee {
    const requestAuth = getRequestAuth();
    if (requestAuth) return requestAuth.user;

    if (!activeSimulatedUser || activeSimulatedUser.status === 'INACTIVO') {
      const cristian =
        employeesCache.get('emp-03') ||
        Array.from(employeesCache.values()).find(
          (e) => (e.email && e.email.includes('andresepulveda718')) || e.roleKey === 'super_admin'
        );
      activeSimulatedUser = cristian || Array.from(employeesCache.values())[0];
    }
    return activeSimulatedUser;
  },

  setActiveUser(id: string): Employee | null {
    const found = employeesCache.get(id);
    if (found && found.status === 'ACTIVO') {
      activeSimulatedUser = found;
      return found;
    }
    return null;
  },
};
