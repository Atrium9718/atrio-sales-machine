import { Injectable, OnModuleInit } from '@nestjs/common';
import { db, initDbTables } from '../../db';
import { siteSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CmsGlobalConfig, DEFAULT_CMS_GLOBAL_CONFIG } from '../../types/cms';

@Injectable()
export class CmsSettingsService implements OnModuleInit {
  private inMemoryConfig: CmsGlobalConfig = JSON.parse(JSON.stringify(DEFAULT_CMS_GLOBAL_CONFIG));
  private tableReady = false;

  async onModuleInit() {
    await this.ensureTableReady();
  }

  private async ensureTableReady() {
    if (this.tableReady) return;
    try {
      await initDbTables();
      this.tableReady = true;
    } catch {
      // Table initialization failsafe
    }
  }

  async getGlobalConfig(): Promise<CmsGlobalConfig> {
    await this.ensureTableReady();
    try {
      const records = await db.select().from(siteSettings).where(eq(siteSettings.key, 'cms_global_config'));
      if (records.length > 0 && records[0].value) {
        const saved = records[0].value as unknown as Partial<CmsGlobalConfig>;
        return {
          ...DEFAULT_CMS_GLOBAL_CONFIG,
          ...saved,
          branding: { ...DEFAULT_CMS_GLOBAL_CONFIG.branding, ...(saved.branding || {}) },
          topBar: { ...DEFAULT_CMS_GLOBAL_CONFIG.topBar, ...(saved.topBar || {}) },
          headerNav: saved.headerNav && saved.headerNav.length > 0 ? saved.headerNav : DEFAULT_CMS_GLOBAL_CONFIG.headerNav,
          footerColumns: saved.footerColumns && saved.footerColumns.length > 0 ? saved.footerColumns : DEFAULT_CMS_GLOBAL_CONFIG.footerColumns,
        };
      }
    } catch (err) {
      // Graceful fallback to memory state
    }
    return this.inMemoryConfig;
  }

  async updateGlobalConfig(config: Partial<CmsGlobalConfig>): Promise<CmsGlobalConfig> {
    await this.ensureTableReady();
    const current = await this.getGlobalConfig();
    const merged: CmsGlobalConfig = {
      ...current,
      ...config,
      branding: { ...current.branding, ...(config.branding || {}) },
      topBar: { ...current.topBar, ...(config.topBar || {}) },
      headerNav: config.headerNav || current.headerNav,
      footerColumns: config.footerColumns || current.footerColumns,
    };

    this.inMemoryConfig = merged;

    try {
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'cms_global_config'));
      if (existing.length > 0) {
        await db.update(siteSettings)
          .set({ value: merged as any, updatedAt: new Date() })
          .where(eq(siteSettings.key, 'cms_global_config'));
      } else {
        await db.insert(siteSettings).values({
          key: 'cms_global_config',
          value: merged as any,
        });
      }
    } catch (err) {
      // Graceful fallback
    }

    return merged;
  }
}

