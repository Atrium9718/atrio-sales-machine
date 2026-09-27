import { Router, type Response } from 'express';
import { inventoryService } from '../services/inventoryService';
import { getActiveTariff } from '../services/tariffStore';

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
