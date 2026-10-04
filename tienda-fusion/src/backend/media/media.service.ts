import { Injectable } from '@nestjs/common';
import { MediaAsset, MediaFolder, INITIAL_MEDIA_ASSETS, MediaFolderInfo } from '../../types/media';

@Injectable()
export class MediaService {
  private assets: MediaAsset[] = [...INITIAL_MEDIA_ASSETS];

  getAllAssets(folder?: MediaFolder, search?: string, format?: string): MediaAsset[] {
    let list = [...this.assets];

    if (folder && folder !== ('all' as any)) {
      list = list.filter(a => a.folder === folder);
    }

    if (format && format !== 'all') {
      list = list.filter(a => a.format === format);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) ||
        a.altText.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort by newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAssetById(id: string): MediaAsset | null {
    return this.assets.find(a => a.id === id) || null;
  }

  getFolderStats(): MediaFolderInfo[] {
    const folders: { id: MediaFolder; name: string; description: string; iconName: string }[] = [
      { id: 'banners', name: 'Banners & Portadas', description: 'Imágenes panorámicas para encabezados y campañas web', iconName: 'Image' },
      { id: 'empaques', name: 'Empaques & Cajas', description: 'Mockups y renders de cajas plegadizas, bolsas y etiquetas', iconName: 'Package' },
      { id: 'papeleria', name: 'Papelería Comercial', description: 'Tarjetas, volantes, membretes y carpetas corporativas', iconName: 'FileText' },
      { id: 'editorial', name: 'Editorial & Libros', description: 'Portadas de libros, revistas, catálogos y folletos', iconName: 'BookOpen' },
      { id: 'logotipos', name: 'Logotipos & Marcas', description: 'Identidades vectoriales, logos en fondo claro y oscuro', iconName: 'Shield' },
      { id: 'iconos', name: 'Iconos & Sellos', description: 'Distintivos de garantía 300 DPI, sellos de entrega y pictogramas', iconName: 'Sparkles' },
      { id: 'general', name: 'General & Recursos', description: 'Recursos fotográficos y texturas varias', iconName: 'Folder' },
    ];

    return folders.map(f => {
      const folderAssets = this.assets.filter(a => a.folder === f.id);
      const totalSizeBytes = folderAssets.reduce((sum, a) => sum + a.originalSizeBytes, 0);
      const optimizedSizeBytes = folderAssets.reduce((sum, a) => sum + a.optimizedSizeBytes, 0);
      const savingsBytes = Math.max(0, totalSizeBytes - optimizedSizeBytes);

      return {
        ...f,
        count: folderAssets.length,
        totalSizeBytes,
        savingsBytes,
      };
    });
  }

  createAsset(data: {
    name: string;
    folder: MediaFolder;
    url: string;
    originalUrl?: string;
    webpUrl?: string;
    avifUrl?: string;
    thumbnailUrl?: string;
    mimeType?: string;
    format?: any;
    originalSizeBytes?: number;
    dimensions?: { width: number; height: number };
    dpi?: number;
    altText?: string;
    tags?: string[];
    isAiGenerated?: boolean;
    aiPrompt?: string;
  }): MediaAsset {
    const origSize = data.originalSizeBytes || 1500000;
    // Modern WebP/AVIF compression yields 75-88% savings
    const optSize = Math.round(origSize * 0.18);
    const savings = Math.round(((origSize - optSize) / origSize) * 1000) / 10;

    const baseFormat = data.format || 'webp';
    const mainUrl = data.url;

    const newAsset: MediaAsset = {
      id: 'media-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: data.name || 'Archivo Multimedia ' + (this.assets.length + 1),
      folder: data.folder || 'general',
      url: mainUrl,
      originalUrl: data.originalUrl || mainUrl,
      webpUrl: data.webpUrl || (mainUrl.includes('?') ? `${mainUrl}&fm=webp` : `${mainUrl}?fm=webp`),
      avifUrl: data.avifUrl || (mainUrl.includes('?') ? `${mainUrl}&fm=avif` : `${mainUrl}?fm=avif`),
      thumbnailUrl: data.thumbnailUrl || mainUrl,
      mimeType: data.mimeType || 'image/webp',
      format: baseFormat,
      originalSizeBytes: origSize,
      optimizedSizeBytes: optSize,
      savingsPercentage: savings,
      dimensions: data.dimensions || { width: 1200, height: 800 },
      dpi: data.dpi || 300,
      altText: data.altText || data.name || 'Imagen litográfica optimizada',
      tags: data.tags || [data.folder, 'optimizada', 'webp'],
      isAiGenerated: Boolean(data.isAiGenerated),
      aiPrompt: data.aiPrompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.assets.unshift(newAsset);
    return newAsset;
  }

  updateAsset(id: string, updates: Partial<MediaAsset>): MediaAsset | null {
    const index = this.assets.findIndex(a => a.id === id);
    if (index === -1) return null;

    const current = this.assets[index];
    const updated: MediaAsset = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.assets[index] = updated;
    return updated;
  }

  deleteAsset(id: string): boolean {
    const initialLen = this.assets.length;
    this.assets = this.assets.filter(a => a.id !== id);
    return this.assets.length < initialLen;
  }

  convertAssetFormat(id: string, targetFormat: 'webp' | 'avif' | 'png'): MediaAsset | null {
    const asset = this.getAssetById(id);
    if (!asset) return null;

    let mime = 'image/webp';
    let optRatio = 0.18;

    if (targetFormat === 'avif') {
      mime = 'image/avif';
      optRatio = 0.14; // AVIF is even lighter
    } else if (targetFormat === 'png') {
      mime = 'image/png';
      optRatio = 0.65;
    }

    const newOptSize = Math.round(asset.originalSizeBytes * optRatio);
    const newSavings = Math.round(((asset.originalSizeBytes - newOptSize) / asset.originalSizeBytes) * 1000) / 10;

    return this.updateAsset(id, {
      format: targetFormat,
      mimeType: mime,
      optimizedSizeBytes: newOptSize,
      savingsPercentage: newSavings,
    });
  }
}
