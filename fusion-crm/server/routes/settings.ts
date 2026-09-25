import { Router } from 'express';
import { SettingsCatalog } from '../../packages/contracts/src/settings';
import fs from 'fs';
import path from 'path';

export const settingsRouter = Router();

const SETTINGS_STORE_PATH = path.join(process.cwd(), 'settings.store.json');

function loadStoredValues(): Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_STORE_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read settings.store.json:', e);
  }
  return {};
}

function saveStoredValues(values: Record<string, any>) {
  try {
    fs.writeFileSync(SETTINGS_STORE_PATH, JSON.stringify(values, null, 2), 'utf8');
  } catch (e) {
    console.error('Could not write settings.store.json:', e);
  }
}

// In-memory cache
let storedSettingsCache = loadStoredValues();

// Fast endpoint to get corporate identity (Logo & Name)
settingsRouter.get('/identity', (req, res) => {
  try {
    const values = storedSettingsCache;
    const name = values['organization.business.name'] || 'Fusión Comunicación Gráfica';
    const logoUrl = values['organization.branding.logoUrl'] || '';
    const logoSecondaryUrl = values['organization.branding.logoSecondaryUrl'] || '';
    const primaryColor = values['organization.branding.primaryColor'] || '#000000';
    const nit = values['organization.business.nit'] || '900.284.195-1';
    const address = values['organization.business.address'] || 'Medellín, Colombia';
    const phone = values['organization.business.phone'] || '+57 (4) 444-0000';
    const email = values['organization.business.email'] || 'contacto@fusion.com.co';

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
      const storedVal = storedSettingsCache[def.key];
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

    for (const update of updates) {
      if (update.key) {
        storedSettingsCache[update.key] = update.value;
      }
    }
    saveStoredValues(storedSettingsCache);

    res.json({ success: true, changes: updates.length });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Validation failed' });
  }
});

// GET AUDIT HISTORY
settingsRouter.get('/history', async (req, res) => {
  try {
    res.json([
      { id: '1', key: 'ai.temperature', oldValue: 0.7, newValue: 0.8, changedBy: 'admin', changedAt: new Date().toISOString(), reason: 'Tuning model' }
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// FEATURE FLAGS
settingsRouter.get('/flags', async (req, res) => {
  try {
    res.json([
      { id: '1', key: 'enable_new_dashboard', enabled: true },
      { id: '2', key: 'beta_features', enabled: false }
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

settingsRouter.post('/flags', async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

