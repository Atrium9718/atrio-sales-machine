import { Controller, Get, Post, Put, Body, Param, Query, Optional, Inject } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller('api/seo')
export class SeoController {
  private seoService: SeoService;

  constructor(@Optional() @Inject(SeoService) seoService?: SeoService) {
    this.seoService = seoService || new SeoService();
  }

  @Get()
  getAll(@Query('targetType') targetType?: string) {
    return this.seoService.getAll(targetType as any);
  }

  @Get('audit-summary')
  getAuditSummary() {
    return this.seoService.getGlobalAuditSummary();
  }

  @Get(':targetType/:targetId')
  getByTarget(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string
  ) {
    const item = this.seoService.getByTarget(targetType as any, targetId);
    if (!item) {
      return { success: false, message: 'Configuración SEO no encontrada' };
    }
    return item;
  }

  @Put(':targetType/:targetId')
  update(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Body() body: any
  ) {
    const updated = this.seoService.upsert({
      ...body,
      targetType: targetType as any,
      targetId,
      targetName: body.targetName || targetId,
    });
    return {
      success: true,
      message: 'Metadatos SEO y Open Graph actualizados exitosamente con auditoría recalculada',
      item: updated,
    };
  }
}
