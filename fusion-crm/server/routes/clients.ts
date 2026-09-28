import { Router } from 'express';
import { repositories, writeContextFrom } from '../repositories';
import { clientProfile } from '../../packages/core/src/crm/clientProfile';

export const clientsRouter = Router();

const nitKey = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(0, 9);

/**
 * Guarda clientes conservando los campos que ya tenían. Un cliente sin id que trae un NIT ya
 * registrado actualiza al existente (así importar el mismo Excel dos veces no duplica).
 */
export async function mergeClients(items: any[], ctx?: ReturnType<typeof writeContextFrom>) {
  const repo = repositories().clients;
  const all = await repo.list();
  const byId = new Map(all.map((c: any) => [String(c.id), c]));
  const byNit = new Map(all.filter((c: any) => nitKey(c.nit)).map((c: any) => [nitKey(c.nit), c]));
  const now = new Date().toISOString();
  const docs = items.map((item: any, i: number) => {
    const existing = (item.id && byId.get(String(item.id))) || (nitKey(item.nit) && byNit.get(nitKey(item.nit))) || null;
    const id = existing?.id || item.id || `cli-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    const { syncedToCloud: _s, ...clean } = item;
    const doc = { ...(existing || {}), ...clean, id, updatedAt: now, createdAt: existing?.createdAt || item.createdAt || now };
    byId.set(String(id), doc);
    if (nitKey(doc.nit)) byNit.set(nitKey(doc.nit), doc);
    return doc;
  });
  // El mismo cliente dos veces en la misma carga: queda la última versión
  const unique = [...new Map(docs.map((d) => [String(d.id), d])).values()];
  if (unique.length) await repo.upsertMany(unique, ctx);
  return unique;
}

// GET /api/clients — todos los clientes (la base es la misma para todo el equipo)
clientsRouter.get('/', async (_req, res) => {
  try {
    const clients = await repositories().clients.list();
    res.json({ success: true, clients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients — crear o actualizar un cliente
clientsRouter.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'El cliente necesita un nombre.' });
    const [client] = await mergeClients([{ ...req.body, name }], writeContextFrom(req));
    res.json({ success: true, client });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clients/bulk — importación desde Excel (hasta 5.000 por envío)
clientsRouter.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ success: false, error: 'Items must be an array' });
    if (items.length > 5000) return res.status(413).json({ success: false, error: 'Envía máximo 5.000 clientes por vez.' });
    const saved = await mergeClients(items.filter((i: any) => String(i?.name || '').trim()), writeContextFrom(req));
    res.json({ success: true, count: saved.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clients/:id — ficha del cliente con sus cotizaciones, OT e indicadores
clientsRouter.get('/:id', async (req, res) => {
  try {
    const repo = repositories();
    const clients = await repo.clients.list();
    const client: any = clients.find((c: any) => String(c.id) === req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    const [quotes, projects] = await Promise.all([repo.quotes.list(), repo.projects.list()]);
    res.json({ success: true, client, ...clientProfile(client, quotes, projects) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
