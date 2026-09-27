import { Router } from 'express';
import { z } from 'zod';
import { documentRepository } from '../repositories/documentStore';

/**
 * Maestros y catálogos de apoyo (sectores, tipos de cliente, orígenes, etapas del pipeline).
 * Se guardan en la base configurada (colección `master_catalogs`); la primera vez se crean los valores base.
 * Las escrituras solo las pueden hacer administradores (server/auth/session.ts).
 */
export const maestrosRouter = Router();

const COLLECTION = 'master_catalogs';

export const DEFAULT_CATALOGS: Record<string, { code: string; name: string }[]> = {
  Sector: [
    { code: 'TECH', name: 'Tecnología' },
    { code: 'RETAIL', name: 'Retail' },
    { code: 'HEALTH', name: 'Salud' },
  ],
  ClientType: [
    { code: 'B2B', name: 'Corporativo (B2B)' },
    { code: 'B2C', name: 'Consumidor (B2C)' },
  ],
  Origin: [
    { code: 'ORG', name: 'Orgánico' },
    { code: 'ADS', name: 'Publicidad Pagada' },
  ],
  PipelineStage: [
    { code: 'LEAD', name: 'Nuevo Prospecto' },
    { code: 'CONTACT', name: 'Contactado' },
    { code: 'QUOTE', name: 'Cotizando' },
    { code: 'WON', name: 'Cerrado Ganado' },
  ],
};

export const docIdFor = (catalog: string, code: string) => `${catalog}__${code}`;

const repo = () => documentRepository(COLLECTION);

function resolveCatalog(catalog: string): string | null {
  return Object.prototype.hasOwnProperty.call(DEFAULT_CATALOGS, catalog) ? catalog : null;
}

maestrosRouter.get('/:catalogId', async (req, res) => {
  const catalog = resolveCatalog(req.params.catalogId);
  if (!catalog) return res.status(404).json({ error: 'Catálogo desconocido' });
  try {
    let records: any[] = (await repo().list()).filter((r: any) => r.catalog === catalog);
    if (!records.length) {
      const now = new Date().toISOString();
      records = DEFAULT_CATALOGS[catalog].map((item) => ({
        id: docIdFor(catalog, item.code),
        catalog,
        ...item,
        description: '',
        isActive: true,
        usageCount: 0,
        createdAt: now,
      }));
      await repo().upsertMany(records);
    }
    records.sort((a: any, b: any) => a.name.localeCompare(b.name));
    res.json(records);
  } catch (err: any) {
    console.error('[maestros] Error listando catálogo:', err);
    res.status(500).json({ error: err.message });
  }
});

export const NewMasterRecordSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{1,30}$/, 'Código: letras, números o _ (máx. 30)'),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().default(''),
});

maestrosRouter.post('/:catalogId', async (req, res) => {
  const catalog = resolveCatalog(req.params.catalogId);
  if (!catalog) return res.status(404).json({ error: 'Catálogo desconocido' });
  const parsed = NewMasterRecordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  try {
    const id = docIdFor(catalog, parsed.data.code);
    if (await repo().get(id)) {
      return res.status(409).json({ error: `Ya existe el código ${parsed.data.code}` });
    }
    const record = { id, catalog, ...parsed.data, isActive: true, usageCount: 0, createdAt: new Date().toISOString() };
    await repo().upsert(record);
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const UpdateMasterRecordSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
});

maestrosRouter.put('/:catalogId/:id', async (req, res) => {
  const catalog = resolveCatalog(req.params.catalogId);
  if (!catalog || !req.params.id.startsWith(`${catalog}__`)) return res.status(404).json({ error: 'Registro no encontrado' });
  const parsed = UpdateMasterRecordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    const updated = await repo().patch(req.params.id, { ...parsed.data, updatedAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: 'Registro no encontrado' });
  }
});
