import { Router, type Response } from 'express';
import { inventoryService } from '../services/inventoryService';
import { getActiveTariff, getTariffVersion } from '../services/tariffStore';
import { repositories } from '../repositories';
import { paperPlanFromItems } from '../../packages/core/src/inventory/paperPlan';

/** Inventario: existencias, kárdex, compras, consumos, mermas, cortes de pliego y conteos. */
export const inventoryRouter = Router();

const by = (req: any) => String(req.headers['x-user-name'] || 'Usuario');
const fail = (res: Response, err: any) => res.status(err?.status || 500).json({ success: false, error: err?.message || String(err) });

inventoryRouter.get('/', async (_req, res) => {
  try {
    const service = inventoryService();
    const tariff = getActiveTariff().snapshot;
    res.json({
      success: true,
      items: await service.list(),
      summary: await service.summary(),
      // Papeles y cortes del tarifario, para crear materiales y transformar pliegos
      catalog: {
        papers: [...new Set(tariff.papers.map((p) => p.name))].map((name) => ({ name, sheetFormats: tariff.papers.filter((p) => p.name === name).map((p) => p.sheetFormat), prices: Object.fromEntries(tariff.papers.filter((p) => p.name === name).map((p) => [p.sheetFormat, Number(p.pricePerSheet)])) })),
        cuts: tariff.sheetCuts.map((c) => ({ code: c.code, divisor: c.divisor, sizes: c.sizes.map((s) => ({ sheetFormat: s.sheetFormat, widthCm: Number(s.widthCm), heightCm: Number(s.heightCm) })) })),
      },
    });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.get('/movements', async (req, res) => {
  try {
    const movements = await inventoryService().movements({
      itemId: typeof req.query.itemId === 'string' ? req.query.itemId : undefined,
      projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
      limit: Number(req.query.limit) || undefined,
    });
    res.json({ success: true, movements });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/items', async (req, res) => {
  try {
    res.status(201).json({ success: true, item: await inventoryService().saveItem(req.body ?? {}, by(req)) });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/receive', async (req, res) => {
  try {
    const r = await inventoryService().receive(req.body ?? {}, by(req));
    res.json({ success: true, item: r.item, movement: r.movement });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/issue', async (req, res) => {
  try {
    const r = await inventoryService().issue(req.body ?? {}, by(req));
    res.json({ success: true, item: r.item, movement: r.movement });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/transform', async (req, res) => {
  try {
    const r = await inventoryService().transform(req.body ?? {}, by(req));
    res.json({ success: true, source: r.source, target: r.target, produced: r.produced, waste: r.waste, pieceCost: r.pieceCost, movements: r.movements });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/count', async (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!entries.length) return res.status(400).json({ success: false, error: 'No hay conteos' });
    res.json({ success: true, ...(await inventoryService().count(entries, by(req), req.body?.note)) });
  } catch (err) {
    fail(res, err);
  }
});

// ── Papel de cada OT ─────────────────────────────────────────────────────
const projectsRepo = () => repositories().projects;

/** Papel de la OT calculado de su cotización (con el tarifario con que se cotizó). */
export async function computeProjectPaperPlan(project: any) {
  const quote: any = project.quoteId ? await repositories().quotes.get(project.quoteId) : null;
  const items = quote?.items ?? project.itemsDetail ?? [];
  const cuts = getTariffVersion(quote?.tariffVersionId).snapshot.sheetCuts;
  return paperPlanFromItems(items, cuts);
}

const loadProject = async (id: string) => {
  const project: any = await projectsRepo().get(id);
  if (!project) throw Object.assign(new Error('OT no encontrada'), { status: 404 });
  return project;
};

/** Recalcula y vuelve a reservar el papel (para OT creadas antes o si cambió la cotización). */
inventoryRouter.post('/projects/:id/plan', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    const plan = await inventoryService().reservePlan(project, await computeProjectPaperPlan(project), by(req));
    res.json({ success: true, project: await projectsRepo().patch(project.id, { paperPlan: plan }) });
  } catch (err) {
    fail(res, err);
  }
});

/** Descarga el papel de la OT del inventario y lo suma a su costo de materiales. */
inventoryRouter.post('/projects/:id/discharge', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    const r = await inventoryService().dischargePlan(project, by(req));
    const patched = await projectsRepo().patch(project.id, {
      paperPlan: r.plan,
      consumedMaterials: [...(project.consumedMaterials || []), ...r.consumed],
      materialCost: Math.round(((Number(project.materialCost) || 0) + r.total) * 100) / 100,
    });
    res.json({ success: true, project: patched, total: r.total });
  } catch (err) {
    fail(res, err);
  }
});

inventoryRouter.post('/projects/:id/release', async (req, res) => {
  try {
    const project = await loadProject(req.params.id);
    const plan = await inventoryService().releasePlan(project, by(req));
    res.json({ success: true, project: plan ? await projectsRepo().patch(project.id, { paperPlan: plan }) : project });
  } catch (err) {
    fail(res, err);
  }
});
