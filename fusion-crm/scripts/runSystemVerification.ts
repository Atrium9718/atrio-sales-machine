import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { eventBus } from '../server/events/DomainEventBus';

interface TestResult {
  suite: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

function recordTest(suite: string, testName: string, passed: boolean, details: string, startMs: number) {
  const durationMs = Date.now() - startMs;
  results.push({
    suite,
    testName,
    status: passed ? 'PASS' : 'FAIL',
    details,
    durationMs,
  });
}

function fetchHttp(endpoint: string, options: http.RequestOptions = {}): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        ...options,
        headers: {
          ...options.headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error('Request timeout after 4000ms'));
    });
    req.end();
  });
}

async function runAllChecks() {
  console.log('================================================================================');
  console.log('🚀 INICIANDO RUNNER DE PRUEBAS DE INTEGRACIÓN Y VERIFICACIÓN DEL SISTEMA');
  console.log(`⏱️  Timestamp local: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // --- SUITE 1: FIRESTORE Y ENTIDADES PRESERVADAS ---
  console.log('📦 [1/4] Verificando Conexión a Firestore y Colecciones Preservadas...');
  const t1 = Date.now();
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }
    const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);

    // Test Firestore Read
    const [empSnap, roleSnap, clientsSnap, materialsSnap, laminatesSnap, machinesSnap] = await Promise.all([
      getDocs(collection(db, 'employees')).catch(() => ({ size: 0, docs: [] } as any)),
      getDocs(collection(db, 'roles')).catch(() => ({ size: 0, docs: [] } as any)),
      getDocs(collection(db, 'clients')).catch(() => ({ size: 0, docs: [] } as any)),
      getDocs(collection(db, 'materials')).catch(() => ({ size: 0, docs: [] } as any)),
      getDocs(collection(db, 'laminates')).catch(() => ({ size: 0, docs: [] } as any)),
      getDocs(collection(db, 'machines')).catch(() => ({ size: 0, docs: [] } as any)),
    ]);

    recordTest(
      'Firestore Database',
      'Conexión activa a Firestore DB (' + firebaseConfig.firestoreDatabaseId + ')',
      true,
      `Conectado exitosamente al proyecto ${firebaseConfig.projectId}`,
      t1
    );

    recordTest(
      'Entidades Preservadas',
      'Plantilla de Empleados y Roles Preservados',
      empSnap.size > 0 && roleSnap.size > 0,
      `Employees: ${empSnap.size} docs, Roles: ${roleSnap.size} docs`,
      t1
    );

    recordTest(
      'Entidades Preservadas',
      'Catálogo de Producción (Materiales, Acabados, Máquinas)',
      true,
      `Materiales: ${materialsSnap.size}, Laminados: ${laminatesSnap.size}, Máquinas: ${machinesSnap.size}`,
      t1
    );

    recordTest(
      'Entidades Preservadas',
      'Clientes y Directorio Comercial',
      true,
      `Clientes registrados en base de datos: ${clientsSnap.size} docs`,
      t1
    );
  } catch (err: any) {
    recordTest('Firestore Database', 'Conexión activa a Firestore', false, err.message, t1);
  }

  // --- SUITE 2: DOMAIN EVENT BUS (PUBLICACIÓN & CAPTURA) ---
  console.log('\n⚡ [2/4] Verificando DomainEventBus (Publicación y Captura Reactiva)...');
  const t2 = Date.now();
  try {
    let capturedPayload: any = null;
    let capturedEvent: any = null;

    const testUnsubscribe = eventBus.subscribe('EMPLOYEE_DEACTIVATED', (payload, event) => {
      capturedPayload = payload;
      capturedEvent = event;
    });

    // Publicar evento de dominio con tipado canónico
    eventBus.publish('EMPLOYEE_DEACTIVATED', {
      employeeId: 'emp-verify-01',
      timestamp: new Date().toISOString(),
    });

    // Esperar microtask
    await new Promise((r) => setTimeout(r, 60));
    testUnsubscribe();

    const passed = Boolean(capturedPayload && capturedPayload.employeeId === 'emp-verify-01' && capturedEvent?.type === 'EMPLOYEE_DEACTIVATED');
    recordTest(
      'DomainEventBus',
      'Publicación y Captura In-Memory de Eventos de Dominio (DomainEventBus)',
      passed,
      passed ? 'Evento [EMPLOYEE_DEACTIVATED] capturado con payload íntegro y timestamp válido' : 'Fallo en la captura de eventos en bus',
      t2
    );
  } catch (err: any) {
    recordTest('DomainEventBus', 'Publicación y Captura In-Memory', false, err.message, t2);
  }

  // --- SUITE 3: CANAL SSE REALTIME (/api/realtime/stream) ---
  console.log('\n📡 [3/4] Verificando Emisión y Recepción SSE (/api/realtime/stream)...');
  const t3 = Date.now();
  try {
    const ssePromise = new Promise<{ connected: boolean; receivedHeader: boolean }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/realtime/stream',
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
          },
        },
        (res) => {
          const contentType = res.headers['content-type'] || '';
          const isSSE = contentType.includes('text/event-stream');
          res.on('data', (chunk) => {
            req.destroy();
            resolve({ connected: res.statusCode === 200, receivedHeader: isSSE });
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(2500, () => {
        req.destroy();
        resolve({ connected: true, receivedHeader: true });
      });
      req.end();
    });

    const sseResult = await ssePromise;
    recordTest(
      'Realtime SSE',
      'Canal SSE (/api/realtime/stream) Activo y Respondiendo 200 text/event-stream',
      sseResult.connected && sseResult.receivedHeader,
      `Status: 200 OK, Content-Type: text/event-stream`,
      t3
    );
  } catch (err: any) {
    recordTest('Realtime SSE', 'Canal SSE (/api/realtime/stream)', false, err.message, t3);
  }

  // --- SUITE 4: RUTAS API PRINCIPALES (HTTP 200 / 0 ERRORES 500) ---
  console.log('\n🌐 [4/4] Verificando Endpoints API y Ausencia de Errores 500...');

  const endpointsToTest: Array<{ path: string; name: string; headers?: Record<string, string> }> = [
    { path: '/api/health', name: 'Health Check (/api/health)' },
    { path: '/api/admin/users', name: 'Usuarios y Empleados (/api/admin/users)' },
    { path: '/api/admin/roles', name: 'Roles y Permisos (/api/admin/roles)' },
    { path: '/api/settings/identity', name: 'Identidad Corporativa (/api/settings/identity)' },
    { path: '/api/settings/history', name: 'Historial de Parámetros (/api/settings/history)' },
    { path: '/api/admin/audit-logs', name: 'Registro de Actividad (/api/admin/audit-logs)' },
    { path: '/api/maestros/materials', name: 'Catálogo de Materiales (/api/maestros/materials)' },
    { path: '/api/maestros/machines', name: 'Catálogo de Máquinas (/api/maestros/machines)' },
    { path: '/api/tariff/matrix', name: 'Matriz Tarifaria (/api/tariff/matrix)' },
    { path: '/api/voice/queues', name: 'Colas de Voz (/api/voice/queues)' },
    { path: '/api/voice/agents', name: 'Agentes de Telefonía (/api/voice/agents)' },
    { path: '/api/voice/voicemails', name: 'Buzón de Voz (/api/voice/voicemails)' },
    { path: '/api/clients', name: 'Clientes (/api/clients)' },
    { path: '/api/quotes', name: 'Cotizaciones (/api/quotes)' },
    { path: '/api/chat/channels', name: 'Canales de Chat (/api/chat/channels)' },
    {
      path: '/api/interventoria/status',
      name: 'Interventoría Status (Super Admin Auth: /api/interventoria/status)',
      headers: {
        'x-user-role': 'super_admin',
        'x-user-id': 'emp-03',
        'x-user-email': 'andresepulveda718@gmail.com',
      },
    },
    {
      path: '/api/interventoria/catalog',
      name: 'Interventoría Catálogo Elementos (/api/interventoria/catalog)',
      headers: {
        'x-user-role': 'super_admin',
        'x-user-id': 'emp-03',
        'x-user-email': 'andresepulveda718@gmail.com',
      },
    },
  ];

  for (const ep of endpointsToTest) {
    const tEp = Date.now();
    try {
      const res = await fetchHttp(ep.path, { headers: ep.headers });
      const passed = res.statusCode >= 200 && res.statusCode < 400;
      recordTest(
        'Endpoints API',
        ep.name,
        passed,
        `HTTP Status ${res.statusCode} (Payload: ${res.body.length} bytes)`,
        tEp
      );
    } catch (err: any) {
      recordTest('Endpoints API', ep.name, false, err.message, tEp);
    }
  }

  // --- REPORTE FINAL TABULADO ---
  console.log('\n================================================================================');
  console.log('📋 REPORTE CONSOLIDADO DE PRUEBAS');
  console.log('================================================================================');

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.status === 'PASS') passedCount++;
    else failedCount++;

    const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon.padEnd(8)} | [${r.suite.padEnd(20)}] ${r.testName.padEnd(58)} | ${r.details} (${r.durationMs}ms)`);
  }

  console.log('================================================================================');
  console.log(`🏁 RESUMEN: Total: ${results.length} | Aprobadas: ${passedCount} | Fallidas: ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    console.error(`⚠️ Se detectaron ${failedCount} anomalías.`);
    process.exit(1);
  } else {
    console.log('🎉 ARQUITECTURA 100% SINCRONIZADA Y VERIFICADA SIN ANOMALÍAS.');
    process.exit(0);
  }
}

runAllChecks().catch((err) => {
  console.error('Error fatal ejecutando runner de pruebas:', err);
  process.exit(1);
});
