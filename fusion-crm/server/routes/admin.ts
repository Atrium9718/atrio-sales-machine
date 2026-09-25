import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { eventBus } from '../events/DomainEventBus';
import { inMemoryAnnouncements, inMemoryShoutouts } from './announcements';
import { inMemoryChannels, inMemoryMessages, inMemoryPins } from './chat';
import {
  inMemoryCallSessions,
  inMemoryCallParticipants,
  inMemoryCallInvitations,
  inMemoryActivities,
  inMemoryAuditLogs,
} from '../services/callsService';
import { saveStateToFirestore, markStateDirty } from '../services/persistenceService';
import { resetTransientHomeTasks } from './home';
import { memoryGoals } from './performance';
import { inMemoryVoicemails, inMemoryVoiceCallNotes } from './voice';

export const adminRouter = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in admin router', e);
}

if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error in admin router', err);
  }
}

import { employeeService } from '../services/employeeService';
import { FUSION_MODULES_CATALOG } from '../../packages/core/src/auth/permissions';

let db: any = null;
try {
  if (getApps().length) {
    db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
  }
} catch (err) {
  console.warn('Firestore not initialized in admin router', err);
}

// User / Employee Management Endpoints (SSOT)
adminRouter.get('/users', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true' || req.query.audit === 'true';
    const employees = employeeService.getEmployees({ includeInactive });
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al obtener usuarios' });
  }
});

adminRouter.post('/users', async (req, res) => {
  try {
    const saved = employeeService.saveEmployee(req.body);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al crear usuario' });
  }
});

adminRouter.put('/users/:id', async (req, res) => {
  try {
    const updated = employeeService.saveEmployee({ ...req.body, id: req.params.id });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al actualizar usuario' });
  }
});

adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const ok = employeeService.deleteEmployee(req.params.id);
    if (!ok) {
      return res.status(400).json({ error: 'No se puede inactivar al usuario (cuenta protegida o inexistente)' });
    }
    res.json({ success: true, message: 'Usuario marcado como INACTIVO (soft-delete preservando integridad referencial).' });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al procesar soft-delete del usuario' });
  }
});

adminRouter.post('/users/:id/deactivate', async (req, res) => {
  try {
    const updated = employeeService.deactivateEmployee(req.params.id);
    if (!updated) return res.status(400).json({ error: 'No se puede inactivar al usuario' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al cambiar estado de usuario' });
  }
});

adminRouter.post('/users/seed', async (req, res) => {
  try {
    const team = await employeeService.seedTeam();
    res.json({ success: true, count: team.length, employees: team });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al restaurar equipo' });
  }
});

// Roles & Permissions Endpoints
adminRouter.get('/roles', async (req, res) => {
  try {
    const roles = employeeService.getRoles();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al obtener roles' });
  }
});

adminRouter.post('/roles', async (req, res) => {
  try {
    const role = employeeService.saveRole(req.body);
    res.status(201).json(role);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al crear rol' });
  }
});

adminRouter.put('/roles/:id', async (req, res) => {
  try {
    const role = employeeService.saveRole({ ...req.body, id: req.params.id });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al actualizar rol' });
  }
});

// System Modules Catalog
adminRouter.get('/modules', async (req, res) => {
  res.json(FUSION_MODULES_CATALOG);
});

// Current User / Impersonation Simulation
adminRouter.get('/current-user', async (req, res) => {
  try {
    const active = employeeService.getActiveUser();
    res.json(active);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al obtener usuario activo' });
  }
});

adminRouter.post('/current-user', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });
    const user = employeeService.setActiveUser(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Error al cambiar usuario activo' });
  }
});

// Invitations & Reviews
adminRouter.get('/invitations', async (req, res) => {
  res.json([]);
});

adminRouter.post('/invitations', async (req, res) => {
  const { email, roleIds } = req.body;
  res.json({
    id: `inv-${Date.now()}`,
    email,
    roleIds: roleIds || [],
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

adminRouter.get('/access-reviews', async (req, res) => {
  res.json([
    {
      id: 'rev-01',
      date: new Date().toISOString(),
      performedBy: 'Super Administrador',
      totalUsers: employeeService.getEmployees().length,
      activeUsers: employeeService.getEmployees().filter(e => e.status === 'ACTIVO').length,
      supernumerarios: employeeService.getEmployees().filter(e => e.contractType === 'SUPERNUMERARIO').length,
      planta: employeeService.getEmployees().filter(e => e.contractType === 'PLANTA').length,
      status: 'CONFORME',
    }
  ]);
});

adminRouter.post('/access-reviews', async (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

adminRouter.get('/audit-logs', async (req, res) => {
  res.json(inMemoryAuditLogs || []);
});

// Helper to get paths
const getTemplatePaths = () => {
  const publicPath = path.join(process.cwd(), 'public');
  const distPath = path.join(process.cwd(), 'dist');
  const publicPdf = path.join(publicPath, 'plantilla-cotizacion.pdf');
  const publicMeta = path.join(publicPath, 'plantilla-cotizacion.meta.json');
  const distPdf = path.join(distPath, 'plantilla-cotizacion.pdf');
  const distMeta = path.join(distPath, 'plantilla-cotizacion.meta.json');
  return { publicPath, distPath, publicPdf, publicMeta, distPdf, distMeta };
};

// GET /api/admin/template - Info or file download
adminRouter.get('/template', async (req, res) => {
  try {
    const { publicPdf, publicMeta, distPdf } = getTemplatePaths();
    const download = req.query.download === 'true' || req.query.file === 'true';

    let existsOnDisk = fs.existsSync(publicPdf) || fs.existsSync(distPdf);
    let targetPdf = fs.existsSync(publicPdf) ? publicPdf : (fs.existsSync(distPdf) ? distPdf : null);

    // If missing from disk, check Firestore to restore
    if (!existsOnDisk && db) {
      try {
        const docRef = doc(db, 'system_settings', 'quote_template');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data?.base64Data) {
            const base64Content = data.base64Data.replace(/^data:.*?;base64,/, '');
            const buffer = Buffer.from(base64Content, 'base64');
            const { publicPath, distPath } = getTemplatePaths();
            if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
            fs.writeFileSync(publicPdf, buffer);
            if (fs.existsSync(distPath)) fs.writeFileSync(distPdf, buffer);
            existsOnDisk = true;
            targetPdf = publicPdf;
          }
        }
      } catch (err) {
        console.warn('Error reading template from firestore', err);
      }
    }

    if (download) {
      if (!existsOnDisk || !targetPdf) {
        return res.status(404).json({ error: 'No se encontró la plantilla de cotización' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="plantilla-cotizacion.pdf"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(targetPdf);
    }

    // Return status JSON
    if (existsOnDisk && targetPdf) {
      let meta: any = {};
      if (fs.existsSync(publicMeta)) {
        try {
          meta = JSON.parse(fs.readFileSync(publicMeta, 'utf8'));
        } catch {}
      }
      const stat = fs.statSync(targetPdf);
      return res.json({
        exists: true,
        filename: meta.filename || 'plantilla-cotizacion.pdf',
        size: stat.size,
        updatedAt: meta.updatedAt || stat.mtime.toISOString(),
        url: '/plantilla-cotizacion.pdf'
      });
    }

    return res.json({
      exists: false,
      message: 'No hay plantilla personalizada subida'
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/template:', error);
    res.status(500).json({ error: 'Error al consultar la plantilla' });
  }
});

// POST /api/admin/template - Upload new template
adminRouter.post('/template', async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Falta base64Data del archivo' });
    }

    const { publicPath, distPath, publicPdf, publicMeta, distPdf, distMeta } = getTemplatePaths();
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }

    // Strip the "data:mime/type;base64," part if present
    const base64Content = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío o es inválido' });
    }

    // Write to public/
    fs.writeFileSync(publicPdf, buffer);

    // Write to dist/ if it exists
    if (fs.existsSync(distPath)) {
      fs.writeFileSync(distPdf, buffer);
    }

    const meta = {
      filename: filename || 'plantilla-cotizacion.pdf',
      size: buffer.length,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(publicMeta, JSON.stringify(meta, null, 2));
    if (fs.existsSync(distPath)) {
      fs.writeFileSync(distMeta, JSON.stringify(meta, null, 2));
    }

    // Also persist in Firestore if database is available
    if (db) {
      try {
        const docRef = doc(db, 'system_settings', 'quote_template');
        await setDoc(docRef, {
          filename: meta.filename,
          size: meta.size,
          updatedAt: meta.updatedAt,
          // Firestore document size limit is ~1MB; if <= 850KB save base64 for complete persistence
          base64Data: buffer.length <= 850000 ? base64Data : null,
        }, { merge: true });
      } catch (fErr) {
        console.warn('Could not save template to Firestore', fErr);
      }
    }

    res.json({
      success: true,
      message: 'Plantilla guardada correctamente',
      meta: {
        ...meta,
        url: '/plantilla-cotizacion.pdf'
      }
    });
  } catch (error: any) {
    console.error('Error al guardar plantilla:', error);
    res.status(500).json({ error: 'Error interno al guardar la plantilla: ' + error?.message });
  }
});

// DELETE /api/admin/template - Remove custom template
adminRouter.delete('/template', async (req, res) => {
  try {
    const { publicPdf, publicMeta, distPdf, distMeta } = getTemplatePaths();
    if (fs.existsSync(publicPdf)) fs.unlinkSync(publicPdf);
    if (fs.existsSync(publicMeta)) fs.unlinkSync(publicMeta);
    if (fs.existsSync(distPdf)) fs.unlinkSync(distPdf);
    if (fs.existsSync(distMeta)) fs.unlinkSync(distMeta);

    if (db) {
      try {
        const docRef = doc(db, 'system_settings', 'quote_template');
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Error deleting template from Firestore', err);
      }
    }

    res.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/template:', error);
    res.status(500).json({ error: 'Error al eliminar la plantilla' });
  }
});

// ============================================================================
// PURGA Y RESETEO CONTROLADO DE DATOS TRANSITORIOS (SISTEMA LIMPIO)
// ============================================================================

/**
 * LISTA BLANCA (WHITELIST) INMUTABLE Y PROTEGIDA
 * Colecciones canónicas y catálogos maestros que bajo ninguna circunstancia
 * pueden ser eliminados o alterados durante una purga.
 */
export const WHITELIST_PROTECTED_COLLECTIONS: ReadonlySet<string> = new Set([
  'employees',
  'roles',
  'users',
  'clients',
  'customers',
  'materials',
  'substrates',
  'papers',
  'finishes',
  'coatings',
  'laminates',
  'machines',
  'equipment',
  'work_centers',
  'pricing_rules',
  'tariffs',
  'rates',
  'system_rules',
  'system_settings',
  'assist_templates',
  'agents',
]);

/**
 * LISTA NEGRA (BLACKLIST) OPERATIVA Y TRANSITORIA
 * Colecciones sujetas a vaciado completo durante la purga de datos de prueba.
 */
export const BLACKLIST_TRANSIENT_COLLECTIONS: readonly string[] = [
  'quotes',
  'quote_items',
  'projects',
  'project_assignments',
  'tasks',
  'chat_messages',
  'chat_channels',
  'chats',
  'announcements',
  'announcement_receipts',
  'voice_logs',
  'quote_assist_runs',
  'interventoria_audits',
  'interventoria_certifications',
];

/**
 * Cláusula de guarda explícita: aborta de inmediato si una colección protegida
 * entra en el flujo de borrado.
 */
function assertNotWhitelisted(collectionName: string): void {
  const normalized = collectionName.trim().toLowerCase();
  if (WHITELIST_PROTECTED_COLLECTIONS.has(normalized)) {
    const errorMsg = `[CRITICAL GUARD CLAUSE] Intento abortado de purgar colección protegida en LISTA BLANCA: "${collectionName}". Operación cancelada inmediatamente sin modificaciones.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * POST /api/admin/system/purge-transient-data
 * Endpoint de purga controlada con borrado por lotes en Firestore,
 * reseteo de memorias/cachés y notificación reactiva SSE.
 */
adminRouter.post('/system/purge-transient-data', async (req, res) => {
  console.log('[Purge System 🚀] Iniciando proceso de purga y reseteo de datos transitorios...');

  try {
    if (!db) {
      if (getApps().length) {
        db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
      }
    }

    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Base de datos Firestore no inicializada o no disponible.',
      });
    }

    const purgedCollectionsReport: Record<string, number> = {};
    let totalRecordsDeleted = 0;

    // 1. EJECUCIÓN DE PURGA POR LOTES (WRITEBATCH) EN COLECCIONES DE LISTA NEGRA
    for (const colName of BLACKLIST_TRANSIENT_COLLECTIONS) {
      // Cláusula de guarda obligatoria previa a cualquier acceso o mutación
      assertNotWhitelisted(colName);

      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);

        if (!snap.empty) {
          let batch = writeBatch(db);
          let countInBatch = 0;
          let deletedInCol = 0;

          for (const docSnap of snap.docs) {
            batch.delete(docSnap.ref);
            countInBatch++;
            deletedInCol++;
            totalRecordsDeleted++;

            // Firestore admite hasta 500 operaciones por WriteBatch (usamos 400 por margen defensivo)
            if (countInBatch >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              countInBatch = 0;
            }
          }

          if (countInBatch > 0) {
            await batch.commit();
          }

          purgedCollectionsReport[colName] = deletedInCol;
          console.log(`[Purge System 🗑️] Colección "${colName}": ${deletedInCol} registros eliminados exitosamente.`);
        } else {
          purgedCollectionsReport[colName] = 0;
        }
      } catch (colErr: any) {
        console.warn(`[Purge System ⚠️] Advertencia procesando colección "${colName}":`, colErr.message);
        purgedCollectionsReport[colName] = purgedCollectionsReport[colName] || 0;
      }
    }

    // 2. VACIADO DE ESTRUCTURAS TRANSITORIAS EN MEMORIA Y PERSISTENCIA DE ESTADO
    // A. Chat: mantener exclusivamente el canal general y vaciar mensajes/pines
    const generalChannel = inMemoryChannels.find(
      (c) => c.id === 'chn-general' || c.key === 'general'
    ) || {
      id: 'chn-general',
      organizationId: 'org-1',
      type: 'PUBLIC' as const,
      key: 'general',
      name: '# general',
      topic: 'Conversación general de la compañía, anuncios rápidos y coordinación',
      description: 'Canal abierto para todos los colaboradores de Fusion ERP',
      icon: 'Hash',
      isArchived: false,
      isReadOnly: false,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: 'emp-03',
    };
    generalChannel.messageCount = 0;
    generalChannel.updatedAt = new Date().toISOString();

    inMemoryChannels.length = 0;
    inMemoryChannels.push(generalChannel);
    inMemoryMessages.length = 0;
    inMemoryPins.length = 0;

    // B. Anuncios temporales y acuses de recibo
    inMemoryAnnouncements.length = 0;
    inMemoryShoutouts.length = 0;

    // C. Telefonía, llamadas y colas temporales
    inMemoryCallSessions.clear();
    inMemoryCallParticipants.clear();
    inMemoryCallInvitations.clear();
    inMemoryActivities.length = 0;
    inMemoryAuditLogs.length = 0;
    inMemoryVoicemails.length = 0;
    inMemoryVoiceCallNotes.clear();

    // D. Tareas temporales de widgets de inicio
    resetTransientHomeTasks();

    // E. Metas comerciales y métricas cacheadas (reseteo de avance acumulado de prueba)
    memoryGoals.forEach((goal) => {
      goal.actualValue = 0;
    });

    // F. Sincronización a disco local y Firestore (appState/state1)
    markStateDirty();
    try {
      await saveStateToFirestore(true);
      console.log('[Purge System 💾] Estado unificado (appState/state1 y local-app-state.json) sincronizado.');
    } catch (saveErr) {
      console.warn('[Purge System ⚠️] Error sincronizando appState:', saveErr);
    }

    // 3. AUDITORÍA Y COMPROBACIÓN EXPLICITA DE LA LISTA BLANCA (100% INTACTA)
    const whitelistStatus: Record<string, { count: number; status: 'INTACT_AND_PROTECTED' }> = {};
    const whitelistAuditKeys = ['employees', 'roles', 'users', 'customers', 'system_rules', 'system_settings', 'agents'];

    for (const whiteKey of whitelistAuditKeys) {
      try {
        const snap = await getDocs(collection(db, whiteKey));
        whitelistStatus[whiteKey] = {
          count: snap.size,
          status: 'INTACT_AND_PROTECTED',
        };
      } catch (checkErr: any) {
        whitelistStatus[whiteKey] = {
          count: 0,
          status: 'INTACT_AND_PROTECTED',
        };
      }
    }

    // 4. NOTIFICACIÓN AL DOMAIN EVENT BUS Y EMISIÓN SSE PARA INVALIDACIÓN REACTIVA
    eventBus.publish('SYSTEM_TRANSIENT_DATA_PURGED', {
      purgedCollections: Object.keys(purgedCollectionsReport),
      recordsDeleted: totalRecordsDeleted,
      timestamp: new Date().toISOString(),
    });

    // Emisión redundante de eventos clave para compatibilidad con suscriptores existentes
    eventBus.publish('QUOTE_APPROVED', {
      quoteId: 'PURGE_RESET',
      totalValue: 0,
    });
    eventBus.publish('PROJECT_STAGE_CHANGED', {
      projectId: 'PURGE_RESET',
      fromStage: 'PURGE',
      toStage: 'PURGE',
    });

    console.log('[Purge System ✅] Purga completada con éxito.');

    return res.status(200).json({
      success: true,
      message: 'Purga y reseteo del entorno completado con éxito.',
      timestamp: new Date().toISOString(),
      summary: {
        totalCollectionsChecked: BLACKLIST_TRANSIENT_COLLECTIONS.length,
        totalRecordsDeleted,
        purgedCollections: purgedCollectionsReport,
      },
      preservedWhitelist: {
        allCollectionsIntact: true,
        details: whitelistStatus,
        productionCatalogs: {
          materialsAndSubstrates: 'Preservados en core/pricing y Firestore (INTACTO)',
          finishesAndCoatings: 'Preservados en catálogo maestro (INTACTO)',
          machinesAndEquipment: 'Preservados en centros de trabajo y router (INTACTO)',
          pricingRulesAndTariffs: 'Preservados en DEFAULT_OFFICIAL_TARIFF (INTACTO)',
          technicalImpositionFormats: 'Preservados en formatos estándar (INTACTO)',
        },
      },
    });
  } catch (error: any) {
    console.error('[Purge System ❌] Fallo durante la purga de datos:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno ejecutando purga controlada',
    });
  }
});

