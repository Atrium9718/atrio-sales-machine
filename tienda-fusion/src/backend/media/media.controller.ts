import { Controller, Get, Post, Put, Delete, Body, Param, Query, Optional, Inject, UseGuards, Res } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MediaService } from './media.service';

@Controller('api/media')
@UseGuards(AdminGuard)
export class MediaController {
  private mediaService: MediaService;

  constructor(@Optional() @Inject(MediaService) mediaService?: MediaService) {
    this.mediaService = mediaService || new MediaService();
  }

  @Get()
  getAll(
    @Query('folder') folder?: string,
    @Query('search') search?: string,
    @Query('format') format?: string
  ) {
    return this.mediaService.getAllAssets(folder as any, search, format);
  }

  @Get('folders')
  getFolderStats() {
    return this.mediaService.getFolderStats();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    const asset = this.mediaService.getAssetById(id);
    if (!asset) {
      return { success: false, message: 'Asset no encontrado' };
    }
    return asset;
  }

  @Post('upload')
  async upload(@Body() body: any) {
    // Acepta una URL pública o un data URI (archivo subido o render de IA)
    const asset = await this.mediaService.createAsset(body);
    return {
      success: true,
      message: 'Archivo subido y convertido a formato ultraligero WebP/AVIF exitosamente',
      asset,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updated = await this.mediaService.updateAsset(id, body);
    if (!updated) {
      return { success: false, message: 'Asset no encontrado' };
    }
    return {
      success: true,
      asset: updated,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const success = await this.mediaService.deleteAsset(id);
    return {
      success,
      message: success ? 'Archivo eliminado correctamente' : 'No se pudo eliminar el archivo',
    };
  }

  @Post(':id/convert')
  async convert(@Param('id') id: string, @Body() body: { targetFormat: 'webp' | 'avif' | 'png' }) {
    const updated = await this.mediaService.convertAssetFormat(id, body.targetFormat || 'webp');
    if (!updated) {
      return { success: false, message: 'No se pudo convertir el formato' };
    }
    return {
      success: true,
      message: `Archivo transformado exitosamente a formato ${body.targetFormat.toUpperCase()}`,
      asset: updated,
    };
  }
}

/** Archivos de la biblioteca (públicos: se usan en banners, productos y páginas de la tienda). */
@Controller('api/media-files')
export class MediaFilesController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  @Get(':id')
  async serve(@Param('id') id: string, @Res() res: any) {
    const file = await this.mediaService.getFile(id);
    if (!file) {
      return res.status(404).send('Archivo no encontrado');
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.sizeBytes);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (file.mimeType === 'image/svg+xml') {
      // Un SVG puede contener scripts: se sirve aislado
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
    return res.end(file.content);
  }
}
