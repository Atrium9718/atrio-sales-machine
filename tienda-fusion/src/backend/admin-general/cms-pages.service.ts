import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { db } from '../../db';
import { siteSettings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CmsPage, CmsBlock, CmsPageVersionSnapshot } from '../../types/cms';
import { INITIAL_CMS_PAGES } from '../../types/cms-default-pages';

@Injectable()
export class CmsPagesService {
  private readonly logger = new Logger(CmsPagesService.name);
  private inMemoryPages: CmsPage[] = JSON.parse(JSON.stringify(INITIAL_CMS_PAGES));
  private inMemoryVersions: Record<string, CmsPageVersionSnapshot[]> = {};

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Seed initial default version snapshots for pages
    this.inMemoryPages.forEach((p, idx) => {
      if (!p.publishedBlocks) {
        p.publishedBlocks = JSON.parse(JSON.stringify(p.blocks));
      }
      p.status = 'PUBLISHED';
      p.currentVersion = 1;
      p.versionsCount = 1;
      p.hasUnpublishedChanges = false;
      p.lastPublishedAt = p.updatedAt || new Date().toISOString();
      p.lastPublishedBy = {
        name: 'Andrés Sepúlveda (Super Admin)',
        email: 'andresepulveda718@gmail.com',
      };

      if (!this.inMemoryVersions[p.id]) {
        this.inMemoryVersions[p.id] = [
          {
            id: `snap-init-${p.id}`,
            pageId: p.id,
            versionNumber: 1,
            versionTag: 'v1.0 - Versión Base Producción',
            changeNote: 'Lanzamiento y configuración inicial de plantilla litográfica W2P',
            authorEmail: 'andresepulveda718@gmail.com',
            authorName: 'Andrés Sepúlveda (Super Admin)',
            createdAt: p.createdAt || new Date().toISOString(),
            status: 'PUBLISHED',
            blocksCount: p.blocks.length,
            blocks: JSON.parse(JSON.stringify(p.blocks)),
            metaTitle: p.metaTitle,
            metaDescription: p.metaDescription,
            ogImage: p.ogImage,
          },
        ];
      }
    });
  }

  async getAllPages(): Promise<CmsPage[]> {
    try {
      const row = await db.select().from(siteSettings).where(eq(siteSettings.key, 'cms_pages')).limit(1);
      if (row && row.length > 0 && row[0].value) {
        const pages = row[0].value as unknown as CmsPage[];
        // Sanitize and ensure draft/published structure
        this.inMemoryPages = pages.map(p => ({
          ...p,
          publishedBlocks: p.publishedBlocks || p.blocks,
          status: p.status || (p.isPublished ? 'PUBLISHED' : 'DRAFT'),
          hasUnpublishedChanges: p.hasUnpublishedChanges ?? (
            JSON.stringify(p.blocks) !== JSON.stringify(p.publishedBlocks || p.blocks)
          ),
          currentVersion: p.currentVersion || 1,
          versionsCount: p.versionsCount || 1,
        }));
        return this.inMemoryPages;
      }
      // Seed default if doesn't exist
      await this.persistPages(this.inMemoryPages);
      return this.inMemoryPages;
    } catch (err) {
      this.logger.warn('Could not read cms_pages from DB, using in-memory state:', err);
      return this.inMemoryPages;
    }
  }

  async getPageBySlug(slug: string, previewMode: boolean = false): Promise<CmsPage | null> {
    const pages = await this.getAllPages();
    const cleanSlug = slug.replace(/^\//, '').toLowerCase();
    
    // Check exact or normalized slug
    let found = pages.find(p => p.slug.toLowerCase() === cleanSlug);
    if (!found && (cleanSlug === '' || cleanSlug === 'index')) {
      found = pages.find(p => p.slug === 'home') || null;
    }

    if (!found) return null;

    // For public visitors (previewMode = false), return only published blocks
    if (!previewMode) {
      if (!found.isPublished) {
        return null; // Page is in draft and unpublished to public
      }
      return {
        ...found,
        blocks: found.publishedBlocks && found.publishedBlocks.length > 0 ? found.publishedBlocks : found.blocks,
      };
    }

    // In preview mode (previewMode = true), return working draft blocks
    return found;
  }

  async getPageById(id: string): Promise<CmsPage | null> {
    const pages = await this.getAllPages();
    return pages.find(p => p.id === id) || null;
  }

  async savePage(pageData: Partial<CmsPage>, user?: { name: string; email: string }): Promise<CmsPage> {
    const pages = await this.getAllPages();
    const now = new Date().toISOString();
    const actorName = user?.name || 'Administrador';
    const actorEmail = user?.email || 'admin@fusiongrafica.com.co';

    let savedPage: CmsPage;

    if (pageData.id) {
      const idx = pages.findIndex(p => p.id === pageData.id);
      if (idx !== -1) {
        const existing = pages[idx];
        const newBlocks = pageData.blocks !== undefined ? pageData.blocks : existing.blocks;
        const pubBlocks = existing.publishedBlocks || existing.blocks;
        const hasChanges = JSON.stringify(newBlocks) !== JSON.stringify(pubBlocks);

        savedPage = {
          ...existing,
          ...pageData,
          blocks: newBlocks,
          publishedBlocks: pubBlocks,
          hasUnpublishedChanges: hasChanges,
          status: hasChanges ? 'CHANGES_IN_DRAFT' : (existing.isPublished ? 'PUBLISHED' : 'DRAFT'),
          lastDraftSavedAt: now,
          lastDraftSavedBy: { name: actorName, email: actorEmail },
          updatedAt: now,
        } as CmsPage;
        pages[idx] = savedPage;
      } else {
        const id = pageData.id;
        const initialBlocks = pageData.blocks || [];
        savedPage = {
          id,
          slug: pageData.slug || `pagina-${Date.now()}`,
          title: pageData.title || 'Nueva Página',
          description: pageData.description || '',
          isSystemPage: false,
          isPublished: pageData.isPublished !== undefined ? pageData.isPublished : false,
          status: 'DRAFT',
          metaTitle: pageData.metaTitle || pageData.title || '',
          metaDescription: pageData.metaDescription || '',
          metaKeywords: pageData.metaKeywords || [],
          ogImage: pageData.ogImage || '',
          blocks: initialBlocks,
          publishedBlocks: pageData.isPublished ? initialBlocks : [],
          currentVersion: 1,
          versionsCount: 1,
          hasUnpublishedChanges: true,
          lastDraftSavedAt: now,
          lastDraftSavedBy: { name: actorName, email: actorEmail },
          createdAt: now,
          updatedAt: now,
        };
        pages.push(savedPage);
        await this.createSnapshotInternal(savedPage, 'v1.0 - Creación Borrador Inicial', 'Creación de nueva página en modo borrador', actorEmail, actorName, 'DRAFT_ARCHIVED');
      }
    } else {
      const id = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const initialBlocks = pageData.blocks || [];
      savedPage = {
        id,
        slug: pageData.slug || `pagina-${Date.now()}`,
        title: pageData.title || 'Nueva Página',
        description: pageData.description || '',
        isSystemPage: false,
        isPublished: pageData.isPublished !== undefined ? pageData.isPublished : false,
        status: 'DRAFT',
        metaTitle: pageData.metaTitle || pageData.title || '',
        metaDescription: pageData.metaDescription || '',
        metaKeywords: pageData.metaKeywords || [],
        ogImage: pageData.ogImage || '',
        blocks: initialBlocks,
        publishedBlocks: pageData.isPublished ? initialBlocks : [],
        currentVersion: 1,
        versionsCount: 1,
        hasUnpublishedChanges: true,
        lastDraftSavedAt: now,
        lastDraftSavedBy: { name: actorName, email: actorEmail },
        createdAt: now,
        updatedAt: now,
      };
      pages.push(savedPage);
      await this.createSnapshotInternal(savedPage, 'v1.0 - Creación Borrador Inicial', 'Creación de nueva página en modo borrador', actorEmail, actorName, 'DRAFT_ARCHIVED');
    }

    this.inMemoryPages = pages;
    await this.persistPages(pages);
    return savedPage;
  }

  async updatePageBlocks(id: string, blocks: CmsBlock[], user?: { name: string; email: string }): Promise<CmsPage> {
    const pages = await this.getAllPages();
    const idx = pages.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    const now = new Date().toISOString();
    const existing = pages[idx];
    const pubBlocks = existing.publishedBlocks || [];
    const hasChanges = JSON.stringify(blocks) !== JSON.stringify(pubBlocks);

    const updated: CmsPage = {
      ...existing,
      blocks,
      hasUnpublishedChanges: hasChanges,
      status: hasChanges ? 'CHANGES_IN_DRAFT' : (existing.isPublished ? 'PUBLISHED' : 'DRAFT'),
      lastDraftSavedAt: now,
      lastDraftSavedBy: {
        name: user?.name || 'Diseñador de Contenido',
        email: user?.email || 'diseno@fusiongrafica.com.co',
      },
      updatedAt: now,
    };

    pages[idx] = updated;
    this.inMemoryPages = pages;
    await this.persistPages(pages);
    return updated;
  }

  async publishPage(
    id: string,
    user: { name: string; email: string },
    changeNote?: string,
    versionTag?: string
  ): Promise<CmsPage> {
    const pages = await this.getAllPages();
    const idx = pages.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    const page = pages[idx];
    const now = new Date().toISOString();
    const newVersion = (page.currentVersion || 1) + 1;
    const defaultTag = versionTag || `v${newVersion}.0 - Publicación en Vivo`;
    const defaultNote = changeNote || `Publicación a producción con ${page.blocks.length} bloques por ${user.name}`;

    // Deploy draft blocks to published blocks
    const updatedPage: CmsPage = {
      ...page,
      publishedBlocks: JSON.parse(JSON.stringify(page.blocks)),
      isPublished: true,
      status: 'PUBLISHED',
      hasUnpublishedChanges: false,
      currentVersion: newVersion,
      versionsCount: (page.versionsCount || 1) + 1,
      lastPublishedAt: now,
      lastPublishedBy: {
        name: user.name,
        email: user.email,
      },
      updatedAt: now,
    };

    pages[idx] = updatedPage;
    this.inMemoryPages = pages;
    await this.persistPages(pages);

    // Create automatic snapshot
    await this.createSnapshotInternal(
      updatedPage,
      defaultTag,
      defaultNote,
      user.email,
      user.name,
      'PUBLISHED'
    );

    this.logger.log(`Página '${page.title}' (${page.slug}) publicada exitosamente a versión ${newVersion} por ${user.email}`);
    return updatedPage;
  }

  async discardDraft(id: string, user?: { name: string; email: string }): Promise<CmsPage> {
    const pages = await this.getAllPages();
    const idx = pages.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    const page = pages[idx];
    if (!page.publishedBlocks || page.publishedBlocks.length === 0) {
      throw new BadRequestException('No hay versión publicada previa para restablecer.');
    }

    const now = new Date().toISOString();
    const restoredPage: CmsPage = {
      ...page,
      blocks: JSON.parse(JSON.stringify(page.publishedBlocks)),
      hasUnpublishedChanges: false,
      status: 'PUBLISHED',
      updatedAt: now,
    };

    pages[idx] = restoredPage;
    this.inMemoryPages = pages;
    await this.persistPages(pages);
    return restoredPage;
  }

  async getPageVersions(pageId: string): Promise<CmsPageVersionSnapshot[]> {
    try {
      const row = await db.select().from(siteSettings).where(eq(siteSettings.key, `cms_versions_${pageId}`)).limit(1);
      if (row && row.length > 0 && row[0].value) {
        const list = row[0].value as unknown as CmsPageVersionSnapshot[];
        this.inMemoryVersions[pageId] = list;
        return list;
      }
    } catch (e) {
      this.logger.warn(`Could not read versions from DB for ${pageId}, using in-memory:`, e);
    }

    return this.inMemoryVersions[pageId] || [];
  }

  async createManualSnapshot(
    pageId: string,
    versionTag: string,
    changeNote: string,
    user: { name: string; email: string }
  ): Promise<CmsPageVersionSnapshot> {
    const page = await this.getPageById(pageId);
    if (!page) {
      throw new NotFoundException(`Página con ID ${pageId} no encontrada`);
    }

    return this.createSnapshotInternal(
      page,
      versionTag || `Snapshot manual - ${new Date().toLocaleDateString()}`,
      changeNote || 'Punto de restauración creado manualmente por el usuario',
      user.email,
      user.name,
      'MANUAL_SNAPSHOT'
    );
  }

  async restoreVersion(
    pageId: string,
    versionId: string,
    user: { name: string; email: string },
    autoPublish: boolean = false
  ): Promise<{ page: CmsPage; restoredSnapshot: CmsPageVersionSnapshot }> {
    const page = await this.getPageById(pageId);
    if (!page) {
      throw new NotFoundException(`Página con ID ${pageId} no encontrada`);
    }

    const versions = await this.getPageVersions(pageId);
    const targetSnapshot = versions.find(v => v.id === versionId);
    if (!targetSnapshot) {
      throw new NotFoundException(`Snapshot de versión ${versionId} no encontrado`);
    }

    const now = new Date().toISOString();

    // Create a safety backup snapshot of current state before rollback
    await this.createSnapshotInternal(
      page,
      `Pre-Rollback Backup (${new Date().toLocaleTimeString()})`,
      `Copia automática de seguridad generada antes de revertir a ${targetSnapshot.versionTag || `v${targetSnapshot.versionNumber}`}`,
      user.email,
      user.name,
      'DRAFT_ARCHIVED'
    );

    const pages = await this.getAllPages();
    const idx = pages.findIndex(p => p.id === pageId);

    const restoredBlocks = JSON.parse(JSON.stringify(targetSnapshot.blocks));
    const newVersionNumber = (page.currentVersion || 1) + 1;

    let updatedPage: CmsPage;

    if (autoPublish) {
      updatedPage = {
        ...page,
        blocks: restoredBlocks,
        publishedBlocks: JSON.parse(JSON.stringify(restoredBlocks)),
        metaTitle: targetSnapshot.metaTitle || page.metaTitle,
        metaDescription: targetSnapshot.metaDescription || page.metaDescription,
        ogImage: targetSnapshot.ogImage || page.ogImage,
        isPublished: true,
        status: 'PUBLISHED',
        hasUnpublishedChanges: false,
        currentVersion: newVersionNumber,
        versionsCount: (page.versionsCount || 1) + 1,
        lastPublishedAt: now,
        lastPublishedBy: { name: user.name, email: user.email },
        updatedAt: now,
      };

      // Create snapshot for published rollback
      await this.createSnapshotInternal(
        updatedPage,
        `v${newVersionNumber}.0 - Restauración de ${targetSnapshot.versionTag || `v${targetSnapshot.versionNumber}`}`,
        `Rollback y despliegue a producción de versión histórica #${targetSnapshot.versionNumber} por ${user.name}`,
        user.email,
        user.name,
        'PUBLISHED'
      );
    } else {
      updatedPage = {
        ...page,
        blocks: restoredBlocks,
        metaTitle: targetSnapshot.metaTitle || page.metaTitle,
        metaDescription: targetSnapshot.metaDescription || page.metaDescription,
        ogImage: targetSnapshot.ogImage || page.ogImage,
        hasUnpublishedChanges: true,
        status: 'CHANGES_IN_DRAFT',
        lastDraftSavedAt: now,
        lastDraftSavedBy: { name: user.name, email: user.email },
        updatedAt: now,
      };
    }

    pages[idx] = updatedPage;
    this.inMemoryPages = pages;
    await this.persistPages(pages);

    return {
      page: updatedPage,
      restoredSnapshot: targetSnapshot,
    };
  }

  private async createSnapshotInternal(
    page: CmsPage,
    versionTag: string,
    changeNote: string,
    authorEmail: string,
    authorName: string,
    status: 'PUBLISHED' | 'DRAFT_ARCHIVED' | 'MANUAL_SNAPSHOT'
  ): Promise<CmsPageVersionSnapshot> {
    const existing = await this.getPageVersions(page.id);
    const now = new Date().toISOString();
    const versionNumber = page.currentVersion || existing.length + 1;

    const snapshot: CmsPageVersionSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      pageId: page.id,
      versionNumber,
      versionTag,
      changeNote,
      authorEmail,
      authorName,
      createdAt: now,
      status,
      blocksCount: (page.blocks || []).length,
      blocks: JSON.parse(JSON.stringify(page.blocks || [])),
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      ogImage: page.ogImage || '',
    };

    const updatedVersions = [snapshot, ...existing].slice(0, 50); // Keep last 50 snapshots
    this.inMemoryVersions[page.id] = updatedVersions;

    try {
      await db.insert(siteSettings)
        .values({
          key: `cms_versions_${page.id}`,
          value: updatedVersions as any,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: updatedVersions as any,
            updatedAt: new Date(),
          },
        });
    } catch (e) {
      this.logger.warn(`Could not persist snapshots in DB for page ${page.id}:`, e);
    }

    return snapshot;
  }

  async duplicatePage(id: string, user?: { name: string; email: string }): Promise<CmsPage> {
    const pages = await this.getAllPages();
    const source = pages.find(p => p.id === id);
    if (!source) {
      throw new NotFoundException(`Página con ID ${id} no encontrada`);
    }

    const now = new Date().toISOString();
    const newId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSlug = `${source.slug}-copia-${Math.random().toString(36).substring(2, 5)}`;
    
    // Deep clone blocks with new unique IDs
    const clonedBlocks: CmsBlock[] = source.blocks.map(b => ({
      ...b,
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    })) as CmsBlock[];

    const duplicated: CmsPage = {
      ...source,
      id: newId,
      slug: newSlug,
      title: `${source.title} (Copia)`,
      isSystemPage: false,
      isPublished: false,
      status: 'DRAFT',
      blocks: clonedBlocks,
      publishedBlocks: [],
      hasUnpublishedChanges: true,
      currentVersion: 1,
      versionsCount: 1,
      lastDraftSavedAt: now,
      lastDraftSavedBy: {
        name: user?.name || 'Administrador',
        email: user?.email || 'admin@fusiongrafica.com.co',
      },
      createdAt: now,
      updatedAt: now,
    };

    pages.push(duplicated);
    this.inMemoryPages = pages;
    await this.persistPages(pages);

    await this.createSnapshotInternal(
      duplicated,
      'v1.0 - Copia Duplicada',
      `Duplicada a partir de ${source.title} (${source.slug})`,
      user?.email || 'admin@fusiongrafica.com.co',
      user?.name || 'Administrador',
      'DRAFT_ARCHIVED'
    );

    return duplicated;
  }

  async deletePage(id: string): Promise<{ success: boolean; message?: string }> {
    const pages = await this.getAllPages();
    const target = pages.find(p => p.id === id);
    if (!target) {
      return { success: false, message: 'Página no encontrada' };
    }

    if (target.isSystemPage) {
      return { success: false, message: 'Las páginas maestras del sistema no pueden ser eliminadas.' };
    }

    const filtered = pages.filter(p => p.id !== id);
    this.inMemoryPages = filtered;
    await this.persistPages(filtered);
    return { success: true };
  }

  private async persistPages(pages: CmsPage[]): Promise<void> {
    try {
      await db.insert(siteSettings)
        .values({
          key: 'cms_pages',
          value: pages as any,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: pages as any,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      this.logger.warn('Could not persist cms_pages in PostgreSQL:', err);
    }
  }
}
