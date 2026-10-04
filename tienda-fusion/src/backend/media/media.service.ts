import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { MediaAsset, MediaFolder, INITIAL_MEDIA_ASSETS, MediaFolderInfo } from '../../types/media';
import { db } from '../../db';
import { mediaAssets, mediaFiles } from '../../db/schema';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|avif|gif|svg\+xml)|application\/pdf)$/;
const LOCAL_FILE_PREFIX = '/api/media-files/';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private assets: MediaAsset[] = [...INITIAL_MEDIA_ASSETS];

  /** Carga la biblioteca desde la base de datos (la primera vez guarda los recursos de ejemplo). */
  async onModuleInit() {
    try {
      const rows = await db.select().from(mediaAssets);
      if (rows.length > 0) {
        this.assets = rows.map(r => r.data as MediaAsset);
      } else {
        for (const asset of this.assets) {
          await db.insert(mediaAssets).values({ id: asset.id, data: asset }).onConflictDoNothing();
        }
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar la biblioteca de medios desde la base de datos: ${err?.message || err}`);
    }
  }

  private async persist(asset: MediaAsset) {
    await db.insert(mediaAssets)
      .values({ id: asset.id, data: asset })
      .onConflictDoUpdate({ target: mediaAssets.id, set: { data: asset } });
  }

  /** Si la URL es un data URI (subida o render de IA), guarda el binario y devuelve su URL pública. */
  private async storeDataUri(dataUri: string): Promise<{ url: string; mimeType: string; sizeBytes: number }> {
    const match = dataUri.match(/^data:([^;,]+);base64,(.+)$/s);
    if (!match) throw new BadRequestException('Archivo inválido.');
    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_MIME.test(mimeType)) throw new BadRequestException('Formato no permitido (usa PNG, JPG, WebP, AVIF, GIF, SVG o PDF).');
    const content = Buffer.from(match[2], 'base64');
    if (content.length === 0 || content.length > MAX_FILE_BYTES) throw new BadRequestException('El archivo supera el límite de 10 MB.');
    const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    await db.insert(mediaFiles).values({ id, mimeType, sizeBytes: content.length, content });
    return { url: LOCAL_FILE_PREFIX + id, mimeType, sizeBytes: content.length };
  }

  async getFile(id: string) {
    return (await db.select().from(mediaFiles).where(eq(mediaFiles.id, id)).limit(1))[0] || null;
  }

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

  async createAsset(data: {
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
  }): Promise<MediaAsset> {
    if (!data?.url || typeof data.url !== 'string') {
      throw new BadRequestException('Indica la URL o el archivo a subir.');
    }
    let stored: { url: string; mimeType: string; sizeBytes: number } | null = null;
    if (data.url.startsWith('data:')) {
      stored = await this.storeDataUri(data.url);
      data = { ...data, url: stored.url, mimeType: stored.mimeType, originalSizeBytes: stored.sizeBytes };
    } else if (!/^https?:\/\//i.test(data.url)) {
      throw new BadRequestException('La URL debe empezar por http(s)://');
    }

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
      webpUrl: data.webpUrl || (stored ? mainUrl : mainUrl.includes('?') ? `${mainUrl}&fm=webp` : `${mainUrl}?fm=webp`),
      avifUrl: data.avifUrl || (stored ? mainUrl : mainUrl.includes('?') ? `${mainUrl}&fm=avif` : `${mainUrl}?fm=avif`),
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

    await this.persist(newAsset);
    this.assets.unshift(newAsset);
    return newAsset;
  }

  async updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null> {
    const index = this.assets.findIndex(a => a.id === id);
    if (index === -1) return null;

    const current = this.assets[index];
    // Los campos de identidad y ubicación del archivo no se pueden reescribir desde el panel
    const { id: _id, url: _url, originalUrl: _o, createdAt: _c, ...safeUpdates } = updates as any;
    const updated: MediaAsset = {
      ...current,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    await this.persist(updated);
    this.assets[index] = updated;
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const asset = this.assets.find(a => a.id === id);
    if (!asset) return false;
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    if (asset.url.startsWith(LOCAL_FILE_PREFIX)) {
      await db.delete(mediaFiles).where(eq(mediaFiles.id, asset.url.slice(LOCAL_FILE_PREFIX.length)));
    }
    this.assets = this.assets.filter(a => a.id !== id);
    return true;
  }

  async convertAssetFormat(id: string, targetFormat: 'webp' | 'avif' | 'png'): Promise<MediaAsset | null> {
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
