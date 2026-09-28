import { Router } from 'express';
import { SettingsCatalog } from '../../packages/contracts/src/settings';
import { documentRepository } from '../repositories/documentStore';
import { getSettings, updateSettings } from '../services/settingsStore';

export const settingsRouter = Router();

const HISTORY = 'settings_history';
const FLAGS_PREFIX = 'flags.';

// Fast endpoint to get corporate identity (Logo & Name)
settingsRouter.get('/identity', (req, res) => {
  try {
    const defaults = Object.fromEntries(Object.values(SettingsCatalog).map((def: any) => [def.key, def.defaultValue]));
    const values: Record<string, any> = { ...defaults, ...getSettings() };
    const name = values['organization.business.name'] || 'Fusión Comunicación Gráfica';
    const logoUrl = values['organization.branding.logoUrl'] || '';
    const logoSecondaryUrl = values['organization.branding.logoSecondaryUrl'] || '';
    const primaryColor = values['organization.branding.primaryColor'] || '#000000';
    const nit = values['organization.business.nit'] || '';
    const address = values['organization.business.address'] || '';
    const phone = values['organization.business.phone'] || '';
    const email = values['organization.business.email'] || '';

    res.json({
      name,
      logoUrl,
      logoSecondaryUrl,
      primaryColor,
      nit,
      address,
      phone,
      email
    });
  } catch (error) {
    console.error('Error fetching identity:', error);
    res.status(500).json({ error: 'Failed to fetch identity' });
  }
});

// GET ALL CATALOG WITH STORED VALUES
settingsRouter.get('/', async (req, res) => {
  try {
    const definitions = Object.values(SettingsCatalog).map((def: any) => {
      const storedVal = getSettings()[def.key];
      const hasStored = storedVal !== undefined && storedVal !== null;
      return {
        ...def,
        value: def.isSensitive ? '********' : (hasStored ? storedVal : def.defaultValue),
        isOverridden: hasStored
      };
    });
    res.json(definitions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// BULK UPDATE SETTINGS
settingsRouter.post('/', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Invalid payload' });

    const before = getSettings();
    const changes: Record<string, any> = {};
    for (const update of updates) {
      if (typeof update?.key === 'string' && update.key) changes[update.key] = update.value;
    }
    await updateSettings(changes);

    // Historial real de cambios (quién, cuándo, antes y después)
    const now = new Date().toISOString();
    const history = documentRepository(HISTORY);
    await history.upsertMany(
      Object.entries(changes)
        .filter(([key, value]) => JSON.stringify(before[key]) !== JSON.stringify(value))
        .map(([key, value], i) => ({
          id: `${now}-${i}-${key}`,
          key,
          oldValue: before[key] ?? null,
          newValue: value,
          changedBy: String(req.headers['x-user-name'] || req.headers['x-user-id'] || 'sistema'),
          changedAt: now,
          reason: typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 300) : null,
        }))
    );

    res.json({ success: true, changes: updates.length });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Validation failed' });
  }
});

// HISTORIAL DE CAMBIOS
settingsRouter.get('/history', async (_req, res) => {
  try {
    const items = await documentRepository(HISTORY).list();
    items.sort((a: any, b: any) => String(b.changedAt).localeCompare(String(a.changedAt)));
    res.json(items.slice(0, 200));
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// INTERRUPTORES (feature flags): se guardan como claves flags.<nombre> de la configuración
settingsRouter.get('/flags', async (_req, res) => {
  try {
    const values = getSettings();
    res.json(
      Object.entries(values)
        .filter(([k]) => k.startsWith(FLAGS_PREFIX))
        .map(([k, v]) => ({ id: k.slice(FLAGS_PREFIX.length), key: k.slice(FLAGS_PREFIX.length), enabled: v === true }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

settingsRouter.post('/flags', async (req, res) => {
  try {
    const key = String(req.body?.key || '').trim();
    if (!/^[a-z0-9_.-]{1,80}$/i.test(key)) return res.status(400).json({ error: 'Nombre de interruptor inválido' });
    await updateSettings({ [FLAGS_PREFIX + key]: req.body?.enabled === true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});
