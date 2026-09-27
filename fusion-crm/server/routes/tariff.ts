import { Router } from 'express';
import { documentRepository } from '../repositories/documentStore';
import { isAdminRole } from '../auth/session';
import { SEED_ROLE_TARIFF_PERMISSIONS } from '../../packages/core/src/auth/permissions';
import { activateTariffVersion, getActiveTariff, getTariffVersion, listTariffVersions, publishTariffVersion } from '../services/tariffStore';

export const tariffRouter = Router();

/** Corrida del asistente guardada (o en memoria si no se pudo guardar). */
export async function getAssistRun(runId: string): Promise<any | null> {
  if (memoryAssistRuns.has(runId)) return memoryAssistRuns.get(runId);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId)) return null;
  return documentRepository('quote_assist_runs').get(runId);
}

// In-memory fallback stores
export const memoryAssistRuns = new Map<string, any>();
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

// GET /api/tariff/snapshot — versión vigente (o la pedida con ?version=)
tariffRouter.get('/snapshot', (req, res) => {
  try {
    const { snapshot, ...version } = getTariffVersion(typeof req.query.version === 'string' ? req.query.version : null);
    res.json({ success: true, version, snapshot });
  } catch (err: any) {
    console.error('Error serving tariff snapshot:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const canPublishTariff = (req: any) => {
  const role = String(req.headers['x-user-role'] || '');
  return isAdminRole(role) || (SEED_ROLE_TARIFF_PERMISSIONS[role] ?? []).includes('tariff:publish');
};

// GET /api/tariff/versions — historial (sin el detalle)
tariffRouter.get('/versions', (_req, res) => {
  res.json({ success: true, versions: listTariffVersions() });
});

// POST /api/tariff/versions — publica una versión nueva con los cambios
tariffRouter.post('/versions', async (req, res) => {
  if (!canPublishTariff(req)) return res.status(403).json({ success: false, error: 'No tienes permiso para modificar el tarifario' });
  try {
    const version = await publishTariffVersion(req.body?.snapshot, { by: String(req.headers['x-user-name'] || req.headers['x-user-id'] || ''), note: req.body?.note });
    const { snapshot: _s, ...meta } = version;
    res.json({ success: true, version: meta });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// POST /api/tariff/versions/:id/activate — volver a una versión anterior
tariffRouter.post('/versions/:id/activate', async (req, res) => {
  if (!canPublishTariff(req)) return res.status(403).json({ success: false, error: 'No tienes permiso para modificar el tarifario' });
  try {
    const { snapshot: _s, ...meta } = await activateTariffVersion(req.params.id);
    res.json({ success: true, version: meta });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
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
      tariffVersionId: getActiveTariff().id,
      engineVersion: result?.engineVersion || 'press-1.0.0',
      quoteId: quoteId || null,
      technique: technique || input?.technique || 'LITHO',
      input: input || {},
      result: result || {},
      warnings: (result?.warnings || []).map((w: any) => typeof w === 'string' ? w : w.message),
      createdAt: new Date().toISOString(),
    };

    try {
      await documentRepository('quote_assist_runs').upsert(record);
    } catch (e) {
      console.warn('[tarifario] No se pudo guardar la corrida; queda en memoria', e);
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
    try {
      const stored = await documentRepository('assist_templates').list();
      if (stored.length) {
        stored.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return res.json({ success: true, templates: stored });
      }
    } catch (e) {
      console.warn('[tarifario] No se pudieron leer las plantillas; se usan las de ejemplo', e);
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

    try {
      await documentRepository('assist_templates').upsert(newTemplate);
    } catch (e) {
      console.warn('[tarifario] No se pudo guardar la plantilla; queda en memoria', e);
      memoryTemplates.unshift(newTemplate);
    }

    res.json({ success: true, template: newTemplate });
  } catch (err: any) {
    console.error('Error creating assist template:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
