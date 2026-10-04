import { Controller, Get, Post, Put, Delete, Body, Param, Query, Optional, Inject } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('api/media')
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
  upload(@Body() body: any) {
    // Accepts file payload, URL, or base64
    const asset = this.mediaService.createAsset(body);
    return {
      success: true,
      message: 'Archivo subido y convertido a formato ultraligero WebP/AVIF exitosamente',
      asset,
    };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const updated = this.mediaService.updateAsset(id, body);
    if (!updated) {
      return { success: false, message: 'Asset no encontrado' };
    }
    return {
      success: true,
      asset: updated,
    };
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    const success = this.mediaService.deleteAsset(id);
    return {
      success,
      message: success ? 'Archivo eliminado correctamente' : 'No se pudo eliminar el archivo',
    };
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() body: { targetFormat: 'webp' | 'avif' | 'png' }) {
    const updated = this.mediaService.convertAssetFormat(id, body.targetFormat || 'webp');
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
