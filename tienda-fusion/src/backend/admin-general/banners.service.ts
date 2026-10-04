import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../../db';
import { homeBanners } from '../../db/schema';
import { eq, asc, desc } from 'drizzle-orm';

const INITIAL_DEFAULT_BANNERS = [
  {
    title: '50% OFF en tu primer pedido',
    subtitle: 'Tarjetas de presentación, volantes y papelería comercial de alta calidad litográfica.',
    tag: 'Oferta de Bienvenida',
    ctaText: 'Explorar Catálogo',
    desktopImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/papeleria-comercial',
    link: '/categoria/papeleria-comercial',
    displayOrder: 1,
    placement: 'hero',
    animationType: 'fade',
    bgType: 'IMAGE',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#14b8a6',
    textColor: '#ffffff',
    overlayOpacity: 50,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: 'Personaliza Online con el Editor Canvas W2P',
    subtitle: 'Diseña tus piezas gráficas con guías de corte y resolución 300 DPI lista para imprenta.',
    tag: 'Web-To-Print 300 DPI',
    ctaText: 'Diseñar en Línea',
    desktopImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    linkType: 'PRODUCT',
    linkUrl: '/diseñador/tarjetas-estandar',
    link: '/diseñador/tarjetas-estandar',
    displayOrder: 2,
    placement: 'hero',
    animationType: 'fade',
    bgType: 'IMAGE',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#14b8a6',
    textColor: '#ffffff',
    overlayOpacity: 50,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: 'Cajas & Empaques Personalizados',
    subtitle: 'Lleva la presentación de tu marca al siguiente nivel con acabados de lujo, foil dorado y reserva UV.',
    tag: 'Línea de Empaques',
    ctaText: 'Ver Empaques',
    desktopImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/empaques-cajas',
    link: '/categoria/empaques-cajas',
    displayOrder: 3,
    placement: 'hero',
    animationType: 'zoom',
    bgType: 'GRADIENT',
    bgColor: '#0f172a',
    gradientFrom: '#083344',
    gradientTo: '#0284c7',
    textColor: '#ffffff',
    overlayOpacity: 50,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: '¿Necesitas impulsar tu marca en digital?',
    subtitle: 'Tenemos la agencia que necesitas para todo lo que tiene que ver con marketing digital, diseño de marca y más. Potencia tus impresos con estrategias digitales de alto impacto.',
    tag: 'Aliado Estratégico • Atrio Agencia S.A.S',
    ctaText: 'Visitar ATRIO AGENCIA S.A.S.',
    desktopImageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
    linkType: 'EXTERNAL',
    linkUrl: 'https://www.atrioagencia.com',
    link: 'https://www.atrioagencia.com',
    displayOrder: 4,
    placement: 'partner',
    animationType: 'fade',
    bgType: 'GRADIENT',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#312e81',
    textColor: '#ffffff',
    overlayOpacity: 40,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: 'Revistas, Catálogos y Libros Corporativos',
    subtitle: 'Impresión offset industrial Heidelberg con encuadernación PUR, lomo cosido y despacho nacional.',
    tag: 'Línea Editorial Offset',
    ctaText: 'Cotizar Editorial',
    desktopImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/editorial-merchandising',
    link: '/categoria/editorial-merchandising',
    displayOrder: 5,
    placement: 'hero',
    animationType: 'fade',
    bgType: 'IMAGE',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#14b8a6',
    textColor: '#ffffff',
    overlayOpacity: 50,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: 'Gran Formato & Avisos Publicitarios',
    subtitle: 'Pendones roll-up retráctiles en lona 13oz, vinilos de corte y señalización comercial de alta durabilidad.',
    tag: 'Gran Formato HD',
    ctaText: 'Ver Gran Formato',
    desktopImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=800&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/gran-formato',
    link: '/categoria/gran-formato',
    displayOrder: 6,
    placement: 'hero',
    animationType: 'slide',
    bgType: 'IMAGE',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#14b8a6',
    textColor: '#ffffff',
    overlayOpacity: 50,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: 'Envíos Gratis a toda Colombia en compras superiores a $200.000 COP',
    subtitle: 'Aplica para tirajes litográficos y gran formato a nivel nacional',
    tag: 'Envío Flash',
    ctaText: 'Ver Catálogo',
    desktopImageUrl: null,
    mobileImageUrl: null,
    imageUrl: null,
    linkType: 'CATEGORY',
    linkUrl: '/categoria/todas',
    link: '/categoria/todas',
    displayOrder: 1,
    placement: 'top_bar',
    animationType: 'fade',
    bgType: 'GRADIENT',
    bgColor: '#0f172a',
    gradientFrom: '#042f2e',
    gradientTo: '#0f766e',
    textColor: '#ffffff',
    overlayOpacity: 0,
    active: true,
    isActive: true,
    isPopup: false,
  },
  {
    title: '¡Bienvenido a Fusión Comunicación Gráfica!',
    subtitle: 'Obtén 20% de descuento en tu primer tiraje litográfico utilizando el cupón exclusivo.',
    tag: 'Cupón Especial',
    ctaText: 'Reclamar 20% OFF',
    desktopImageUrl: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=800&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=400&auto=format&fit=crop',
    imageUrl: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=800&auto=format&fit=crop',
    linkType: 'CATEGORY',
    linkUrl: '/categoria/todas',
    link: '/categoria/todas',
    displayOrder: 1,
    placement: 'popup_modal',
    animationType: 'zoom',
    bgType: 'IMAGE',
    bgColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#14b8a6',
    textColor: '#ffffff',
    overlayOpacity: 40,
    active: true,
    isActive: true,
    isPopup: true,
    popupConfig: {
      trigger: 'delay',
      delaySeconds: 4,
      couponCode: 'FUSION2026',
      discountValue: '20% OFF',
      showOncePerSession: false,
      modalSize: 'md',
      confetti: true,
      countdownHours: 48,
    }
  }
];

@Injectable()
export class AdminBannersService {
  private hasEnsuredDefaults = false;

  private async ensureDefaults() {
    if (this.hasEnsuredDefaults) return;
    try {
      const existing = await db.select().from(homeBanners);
      if (existing.length === 0) {
        console.log(`[AdminBannersService] Seeding ${INITIAL_DEFAULT_BANNERS.length} initial default banners...`);
        for (const item of INITIAL_DEFAULT_BANNERS) {
          await db.insert(homeBanners).values(item);
        }
      }
      this.hasEnsuredDefaults = true;
    } catch (e) {
      console.warn('[AdminBannersService] Failed to check/seed default banners:', e);
    }
  }

  async getAll() {
    await this.ensureDefaults();
    return await db.select().from(homeBanners).orderBy(asc(homeBanners.displayOrder), desc(homeBanners.id));
  }

  private parseDate(val: any): Date | null {
    if (!val) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  async create(data: any) {
    const nextOrder = data.displayOrder !== undefined ? Number(data.displayOrder) : 0;
    const result = await db.insert(homeBanners).values({
      title: data.title || 'Nuevo Banner',
      subtitle: data.subtitle || null,
      tag: data.tag || null,
      ctaText: data.ctaText || 'Ver Más',
      desktopImageUrl: data.desktopImageUrl || data.imageUrl || null,
      mobileImageUrl: data.mobileImageUrl || null,
      imageUrl: data.desktopImageUrl || data.imageUrl || null,
      linkType: data.linkType || 'CATEGORY',
      linkUrl: data.linkUrl || data.link || '/categoria/todas',
      link: data.linkUrl || data.link || '/categoria/todas',
      displayOrder: nextOrder,
      placement: data.placement || 'hero',
      animationType: data.animationType || 'fade',
      bgType: data.bgType || 'IMAGE',
      bgColor: data.bgColor || '#0f172a',
      gradientFrom: data.gradientFrom || '#042f2e',
      gradientTo: data.gradientTo || '#0f766e',
      textColor: data.textColor || '#ffffff',
      overlayOpacity: data.overlayOpacity !== undefined ? Number(data.overlayOpacity) : 50,
      active: data.active !== undefined ? Boolean(data.active) : true,
      isActive: data.active !== undefined ? Boolean(data.active) : true,
      isPopup: Boolean(data.isPopup),
      popupConfig: data.popupConfig || null,
      extraConfig: data.extraConfig || null,
      startDate: this.parseDate(data.startDate),
      endDate: this.parseDate(data.endDate),
    }).returning();
    return result[0];
  }

  async update(id: number, data: any) {
    const existing = await db.select().from(homeBanners).where(eq(homeBanners.id, id));
    if (existing.length === 0) {
      throw new NotFoundException(`Banner #${id} no encontrado`);
    }

    const isActive = data.active !== undefined ? Boolean(data.active) : (existing[0].active ?? true);

    const result = await db.update(homeBanners).set({
      title: data.title !== undefined ? data.title : existing[0].title,
      subtitle: data.subtitle !== undefined ? data.subtitle : existing[0].subtitle,
      tag: data.tag !== undefined ? data.tag : existing[0].tag,
      ctaText: data.ctaText !== undefined ? data.ctaText : existing[0].ctaText,
      desktopImageUrl: data.desktopImageUrl !== undefined ? data.desktopImageUrl : existing[0].desktopImageUrl,
      mobileImageUrl: data.mobileImageUrl !== undefined ? data.mobileImageUrl : existing[0].mobileImageUrl,
      imageUrl: data.desktopImageUrl !== undefined ? data.desktopImageUrl : (existing[0].imageUrl || existing[0].desktopImageUrl),
      linkType: data.linkType !== undefined ? data.linkType : existing[0].linkType,
      linkUrl: data.linkUrl !== undefined ? data.linkUrl : existing[0].linkUrl,
      link: data.linkUrl !== undefined ? data.linkUrl : existing[0].link,
      displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : existing[0].displayOrder,
      placement: data.placement !== undefined ? data.placement : existing[0].placement,
      animationType: data.animationType !== undefined ? data.animationType : existing[0].animationType,
      bgType: data.bgType !== undefined ? data.bgType : existing[0].bgType,
      bgColor: data.bgColor !== undefined ? data.bgColor : existing[0].bgColor,
      gradientFrom: data.gradientFrom !== undefined ? data.gradientFrom : existing[0].gradientFrom,
      gradientTo: data.gradientTo !== undefined ? data.gradientTo : existing[0].gradientTo,
      textColor: data.textColor !== undefined ? data.textColor : existing[0].textColor,
      overlayOpacity: data.overlayOpacity !== undefined ? Number(data.overlayOpacity) : existing[0].overlayOpacity,
      active: isActive,
      isActive: isActive,
      isPopup: data.isPopup !== undefined ? Boolean(data.isPopup) : existing[0].isPopup,
      popupConfig: data.popupConfig !== undefined ? data.popupConfig : existing[0].popupConfig,
      extraConfig: data.extraConfig !== undefined ? data.extraConfig : existing[0].extraConfig,
      startDate: data.startDate !== undefined ? this.parseDate(data.startDate) : existing[0].startDate,
      endDate: data.endDate !== undefined ? this.parseDate(data.endDate) : existing[0].endDate,
    }).where(eq(homeBanners.id, id)).returning();

    return result[0];
  }

  async toggleActive(id: number, active?: boolean) {
    const existing = await db.select().from(homeBanners).where(eq(homeBanners.id, id));
    if (existing.length === 0) {
      throw new NotFoundException(`Banner #${id} no encontrado`);
    }
    const nextState = active !== undefined ? Boolean(active) : !existing[0].active;
    const result = await db.update(homeBanners).set({
      active: nextState,
      isActive: nextState,
    }).where(eq(homeBanners.id, id)).returning();

    return result[0];
  }

  async duplicate(id: number) {
    const existing = await db.select().from(homeBanners).where(eq(homeBanners.id, id));
    if (existing.length === 0) {
      throw new NotFoundException(`Banner #${id} no encontrado`);
    }
    const item = existing[0];
    const result = await db.insert(homeBanners).values({
      title: `${item.title} (Copia)`,
      subtitle: item.subtitle,
      tag: item.tag,
      ctaText: item.ctaText,
      desktopImageUrl: item.desktopImageUrl,
      mobileImageUrl: item.mobileImageUrl,
      imageUrl: item.imageUrl,
      linkType: item.linkType,
      linkUrl: item.linkUrl,
      link: item.link,
      displayOrder: (item.displayOrder || 0) + 1,
      placement: item.placement,
      animationType: item.animationType,
      bgType: item.bgType,
      bgColor: item.bgColor,
      gradientFrom: item.gradientFrom,
      gradientTo: item.gradientTo,
      textColor: item.textColor,
      overlayOpacity: item.overlayOpacity,
      active: false, // Start as draft/inactive
      isActive: false,
      isPopup: item.isPopup,
      popupConfig: item.popupConfig,
      extraConfig: item.extraConfig,
      startDate: item.startDate,
      endDate: item.endDate,
    }).returning();

    return result[0];
  }

  async reorder(payload: { items?: { id: number; displayOrder: number }[]; bannerIds?: number[] } | { id: number; displayOrder: number }[]) {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        await db.update(homeBanners)
          .set({ displayOrder: item.displayOrder })
          .where(eq(homeBanners.id, item.id));
      }
    } else if (payload?.bannerIds && Array.isArray(payload.bannerIds)) {
      for (let i = 0; i < payload.bannerIds.length; i++) {
        const bId = payload.bannerIds[i];
        await db.update(homeBanners)
          .set({ displayOrder: i + 1 })
          .where(eq(homeBanners.id, bId));
      }
    } else if (payload?.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        await db.update(homeBanners)
          .set({ displayOrder: item.displayOrder })
          .where(eq(homeBanners.id, item.id));
      }
    }
    return { success: true };
  }

  async delete(id: number) {
    await db.delete(homeBanners).where(eq(homeBanners.id, id));
    return { success: true };
  }
}

