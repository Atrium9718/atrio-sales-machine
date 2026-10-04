import { Injectable } from '@nestjs/common';
import { SeoMetadataItem, SeoCheckResult, SeoTargetType } from '../../types/media';

@Injectable()
export class SeoService {
  private seoItems: SeoMetadataItem[] = [
    {
      id: 'seo-home',
      targetType: 'global',
      targetId: 'home',
      targetName: 'Página Principal (Home Storefront)',
      slug: '',
      canonicalUrl: 'https://fusiongrafica.com.co/',
      pageTitle: 'Fusión Comunicación Gráfica | Imprenta Litográfica & W2P en Colombia',
      metaTitle: 'Imprenta Litográfica Online Colombia | Fusión Gráfica',
      metaDescription: 'Cotiza e imprime papelería corporativa, empaques, libros y material publicitario con tecnología CTP offset 300 DPI y despachos a toda Colombia.',
      keywords: ['imprenta litografica', 'impresion offset bogota', 'cajas plegadizas', 'cotizador libros online', 'impresion corporativa'],
      ogTitle: 'Fusión Comunicación Gráfica - Soluciones Litográficas de Alto Impacto',
      ogDescription: 'Cotizador en línea inteligente, acabados prémium UV, hot stamping y tirajes masivos con despacho nacional.',
      ogImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
      twitterCard: 'summary_large_image',
      robots: 'index, follow',
      schemaType: 'Organization',
      jsonLdSchema: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Fusión Comunicación Gráfica",
        "url": "https://fusiongrafica.com.co",
        "logo": "https://fusiongrafica.com.co/logo.png",
        "description": "Imprenta litográfica y digital industrial con cotizador W2P en Colombia.",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+57-300-1234567",
          "contactType": "customer service",
          "areaServed": "CO"
        }
      }, null, 2),
      seoScore: 96,
      checks: [],
      lastAuditedAt: new Date().toISOString(),
    },
    {
      id: 'seo-libros',
      targetType: 'page',
      targetId: 'cotizador-libros',
      targetName: 'Cotizador Editorial de Libros & Revistas',
      slug: 'cotizador-libros',
      canonicalUrl: 'https://fusiongrafica.com.co/cotizador-libros',
      pageTitle: 'Cotizador de Libros y Revistas Online | Impresión Litográfica',
      metaTitle: 'Impresión de Libros y Revistas al Mejor Precio | Fusión',
      metaDescription: 'Calcula al instante el costo de impresión de libros con lomo cuadrado, cosido hilo o rústica. Tirajes desde 50 unidades con papel propalcote o bond.',
      keywords: ['imprimir libros', 'cotizador editorial', 'libros lomo cosido', 'revistas grapadas', 'impresion catalogos'],
      ogTitle: 'Cotizador de Libros & Revistas al Instante - Fusión Gráfica',
      ogDescription: 'Calcula costos de impresión editorial, tipo de encuadernación y acabados de portada en segundos.',
      ogImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
      twitterCard: 'summary_large_image',
      robots: 'index, follow',
      schemaType: 'Product',
      jsonLdSchema: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Impresión de Libros y Catálogos Editoriales",
        "provider": {
          "@type": "Organization",
          "name": "Fusión Comunicación Gráfica"
        }
      }, null, 2),
      seoScore: 92,
      checks: [],
      lastAuditedAt: new Date().toISOString(),
    },
    {
      id: 'seo-b2b',
      targetType: 'page',
      targetId: 'b2b',
      targetName: 'Portal Corporativo B2B & Distribuidores',
      slug: 'b2b',
      canonicalUrl: 'https://fusiongrafica.com.co/b2b',
      pageTitle: 'Portal Mayorista B2B para Agencias e Imprentas | Fusión',
      metaTitle: 'Precios de Fábrica y Crédito B2B en Litografía | Fusión',
      metaDescription: 'Programa exclusivo para distribuidores, agencias de publicidad y grandes cuentas. Descuentos por volumen, crédito comercial y CTP de alta capacidad.',
      keywords: ['distribuidores litografia', 'precios mayoristas impresion', 'maquila litografica', 'agencias de publicidad'],
      ogTitle: 'Conviértete en Aliado B2B de Fusión Comunicación Gráfica',
      ogDescription: 'Accede a tarifas preferenciales de fábrica y producción industrial garantizada.',
      ogImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
      twitterCard: 'summary_large_image',
      robots: 'index, follow',
      schemaType: 'WebPage',
      jsonLdSchema: '',
      seoScore: 88,
      checks: [],
      lastAuditedAt: new Date().toISOString(),
    }
  ];

  constructor() {
    // Initial audits
    this.seoItems.forEach(item => {
      item.checks = this.runAuditChecks(item);
      item.seoScore = this.calculateScore(item.checks);
    });
  }

  getAll(targetType?: SeoTargetType): SeoMetadataItem[] {
    if (targetType) {
      return this.seoItems.filter(i => i.targetType === targetType);
    }
    return this.seoItems;
  }

  getByTarget(targetType: SeoTargetType, targetId: string): SeoMetadataItem | null {
    return this.seoItems.find(i => i.targetType === targetType && i.targetId === targetId) || null;
  }

  upsert(data: Partial<SeoMetadataItem> & { targetType: SeoTargetType; targetId: string; targetName: string }): SeoMetadataItem {
    const existingIndex = this.seoItems.findIndex(i => i.targetType === data.targetType && i.targetId === data.targetId);

    const base: SeoMetadataItem = existingIndex >= 0 ? this.seoItems[existingIndex] : {
      id: 'seo-' + data.targetType + '-' + data.targetId,
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName,
      slug: data.slug || '',
      canonicalUrl: data.canonicalUrl || `https://fusiongrafica.com.co/${data.slug || ''}`,
      pageTitle: data.pageTitle || data.targetName,
      metaTitle: data.metaTitle || `${data.targetName} | Fusión Gráfica`,
      metaDescription: data.metaDescription || `Impresión litográfica y digital de ${data.targetName} con calidad 300 DPI y despachos a toda Colombia.`,
      keywords: data.keywords || [data.targetName.toLowerCase(), 'litografia', 'impresion'],
      ogTitle: data.ogTitle || data.targetName,
      ogDescription: data.ogDescription || data.metaDescription || '',
      ogImage: data.ogImage || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
      twitterCard: 'summary_large_image',
      robots: 'index, follow',
      schemaType: 'WebPage',
      jsonLdSchema: '',
      seoScore: 0,
      checks: [],
      lastAuditedAt: new Date().toISOString(),
    };

    const merged: SeoMetadataItem = {
      ...base,
      ...data,
      lastAuditedAt: new Date().toISOString(),
    };

    // Calculate SEO health checks
    merged.checks = this.runAuditChecks(merged);
    merged.seoScore = this.calculateScore(merged.checks);

    if (existingIndex >= 0) {
      this.seoItems[existingIndex] = merged;
    } else {
      this.seoItems.push(merged);
    }

    return merged;
  }

  private runAuditChecks(item: SeoMetadataItem): SeoCheckResult[] {
    const checks: SeoCheckResult[] = [];

    // 1. Meta Title Check (50 - 65 chars is ideal)
    const titleLen = (item.metaTitle || '').length;
    if (titleLen === 0) {
      checks.push({
        id: 'title-missing',
        label: 'Meta Título (Title Tag)',
        passed: false,
        message: 'No has definido un Meta Título. Los motores de búsqueda usarán un valor por defecto.',
        severity: 'error',
        scoreImpact: -25,
      });
    } else if (titleLen < 30) {
      checks.push({
        id: 'title-short',
        label: 'Longitud del Meta Título',
        passed: false,
        message: `El título es muy corto (${titleLen} caracteres). Recomendado: entre 50 y 60 caracteres.`,
        severity: 'warning',
        scoreImpact: -10,
      });
    } else if (titleLen > 65) {
      checks.push({
        id: 'title-long',
        label: 'Longitud del Meta Título',
        passed: false,
        message: `El título es muy largo (${titleLen} caracteres) y podría truncarse en Google SERP.`,
        severity: 'warning',
        scoreImpact: -8,
      });
    } else {
      checks.push({
        id: 'title-optimal',
        label: 'Meta Título Óptimo',
        passed: true,
        message: `Excelente longitud (${titleLen} caracteres) para mostrarse completo en Google.`,
        severity: 'good',
        scoreImpact: 20,
      });
    }

    // 2. Meta Description Check (120 - 160 chars)
    const descLen = (item.metaDescription || '').length;
    if (descLen === 0) {
      checks.push({
        id: 'desc-missing',
        label: 'Meta Descripción',
        passed: false,
        message: 'Falta la meta descripción. Es vital para aumentar el CTR de clics en Google.',
        severity: 'error',
        scoreImpact: -25,
      });
    } else if (descLen < 80) {
      checks.push({
        id: 'desc-short',
        label: 'Longitud de Meta Descripción',
        passed: false,
        message: `Descripción corta (${descLen} caracteres). Aprovecha hasta 155 caracteres con un buen CTA.`,
        severity: 'warning',
        scoreImpact: -10,
      });
    } else if (descLen > 165) {
      checks.push({
        id: 'desc-long',
        label: 'Longitud de Meta Descripción',
        passed: false,
        message: `Descripción extensa (${descLen} caracteres). Google cortará el texto con '...'.`,
        severity: 'warning',
        scoreImpact: -8,
      });
    } else {
      checks.push({
        id: 'desc-optimal',
        label: 'Meta Descripción Óptima',
        passed: true,
        message: `Longitud perfecta (${descLen} caracteres) con información clara y persuasiva.`,
        severity: 'good',
        scoreImpact: 25,
      });
    }

    // 3. Open Graph Image
    if (!item.ogImage || item.ogImage.trim() === '') {
      checks.push({
        id: 'og-image-missing',
        label: 'Imagen Open Graph (Redes / WhatsApp)',
        passed: false,
        message: 'No hay imagen Open Graph configurada. Al compartir en WhatsApp no saldrá preview visual.',
        severity: 'warning',
        scoreImpact: -15,
      });
    } else {
      checks.push({
        id: 'og-image-present',
        label: 'Imagen Open Graph Activa',
        passed: true,
        message: 'Imagen lista para compartir en WhatsApp, Facebook y Twitter.',
        severity: 'good',
        scoreImpact: 15,
      });
    }

    // 4. Focus Keywords
    if (!item.keywords || item.keywords.length === 0) {
      checks.push({
        id: 'keywords-missing',
        label: 'Palabras Clave de Enfoque',
        passed: false,
        message: 'Define al menos 3 a 5 palabras clave para monitorear relevancia semántica.',
        severity: 'warning',
        scoreImpact: -10,
      });
    } else if (item.keywords.length >= 3) {
      checks.push({
        id: 'keywords-good',
        label: 'Palabras Clave Asignadas',
        passed: true,
        message: `${item.keywords.length} palabras clave configuradas para indexación temática.`,
        severity: 'good',
        scoreImpact: 15,
      });
    }

    // 5. Canonical URL
    if (item.canonicalUrl && item.canonicalUrl.startsWith('https://')) {
      checks.push({
        id: 'canonical-valid',
        label: 'URL Canónica Segura (HTTPS)',
        passed: true,
        message: 'URL canónica declarada para evitar penalizaciones por contenido duplicado.',
        severity: 'good',
        scoreImpact: 15,
      });
    } else {
      checks.push({
        id: 'canonical-missing',
        label: 'URL Canónica',
        passed: false,
        message: 'Especifica la URL canónica absoluta (https://...) para evitar contenido duplicado.',
        severity: 'warning',
        scoreImpact: -5,
      });
    }

    // 6. Schema JSON-LD
    if (item.jsonLdSchema && item.jsonLdSchema.trim().length > 10) {
      checks.push({
        id: 'schema-present',
        label: 'Datos Estructurados Schema.org',
        passed: true,
        message: 'Bloque JSON-LD configurado para Google Rich Results.',
        severity: 'good',
        scoreImpact: 10,
      });
    }

    return checks;
  }

  private calculateScore(checks: SeoCheckResult[]): number {
    let score = 50; // base score
    for (const c of checks) {
      score += c.scoreImpact;
    }
    return Math.max(0, Math.min(100, score));
  }

  getGlobalAuditSummary() {
    const total = this.seoItems.length;
    const avgScore = Math.round(this.seoItems.reduce((sum, i) => sum + i.seoScore, 0) / (total || 1));
    const perfectCount = this.seoItems.filter(i => i.seoScore >= 90).length;
    const warningCount = this.seoItems.filter(i => i.seoScore < 90 && i.seoScore >= 70).length;
    const criticalCount = this.seoItems.filter(i => i.seoScore < 70).length;

    return {
      totalPagesAudited: total,
      overallHealthScore: avgScore,
      perfectCount,
      warningCount,
      criticalCount,
      items: this.seoItems,
    };
  }
}
