import { Router } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { DEFAULT_OFFICIAL_TARIFF } from '../../packages/core/src/pricing/press/defaultTariff';

export const tariffRouter = Router();

// Retrieve Firebase configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in tariffRouter', e);
}

if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error in tariffRouter', err);
  }
}

function getDb() {
  if (!getApps().length) return null;
  try {
    return getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);
  } catch {
    return null;
  }
}

// In-memory fallback stores
const memoryAssistRuns = new Map<string, any>();
const memoryTemplates: any[] = [
  {
    id: 'tmpl-01',
    organizationId: 'org-01',
    name: 'Volantes media carta 4x4',
    technique: 'LITHO',
    isShared: true,
    usageCount: 14,
    createdAt: '2026-01-15T10:00:00.000Z',
    input: {
      technique: 'LITHO',
      jobName: 'Volantes media carta 4x4',
      artWidthCm: 14,
      artHeightCm: 21,
      applyBleed: true,
      pagesPerUnit: null,
      quantities: [1000, 2500, 5000],
      litho: {
        paperName: 'Propalcote 150g',
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/8',
        plateFormatName: '1/4 (52 x 40 cm)',
        inkSetCode: '4X4',
        plateBacking: false,
        marginPercent: 30,
        wastageSheets: 200,
      },
      commercial: {
        vatLabel: 'IVA 19%',
        otherTaxPercent: 0,
        clientDiscountLabel: 'Ninguno',
        otherDiscountPercent: 0,
        salesCommissionPercent: 0,
      },
    },
  },
  {
    id: 'tmpl-02',
    organizationId: 'org-01',
    name: 'Cuadernos cosidos 1/4',
    technique: 'LITHO',
    isShared: true,
    usageCount: 8,
    createdAt: '2026-01-20T14:30:00.000Z',
    input: {
      technique: 'LITHO',
      jobName: 'Cuadernos cosidos 1/4',
      artWidthCm: 17,
      artHeightCm: 24,
      applyBleed: true,
      pagesPerUnit: 100,
      quantities: [500, 1000, 2000],
      litho: {
        paperName: 'Bond 75g',
        sheetFormat: 'S70X100',
        sheetCutCode: '.1/4',
        plateFormatName: '1/2 (74 x 54 cm)',
        inkSetCode: '1X1',
        plateBacking: true,
        marginPercent: 30,
        wastageSheets: 250,
      },
      commercial: {
        vatLabel: 'IVA 19%',
        otherTaxPercent: 0,
        clientDiscountLabel: 'Ninguno',
        otherDiscountPercent: 0,
        salesCommissionPercent: 0,
      },
    },
  },
  {
    id: 'tmpl-03',
    organizationId: 'org-01',
    name: 'Tarjetas personales digital 4x0',
    technique: 'DIGITAL',
    isShared: true,
    usageCount: 26,
    createdAt: '2026-02-01T09:15:00.000Z',
    input: {
      technique: 'DIGITAL',
      jobName: 'Tarjetas personales 4x0',
      artWidthCm: 9,
      artHeightCm: 5.5,
      applyBleed: true,
      pagesPerUnit: null,
      quantities: [100, 200, 500],
      digital: {
        formatName: 'Tabloide',
        inkMode: 'ONE_SIDE_COLOR',
        onDemand: false,
      },
      commercial: {
        vatLabel: 'IVA 19%',
        otherTaxPercent: 0,
        clientDiscountLabel: 'Ninguno',
        otherDiscountPercent: 0,
        salesCommissionPercent: 0,
      },
    },
  },
];

// GET /api/tariff/snapshot
tariffRouter.get('/snapshot', (req, res) => {
  try {
    res.json({
      success: true,
      version: {
        id: 'tar-2026-01',
        code: 'TAR-2026-01',
        name: 'Tarifario Oficial 2026 (Vigente)',
        validFrom: '2026-01-01T00:00:00.000Z',
        isActive: true,
      },
      snapshot: DEFAULT_OFFICIAL_TARIFF,
    });
  } catch (err: any) {
    console.error('Error serving tariff snapshot:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tariff/assist-run
tariffRouter.post('/assist-run', async (req, res) => {
  try {
    const { input, result, quoteId, technique } = req.body;
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: runId,
      organizationId: 'org-01',
      tariffVersionId: 'tar-2026-01',
      engineVersion: result?.engineVersion || 'press-1.0.0',
      quoteId: quoteId || null,
      technique: technique || input?.technique || 'LITHO',
      input: input || {},
      result: result || {},
      warnings: (result?.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, 'quote_assist_runs', runId), record);
      } catch (e) {
        console.warn('Could not write assist run to Firestore, saving to memory', e);
        memoryAssistRuns.set(runId, record);
      }
    } else {
      memoryAssistRuns.set(runId, record);
    }

    res.json({ success: true, id: runId, record });
  } catch (err: any) {
    console.error('Error saving quote assist run:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tariff/templates
tariffRouter.get('/templates', async (req, res) => {
  try {
    const db = getDb();
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'assist_templates'));
        if (!snap.empty) {
          const dbTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          return res.json({ success: true, templates: dbTemplates });
        }
      } catch (e) {
        console.warn('Error reading assist templates from Firestore, using memory fallback', e);
      }
    }
    res.json({ success: true, templates: memoryTemplates });
  } catch (err: any) {
    console.error('Error reading assist templates:', err);
    res.status(500).json({ success: false, error: err.message, templates: memoryTemplates });
  }
});

// POST /api/tariff/templates
tariffRouter.post('/templates', async (req, res) => {
  try {
    const { name, technique, input, isShared } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre de la plantilla es obligatorio' });
    }

    const templateId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTemplate = {
      id: templateId,
      organizationId: 'org-01',
      name,
      technique: technique || input?.technique || 'LITHO',
      input: input || {},
      usageCount: 1,
      isShared: isShared ?? true,
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, 'assist_templates', templateId), newTemplate);
      } catch (e) {
        console.warn('Could not write template to Firestore, saving to memory', e);
        memoryTemplates.unshift(newTemplate);
      }
    } else {
      memoryTemplates.unshift(newTemplate);
    }

    res.json({ success: true, template: newTemplate });
  } catch (err: any) {
    console.error('Error creating assist template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
