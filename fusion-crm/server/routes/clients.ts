import { Router } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

import { repositories, writeContextFrom } from '../repositories';

export const clientsRouter = Router();

/** Guarda clientes conservando los campos que ya tenían (como el antiguo merge de Firestore). */
async function mergeClients(items: any[], ctx?: ReturnType<typeof writeContextFrom>) {
  const repo = repositories().clients;
  const current = new Map((await repo.list()).map((c) => [c.id, c]));
  const now = new Date().toISOString();
  const docs = items.map((item: any) => {
    const id = item.id || `cli-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return { ...(current.get(id) || {}), ...item, id, updatedAt: now, createdAt: item.createdAt || current.get(id)?.createdAt || now };
  });
  await repo.upsertMany(docs, ctx);
  return docs.length;
}

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in clientsRouter', e);
}

if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error in clientsRouter', err);
  }
}

function getDb() {
  if (!getApps().length) return null;
  return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
}

// GET /api/clients - Obtener todos los clientes de Firestore
clientsRouter.get('/', async (req, res) => {
  try {
    const clients = await repositories().clients.list();
    res.json({ success: true, clients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients/bulk - Guardar múltiples clientes (para importación)
clientsRouter.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, error: 'Items must be an array' });

    await mergeClients(items, writeContextFrom(req));

    res.json({ success: true, count: items.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients/seed - Cargar base de datos inicial con clientes reales de ejemplo
clientsRouter.post('/seed', async (req, res) => {
  try {

    const SEED_CLIENTS = [
      {
        nit: '900.123.456-1',
        name: 'Laboratorios Pintuco S.A.S',
        tradeName: 'Pintuco',
        address: 'Calle 10 # 45-20, Medellín',
        phone1: '6043124567',
        email: 'compras@pintuco.com',
        billingContact: 'Claudia Restrepo',
        billingEmail: 'facturacion@pintuco.com',
        type: 'ACTIVE',
        temp: 'HOT'
      },
      {
        nit: '890.321.654-7',
        name: 'Inversiones Nutresa S.A.',
        tradeName: 'Grupo Nutresa',
        address: 'Carrera 52 # 2-38, Medellín',
        phone1: '6042658900',
        email: 'proveedores@nutresa.com.co',
        billingContact: 'Andrés Felipe Gómez',
        billingEmail: 'pagos@nutresa.com.co',
        type: 'ACTIVE',
        temp: 'WARM'
      },
      {
        nit: '800.555.777-9',
        name: 'Almacenes Éxito S.A.',
        tradeName: 'Grupo Éxito',
        address: 'Sede Envigado, Antioquia',
        phone1: '6043396565',
        email: 'mercancia@grupoexito.com.co',
        billingContact: 'Marta Lucía Henao',
        billingEmail: 'tesoreria@grupoexito.com',
        type: 'ACTIVE',
        temp: 'HOT'
      },
      {
        nit: '901.444.222-3',
        name: 'Compañía de Galletas Noel S.A.S',
        tradeName: 'Noel',
        address: 'Avenida Guayabal, Medellín',
        phone1: '6042851100',
        email: 'empaques@noel.com.co',
        billingContact: 'Rodrigo Estrada',
        type: 'ACTIVE',
        temp: 'HOT'
      },
      {
        nit: '860.000.555-2',
        name: 'Bancolombia S.A.',
        tradeName: 'Bancolombia',
        address: 'Dirección General, Medellín',
        phone1: '6044444141',
        email: 'servicios@bancolombia.com.co',
        billingContact: 'Gestión Administrativa',
        type: 'ACTIVE',
        temp: 'WARM'
      },
      {
        nit: '900.888.999-5',
        name: 'SURA EPS',
        tradeName: 'Seguros Sura',
        address: 'Torre Sura, Medellín',
        phone1: '6044444555',
        email: 'adquisiciones@sura.com.co',
        billingContact: 'Diana Montoya',
        type: 'ACTIVE',
        temp: 'HOT'
      },
      {
        nit: '811.000.123-4',
        name: 'Copidrogas Cooperativa',
        tradeName: 'Copidrogas',
        address: 'Parque Industrial, Sabaneta',
        phone1: '6043725555',
        email: 'compras.medellin@copidrogas.com.co',
        billingContact: 'Gustavo Adolfo Pérez',
        type: 'ACTIVE',
        temp: 'HOT'
      },
      {
        nit: '901.777.888-0',
        name: 'EPM - Empresas Públicas de Medellín',
        tradeName: 'EPM',
        address: 'Edificio Inteligente, Medellín',
        phone1: '6043808080',
        email: 'contratacion@epm.com.co',
        billingContact: 'Departamento de Compras',
        type: 'ACTIVE',
        temp: 'WARM'
      }
    ];

    await mergeClients(SEED_CLIENTS.map((c, i) => ({ ...c, id: `seed-cli-${i + 1}`, code: `CLI-SEED-00${i + 1}` })), writeContextFrom(req));

    res.json({ success: true, message: 'Base de datos de clientes (8 registros reales) cargada exitosamente en la nube.', count: SEED_CLIENTS.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
