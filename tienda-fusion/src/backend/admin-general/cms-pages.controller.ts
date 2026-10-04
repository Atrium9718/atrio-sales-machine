import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException, Inject, Optional } from '@nestjs/common';
import { CmsPagesService } from './cms-pages.service';
import { CmsPage, CmsBlock } from '../../types/cms';

@Controller('api/cms/pages')
export class CmsPagesController {
  private service: CmsPagesService;

  constructor(@Optional() @Inject(CmsPagesService) private readonly cmsPagesService?: CmsPagesService) {
    this.service = cmsPagesService || new CmsPagesService();
  }

  @Get()
  async getAllPages() {
    return this.service.getAllPages();
  }

  @Get(':slugOrId')
  async getPage(
    @Param('slugOrId') slugOrId: string,
    @Query('preview') preview?: string
  ) {
    const isPreview = preview === 'draft' || preview === 'true';
    
    // Try by slug first
    let page = await this.service.getPageBySlug(slugOrId, isPreview);
    if (!page) {
      // Try by ID
      page = await this.service.getPageById(slugOrId);
    }
    if (!page) {
      throw new NotFoundException(`Página '${slugOrId}' no encontrada.`);
    }
    return page;
  }

  @Post()
  async createPage(@Body() body: { pageData: Partial<CmsPage>; user?: { name: string; email: string } } | Partial<CmsPage>) {
    const pageData = 'pageData' in body ? body.pageData : body;
    const user = 'user' in body ? body.user : undefined;
    return this.service.savePage(pageData, user);
  }

  @Put(':id')
  async updatePage(
    @Param('id') id: string,
    @Body() body: { pageData: Partial<CmsPage>; user?: { name: string; email: string } } | Partial<CmsPage>
  ) {
    const pageData = 'pageData' in body ? body.pageData : body;
    const user = 'user' in body ? body.user : undefined;
    return this.service.savePage({ ...pageData, id }, user);
  }

  @Put(':id/blocks')
  async updateBlocks(
    @Param('id') id: string,
    @Body() body: { blocks: CmsBlock[]; user?: { name: string; email: string } }
  ) {
    return this.service.updatePageBlocks(id, body.blocks || [], body.user);
  }

  @Post(':id/publish')
  async publishPage(
    @Param('id') id: string,
    @Body() body: { user: { name: string; email: string }; changeNote?: string; versionTag?: string }
  ) {
    const user = body.user || { name: 'Super Administrador', email: 'andresepulveda718@gmail.com' };
    return this.service.publishPage(id, user, body.changeNote, body.versionTag);
  }

  @Post(':id/discard-draft')
  async discardDraft(
    @Param('id') id: string,
    @Body() body: { user?: { name: string; email: string } }
  ) {
    return this.service.discardDraft(id, body.user);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.service.getPageVersions(id);
  }

  @Post(':id/versions/snapshot')
  async createSnapshot(
    @Param('id') id: string,
    @Body() body: { versionTag: string; changeNote: string; user: { name: string; email: string } }
  ) {
    const user = body.user || { name: 'Administrador', email: 'admin@fusiongrafica.com.co' };
    return this.service.createManualSnapshot(id, body.versionTag, body.changeNote, user);
  }

  @Post(':id/versions/:versionId/restore')
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: { user: { name: string; email: string }; autoPublish?: boolean }
  ) {
    const user = body.user || { name: 'Administrador', email: 'admin@fusiongrafica.com.co' };
    return this.service.restoreVersion(id, versionId, user, body.autoPublish ?? false);
  }

  @Post(':id/duplicate')
  async duplicatePage(
    @Param('id') id: string,
    @Body() body?: { user?: { name: string; email: string } }
  ) {
    return this.service.duplicatePage(id, body?.user);
  }

  @Delete(':id')
  async deletePage(@Param('id') id: string) {
    return this.service.deletePage(id);
  }
}
