import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '3:4' | '4:3' | '9:16' | '3:2' | string;
  style?: 'fotorealista' | 'vector' | 'acuarela' | '3d_render' | 'textura_fondo' | 'logo_emblema' | 'general' | string;
  productContext?: string;
  engine?: 'gemini' | 'flux' | 'auto';
}

export interface GenerateProductPromptDto {
  productName: string;
  category?: string;
  finishingStyle?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | string;
  targetAudience?: string;
  customDetails?: string;
  offerOrPromo?: string;
}

export interface GeneratedProductPromptResult {
  productName: string;
  englishPrompt: string;
  spanishDescription: string;
  headline: string;
  subtitle: string;
  tag: string;
  ctaText: string;
  recommendedAspect: string;
  recommendedColors: {
    gradientFrom: string;
    gradientTo: string;
    accentColor: string;
  };
  finishingHighlights: string[];
  suggestedStyles: string[];
}

export interface GenerateMarketingOptions {
  productOrTopic: string;
  targetAudience: 'NEW_CUSTOMERS' | 'RECURRENT_CLIENTS' | 'B2B_DISTRIBUTORS' | 'CART_ABANDONERS' | 'GENERAL';
  tone: 'AGRESSIVE_SALES' | 'CORPORATE_PROFESSIONAL' | 'URGENCY_FOMO' | 'PREMIUM_LUXURY' | 'DISCOUNT_OFFER';
  discountOffer?: string;
  cityFocus?: string;
}

export interface GeneratedMarketingResult {
  strategy: {
    campaignName: string;
    hookTitle: string;
    valueProposition: string;
    urgencyTrigger: string;
    targetPersona: string;
  };
  social: {
    instagram: {
      hook: string;
      caption: string;
      hashtags: string[];
      imagePrompt: string;
      suggestedAudioType: string;
    };
    facebook: {
      headline: string;
      postText: string;
      ctaText: string;
    };
    linkedin: {
      articleHeadline: string;
      postContent: string;
      b2bTakeaway: string;
    };
    tiktok: {
      script30s: {
        seconds0to3: string;
        seconds4to15: string;
        seconds16to25: string;
        seconds26to30: string;
      };
    };
  };
  google: {
    headlines: string[]; // 5 short headlines <= 30 chars
    descriptions: string[]; // 3 descriptions <= 90 chars
    keywords: string[]; // 10-15 keywords
    metaTitle: string;
    metaDescription: string;
    structuredDataJsonLd: string;
  };
  email: {
    subjectLines: string[];
    previewText: string;
    targetSegment: string;
    htmlBody: string;
  };
  whatsapp: {
    broadcastMessage: string;
    shortSms: string;
    quickReplyButtons: string[];
  };
}

@Injectable()
export class AiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    } else {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
  }

  getEnvironmentStatus() {
    const maskKey = (k?: string) => {
      if (!k) return null;
      if (k.length <= 8) return '***';
      return `${k.slice(0, 4)}...${k.slice(-4)}`;
    };

    return {
      gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        preview: maskKey(process.env.GEMINI_API_KEY),
        variableName: 'GEMINI_API_KEY',
        description: 'Motor de Inteligencia Artificial Gemini 3.7 Flash & Imagen para generación de copys, campañas y diseño'
      },
      meta: {
        configured: Boolean(process.env.META_ACCESS_TOKEN),
        preview: maskKey(process.env.META_ACCESS_TOKEN),
        variableName: 'META_ACCESS_TOKEN',
        description: 'Meta Graph API para publicación y segmentación en Instagram Business y Facebook Ads'
      },
      whatsapp: {
        configured: Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN),
        preview: maskKey(process.env.WHATSAPP_CLOUD_API_TOKEN),
        variableName: 'WHATSAPP_CLOUD_API_TOKEN',
        description: 'WhatsApp Cloud API oficial para envíos masivos y chatbots de atención de cotizaciones'
      },
      resend: {
        configured: Boolean(process.env.RESEND_API_KEY),
        preview: maskKey(process.env.RESEND_API_KEY),
        variableName: 'RESEND_API_KEY',
        description: 'Servicio de correo transaccional y newsletters de alta entregabilidad'
      },
      googleAds: {
        configured: Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID),
        preview: maskKey(process.env.GOOGLE_ADS_CUSTOMER_ID),
        variableName: 'GOOGLE_ADS_CUSTOMER_ID',
        description: 'Google Ads API para sincronización de conversiones y campañas de búsqueda'
      },
      database: {
        configured: Boolean(process.env.DATABASE_URL),
        preview: maskKey(process.env.DATABASE_URL),
        variableName: 'DATABASE_URL',
        description: 'Base de datos PostgreSQL para almacenamiento de órdenes, clientes y analíticas'
      }
    };
  }

  async testAiConnection(customApiKey?: string): Promise<{ success: boolean; latencyMs: number; model: string; message: string }> {
    const keyToUse = customApiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return {
        success: false,
        latencyMs: 0,
        model: 'gemini-3.7-flash',
        message: 'No se ha detectado GEMINI_API_KEY en las variables de entorno ni en la solicitud.'
      };
    }

    const testClient = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const start = Date.now();
    try {
      const resp = await testClient.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: 'Escribe exactamente: "Conexión exitosa con Gemini AI para Fusión Gráfica".'
      });
      const latencyMs = Date.now() - start;
      const text = resp.text || '';
      
      // If valid, and custom key was provided, we can store in memory
      if (customApiKey) {
        process.env.GEMINI_API_KEY = customApiKey;
        this.ai = testClient;
      }

      return {
        success: true,
        latencyMs,
        model: 'gemini-3.7-flash',
        message: text.trim() || 'Conexión verificada con éxito'
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        latencyMs,
        model: 'gemini-3.7-flash',
        message: err?.message || 'Error al conectar con la API de Gemini'
      };
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required for AI operations');
      }
      this.ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
    return this.ai;
  }

  async generateMarketingCampaign(options: GenerateMarketingOptions): Promise<GeneratedMarketingResult> {
    const { productOrTopic, targetAudience, tone, discountOffer, cityFocus } = options;

    const audienceDescription = {
      NEW_CUSTOMERS: 'Nuevos prospectos / Clientes que nunca han comprado y buscan alta calidad y prueba de confianza',
      RECURRENT_CLIENTS: 'Empresas y clientes recurrentes que necesitan reabastecer papelería y empaques',
      B2B_DISTRIBUTORS: 'Agencias de publicidad, diseñadores independientes e imprentas aliadas que buscan precios de fábrica mayoristas, crédito a 30 días y marca blanca',
      CART_ABANDONERS: 'Usuarios que cotizaron o dejaron su carrito abandonado y requieren un empuje final con oferta irresistible',
      GENERAL: 'Audiencia general empresarial e industrial en Colombia'
    }[targetAudience] || 'Empresas y emprendedores';

    const toneDescription = {
      AGRESSIVE_SALES: 'Agresivo, persuasivo, directo, enfocado en ROI, urgencia y beneficios comerciales inmediatos sin rodeos',
      CORPORATE_PROFESSIONAL: 'Institucional, elegante, enfocado en precisión offset CTP, cumplimiento y respaldo de fábrica',
      URGENCY_FOMO: 'Escasez extrema, cupos limitados, tiempo límite de descuento y llamado a la acción inmediato',
      PREMIUM_LUXURY: 'Sofisticado, acabados de lujo (hot stamping, UV sectorizado, papeles finos), alta exclusividad',
      DISCOUNT_OFFER: 'Centrado en descuentos masivos por escala, bonificaciones de fletes y ahorro de costos'
    }[tone] || 'Comercial persuasivo';

    const prompt = `Eres el Director de Marketing y Crecimiento (Growth Marketer) de "FUSIÓN COMUNICACIÓN GRÁFICA", una imprenta litográfica industrial y digital Web-to-Print líder en Colombia (sede en Manizales y despachos a Pereira, Armenia, Medellín, Bogotá, Cali y todo el país).
Contamos con tecnología de punta Offset Heidelberg, CTP directo a plancha, corte trilateral computarizado, acabados UV reserva, laminados mate/brillante, hot stamping, cajas plegadizas, etiquetas en rollo troqueladas, catálogos, revistas y papelería comercial corporativa.

Genera una campaña omnicanal hiper-optimizada, agresiva y de alta conversión con los siguientes parámetros:
- Producto / Tema: "${productOrTopic}"
- Audiencia Objetivo: "${audienceDescription}"
- Tono de Comunicación: "${toneDescription}"
- Oferta / Gancho Comercial: "${discountOffer || 'Descuento especial por volumen y despacho garantizado a nivel nacional'}"
- Enfoque Geográfico: "${cityFocus || 'Manizales, Pereira, Armenia, Eje Cafetero y envíos a toda Colombia'}"

Debes devolver OBLIGATORIAMENTE un único objeto JSON válido sin bloques markdown adicionales, con la siguiente estructura exacta:
{
  "strategy": {
    "campaignName": "Nombre estratégico de la campaña",
    "hookTitle": "Titular de gancho comercial impactante",
    "valueProposition": "Propuesta de valor diferenciadora",
    "urgencyTrigger": "Gatillo de urgencia o escasez",
    "targetPersona": "Descripción del tomador de decisión"
  },
  "social": {
    "instagram": {
      "hook": "Gancho de los primeros 3 segundos para el reel/post",
      "caption": "Copy completo para Instagram con emojis estratégicos y llamado a la acción al link de la bio/WhatsApp",
      "hashtags": ["#ImpresionLitografica", "#LitografiaColombia", "#TarjetasDePresentacion", "#EmpaquesPersonalizados", "#Manizales", "#Pereira", "#PublicidadB2B"],
      "imagePrompt": "Prompt fotográfico detallado para generar el arte en IA o estudio de diseño",
      "suggestedAudioType": "Audio en tendencia o voz en off enérgica corporativa"
    },
    "facebook": {
      "headline": "Titular de anuncio en Facebook Ads",
      "postText": "Texto persuasivo del post orientado a dueños de negocio y gerentes de compras",
      "ctaText": "Cotizar en Línea / Pedir por WhatsApp"
    },
    "linkedin": {
      "articleHeadline": "Titular profesional orientado a B2B y directores de compras",
      "postContent": "Post con enfoque en optimización de presupuestos de mercadeo, calidad offset y cumplimiento de entregas",
      "b2bTakeaway": "Dato o conclusión clave para empresas"
    },
    "tiktok": {
      "script30s": {
        "seconds0to3": "0-3s: Gancho visual y pregunta perturbadora o revelación de precios de fábrica",
        "seconds4to15": "4-15s: Demostración del producto, acabados premium o ahorro por escala",
        "seconds16to25": "16-25s: Beneficio irresistible y prueba de velocidad de entrega",
        "seconds26to30": "26-30s: Llamado a la acción directo 'Link en el perfil o cotiza en 1 minuto'"
      }
    }
  },
  "google": {
    "headlines": [
      "Headline 1 (máx 30 caracteres)",
      "Headline 2 (máx 30 caracteres)",
      "Headline 3 (máx 30 caracteres)",
      "Headline 4 (máx 30 caracteres)",
      "Headline 5 (máx 30 caracteres)"
    ],
    "descriptions": [
      "Descripción 1 para Google Ads Search (máx 90 caracteres)",
      "Descripción 2 para Google Ads Search (máx 90 caracteres)",
      "Descripción 3 para Google Ads Search (máx 90 caracteres)"
    ],
    "keywords": [
      "imprenta en manizales",
      "litografia industrial colombia",
      "impresion offset pereira",
      "etiquetas adhesivas personalizadas",
      "cajas plegadizas al por mayor",
      "tarjetas de presentacion uv brillo"
    ],
    "metaTitle": "Título SEO optimizado para Google (máx 60 caracteres)",
    "metaDescription": "Meta descripción SEO con CTR optimizado (máx 155 caracteres)",
    "structuredDataJsonLd": "{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Product\\",\\"name\\":\\"${productOrTopic}\\",\\"brand\\":{\\"@type\\":\\"Brand\\",\\"name\\":\\"Fusión Comunicación Gráfica\\"},\\"offers\\":{\\"@type\\":\\"AggregateOffer\\",\\"priceCurrency\\":\\"COP\\",\\"availability\\":\\"https://schema.org/InStock\\"}}"
  },
  "email": {
    "subjectLines": [
      "Línea de asunto 1 (Alta curiosidad y apertura)",
      "Línea de asunto 2 (Oferta directa)",
      "Línea de asunto 3 (Urgencia/Recordatorio B2B)"
    ],
    "previewText": "Texto de vista previa antes de abrir el correo",
    "targetSegment": "Segmento recomendado (ej: Base de Datos B2B / Carritos Abandonados)",
    "htmlBody": "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;'><h1 style='color: #0f766e;'>Fusión Gráfica</h1><p>Contenido persuasivo del newsletter...</p><a href='https://fusiongrafica.com.co' style='display:inline-block; background-color:#0d9488; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold;'>Cotizar Ahora con Descuento</a></div>"
  },
  "whatsapp": {
    "broadcastMessage": "🔥 *FUSIÓN COMUNICACIÓN GRÁFICA | OFERTA EXCLUSIVA* 🔥\\n\\nHola {nombre_contacto}, esperamos que tu empresa marche excelente.\\n\\nTenemos activa una tarifa preferencial de fábrica para *${productOrTopic}*:\\n\\n✅ *Beneficio:* ${discountOffer || 'Descuento especial por volumen'}\\n✅ *Calidad:* Impresión Offset HD + Acabados Premium\\n✅ *Despacho:* Directo a tus instalaciones\\n\\n👉 Cotiza o confirma tu pedido aquí: https://fusiongrafica.com.co\\n\\n¿Deseas que un asesor técnico te envíe la muestra digital?",
    "shortSms": "FUSIÓN GRÁFICA: Precios de fábrica en ${productOrTopic}. Aprovecha ${discountOffer || 'descuento especial'}. Cotiza hoy en fusiongrafica.com.co o WA: 3108420000",
    "quickReplyButtons": [
      "Quiero Cotización Inmediata",
      "Hablar con Asesor B2B",
      "Ver Catálogo de Acabados"
    ]
  }
}`;

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '';
      const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (err: any) {
      console.warn('Gemini marketing generation error or fallback:', err?.message || err);
      // Fallback structured generation so the app never fails
      return this.buildFallbackCampaign(options);
    }
  }

  private buildFallbackCampaign(options: GenerateMarketingOptions): GeneratedMarketingResult {
    const { productOrTopic, targetAudience, discountOffer, cityFocus } = options;
    const offer = discountOffer || 'Hasta 20% de descuento en pedidos por volumen + Prueba CTP bonificada';
    const city = cityFocus || 'Manizales, Pereira, Armenia y todo Colombia';

    return {
      strategy: {
        campaignName: `Campaña Alto Impacto: ${productOrTopic}`,
        hookTitle: `Potencia la Imagen de tu Marca con ${productOrTopic}`,
        valueProposition: 'Impresión litográfica offset de alta definición con acabados de lujo y entregas en tiempo récord.',
        urgencyTrigger: 'Tarifas promocionales por escala vigentes solo por este mes.',
        targetPersona: 'Gerentes de mercadeo, directores de compras, agencias de publicidad y empresarios.'
      },
      social: {
        instagram: {
          hook: '¿Tus impresos transmiten la verdadera calidad de tu empresa? Mira esto 👇',
          caption: `✨ Dale a tu marca el acabado premium que merece con *${productOrTopic}* de Fusión Comunicación Gráfica.\n\n🎯 *¿Por qué elegir nuestra planta litográfica?*\n✅ Calidad Offset de alta resolución\n✅ Acabados especiales: Barniz UV reserva, estampado foil y laminado mate\n✅ Precios directos de fábrica sin intermediarios\n✅ Despachos a ${city}\n\n🔥 *OFERTA ESPECIAL:* ${offer}\n\n👉 Cotiza en línea en segundos en el link de nuestra bio o escríbenos al WhatsApp directo.`,
          hashtags: ['#ImpresionLitografica', '#LitografiaManizales', '#PublicidadColombia', '#DisenoGrafico', '#EmpaquesB2B', '#OffsetPrinting'],
          imagePrompt: `High-end commercial product showcase of ${productOrTopic}, elegant luxury lighting, sharp studio backdrop, vibrant colors, 300 DPI print quality`,
          suggestedAudioType: 'Tendencia empresarial motivacional / Beat moderno'
        },
        facebook: {
          headline: `${productOrTopic} con Precios Directos de Fábrica Litográfica`,
          postText: `¿Necesitas imprimir ${productOrTopic} para tu empresa o clientes? En Fusión Gráfica producimos con tecnología CTP y offset industrial garantizando fidelidad de color y tiempos de entrega exactos. ${offer}. ¡Cotiza ahora mismo y recibe asesoría técnica personalizada!`,
          ctaText: 'Cotizar en Línea'
        },
        linkedin: {
          articleHeadline: `Optimización de Costos y Calidad en Impresión Corporativa: ${productOrTopic}`,
          postContent: `En el entorno corporativo, los materiales impresos son la carta de presentación física de una marca. En Fusión Comunicación Gráfica apoyamos a departamentos de compras y agencias en la producción a escala de ${productOrTopic} con estrictos estándares de control de color y acabados industriales.\n\nContáctanos para habilitar tu cuenta corporativa B2B con beneficios arancelarios y crédito comercial.`,
          b2bTakeaway: 'Reducción comprobada del 18% al 25% en costos de aprovisionamiento de material POP e impresos corporativos.'
        },
        tiktok: {
          script30s: {
            seconds0to3: '¿Cuánto te están cobrando por imprimir esto? Te revelamos el costo real de fábrica...',
            seconds4to15: `Observa el detalle de este acabado en ${productOrTopic}. El barniz UV sectorizado y el registro de color perfecto marcan la diferencia.`,
            seconds16to25: `Somos planta de producción directa en el Eje Cafetero con despachos a todo Colombia. ${offer}.`,
            seconds26to30: 'Cotiza en 1 minuto en nuestra plataforma Web-to-Print. Link en el perfil.'
          }
        }
      },
      google: {
        headlines: [
          'Litografía Directa Fábrica',
          `${productOrTopic.slice(0, 28)}`,
          'Envíos a Todo Colombia',
          'Cotización Inmediata Online',
          'Calidad Offset Garantizada'
        ],
        descriptions: [
          `Impresión litográfica de ${productOrTopic.slice(0, 45)}. Precios de fábrica y acabados premium.`,
          `Cotiza en línea ${productOrTopic.slice(0, 40)}. Despachos a ${city.slice(0, 30)}.`,
          'Más de 15 años de experiencia en artes gráficas. Calidad offset y tiempos récord.'
        ],
        keywords: [
          'litografia manizales',
          'imprenta offset colombia',
          'impresion de ' + productOrTopic.toLowerCase(),
          'etiquetas y empaques industriales',
          'cotizar litografia online',
          'impresion gran formato y offset'
        ],
        metaTitle: `${productOrTopic} | Fusión Comunicación Gráfica`,
        metaDescription: `Impresión litográfica y digital de ${productOrTopic}. Precios directos de fábrica, acabados de lujo y envíos a todo Colombia. ¡Cotiza online!`,
        structuredDataJsonLd: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: productOrTopic,
          brand: { '@type': 'Brand', name: 'Fusión Comunicación Gráfica' },
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'COP',
            availability: 'https://schema.org/InStock'
          }
        }, null, 2)
      },
      email: {
        subjectLines: [
          `🔥 Exclusivo: Tarifa especial en ${productOrTopic}`,
          `¿Necesitas renovar tus impresos? Mira esta oferta para ${productOrTopic}`,
          `[Oportunidad B2B] ${offer}`
        ],
        previewText: 'Aprovecha los precios directos de fábrica litográfica antes de agotar cupos.',
        targetSegment: targetAudience,
        htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 32px 24px; text-align: center; color: #ffffff;">
    <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">FUSIÓN COMUNICACIÓN GRÁFICA</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Planta Litográfica & Plataforma Web-to-Print</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">Impulsa tus Ventas con ${productOrTopic}</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Estimado cliente, ponemos a tu disposición nuestra capacidad industrial en impresión offset y digital con precios directos de planta.</p>
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Beneficio Exclusivo</p>
      <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${offer}</p>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://fusiongrafica.com.co" style="display: inline-block; background: #0d9488; color: #ffffff; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);">Cotizar Ahora en Línea</a>
    </div>
  </div>
  <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0;">Fusión Comunicación Gráfica S.A.S. | Manizales, Caldas, Colombia | Despachos Nacionales</p>
  </div>
</div>
        `
      },
      whatsapp: {
        broadcastMessage: `🔥 *FUSIÓN COMUNICACIÓN GRÁFICA | OFERTA LITOGRÁFICA* 🔥\n\nHola *{nombre_contacto}*, un saludo muy especial.\n\nQueremos informarte que abrimos cupos con tarifa especial de fábrica para producción de *${productOrTopic}*:\n\n✨ *Beneficio:* ${offer}\n🏭 *Producción:* Offset HD con prueba CTP computarizada\n📦 *Despachos:* Directo a tus instalaciones en ${city}\n\n👉 *Cotiza en línea en 1 minuto:* https://fusiongrafica.com.co\n\n¿Deseas que te enviemos la muestra virtual de acabados? Escríbenos "SÍ" para atenderte.`,
        shortSms: `FUSION GRAFICA: Precios de fabrica en ${productOrTopic.slice(0, 25)}. ${offer.slice(0, 40)}. Cotiza en fusiongrafica.com.co`,
        quickReplyButtons: [
          'Solicitar Cotización',
          'Hablar con Asesor Técnico',
          'Pedir Muestra de Acabados'
        ]
      }
    };
  }

  private buildEnrichedPrompt(prompt: string, style?: string): string {
    let styleModifiers = '';

    switch (style) {
      case 'fotorealista':
        styleModifiers = ', high-end commercial product photography, professional studio lighting, crisp 300 DPI print quality, ultra-detailed, 8k resolution, elegant clean composition, centered subject';
        break;
      case 'vector':
        styleModifiers = ', clean flat vector graphic art, modern commercial illustration, sharp vector lines, vibrant balanced colors, print ready, sticker/badge aesthetic, no watermarks, no distorted text';
        break;
      case 'acuarela':
        styleModifiers = ', delicate watercolor painting, fine art paper texture, soft pastel color bleeding, elegant fluid brush strokes, artisanal craft illustration';
        break;
      case '3d_render':
        styleModifiers = ', 3D isometric render, claymation / octane render style, soft ambient occlusion, clean studio lighting, smooth surfaces, modern vibrant tech aesthetic';
        break;
      case 'textura_fondo':
        styleModifiers = ', abstract luxury texture background pattern, seamless geometric or organic surface, premium print backdrop, subtle gradient, high resolution';
        break;
      case 'logo_emblema':
        styleModifiers = ', minimalist brand logo icon, modern graphic symbol, isolated on solid clean background, vector simplicity, corporate branding identity';
        break;
      default:
        styleModifiers = ', high quality print design asset, crisp 300 DPI resolution, professional color palette';
    }

    return `${prompt.trim()}${styleModifiers}`;
  }

  private getDomainAssetFallback(prompt: string): { url: string; category: string; variations: string[] } {
    const p = prompt.toLowerCase();
    
    if (p.includes('atrio') || p.includes('agencia') || p.includes('digital') || p.includes('marketing') || p.includes('branding') || p.includes('estrategia')) {
      return {
        url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
        category: 'Marketing Digital & Branding (Atrio Agencia)',
        variations: [
          'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('tarjeta') || p.includes('presentacion') || p.includes('business card') || p.includes('foil') || p.includes('dorado') || p.includes('lujo')) {
      return {
        url: 'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
        category: 'Tarjetas de Presentación & Acabados de Lujo',
        variations: [
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('caja') || p.includes('empaque') || p.includes('packaging') || p.includes('carton') || p.includes('maule') || p.includes('bolsa')) {
      return {
        url: 'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
        category: 'Cajas & Empaques Personalizados',
        variations: [
          'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('libro') || p.includes('revista') || p.includes('editorial') || p.includes('catalogo') || p.includes('cuaderno') || p.includes('agenda')) {
      return {
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
        category: 'Editorial & Revistas Litográficas',
        variations: [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('pendon') || p.includes('gran formato') || p.includes('rollup') || p.includes('lona') || p.includes('aviso') || p.includes('valla')) {
      return {
        url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
        category: 'Gran Formato & Pendones Roll-Up',
        variations: [
          'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('sticker') || p.includes('etiqueta') || p.includes('adhesivo') || p.includes('vinilo') || p.includes('rollo')) {
      return {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop',
        category: 'Etiquetas y Stickers Troquelados',
        variations: [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('volante') || p.includes('folleto') || p.includes('flyer') || p.includes('triptico') || p.includes('publicidad')) {
      return {
        url: 'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=2000&auto=format&fit=crop',
        category: 'Volantes & Publicidad Comercial',
        variations: [
          'https://images.unsplash.com/photo-1596526131083-e8c638c9c6c5?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }
    if (p.includes('carpeta') || p.includes('folder') || p.includes('corporativo') || p.includes('membrete') || p.includes('sobre')) {
      return {
        url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2000&auto=format&fit=crop',
        category: 'Carpetas & Papelería Corporativa',
        variations: [
          'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop'
        ]
      };
    }

    // Default litography / graphic design press
    return {
      url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
      category: 'Prensa Litográfica Offset CMYK',
      variations: [
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1589041127535-ee162232fb5b?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600868779951-872f7c006b0d?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=2000&auto=format&fit=crop'
      ]
    };
  }

  async generateProductPrompt(dto: GenerateProductPromptDto): Promise<GeneratedProductPromptResult> {
    const { productName, category, finishingStyle, aspectRatio = '16:9', targetAudience, customDetails, offerOrPromo } = dto;

    const isMobile = aspectRatio === '9:16';
    const orientationNote = isMobile 
      ? 'Vertical 9:16 orientation for smartphone screens, centered vertical hero composition' 
      : 'Panoramic 16:9 widescreen layout for desktop web banners with left-side negative space for text overlays';

    const systemPrompt = `You are a World-Class Graphic Arts & Commercial Print Creative Director specializing in Web-to-Print and Advertising Banners for "FUSIÓN COMUNICACIÓN GRÁFICA" (Manizales, Colombia - Industrial Offset & Digital Printing Press).

Given a Product, generate an ultra-realistic, commercially compelling image prompt for AI generation, along with high-conversion marketing copy in Spanish.

Product: "${productName}"
Category: "${category || 'Litografía e Impresión Comercial'}"
Finishing / Material Style: "${finishingStyle || 'Foil Dorado & Plastificado Mate Soft Touch'}"
Layout Orientation: "${orientationNote}"
Target Audience: "${targetAudience || 'Empresas, diseñadores y agencias'}"
Custom Details: "${customDetails || ''}"
Offer / Promo: "${offerOrPromo || 'Precios directos de fábrica litográfica'}"

Return ONLY a valid JSON object matching this schema:
{
  "productName": "${productName}",
  "englishPrompt": "Hyper-detailed studio lighting English photography prompt for Midjourney/Flux/Gemini Imagen. Include lighting (soft studio box, rim light), macro camera angle, material textures (hot stamping foil, UV varnish reflections, 300 DPI paper grain), color accents, crisp clean commercial composition.",
  "spanishDescription": "Explicación breve en español de la escena visual y acabados destacados.",
  "headline": "Titular de alto impacto comercial en español (máx 8 palabras)",
  "subtitle": "Subtítulo persuasivo con propuesta de valor y calidad litográfica (máx 18 palabras)",
  "tag": "Etiqueta / Badge corto (ej: ⚡ Tiraje Offset 300 DPI)",
  "ctaText": "Texto del botón de acción (ej: Cotizar en Línea)",
  "recommendedAspect": "${aspectRatio}",
  "recommendedColors": {
    "gradientFrom": "#042f2e",
    "gradientTo": "#0f766e",
    "accentColor": "#14b8a6"
  },
  "finishingHighlights": ["Barniz UV Reserva", "Foil Metalizado", "Papel Propalcote 300g"],
  "suggestedStyles": ["Fotografía de Estudio Macro", "Mockup Isométrico 3D"]
}`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanJson);
        return {
          productName: parsed.productName || productName,
          englishPrompt: parsed.englishPrompt || this.buildFallbackProductPrompt(dto).englishPrompt,
          spanishDescription: parsed.spanishDescription || 'Fotografía de alta definición litográfica con acabados especiales.',
          headline: parsed.headline || `Impresión de ${productName} con Calidad Offset`,
          subtitle: parsed.subtitle || `Fabricación directa de ${productName} con acabados de lujo y envíos a toda Colombia.`,
          tag: parsed.tag || `⭐ Calidad Litográfica • ${productName}`,
          ctaText: parsed.ctaText || 'Cotizar en Línea',
          recommendedAspect: parsed.recommendedAspect || aspectRatio,
          recommendedColors: parsed.recommendedColors || { gradientFrom: '#042f2e', gradientTo: '#0f766e', accentColor: '#14b8a6' },
          finishingHighlights: Array.isArray(parsed.finishingHighlights) ? parsed.finishingHighlights : ['Calidad 300 DPI', 'Acabados de Lujo'],
          suggestedStyles: Array.isArray(parsed.suggestedStyles) ? parsed.suggestedStyles : ['Fotografía Comercial']
        };
      } catch (err: any) {
        console.warn('Gemini product prompt error, using template engine:', err?.message || err);
      }
    }

    // Return rich template fallback
    return this.buildFallbackProductPrompt(dto);
  }

  private buildFallbackProductPrompt(dto: GenerateProductPromptDto): GeneratedProductPromptResult {
    const { productName, finishingStyle, aspectRatio = '16:9', offerOrPromo } = dto;
    const p = productName.toLowerCase();
    const isMobile = aspectRatio === '9:16';

    let englishPrompt = `High-end commercial studio product photography of ${productName}, crisp 300 DPI graphic arts detail, soft professional key light, subtle reflections, luxury clean background`;
    let headline = `Impresión Premium de ${productName}`;
    let subtitle = `Tecnología offset CTP de alta fidelidad y acabados industriales con despacho directo de fábrica.`;
    let tag = `⭐ Tiraje Litográfico 300 DPI`;
    let ctaText = `Cotizar ${productName.slice(0, 15)}`;
    let gradientFrom = '#042f2e';
    let gradientTo = '#0f766e';
    let accentColor = '#14b8a6';
    let highlights = ['Offset 300 DPI', 'Prueba CTP Computarizada', 'Despacho Nacional'];

    if (p.includes('atrio') || p.includes('agencia') || p.includes('marketing') || p.includes('digital') || p.includes('branding')) {
      englishPrompt = `Modern executive digital marketing and branding creative studio workspace, sleek glass desks, glowing analytics dashboards on modern screens, warm ambient architectural lighting, corporate strategic partner vibe, photorealistic 8k, ${isMobile ? 'vertical portrait orientation' : 'panoramic 16:9 horizontal'}`;
      headline = 'Impulsa tu Marca con Marketing Digital y Estrategia Omnicanal';
      subtitle = 'Alianza estratégica con Atrio Agencia S.A.S para diseño de marca, pauta digital y crecimiento comercial.';
      tag = '🚀 Aliado Estratégico • Atrio Agencia S.A.S';
      ctaText = 'Conocer Atrio Agencia';
      gradientFrom = '#0f172a';
      gradientTo = '#312e81';
      accentColor = '#6366f1';
      highlights = ['Estrategia Digital', 'Pauta Meta & Google', 'Branding Corporativo'];
    } else if (p.includes('tarjeta') || p.includes('business card')) {
      englishPrompt = `Macro close-up studio shot of luxury black and dark green corporate business cards on textured cotton paper, dazzling embossed metallic gold foil edge gilding and typography, soft studio lighting with gentle shadows, ultra sharp 300 DPI print quality, 8k resolution, ${isMobile ? 'vertical layout' : 'horizontal layout with negative space on left'}`;
      headline = 'Tarjetas de Presentación de Lujo con Foil y UV';
      subtitle = 'Causa una primera impresión inolvidable con papeles finos, plastificado mate Soft Touch y estampado metalizado.';
      tag = '💎 Acabados Especiales Foil';
      ctaText = 'Personalizar Tarjetas';
      gradientFrom = '#18181b';
      gradientTo = '#27272a';
      accentColor = '#f59e0b';
      highlights = ['Estampado Foil Dorado', 'Plastificado Soft Touch', 'Barniz UV Reserva'];
    } else if (p.includes('caja') || p.includes('empaque') || p.includes('packaging')) {
      englishPrompt = `Luxury custom cosmetic packaging box mockup, matte dark emerald finish with embossed gold foil details, clean studio pedestal showcase, soft rim lighting, premium folding carton manufacturing, 8k, ${isMobile ? 'vertical 9:16 view' : '16:9 widescreen composition'}`;
      headline = 'Cajas y Empaques Personalizados de Alta Gama';
      subtitle = 'Protege y valoriza tus productos con cajas plegadizas troqueladas en cartón maule y acabados de lujo.';
      tag = '📦 Línea de Empaques Premium';
      ctaText = 'Cotizar Empaques';
      gradientFrom = '#064e3b';
      gradientTo = '#047857';
      accentColor = '#10b981';
      highlights = ['Cartón Maule Calibre 14/16', 'Troquelado de Precisión', 'Barniz UV Brillante'];
    } else if (p.includes('libro') || p.includes('revista') || p.includes('catalogo') || p.includes('editorial')) {
      englishPrompt = `High-end editorial design catalog and magazine spread open on minimalist warm concrete surface, vibrant full-color CMYK offset print pages, spot gloss varnish highlights, crisp binding spine, architectural lighting, ${isMobile ? 'vertical smartphone composition' : 'widescreen landscape'}`;
      headline = 'Revistas, Libros y Catálogos de Alta Definición';
      subtitle = 'Impresión editorial offset con encuadernación PUR o grapa caballete y fidelidad de color certificada.';
      tag = '📚 Producción Editorial Offset';
      ctaText = 'Calcular Lomo y Cotizar';
      gradientFrom = '#083344';
      gradientTo = '#0284c7';
      accentColor = '#38bdf8';
      highlights = ['Encuadernación PUR', 'Propalcote 300g Cubierta', 'Control de Color CMYK'];
    } else if (p.includes('etiqueta') || p.includes('sticker') || p.includes('adhesivo')) {
      englishPrompt = `Vibrant holographic die-cut vinyl stickers and roll labels peeling on a clean graphic studio backdrop, colorful iridescent reflections, crisp vector precision, studio strobe light, ${isMobile ? 'vertical composition' : 'horizontal composition'}`;
      headline = 'Etiquetas y Stickers en Rollo Troquelados';
      subtitle = 'Adhesivos en vinilo mate, brillante o transparente resistentes al agua, congelación y fricción.';
      tag = '🏷️ Adhesivos en Rollo & Troquel';
      ctaText = 'Diseñar Stickers';
      gradientFrom = '#701a75';
      gradientTo = '#db2777';
      accentColor = '#f472b6';
      highlights = ['Vinilo Resistente al Agua', 'Troquel Computarizado', 'Tintas UV'];
    } else if (p.includes('pendon') || p.includes('gran formato') || p.includes('rollup') || p.includes('lona')) {
      englishPrompt = `Modern aluminum retractable roll-up banner stand standing in a bright minimalist corporate expo showroom, vibrant ultra-high resolution graphic print, crisp typography, clean lighting, ${isMobile ? 'vertical 9:16 framing' : 'wide exhibition hall view'}`;
      headline = 'Pendones Roll-Up y Publicidad Gran Formato';
      subtitle = 'Lona banner de alta resistencia 13oz con estructura de aluminio retráctil y bolso de transporte incluido.';
      tag = '🏢 Gran Formato & Eventos';
      ctaText = 'Ver Medidas y Precios';
      gradientFrom = '#1e293b';
      gradientTo = '#334155';
      accentColor = '#38bdf8';
      highlights = ['Lona Banner 13oz', 'Estructura Retráctil', 'Resolución 1440 DPI'];
    }

    if (offerOrPromo) {
      subtitle += ` ¡Aprovecha: ${offerOrPromo}!`;
    }

    return {
      productName,
      englishPrompt,
      spanishDescription: `Render fotográfico de estudio para ${productName} con acabados ${finishingStyle || 'litográficos 300 DPI'}.`,
      headline,
      subtitle,
      tag,
      ctaText,
      recommendedAspect: aspectRatio,
      recommendedColors: {
        gradientFrom,
        gradientTo,
        accentColor
      },
      finishingHighlights: highlights,
      suggestedStyles: ['Fotografía de Estudio Macro', 'Mockup Isométrico 3D', 'Comercial 300 DPI']
    };
  }

  async generateImage(options: GenerateImageOptions): Promise<{ 
    imageUrl: string; 
    fallbackUrl: string;
    variations: string[];
    isAiGenerated: boolean; 
    source: string; 
    category?: string;
    note?: string 
  }> {
    const rawPrompt = options?.prompt || 'diseño gráfico litografía imprenta alta calidad';
    const aspectRatio = options?.aspectRatio || '16:9';
    const style = options?.style || 'fotorealista';
    const enrichedPrompt = this.buildEnrichedPrompt(rawPrompt, style);

    // Determine dimensions based on aspect ratio
    let width = 1280;
    let height = 720;
    if (aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    } else if (aspectRatio === '3:2') {
      width = 1200;
      height = 800;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    }

    const domainAsset = this.getDomainAssetFallback(rawPrompt);

    // Try Gemini Imagen if API key is active
    let geminiDataUri: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const client = this.getClient();
        const validAspect = ['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '16:9';
        const aiResp = await client.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: enrichedPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: validAspect as any
            }
          }
        });

        if (aiResp?.candidates?.[0]?.content?.parts) {
          for (const part of aiResp.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              geminiDataUri = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn('Gemini Imagen direct call note (using Flux HD engine):', err?.message || err);
      }
    }

    // High quality AI Image render URL with seed
    const seed = Math.floor(Math.random() * 900000) + 100000;
    const cleanPrompt = encodeURIComponent(enrichedPrompt.slice(0, 320));
    const fluxUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    const primaryImageUrl = geminiDataUri || fluxUrl;
    const variations = [
      primaryImageUrl,
      fluxUrl,
      `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed + 42}&nologo=true&model=flux`,
      ...domainAsset.variations
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    return {
      imageUrl: primaryImageUrl,
      fallbackUrl: domainAsset.url,
      variations,
      isAiGenerated: true,
      category: domainAsset.category,
      source: geminiDataUri ? 'Motor Gemini Imagen 300 DPI' : 'Motor IA Flux Ultra-HD + Litografía',
      note: geminiDataUri 
        ? 'Generado nativamente con Google Gemini Imagen a 300 DPI.' 
        : 'Renderizado fotorrealista para artes gráficas e impresión comercial.'
    };
  }

  /**
   * Generador de Copys Comerciales y Persuasivos con Asistente Gemini IA
   */
  async generateCreativeCopy(req: {
    copyType: string;
    tone: string;
    productOrTopic: string;
    category?: string;
    targetAudience?: string;
    specialFeatures?: string;
    offerOrPromo?: string;
  }): Promise<{
    headline: string;
    subtitle: string;
    mainCopy: string;
    bulletPoints: string[];
    ctaText: string;
    suggestedKeywords: string[];
    socialSnippet: string;
    technicalNote: string;
  }> {
    const toneDescriptions: Record<string, string> = {
      LITHO_PROFESSIONAL: 'Técnico de alta precisión litográfica 300 DPI, CTP, calibración de color ISO y estándares de pre-prensa.',
      COMMERCIAL_URGENCY: 'Comercial de alta conversión, enfatizando rapidez de entrega, precios de fábrica y llamados a la acción inmediatos.',
      B2B_CORPORATE: 'Corporativo e institucional, orientado a directores de compras, agencias de publicidad y pedidos al por mayor.',
      CREATIVE_DESIGN: 'Innovador, elegante y vanguardista, destacando texturas táctiles, acabados especiales (Foil, UV, Troquel) y estética prémium.',
      LUXURY_PREMIUM: 'Exclusivo y sofisticado, resaltando papeles de alta gama, estampados metalizados y empaques de lujo.'
    };

    const toneDesc = toneDescriptions[req.tone] || toneDescriptions.LITHO_PROFESSIONAL;

    const systemPrompt = `Eres el redactor publicitario senior y especialista técnico en artes gráficas de "FUSIÓN Comunicación Gráfica", una imprenta litográfica y digital líder en Colombia con tecnología CTP, máquinas Heidelberg offset y acabados especiales.

Tu tarea es redactar textos publicitarios y de producto altamente persuasivos, perfectamente adaptados para imprenta online (Web-to-Print).

Parámetros:
- Tipo de contenido: ${req.copyType}
- Producto / Tema: ${req.productOrTopic}
- Categoría: ${req.category || 'Litografía Comercial'}
- Audiencia: ${req.targetAudience || 'Empresas, Diseñadores y Emprendedores'}
- Acabados y Características Especiales: ${req.specialFeatures || 'Impresión Offset Full Color 300 DPI, Troquelado y Barniz UV'}
- Oferta / Promoción: ${req.offerOrPromo || 'Descuentos por volumen y despacho nacional garantizado'}
- Tono Requerido: ${req.tone} (${toneDesc})

Devuelve EXCLUSIVAMENTE un JSON válido con la siguiente estructura (sin formato markdown exterior):
{
  "headline": "Titular impactante y vendedor (máx 12 palabras)",
  "subtitle": "Subtítulo explicativo con propuesta de valor única",
  "mainCopy": "Párrafo principal persuasivo (40-60 palabras)",
  "bulletPoints": [
    "Beneficio clave 1 con especificación técnica",
    "Beneficio clave 2 con acabado prémium o durabilidad",
    "Beneficio clave 3 sobre tiempo de entrega o costo por unidad",
    "Beneficio clave 4 sobre asesoría técnica y revisión de archivos"
  ],
  "ctaText": "Texto del botón de acción (ej: Cotizar con Descuento Mayorista)",
  "suggestedKeywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "socialSnippet": "Texto breve optimizado para WhatsApp / Instagram / Facebook",
  "technicalNote": "Ficha técnica o recomendación de pre-prensa (ej: Resolución 300 DPI en CMYK con 3mm de sangría)"
}`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        if (parsed && parsed.headline) {
          return parsed;
        }
      } catch (err: any) {
        console.warn('Gemini generateCreativeCopy fallback:', err?.message || err);
      }
    }

    // High quality contextual fallback
    return {
      headline: `Impresión Litográfica de ${req.productOrTopic} con Acabados de Alto Impacto`,
      subtitle: `Eleva la presencia de tu marca con nitidez a 300 DPI y terminados prémium como ${req.specialFeatures || 'Barniz UV y Troquel Especial'}.`,
      mainCopy: `En Fusión Comunicación Gráfica transformamos tus diseños en piezas impresas impecables. Fabricamos ${req.productOrTopic} con papeles certificados de alto gramaje, control espectral de color en prensa offset y tecnología CTP directa a plancha para garantizar tirajes perfectos desde el primer ejemplar.`,
      bulletPoints: [
        `Resolución fotográfica 300 DPI y calibración de color CMYK certificada`,
        `Papeles ecológicos y propalcotes de 150g a 350g con opciones de laminado mate o brillante`,
        `Precios escalonados con ahorros de hasta el 45% en pedidos por volumen y tirajes mayoristas`,
        `Revisión técnica gratuita de pre-prensa y verificación de sangrías antes de imprimir`
      ],
      ctaText: `Cotizar ${req.productOrTopic} en Línea`,
      suggestedKeywords: [
        req.productOrTopic.toLowerCase(),
        'imprenta litografica',
        'impresion offset',
        'acabados especiales uv',
        'precio por mayor colombia'
      ],
      socialSnippet: `¡Destaca tu marca! Imprime tus ${req.productOrTopic} con calidad prémium 300 DPI y acabados exclusivos. Pide tu cotización al instante con despacho nacional.`,
      technicalNote: `Enviar archivos en formato PDF/X-1a, espacio de color CMYK, resolución mínima de 300 DPI y 3 mm de sangría perimetral.`
    };
  }

  /**
   * Generador de Sugerencias SEO y Meta-Etiquetas con Gemini IA
   */
  async generateSeoSuggestions(req: {
    pageTitle: string;
    pageType: string;
    contentSummary: string;
    currentKeywords?: string[];
  }): Promise<{
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    suggestedSlug: string;
    ogTitle: string;
    ogDescription: string;
    schemaJson: string;
  }> {
    const prompt = `Eres un experto en SEO Técnico y Optimización de Conversión para comercio electrónico e imprentas online (Web-to-Print).

Genera los metadatos SEO óptimos para la siguiente página:
- Título/Tema: ${req.pageTitle}
- Tipo de página: ${req.pageType}
- Resumen del contenido: ${req.contentSummary}
- Palabras clave base: ${(req.currentKeywords || []).join(', ')}

Reglas estrictas de SEO:
1. "metaTitle": Entre 50 y 60 caracteres exactos, incluyendo palabra clave principal y marca "| Fusión Gráfica".
2. "metaDescription": Entre 130 y 155 caracteres exactos, persuasivo con llamado a la acción.
3. "keywords": Array de 6 a 8 términos de búsqueda con intención comercial y local (Colombia / Imprenta).
4. "suggestedSlug": URL amigable en minúsculas separada por guiones.
5. "ogTitle": Título optimizado para compartir en WhatsApp y Facebook.
6. "ogDescription": Descripción atractiva para vista previa en redes sociales.
7. "schemaJson": Bloque JSON-LD válido para Schema.org (Product, Service o WebPage).

Responde EXCLUSIVAMENTE con un JSON válido.`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        if (parsed && parsed.metaTitle) {
          return parsed;
        }
      } catch (err: any) {
        console.warn('Gemini generateSeoSuggestions fallback:', err?.message || err);
      }
    }

    const cleanTitle = req.pageTitle.trim();
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
      metaTitle: `${cleanTitle} | Impresión Litográfica Fusión`,
      metaDescription: `Imprime ${cleanTitle} con la más alta calidad litográfica a 300 DPI. Cotiza online con acabados de lujo y envíos a toda Colombia.`,
      keywords: [
        cleanTitle.toLowerCase(),
        'imprenta litografica',
        'impresion offset bogota',
        'acabados litograficos',
        'precios de fabrica',
        'tienda web to print'
      ],
      suggestedSlug: slug,
      ogTitle: `${cleanTitle} - Calidad de Impresión Litográfica Prémium`,
      ogDescription: `Descubre las mejores opciones de impresión para ${cleanTitle}. Cotización inmediata y producción profesional en Fusión Gráfica.`,
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": cleanTitle,
        "description": `Servicio de impresión litográfica profesional para ${cleanTitle} con tecnología CTP offset.`,
        "brand": {
          "@type": "Brand",
          "name": "Fusión Comunicación Gráfica"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "COP",
          "availability": "https://schema.org/InStock"
        }
      }, null, 2)
    };
  }
}



