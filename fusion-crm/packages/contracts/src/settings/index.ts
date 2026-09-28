import { z } from 'zod';
import { commercialSettings } from './commercial';
import { aiSettings } from './ai';
import { organizationSettings } from './organization';
import { securitySettings } from './security';
import { quotingSettings } from './quoting';
import { productionSettings } from './production';

export const SettingsCatalog = {
  ...commercialSettings,
  ...aiSettings,
  ...organizationSettings,
  ...securitySettings,
  ...quotingSettings,
  ...productionSettings,
} as const;

export type SettingsKey = keyof typeof SettingsCatalog;

export type AppSettings = {
  [K in SettingsKey]: z.infer<typeof SettingsCatalog[K]['schema']>;
};

export * from './types';
