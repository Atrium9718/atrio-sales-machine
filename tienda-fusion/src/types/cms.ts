export interface SiteBrandingConfig {
  siteName: string;
  siteTagline: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  department: string;
  country: string;
  guaranteeBadgeText: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    linkedin?: string;
  };
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  url: string;
  type: 'link' | 'dropdown' | 'category_megamenu' | 'highlight_badge';
  badge?: string;
  badgeColor?: string;
  isExternal?: boolean;
  isOpenNewTab?: boolean;
  children?: NavigationMenuItem[];
  displayOrder: number;
  active: boolean;
}

export interface FooterColumnConfig {
  id: string;
  title: string;
  displayOrder: number;
  links: {
    id: string;
    label: string;
    url: string;
    isHighlight?: boolean;
    badge?: string;
  }[];
}

export interface AnnouncementTopBarConfig {
  enabled: boolean;
  text: string;
  highlightText?: string;
  linkText?: string;
  linkUrl?: string;
  badgeTag?: string;
  bgType: 'GRADIENT' | 'COLOR';
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  showShippingMarquee: boolean;
  marqueeText: string;
  trackingLinkActive: boolean;
}

export interface CmsGlobalConfig {
  branding: SiteBrandingConfig;
  headerNav: NavigationMenuItem[];
  footerColumns: FooterColumnConfig[];
  topBar: AnnouncementTopBarConfig;
}

// --------------------------------------------------------------------------
// CMS Visual Page Builder Types (Fase 2)
// --------------------------------------------------------------------------

export type CmsBlockType =
  | 'HERO_BANNER'
  | 'CATEGORY_GRID'
  | 'FEATURED_PRODUCTS'
  | 'VALUE_PROPOSITION'
  | 'RICH_TEXT_MEDIA'
  | 'FAQ_ACCORDION'
  | 'TESTIMONIALS'
  | 'TECH_SPECS_PREPRESS'
  | 'PARTNER_SHOWCASE'
  | 'EMBEDDED_QUOTER_CTA'
  | 'CONTACT_MAP_FORM'
  | 'CUSTOM_HTML';

export interface BaseBlockConfig {
  id: string;
  type: CmsBlockType;
  title?: string;
  subtitle?: string;
  badge?: string;
  displayOrder: number;
  isEnabled: boolean;
  bgStyle?: 'white' | 'slate-50' | 'dark' | 'gradient-teal' | 'gradient-dark';
  paddingTop?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingBottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface HeroBannerBlockConfig extends BaseBlockConfig {
  type: 'HERO_BANNER';
  headline: string;
  subheadline: string;
  badgeText?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundImageUrl?: string;
  alignment?: 'left' | 'center' | 'right';
  height?: 'compact' | 'standard' | 'large';
  showTrustBadges?: boolean;
}

export interface CategoryGridBlockConfig extends BaseBlockConfig {
  type: 'CATEGORY_GRID';
  columns?: 2 | 3 | 4;
  showBadge?: boolean;
  layoutVariant?: 'grid' | 'cards' | 'bento';
  categoriesToShow?: string[]; // IDs or empty for all
}

export interface FeaturedProductsBlockConfig extends BaseBlockConfig {
  type: 'FEATURED_PRODUCTS';
  categoryFilter?: string; // 'all' or category slug
  limit?: number;
  viewAllLinkText?: string;
  viewAllUrl?: string;
}

export interface ValuePropItem {
  id: string;
  icon: 'ShieldCheck' | 'Zap' | 'Truck' | 'Award' | 'Clock' | 'Printer' | 'Sparkles' | 'Layers' | 'DollarSign';
  title: string;
  description: string;
  highlightBadge?: string;
}

export interface ValuePropBlockConfig extends BaseBlockConfig {
  type: 'VALUE_PROPOSITION';
  columns?: 2 | 3 | 4;
  items: ValuePropItem[];
}

export interface RichTextMediaBlockConfig extends BaseBlockConfig {
  type: 'RICH_TEXT_MEDIA';
  contentHtml: string;
  mediaType: 'image' | 'comparison' | 'video';
  mediaUrl: string;
  mediaPosition: 'left' | 'right';
  checklistItems?: string[];
  ctaButtonText?: string;
  ctaButtonLink?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface FaqAccordionBlockConfig extends BaseBlockConfig {
  type: 'FAQ_ACCORDION';
  items: FaqItem[];
  enableSearch?: boolean;
  contactPromptText?: string;
}

export interface TestimonialItem {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatarUrl?: string;
  city?: string;
}

export interface TestimonialsBlockConfig extends BaseBlockConfig {
  type: 'TESTIMONIALS';
  items: TestimonialItem[];
  layout?: 'grid' | 'carousel' | 'compact';
}

export interface PrepressSpecItem {
  id: string;
  title: string;
  specification: string;
  importance: 'CRITICO' | 'RECOMENDADO' | 'ESTANDAR';
  detail: string;
}

export interface TechSpecsPrepressBlockConfig extends BaseBlockConfig {
  type: 'TECH_SPECS_PREPRESS';
  specs: PrepressSpecItem[];
  downloadGuideUrl?: string;
  downloadGuideText?: string;
}

export interface PartnerShowcaseBlockConfig extends BaseBlockConfig {
  type: 'PARTNER_SHOWCASE';
  partnerName: string;
  partnerTagline: string;
  partnerLogoUrl?: string;
  description: string;
  services: { title: string; desc: string }[];
  ctaText?: string;
  ctaLink?: string;
}

export interface EmbeddedQuoterCtaBlockConfig extends BaseBlockConfig {
  type: 'EMBEDDED_QUOTER_CTA';
  quoterType: 'libros' | 'papeleria' | 'empaques' | 'general';
  highlightText?: string;
  buttonText: string;
  buttonLink: string;
  featureBullets: string[];
}

export interface ContactMapFormBlockConfig extends BaseBlockConfig {
  type: 'CONTACT_MAP_FORM';
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  scheduleText: string;
  showForm: boolean;
  showMap: boolean;
}

export interface CustomHtmlBlockConfig extends BaseBlockConfig {
  type: 'CUSTOM_HTML';
  rawHtml: string;
}

export type CmsBlock =
  | HeroBannerBlockConfig
  | CategoryGridBlockConfig
  | FeaturedProductsBlockConfig
  | ValuePropBlockConfig
  | RichTextMediaBlockConfig
  | FaqAccordionBlockConfig
  | TestimonialsBlockConfig
  | TechSpecsPrepressBlockConfig
  | PartnerShowcaseBlockConfig
  | EmbeddedQuoterCtaBlockConfig
  | ContactMapFormBlockConfig
  | CustomHtmlBlockConfig;

export type CmsPageStatus = 'PUBLISHED' | 'DRAFT' | 'CHANGES_IN_DRAFT';

export interface CmsPageVersionSnapshot {
  id: string;
  pageId: string;
  versionNumber: number;
  versionTag?: string; // e.g. "v2.1 - Campaña Día de la Madre"
  changeNote: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  status: 'PUBLISHED' | 'DRAFT_ARCHIVED' | 'MANUAL_SNAPSHOT';
  blocksCount: number;
  blocks: CmsBlock[];
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
}

export interface CmsPage {
  id: string;
  slug: string; // e.g. 'home', 'nosotros', 'tecnologia', 'guia-archivos', or custom 'promo-2026'
  title: string;
  description: string;
  isSystemPage: boolean;
  isPublished: boolean;
  status?: CmsPageStatus;
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string[];
  ogImage?: string;
  blocks: CmsBlock[]; // Current working/draft blocks
  publishedBlocks?: CmsBlock[]; // Deployed blocks visible to live storefront visitors
  lastPublishedAt?: string;
  lastPublishedBy?: {
    name: string;
    email: string;
  };
  lastDraftSavedAt?: string;
  lastDraftSavedBy?: {
    name: string;
    email: string;
  };
  currentVersion?: number;
  versionsCount?: number;
  hasUnpublishedChanges?: boolean;
  lockedBy?: {
    name: string;
    email: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CMS_GLOBAL_CONFIG: CmsGlobalConfig = {
  branding: {
    siteName: 'Fusión Comunicación Gráfica',
    siteTagline: 'Gráfica W2P',
    logoLightUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: '#0d9488', // teal-600
    secondaryColor: '#0f172a', // slate-900
    accentColor: '#f59e0b', // amber-500
    phone: '+57 324 3917169',
    whatsapp: '573243917169',
    email: 'comercial@fusioncg.com',
    address: 'Cra. 22 #24 - 47, Centro',
    city: 'Manizales',
    department: 'Caldas',
    country: 'Colombia',
    guaranteeBadgeText: 'Calidad Garantizada 300 DPI CTP',
    socialLinks: {
      facebook: 'https://facebook.com/fusiongraficaw2p',
      instagram: 'https://instagram.com/fusiongraficaw2p',
      whatsapp: 'https://wa.me/573243917169',
      linkedin: 'https://linkedin.com/company/fusion-grafica',
    },
  },
  headerNav: [
    {
      id: 'nav-home',
      label: 'Inicio',
      url: '/',
      type: 'link',
      displayOrder: 1,
      active: true,
    },
    {
      id: 'nav-catalog',
      label: 'Catálogo Completo',
      url: '/categoria/todas',
      type: 'link',
      displayOrder: 2,
      active: true,
    },
    {
      id: 'nav-editorial',
      label: 'Libros & Revistas',
      url: '/cotizador-libros',
      type: 'highlight_badge',
      badge: 'PRO',
      badgeColor: 'teal',
      displayOrder: 3,
      active: true,
    },
    {
      id: 'nav-b2b',
      label: 'Portal B2B Mayoristas',
      url: '/b2b',
      type: 'highlight_badge',
      badge: 'DTO',
      badgeColor: 'amber',
      displayOrder: 4,
      active: true,
    },
    {
      id: 'nav-editor',
      label: 'Editor Canvas Online',
      url: '/diseñador/tarjetas-estandar',
      type: 'link',
      displayOrder: 5,
      active: true,
    },
  ],
  footerColumns: [
    {
      id: 'col-categories',
      title: 'Categorías Litográficas',
      displayOrder: 1,
      links: [
        { id: 'f-c1', label: 'Impresión Comercial', url: '/categoria/papeleria-comercial' },
        { id: 'f-c2', label: 'Libros & Revistas (PRO)', url: '/cotizador-libros', isHighlight: true, badge: 'PRO' },
        { id: 'f-c3', label: 'Gran Formato & Pendones', url: '/categoria/gran-formato' },
        { id: 'f-c4', label: 'Empaques & Cajas', url: '/categoria/empaques-cajas' },
        { id: 'f-c5', label: 'Portal Mayoristas B2B', url: '/b2b', isHighlight: true, badge: 'DTO' },
      ],
    },
    {
      id: 'col-services',
      title: 'Servicios & Ayuda',
      displayOrder: 2,
      links: [
        { id: 'f-s1', label: 'Mi Cuenta & Re-órdenes', url: '/mi-cuenta' },
        { id: 'f-s2', label: 'Rastrear mi Pedido', url: '/rastreo', isHighlight: true },
        { id: 'f-s3', label: 'Catálogo Completo', url: '/categoria/todas' },
        { id: 'f-s4', label: 'Mi Carrito de Compras', url: '/carrito' },
        { id: 'f-s5', label: 'Atención por WhatsApp', url: 'https://wa.me/573243917169' },
      ],
    },
    {
      id: 'col-legal',
      title: 'Legal & Envíos',
      displayOrder: 3,
      links: [
        { id: 'f-l1', label: 'Términos y Condiciones', url: '/terminos' },
        { id: 'f-l2', label: 'Política de Tratamiento de Datos', url: '/privacidad' },
        { id: 'f-l3', label: 'Aviso Legal', url: '/legal' },
        { id: 'f-l4', label: 'Despachos Nacionales', url: '/rastreo' },
      ],
    },
  ],
  topBar: {
    enabled: true,
    text: 'Envíos nacionales a toda Colombia | Impresión Litográfica y Gran Formato',
    highlightText: 'Despachos diarios 300 DPI CTP',
    linkText: 'Rastrear Pedido',
    linkUrl: '/rastreo',
    badgeTag: 'ENVÍO NACIONAL',
    bgType: 'COLOR',
    bgColor: '#020617', // slate-950
    gradientFrom: '#020617',
    gradientTo: '#0f766e',
    textColor: '#cbd5e1', // slate-300
    showShippingMarquee: true,
    marqueeText: 'Envíos nacionales a toda Colombia | Impresión Litográfica, Editorial y Empaques',
    trackingLinkActive: true,
  },
};

