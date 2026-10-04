export type MediaFolder = 'banners' | 'empaques' | 'papeleria' | 'logotipos' | 'iconos' | 'editorial' | 'general';

export type MediaFormat = 'webp' | 'avif' | 'png' | 'jpg' | 'svg' | 'pdf';

export interface MediaAsset {
  id: string;
  name: string;
  folder: MediaFolder;
  url: string;
  originalUrl: string;
  webpUrl: string;
  avifUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  format: MediaFormat;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savingsPercentage: number;
  dimensions: {
    width: number;
    height: number;
  };
  dpi?: number;
  altText: string;
  tags: string[];
  isAiGenerated: boolean;
  aiPrompt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaFolderInfo {
  id: MediaFolder;
  name: string;
  description: string;
  iconName: string;
  count: number;
  totalSizeBytes: number;
  savingsBytes: number;
}

// --------------------------------------------------------------------------
// AI Creative Studio Types
// --------------------------------------------------------------------------

export type AiCopyType = 
  | 'HERO_HEADLINE' 
  | 'PRODUCT_DESCRIPTION' 
  | 'PERSUASIVE_BULLETS' 
  | 'CALL_TO_ACTION' 
  | 'PREPRESS_TECH_NOTE' 
  | 'VALUE_PROPOSITION'
  | 'EMAIL_PROMO';

export type AiToneStyle = 
  | 'LITHO_PROFESSIONAL' // Tono técnico de alta fidelidad 300 DPI
  | 'COMMERCIAL_URGENCY' // Tono comercial de venta rápida y descuentos
  | 'B2B_CORPORATE' // Tono sobrio para compras corporativas y mayoristas
  | 'CREATIVE_DESIGN' // Tono vanguardista para diseñadores y agencias
  | 'LUXURY_PREMIUM'; // Tono elegante para acabados finos y papeles especiales

export interface GenerateCreativeCopyRequest {
  copyType: AiCopyType;
  tone: AiToneStyle;
  productOrTopic: string;
  category?: string;
  targetAudience?: string;
  specialFeatures?: string; // ej: "Barniz UV, Troquelado, Papel Propalcote 300g"
  offerOrPromo?: string;
}

export interface GenerateCreativeCopyResult {
  headline: string;
  subtitle?: string;
  mainCopy: string;
  bulletPoints: string[];
  ctaText: string;
  suggestedKeywords: string[];
  socialSnippet?: string;
  technicalNote?: string;
}

export interface GenerateProductRenderRequest {
  preset: 'CAJA_PLEGADIZA' | 'FOLLETO_FLYER' | 'LIBRO_EDITORIAL' | 'BOLSA_KRAFT' | 'TARJETA_FOIL' | 'REVISTA_GRAPADA' | 'CUSTOM';
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
  finishingStyle?: 'BRILLO_UV' | 'FOIL_DORADO' | 'MATE_SOBRIO' | 'TROQUEL_ESPECIAL' | 'KRAFT_ORGANICO';
  folderToSave?: MediaFolder;
}

export interface GenerateProductRenderResult {
  imageUrl: string;
  promptUsed: string;
  dimensions: { width: number; height: number };
  savedAsset?: MediaAsset;
}

// --------------------------------------------------------------------------
// SEO & Meta Suite Types
// --------------------------------------------------------------------------

export type SeoTargetType = 'page' | 'product' | 'category' | 'global';

export interface SeoCheckResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'good';
  scoreImpact: number;
}

export interface SeoMetadataItem {
  id: string;
  targetType: SeoTargetType;
  targetId: string;
  targetName: string;
  slug: string;
  canonicalUrl: string;
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: 'summary_large_image' | 'summary';
  robots: 'index, follow' | 'noindex, follow' | 'index, nofollow' | 'noindex, nofollow';
  schemaType: 'Organization' | 'Product' | 'WebPage' | 'Article' | 'FAQPage' | 'LocalBusiness';
  jsonLdSchema: string;
  seoScore: number;
  checks: SeoCheckResult[];
  lastAuditedAt: string;
}

// Initial Seed Data for Media Library
export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'media-ban-01',
    name: 'Banner Principal Impresión Offset 300 DPI',
    folder: 'banners',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=400&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 2450000,
    optimizedSizeBytes: 380000,
    savingsPercentage: 84.5,
    dimensions: { width: 1920, height: 800 },
    dpi: 300,
    altText: 'Maquinaria litográfica de alta precisión offset para grandes tirajes',
    tags: ['banner', 'offset', 'prensa', 'hero', 'hd'],
    isAiGenerated: false,
    createdAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'media-emp-01',
    name: 'Caja Plegadiza Cosmética con Foil Dorado',
    folder: 'empaques',
    url: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?q=80&w=1200&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?q=80&w=1200&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?q=80&w=1200&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?q=80&w=1200&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?q=80&w=400&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 1890000,
    optimizedSizeBytes: 260000,
    savingsPercentage: 86.2,
    dimensions: { width: 1200, height: 1200 },
    dpi: 300,
    altText: 'Mockup fotorrealista de caja de cartón plegadiza para cosméticos',
    tags: ['empaque', 'caja', 'plegadiza', 'foil', 'mockup'],
    isAiGenerated: true,
    aiPrompt: 'Photorealistic luxury cosmetics packaging box with gold foil stamping on clean studio background, 300 DPI print render',
    createdAt: '2026-08-12T14:30:00Z',
  },
  {
    id: 'media-pap-01',
    name: 'Tarjetas de Presentación Acabado Soft Touch',
    folder: 'papeleria',
    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=400&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 1650000,
    optimizedSizeBytes: 210000,
    savingsPercentage: 87.2,
    dimensions: { width: 1200, height: 900 },
    dpi: 300,
    altText: 'Tarjetas de visita corporativas apiladas sobre mesa de diseño',
    tags: ['papeleria', 'tarjetas', 'soft-touch', 'uv', 'corporativo'],
    isAiGenerated: false,
    createdAt: '2026-08-14T09:15:00Z',
  },
  {
    id: 'media-edt-01',
    name: 'Libro Corporativo con Lomo Cuadrado Cosido',
    folder: 'editorial',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 2100000,
    optimizedSizeBytes: 295000,
    savingsPercentage: 85.9,
    dimensions: { width: 1200, height: 800 },
    dpi: 300,
    altText: 'Encuadernación rústica con lomo cosido para catálogo editorial',
    tags: ['editorial', 'libros', 'lomo', 'revistas', 'catalogos'],
    isAiGenerated: false,
    createdAt: '2026-08-15T11:00:00Z',
  },
  {
    id: 'media-log-01',
    name: 'Logotipo Fusión Comunicación Gráfica Vectorial',
    folder: 'logotipos',
    url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=300&auto=format&fit=crop',
    mimeType: 'image/png',
    format: 'png',
    originalSizeBytes: 420000,
    optimizedSizeBytes: 95000,
    savingsPercentage: 77.3,
    dimensions: { width: 800, height: 400 },
    dpi: 300,
    altText: 'Logotipo oficial de Fusión Gráfica con símbolos litográficos CMYK',
    tags: ['logotipo', 'marca', 'identidad', 'cmyk', 'vector'],
    isAiGenerated: false,
    createdAt: '2026-08-16T16:20:00Z',
  },
  {
    id: 'media-ico-01',
    name: 'Sello de Calidad 300 DPI CTP Garantizada',
    folder: 'iconos',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 310000,
    optimizedSizeBytes: 42000,
    savingsPercentage: 86.4,
    dimensions: { width: 512, height: 512 },
    dpi: 300,
    altText: 'Insignia de garantía de pre-prensa y calibración espectral ISO',
    tags: ['icono', 'garantia', 'ctp', 'insignia', 'badge'],
    isAiGenerated: false,
    createdAt: '2026-08-18T12:00:00Z',
  },
  {
    id: 'media-emp-02',
    name: 'Bolsa Boutique de Papel Kraft con Manija de Cordón',
    folder: 'empaques',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200&auto=format&fit=crop',
    originalUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200&auto=format&fit=crop',
    webpUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200&auto=format&fit=crop&fm=webp',
    avifUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200&auto=format&fit=crop&fm=avif',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=400&auto=format&fit=crop',
    mimeType: 'image/webp',
    format: 'webp',
    originalSizeBytes: 1980000,
    optimizedSizeBytes: 270000,
    savingsPercentage: 86.3,
    dimensions: { width: 1200, height: 1200 },
    dpi: 300,
    altText: 'Render fotorrealista de bolsa de compras ecológica kraft impresa',
    tags: ['bolsa', 'kraft', 'ecologico', 'empaque', 'render'],
    isAiGenerated: true,
    aiPrompt: 'High quality render of eco-friendly brown kraft shopping bag with black luxury logo print, cotton rope handle',
    createdAt: '2026-08-20T17:45:00Z',
  }
];
