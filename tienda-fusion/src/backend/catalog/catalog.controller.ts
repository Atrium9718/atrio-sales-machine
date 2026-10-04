import { Controller, Get, Param, Query, Inject, Optional } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('api/catalog')
export class CatalogController {
  private catalogService: CatalogService;

  constructor(@Optional() @Inject(CatalogService) catalogService?: CatalogService) {
    this.catalogService = catalogService || new CatalogService();
  }

  @Get('categories')
  async getCategories() {
    try {
       return await this.catalogService.getCategories();
    } catch(e) {
       console.error(e);
       throw e;
    }
  }
  
  @Get('banners')
  async getBanners(@Query('placement') placement?: string) {
    return await this.catalogService.getHomeBanners(placement);
  }

  @Get('templates')
  async getTemplates() {
    return await this.catalogService.getTemplates();
  }

  @Get('category/:slug')
  async getProductsByCategory(@Param('slug') slug: string) {
    return await this.catalogService.getProductsByCategory(slug);
  }

  @Get('product/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    return await this.catalogService.getProductBySlug(slug);
  }
}
