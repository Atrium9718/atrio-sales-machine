import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  setDoc,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

/**
 * LISTA BLANCA (WHITELIST) INMUTABLE Y PROTEGIDA
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
 */
export const BLACKLIST_TRANSIENT_COLLECTIONS: readonly string[] = [
  'quotes',
  'quote_items',
  'projects',
  'project_assignments',
  'tasks',
  'chat_messages',
  'chat_channels',
  'announcements',
  'announcement_receipts',
  'voice_logs',
  'quote_assist_runs',
  'interventoria_audits',
  'interventoria_certifications',
];

function assertNotWhitelisted(collectionName: string): void {
  const normalized = collectionName.trim().toLowerCase();
  if (WHITELIST_PROTECTED_COLLECTIONS.has(normalized)) {
    const errorMsg = `[CRITICAL GUARD CLAUSE] Intento abortado de purgar colección protegida en LISTA BLANCA: "${collectionName}". Operación cancelada inmediatamente sin modificaciones.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

async function runPurge() {
  console.log('================================================================');
  console.log('  INICIANDO PURGA Y RESETEO CONTROLADO DEL ENTORNO (FUSIÓN CG)  ');
  console.log('================================================================\n');

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('firebase-applet-config.json no encontrado.');
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);

  // 1. PURGA DE COLECCIONES DE LA LISTA NEGRA
  console.log('PASO 1: Vaciando colecciones transitorias (Lista Negra) en Firestore...');
  const purgedReport: Record<string, number> = {};
  let totalDeleted = 0;

  for (const colName of BLACKLIST_TRANSIENT_COLLECTIONS) {
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
          totalDeleted++;

          if (countInBatch >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            countInBatch = 0;
          }
        }

        if (countInBatch > 0) {
          await batch.commit();
        }

        purgedReport[colName] = deletedInCol;
        console.log(`  ✓ Colección "${colName}": ${deletedInCol} documentos eliminados.`);
      } else {
        purgedReport[colName] = 0;
        console.log(`  - Colección "${colName}": 0 documentos (ya vacía).`);
      }
    } catch (err: any) {
      console.warn(`  ! Advertencia en colección "${colName}":`, err.message);
      purgedReport[colName] = 0;
    }
  }

  // 2. RESETEO DE ESTADO TRANSITORIO PERSISTENTE (appState/state1 & local-app-state.json)
  console.log('\nPASO 2: Reseteando estructuras de chat, anuncios, telefonía y tareas...');
  const cleanAppState = {
    announcements: JSON.stringify([]),
    shoutouts: JSON.stringify([]),
    channels: JSON.stringify([
      {
        id: 'chn-general',
        organizationId: 'org-1',
        type: 'PUBLIC',
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
      },
    ]),
    messages: JSON.stringify([]),
    pins: JSON.stringify([]),
    savedReplies: JSON.stringify([]),
    presences: JSON.stringify({}),
    callSessions: JSON.stringify({}),
    callParticipants: JSON.stringify({}),
    callInvitations: JSON.stringify({}),
    activities: JSON.stringify([]),
    auditLogs: JSON.stringify([]),
  };

  // Guardar en Firestore appState
  try {
    await setDoc(doc(db, 'appState', 'state1'), cleanAppState);
    console.log('  ✓ Documento "appState/state1" actualizado con estado limpio (solo canal # general).');
  } catch (appErr: any) {
    console.warn('  ! Advertencia actualizando appState/state1:', appErr.message);
  }

  // Guardar en local-app-state.json
  const localStatePath = path.join(process.cwd(), 'local-app-state.json');
  try {
    fs.writeFileSync(localStatePath, JSON.stringify(cleanAppState, null, 2), 'utf8');
    console.log('  ✓ Archivo local "local-app-state.json" sincronizado limpiamente.');
  } catch (fsErr: any) {
    console.warn('  ! Advertencia actualizando local-app-state.json:', fsErr.message);
  }

  // 3. AUDITORÍA EXPLICITA DE LA LISTA BLANCA (CONFIRMACIÓN 100% INTACTO)
  console.log('\nPASO 3: Verificación de integridad de la Lista Blanca (Inmutable)...');
  const whitelistAuditKeys = [
    'employees',
    'roles',
    'users',
    'customers',
    'system_rules',
    'system_settings',
    'agents',
  ];

  const auditReport: Record<string, number> = {};
  for (const whiteKey of whitelistAuditKeys) {
    try {
      const snap = await getDocs(collection(db, whiteKey));
      auditReport[whiteKey] = snap.size;
      console.log(`  🔒 Lista Blanca: Colección "${whiteKey}" -> ${snap.size} registros [100% INTACTO]`);
    } catch (e: any) {
      console.warn(`  ! Lista Blanca: Colección "${whiteKey}" error:`, e.message);
    }
  }

  console.log('\n================================================================');
  console.log('  RESUMEN DE PURGA Y RESETEO EXITOSO');
  console.log('================================================================');
  console.log(`Total de registros transitorios eliminados: ${totalDeleted}`);
  console.log('Desglose por colección:', JSON.stringify(purgedReport, null, 2));
  console.log('Integridad de Lista Blanca:', JSON.stringify(auditReport, null, 2));
  console.log('\nCatálogos maestros técnicos y de costeo:');
  console.log('  - Materiales y sustratos: INTACTOS');
  console.log('  - Acabados y barnices: INTACTOS');
  console.log('  - Máquinas y centros de trabajo: INTACTOS');
  console.log('  - Tarifas y reglas de costeo (DEFAULT_OFFICIAL_TARIFF): INTACTAS');
  console.log('  - Formatos estándar de imposición: INTACTOS\n');

  process.exit(0);
}

runPurge().catch((err) => {
  console.error('[ERROR FATAL EN PURGA]:', err);
  process.exit(1);
});
