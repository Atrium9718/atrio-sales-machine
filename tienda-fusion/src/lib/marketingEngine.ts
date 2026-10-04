export type ChannelCategory = 'EMAIL' | 'WHATSAPP' | 'SOCIAL_META' | 'GOOGLE_ADS' | 'SMS';

export type ChannelConnection = {
  id: string;
  name: string;
  category: 'SOCIAL' | 'SEARCH' | 'MESSAGING' | 'EMAIL';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  accountName: string;
  configFields: Record<string, string>;
  metrics: {
    reachOrAudience: string;
    conversionRate: string;
    lastSyncDate: string;
  };
};

export type EmailCampaignTemplate = {
  id: string;
  title: string;
  category: 'PROMOTIONAL' | 'B2B_DISTRIBUTORS' | 'CART_RECOVERY' | 'SEASONAL' | 'REENGAGEMENT';
  subject: string;
  previewText: string;
  preheader: string;
  badge: string;
  htmlContent: string;
  recommendedAudience: string;
  stats?: {
    openRate: string;
    clickRate: string;
  };
};

export type MarketingCampaignRecord = {
  id: string;
  title: string;
  targetProduct: string;
  targetAudience: string;
  channelType: 'EMAIL' | 'WHATSAPP' | 'META' | 'GOOGLE' | 'OMNICHANNEL';
  channels: string[];
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED' | 'SCHEDULED';
  sentDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueGenerated: number;
  budgetCOP?: number;
  roas?: number;
  emailDetails?: {
    subject: string;
    previewText: string;
    senderName: string;
    senderEmail: string;
    openRate?: number;
    clickRate?: number;
    recipientsCount?: number;
    htmlBody: string;
  };
  whatsappDetails?: {
    broadcastMessage: string;
    contactsTargeted: number;
    deliveredCount: number;
    repliedCount: number;
  };
  socialDetails?: {
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'LINKEDIN';
    headline: string;
    copy: string;
    cta: string;
    targetLocation: string;
  };
  googleDetails?: {
    headline: string;
    description: string;
    keywords: string[];
    costPerClickCOP: number;
  };
  content?: any;
};

export type AutomationWorkflow = {
  id: string;
  name: string;
  category?: 'CART_ABANDONMENT' | 'B2B_REORDER' | 'WELCOME_SERIES' | 'ORDER_UPDATE' | 'CUSTOM';
  description: string;
  triggerEvent: string;
  delay: string;
  delayMinutes?: number;
  channels: string[];
  status: 'ACTIVE' | 'PAUSED';
  couponCode?: string;
  discountPercent?: number;
  messageCustomization?: {
    whatsappText?: string;
    emailSubject?: string;
    emailPreview?: string;
    emailBodyHtml?: string;
  };
  stats: {
    triggered: number;
    opened: number;
    converted: number;
    recoveredRevenueCOP?: number;
  };
};

export type AudienceContact = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  department: string;
  totalSpentCOP: number;
  ordersCount: number;
  lastOrderDate: string;
  preferredCategory: string;
  isVip: boolean;
};

export type AudienceSegment = {
  id: string;
  name: string;
  tag: string;
  categoryType: 'B2B_VIP' | 'PACKAGING_RECURRENT' | 'LOCAL_CITIES' | 'CART_ABANDONMENT' | 'NATIONAL_ALL' | 'CUSTOM';
  description: string;
  totalContacts: number;
  growthRate: string;
  criteria: {
    minSpentCOP?: number;
    categories?: string[];
    cities?: string[];
    orderCountMin?: number;
    abandonedCart?: boolean;
    daysAgoMax?: number;
    country?: string;
  };
  lastUpdated: string;
  engagementRate: number;
  avgTicketCOP?: number;
  topCities?: string[];
  contacts?: AudienceContact[];
};

export const INITIAL_CHANNEL_CONNECTIONS: ChannelConnection[] = [
  {
    id: 'resend_email',
    name: 'Resend Email API / SMTP Corporativo',
    category: 'EMAIL',
    status: 'CONNECTED',
    accountName: 'ventas@fusiongrafica.com.co',
    configFields: {
      'API Key': 're_prod_94827xxxxxxxxxxxxxxxxx',
      'Remitente Oficial': 'Fusión Comunicación Gráfica <ventas@fusiongrafica.com.co>',
      'Servidor SMTP': 'smtp.resend.com (Puerto 465 SSL)',
      'Tasa de Entrega': '99.4% (DKIM & SPF Validados)'
    },
    metrics: { reachOrAudience: '14.8K Suscriptores B2B & B2C', conversionRate: '3.6%', lastSyncDate: 'Hace 4 min' }
  },
  {
    id: 'wa_cloud',
    name: 'WhatsApp Cloud API Oficial (Meta)',
    category: 'MESSAGING',
    status: 'CONNECTED',
    accountName: '+57 (6) 885 5555 / +57 310 456 7890',
    configFields: {
      'WABA Phone Number ID': '109827346129845',
      'Token de Acceso Permanente': 'EAAK487xxxxxxxxxxxxxxxxxxxxxxxxx',
      'Plantilla Aprobada': 'notificacion_cotizacion_v2',
      'Límite de Mensajes': '10,000 conversaciones / 24h'
    },
    metrics: { reachOrAudience: '6.4K Clientes Registrados', conversionRate: '14.8%', lastSyncDate: 'Hace 2 min' }
  },
  {
    id: 'meta_ig',
    name: 'Instagram Graph API & Reels Ads',
    category: 'SOCIAL',
    status: 'CONNECTED',
    accountName: '@fusiongraficacol (Perfil Comercial)',
    configFields: {
      'Instagram Business ID': '178414002938472',
      'Píxel de Meta': '837261940283719',
      'Catálogo de Productos Sincronizado': '24 productos litográficos'
    },
    metrics: { reachOrAudience: '18.2K Seguidores Orgánicos + Ads', conversionRate: '4.5%', lastSyncDate: 'Hace 8 min' }
  },
  {
    id: 'meta_fb',
    name: 'Facebook Ads Manager & Retargeting',
    category: 'SOCIAL',
    status: 'CONNECTED',
    accountName: 'Fusión Comunicación Gráfica Oficial',
    configFields: {
      'Cuenta Publicitaria ID': 'act_293847192834',
      'Presupuesto Activo': '$ 1.200.000 COP / mes',
      'Objetivo Principal': 'Generación de Clientes Potenciales & Ventas Web'
    },
    metrics: { reachOrAudience: '112K Alcance Mensual Colombia', conversionRate: '3.9%', lastSyncDate: 'Hace 10 min' }
  },
  {
    id: 'google_ads',
    name: 'Google Ads Search & Performance Max',
    category: 'SEARCH',
    status: 'CONNECTED',
    accountName: 'CID: 482-938-1920 (Fusión Gráfica)',
    configFields: {
      'ID de Cliente Google Ads': '482-938-1920',
      'Conversiones Medidas': 'Cotizaciones Online & Compras Checkout',
      'Presupuesto Diario': '$ 45.000 COP'
    },
    metrics: { reachOrAudience: '22.4K Impresiones Search / Mes', conversionRate: '5.2%', lastSyncDate: 'Hace 15 min' }
  }
];

export const INITIAL_EMAIL_TEMPLATES: EmailCampaignTemplate[] = [
  {
    id: 'tpl_b2b_wholesale',
    title: 'Catálogo de Precios Mayoristas para Agencias & Diseñadores',
    category: 'B2B_DISTRIBUTORS',
    badge: 'Alta Conversión B2B',
    subject: '🏢 Tarifario Mayorista 2025: Precios de Fábrica Directa para tu Agencia',
    previewText: 'Aumenta tus márgenes comerciales hasta un 45% con despacho garantizado desde Manizales a toda Colombia.',
    preheader: 'Descuentos exclusivos por escala y crédito corporativo a 30 días.',
    recommendedAudience: 'Agencias de Publicidad, Diseñadores & Litografías Aliadas (B2B)',
    stats: { openRate: '42.8%', clickRate: '12.4%' },
    htmlContent: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #042f2e 100%); padding: 32px 24px; text-align: center;">
    <span style="background-color: #14b8a6; color: #022c22; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">Portal Aliados B2B</span>
    <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 16px 0 8px 0;">¿Listo para duplicar el margen de tus proyectos gráficos?</h1>
    <p style="color: #99f6e4; font-size: 14px; margin: 0; line-height: 1.5;">Imprime con nosotros a precio de planta offset y entrega a tus clientes con marca blanca.</p>
  </div>
  <div style="padding: 28px 24px;">
    <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin-top: 0;">Ventajas Exclusivas para tu Negocio:</h2>
    <ul style="color: #334155; font-size: 13px; line-height: 1.8; padding-left: 20px; margin-bottom: 24px;">
      <li><strong>Precios de Fábrica Heidelberg:</strong> Descuentos de hasta el 40% frente a precio mostrador.</li>
      <li><strong>Empaque Neutro (Marca Blanca):</strong> Enviamos directo a tu cliente final con tu remitente.</li>
      <li><strong>Prueba Digital CTP Bonificada:</strong> Cero costos ocultos en preparación de planchas.</li>
      <li><strong>Despachos Diarios:</strong> Manizales, Pereira, Armenia, Medellín, Bogotá, Cali y más.</li>
    </ul>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
      <span style="color: #166534; font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">CUPÓN ESPECIAL PRIMER PEDIDO B2B</span>
      <span style="color: #15803d; font-size: 20px; font-weight: 900; letter-spacing: 2px;">AGENCIAVIP25</span>
      <span style="color: #166534; font-size: 11px; display: block; margin-top: 4px;">25% DTO extra en tu primera orden superior a $ 500.000 COP</span>
    </div>
    <div style="text-align: center;">
      <a href="https://fusiongrafica.com.co/registro-agencias" style="background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 800; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
        Activar Cuenta B2B Mayorista
      </a>
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #64748b;">
    Fusión Comunicación Gráfica S.A.S · Manizales, Caldas, Colombia · PBX: +57 (6) 885 5555
  </div>
</div>`
  },
  {
    id: 'tpl_cart_recovery',
    title: 'Rescate Automático de Cotización / Carrito Abandonado',
    category: 'CART_RECOVERY',
    badge: 'Recuperación de Ventas',
    subject: '🛒 ¿Olvidaste tus impresiones en el carrito? Tenemos un 15% DTO para ti',
    previewText: 'Guardamos tu diseño y cotización técnica. Completa tu pedido hoy con flete bonificado.',
    preheader: 'Tus archivos de impresión están seguros y listos para producción.',
    recommendedAudience: 'Cotizaciones sin completar en las últimas 24 horas',
    stats: { openRate: '58.4%', clickRate: '24.1%' },
    htmlContent: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background-color: #0f172a; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0;">Tu proyecto gráfico te está esperando en taller</h1>
  </div>
  <div style="padding: 24px;">
    <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 0;">
      Notamos que estuviste configurando tu pedido pero no alcanzaste a finalizarlo. Para ayudarte a tener tus materiales a tiempo en tus manos, te otorgamos un <strong>15% de descuento inmediato</strong> y revisión técnica de archivos sin costo.
    </p>
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
      <span style="font-size: 12px; color: #64748b; display: block;">Código de Descuento Flash:</span>
      <span style="font-size: 22px; font-weight: 900; color: #0d9488; letter-spacing: 2px;">VUELVE15</span>
      <span style="font-size: 11px; color: #ef4444; display: block; margin-top: 4px;">Válido únicamente por las próximas 48 horas</span>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://fusiongrafica.com.co/carrito" style="background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 800; border-radius: 10px; display: inline-block;">
        Finalizar Mi Pedido con Descuento
      </a>
    </div>
  </div>
</div>`
  },
  {
    id: 'tpl_packaging_promo',
    title: 'Campaña Especial Cajas Plegadizas & Empaques para Alimentos',
    category: 'PROMOTIONAL',
    badge: 'Lanzamiento Industrial',
    subject: '📦 Cajas Plegadizas y Empaques con Certificación de Grado Alimenticio',
    previewText: 'Cartón Maule y reverso kraft con barniz barrera anti-grasa. Cotiza desde 500 unidades.',
    preheader: 'Troqueles estándar sin costo de matriz para tu emprendimiento o empresa.',
    recommendedAudience: 'Restaurantes, Marcas de Moda, Cosméticos y E-commerce',
    stats: { openRate: '38.2%', clickRate: '9.8%' },
    htmlContent: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #134e4a 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: white;">
    <span style="background-color: #f59e0b; color: #78350f; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;">Empaques Sostenibles</span>
    <h1 style="font-size: 22px; font-weight: 900; margin: 12px 0 6px 0;">Eleva la presentación de tu marca con cajas litográficas</h1>
    <p style="color: #ccfbf1; font-size: 13px; margin: 0;">Acabados en reserva UV, estampado oro/plata y resistencia estructural garantizada.</p>
  </div>
  <div style="padding: 24px;">
    <p style="color: #334155; font-size: 13px; line-height: 1.6;">
      En Fusión Comunicación Gráfica producimos empaques a medida para todo tipo de industrias: alimentos, e-commerce, cosmética y regalos corporativos.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://fusiongrafica.com.co/cotizador-empaques" style="background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 800; border-radius: 8px; display: inline-block;">
        Ver Modelos y Cotizar en Línea
      </a>
    </div>
  </div>
</div>`
  },
  {
    id: 'tpl_labels_reorder',
    title: 'Reabastecimiento de Etiquetas Adhesivas en Rollo',
    category: 'REENGAGEMENT',
    badge: 'Fidelización Clientes',
    subject: '🏷️ ¿Se te están agotando tus etiquetas adhesivas? Reordena en 1 clic',
    previewText: 'Mantenemos tus archivos listos para entrar a máquina de inmediato sin demoras.',
    preheader: 'Envío prioritario express para clientes frecuentes.',
    recommendedAudience: 'Clientes de Etiquetas Adhesivas con última compra > 30 días',
    stats: { openRate: '46.1%', clickRate: '15.2%' },
    htmlContent: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background-color: #0f766e; padding: 24px; text-align: center; color: white;">
    <h1 style="font-size: 20px; font-weight: 900; margin: 0;">Reabastece tus Etiquetas en Rollo</h1>
    <p style="color: #ccfbf1; font-size: 12px; margin: 6px 0 0 0;">Papel semi-brillante, vinilo adhesivo resistente al agua y ribbon de alta fijación.</p>
  </div>
  <div style="padding: 24px; text-align: center;">
    <p style="color: #334155; font-size: 13px; line-height: 1.6;">
      Sabemos que no puedes parar tu producción por falta de insumos de rotulado. Tu troquel y diseño ya están configurados en nuestro taller.
    </p>
    <a href="https://fusiongrafica.com.co/reordenar-etiquetas" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 800; border-radius: 8px; display: inline-block; margin-top: 12px;">
      Reordenar con Mismo Archivo
    </a>
  </div>
</div>`
  }
];

export const INITIAL_CAMPAIGNS: MarketingCampaignRecord[] = [
  {
    id: 'CAMP-9021',
    title: 'Campaña B2B: Reactivación Agencias y Diseñadores Mayoristas',
    targetProduct: 'Catálogo de Precios Mayoristas & Cajas Plegadizas',
    targetAudience: '🏢 Distribuidores, Agencias & Imprentas (B2B)',
    channelType: 'EMAIL',
    channels: ['EMAIL_MARKETING', 'WHATSAPP_BROADCAST'],
    status: 'ACTIVE',
    sentDate: '2025-02-18',
    impressions: 4820,
    clicks: 612,
    conversions: 48,
    revenueGenerated: 8450000,
    budgetCOP: 250000,
    roas: 33.8,
    emailDetails: {
      subject: '🏢 Tarifario Mayorista 2025: Precios de Fábrica Directa para tu Agencia',
      previewText: 'Aumenta tus márgenes comerciales hasta un 45% con despacho garantizado a toda Colombia.',
      senderName: 'Fusión Comunicación Gráfica',
      senderEmail: 'ventas@fusiongrafica.com.co',
      openRate: 44.5,
      clickRate: 12.7,
      recipientsCount: 2450,
      htmlBody: INITIAL_EMAIL_TEMPLATES[0].htmlContent
    }
  },
  {
    id: 'CAMP-8812',
    title: 'Lanzamiento Etiquetas Adhesivas en Rollo Eje Cafetero & Nacional',
    targetProduct: 'Etiquetas adhesivas en rollo con barniz UV y troquel digital',
    targetAudience: '✨ Nuevos Clientes & Emprendedores (B2C)',
    channelType: 'META',
    channels: ['META_INSTAGRAM', 'META_FACEBOOK', 'GOOGLE_ADS'],
    status: 'ACTIVE',
    sentDate: '2025-02-10',
    impressions: 34500,
    clicks: 1420,
    conversions: 82,
    revenueGenerated: 12800000,
    budgetCOP: 650000,
    roas: 19.6,
    socialDetails: {
      platform: 'INSTAGRAM',
      headline: 'Etiquetas en Rollo para tu Producto',
      copy: '¿Quieres que tus productos resalten en la estantería? Imprime etiquetas en rollo con acabados profesionales. Cotiza en 1 minuto.',
      cta: 'Cotizar en Línea',
      targetLocation: 'Manizales, Pereira, Armenia, Medellín, Bogotá'
    }
  },
  {
    id: 'CAMP-7634',
    title: 'Recuperación de Carritos y Cotizaciones Abandonadas',
    targetProduct: 'Tarjetas de Presentación, Carpetas y Factureros',
    targetAudience: '🛒 Rescate de Carritos & Cotizaciones Abandonadas',
    channelType: 'WHATSAPP',
    channels: ['WHATSAPP_BROADCAST', 'EMAIL_MARKETING'],
    status: 'ACTIVE',
    sentDate: '2025-02-01',
    impressions: 1120,
    clicks: 340,
    conversions: 74,
    revenueGenerated: 6200000,
    budgetCOP: 80000,
    roas: 77.5,
    whatsappDetails: {
      broadcastMessage: '👋 Hola {nombre}, notamos que tu cotización técnica quedó pendiente. Aplica el cupón VUELVE15 para un 15% DTO inmediato.',
      contactsTargeted: 420,
      deliveredCount: 412,
      repliedCount: 148
    }
  },
  {
    id: 'CAMP-6420',
    title: 'Google Search Ads: Imprenta y Litografía Manizales / Pereira',
    targetProduct: 'Impresión Offset Gran Formato, Libros y Revistas',
    targetAudience: '🌐 Audiencia General Empresarial',
    channelType: 'GOOGLE',
    channels: ['GOOGLE_ADS'],
    status: 'ACTIVE',
    sentDate: '2025-01-15',
    impressions: 18900,
    clicks: 980,
    conversions: 56,
    revenueGenerated: 9400000,
    budgetCOP: 420000,
    roas: 22.3,
    googleDetails: {
      headline: 'Litografía Offset en Manizales | Fusión Gráfica',
      description: 'Imprenta industrial de alta precisión. Libros, revistas, cajas y empaques con envíos a toda Colombia.',
      keywords: ['litografia manizales', 'imprenta pereira', 'impresion offset colombia', 'cajas plegadizas', 'etiquetas en rollo'],
      costPerClickCOP: 428
    }
  }
];

export const INITIAL_AUTOMATIONS: AutomationWorkflow[] = [
  {
    id: 'auto_1',
    name: '🛒 Rescate de Carrito & Cotización Abandonada (30 Min)',
    category: 'CART_ABANDONMENT',
    description: 'Envío automático por WhatsApp Cloud y Email a los 30 minutos del abandono con cupón de 15% DTO y enlace directo para completar checkout.',
    triggerEvent: 'Cotizador o Carrito en abandono > 30 minutos',
    delay: '30 Minutos',
    delayMinutes: 30,
    channels: ['WhatsApp Cloud API', 'Resend Email API'],
    status: 'ACTIVE',
    couponCode: 'VUELVE15',
    discountPercent: 15,
    messageCustomization: {
      whatsappText: '👋 ¡Hola {nombre}! Notamos que dejaste tu cotización de {producto} pendiente en taller. No pierdas tu turno en máquina: completa tu orden en los próximos 30 minutos y recibe 15% DTO usando el cupón *VUELVE15*.\n\n👉 Finalizar pedido aquí: {url_checkout}',
      emailSubject: '🛒 ¿Olvidaste tus impresiones en el carrito? Tenemos un 15% DTO para ti',
      emailPreview: 'Guardamos tu diseño y cotización técnica. Completa tu pedido hoy con flete bonificado.',
      emailBodyHtml: '<p>Tu cotización técnica está guardada y lista para entrar a máquina Heidelberg. Aplica el cupón <strong>VUELVE15</strong> y finaliza con despacho prioritario.</p>'
    },
    stats: { triggered: 284, opened: 242, converted: 78, recoveredRevenueCOP: 9850000 }
  },
  {
    id: 'auto_2',
    name: '📦 Recompra Automática B2B: Empaques y Etiquetas (30-60 Días)',
    category: 'B2B_REORDER',
    description: 'Notificación inteligente cada 30 o 60 días a clientes de empaques, cajas plegadizas y etiquetas en rollo para reabastecimiento de stock sin costo de troquel.',
    triggerEvent: 'Clientes de cajas / etiquetas con última compra hace 30 o 60 días',
    delay: 'Cada 45 Días (Ciclo de Reabastecimiento)',
    delayMinutes: 64800,
    channels: ['WhatsApp Cloud API', 'Resend Email API'],
    status: 'ACTIVE',
    couponCode: 'REORDENAVIP',
    discountPercent: 10,
    messageCustomization: {
      whatsappText: '📦 Hola {nombre}, según tu consumo proyectado, tu stock de {producto} podría estar por agotarse en los próximos días. Ya tenemos tus troqueles y perfiles CTP listos. ¿Deseas que montemos a máquina la misma tirada con 10% DTO corporativo?',
      emailSubject: '🏷️ ¿Se te están agotando tus etiquetas o empaques? Reordena en 1 clic',
      emailPreview: 'Mantenemos tus archivos y troqueles listos para entrar a máquina de inmediato sin demoras.',
      emailBodyHtml: '<p>Evita detener tu producción o entregas. Reabastece tus cajas plegadizas y etiquetas con precio preferencial y entrega prioritaria.</p>'
    },
    stats: { triggered: 168, opened: 138, converted: 52, recoveredRevenueCOP: 18400000 }
  },
  {
    id: 'auto_3',
    name: '✨ Secuencia de Bienvenida & Nutrición B2B para Nuevos Clientes',
    category: 'WELCOME_SERIES',
    description: 'Secuencia de nutrición instantánea con catálogo digital 2025, guía técnica CTP (perfiles CMYK) y lista de precios por volumen para agencias y litografías.',
    triggerEvent: 'Registro de nueva empresa o usuario en la plataforma',
    delay: 'Inmediato (0 minutos)',
    delayMinutes: 0,
    channels: ['Resend Email API', 'WhatsApp Cloud API'],
    status: 'ACTIVE',
    couponCode: 'BIENVENIDOFG',
    discountPercent: 20,
    messageCustomization: {
      whatsappText: '🎉 ¡Bienvenido a Fusión Comunicación Gráfica, {nombre}! Ya tienes acceso a nuestra planta offset Heidelberg con precios de fábrica. Te enviamos nuestro Catálogo 2025 y un cupón de bienvenida del 20% DTO: *BIENVENIDOFG*.',
      emailSubject: '🏢 ¡Bienvenido a Fusión Gráfica! Tu Catálogo Digital y Tarifario 2025',
      emailPreview: 'Accede a precios de planta directa, muestras 3D y crédito corporativo para tu empresa.',
      emailBodyHtml: '<p>Te damos la bienvenida a la litografía industrial más moderna de Manizales y el Eje Cafetero. Adjuntamos tarifario mayorista y guía técnica para preprensa.</p>'
    },
    stats: { triggered: 490, opened: 420, converted: 135, recoveredRevenueCOP: 14200000 }
  },
  {
    id: 'auto_4',
    name: '🚚 Notificación de Despacho con Guía de Envidia / Servientrega',
    category: 'ORDER_UPDATE',
    description: 'Envía el número de guía de rastreo, transportadora y confirmación de empaque rígido en tiempo real apenas la orden de taller pasa a estado ENVIADO.',
    triggerEvent: 'Orden de trabajo pasa a estado ENVIADO en producción',
    delay: 'Tiempo Real (Inmediato)',
    delayMinutes: 0,
    channels: ['WhatsApp Cloud API', 'Resend Email API'],
    status: 'ACTIVE',
    couponCode: 'PROXIMACOMPRA',
    discountPercent: 5,
    messageCustomization: {
      whatsappText: '🚚 ¡Tu pedido #{numero_orden} ha salido de nuestra planta en Manizales! Guía de rastreo: {guia_transportadora} por {transportadora}. Puedes seguir el camión en tiempo real aquí: {url_rastreo}. ¡Gracias por confiar en Fusión Gráfica!',
      emailSubject: '📦 Tu pedido #{numero_orden} ya va en camino (Guía de Rastreo)',
      emailPreview: 'Tus impresiones han sido empacadas en cartón rígido protector y entregadas a la transportadora.',
      emailBodyHtml: '<p>Tu pedido ya está en ruta con empaque anti-impacto. Puedes rastrear tu guía en la web de la transportadora asignada.</p>'
    },
    stats: { triggered: 810, opened: 795, converted: 210, recoveredRevenueCOP: 26500000 }
  }
];

export const INITIAL_AUDIENCE_SEGMENTS: AudienceSegment[] = [
  {
    id: 'SEG-B2B-VIP',
    name: 'Clientes VIP & Mayoristas B2B (> $2.000.000 COP)',
    tag: 'Mayoristas VIP',
    categoryType: 'B2B_VIP',
    description: 'Empresas, agencias de publicidad y litografías con facturación acumulada superior a $2.000.000 COP y compras de gran volumen.',
    totalContacts: 428,
    growthRate: '+16% este mes',
    criteria: {
      minSpentCOP: 2000000,
      orderCountMin: 3
    },
    avgTicketCOP: 3850000,
    topCities: ['Manizales', 'Pereira', 'Bogotá', 'Medellín'],
    lastUpdated: 'Hoy a las 08:30 AM',
    engagementRate: 58.4,
    contacts: [
      { id: 'c1', firstName: 'Mauricio', lastName: 'Gómez', companyName: 'Agencia BrandLab S.A.S', email: 'mgomez@brandlab.com.co', phone: '+573104567890', city: 'Manizales', department: 'Caldas', totalSpentCOP: 8450000, ordersCount: 7, lastOrderDate: '2025-02-14', preferredCategory: 'Catálogos & Revistas', isVip: true },
      { id: 'c2', firstName: 'Carolina', lastName: 'Restrepo', companyName: 'Litografía Central Pereira', email: 'crestrepo@litocentral.co', phone: '+573129876543', city: 'Pereira', department: 'Risaralda', totalSpentCOP: 6200000, ordersCount: 5, lastOrderDate: '2025-02-18', preferredCategory: 'Cajas Plegadizas', isVip: true },
      { id: 'c3', firstName: 'Alejandro', lastName: 'Vargas', companyName: 'Publicidad Visual Andina', email: 'avargas@visualandina.com', phone: '+573153456789', city: 'Bogotá', department: 'Cundinamarca', totalSpentCOP: 12500000, ordersCount: 11, lastOrderDate: '2025-02-10', preferredCategory: 'Plegables & Afiches', isVip: true },
      { id: 'c4', firstName: 'Daniela', lastName: 'Ospina', companyName: 'Estudio Creativo Medellín', email: 'dospina@estudiocreativo.co', phone: '+573007654321', city: 'Medellín', department: 'Antioquia', totalSpentCOP: 4900000, ordersCount: 4, lastOrderDate: '2025-02-05', preferredCategory: 'Carpetas Corporativas', isVip: true },
      { id: 'c5', firstName: 'Jorge', lastName: 'Cárdenas', companyName: 'Distribuidora del Café Ltda', email: 'jcardenas@districafe.com', phone: '+573118901234', city: 'Armenia', department: 'Quindío', totalSpentCOP: 7800000, ordersCount: 6, lastOrderDate: '2025-02-16', preferredCategory: 'Etiquetas en Rollo', isVip: true }
    ]
  },
  {
    id: 'SEG-RECURRENT-PACKAGING',
    name: 'Compradores Recurrentes de Etiquetas & Empaques',
    tag: 'Línea Empaques & Rollos',
    categoryType: 'PACKAGING_RECURRENT',
    description: 'Marcas de alimentos, cosméticos, café especial y farmacéuticos con órdenes periódicas de cajas plegadizas y etiquetas adhesivas.',
    totalContacts: 560,
    growthRate: '+24% este mes',
    criteria: {
      categories: ['Cajas Plegadizas', 'Etiquetas Adhesivas en Rollo'],
      orderCountMin: 2
    },
    avgTicketCOP: 1650000,
    topCities: ['Manizales', 'Chinchiná', 'Pereira', 'Cali', 'Bogotá'],
    lastUpdated: 'Hace 3 horas',
    engagementRate: 62.1,
    contacts: [
      { id: 'c6', firstName: 'Luisa', lastName: 'Henao', companyName: 'Café Origen Nevado', email: 'luisa@cafenevado.co', phone: '+573145678901', city: 'Manizales', department: 'Caldas', totalSpentCOP: 3400000, ordersCount: 4, lastOrderDate: '2025-02-12', preferredCategory: 'Etiquetas Adhesivas', isVip: true },
      { id: 'c7', firstName: 'Santiago', lastName: 'Morales', companyName: 'Cosméticos Botánica S.A.S', email: 'compras@botanica.com.co', phone: '+573187654320', city: 'Cali', department: 'Valle del Cauca', totalSpentCOP: 5200000, ordersCount: 5, lastOrderDate: '2025-02-08', preferredCategory: 'Cajas Plegadizas', isVip: true },
      { id: 'c8', firstName: 'Claudia', lastName: 'Gutiérrez', companyName: 'Chocolates de la Sierra', email: 'claudia@chocolatesierra.com', phone: '+573102345678', city: 'Chinchiná', department: 'Caldas', totalSpentCOP: 2900000, ordersCount: 3, lastOrderDate: '2025-02-15', preferredCategory: 'Empaques Alimentos', isVip: false },
      { id: 'c9', firstName: 'Andrés', lastName: 'Zapata', companyName: 'Snacks Saludables Andinos', email: 'azapata@snacksandinos.co', phone: '+573138765412', city: 'Pereira', department: 'Risaralda', totalSpentCOP: 4100000, ordersCount: 4, lastOrderDate: '2025-02-17', preferredCategory: 'Etiquetas en Rollo', isVip: true },
      { id: 'c10', firstName: 'Felipe', lastName: 'Trujillo', companyName: 'Laboratorios Farmacol', email: 'ftrujillo@farmacol.com.co', phone: '+573169876123', city: 'Bogotá', department: 'Cundinamarca', totalSpentCOP: 8900000, ordersCount: 6, lastOrderDate: '2025-02-19', preferredCategory: 'Cajas Farmacéuticas', isVip: true }
    ]
  },
  {
    id: 'SEG-LOCAL-CALDAS',
    name: 'Prospectos Locales: Manizales & Eje Cafetero',
    tag: 'Eje Cafetero Local',
    categoryType: 'LOCAL_CITIES',
    description: 'Empresas, negocios y profesionales de Manizales, Pereira, Armenia, Villamaría, Chinchiná, Dosquebradas y Santa Rosa de Cabal.',
    totalContacts: 1940,
    growthRate: '+19% este mes',
    criteria: {
      cities: ['Manizales', 'Pereira', 'Armenia', 'Villamaría', 'Chinchiná', 'Dosquebradas', 'Santa Rosa de Cabal']
    },
    avgTicketCOP: 850000,
    topCities: ['Manizales (45%)', 'Pereira (30%)', 'Armenia (15%)', 'Otros (10%)'],
    lastUpdated: 'Hoy a las 07:15 AM',
    engagementRate: 49.3,
    contacts: [
      { id: 'c11', firstName: 'Carlos', lastName: 'Ramírez', companyName: 'Restaurante El Roble Gourmet', email: 'contacto@elroblegourmet.co', phone: '+573105556677', city: 'Manizales', department: 'Caldas', totalSpentCOP: 1450000, ordersCount: 2, lastOrderDate: '2025-02-01', preferredCategory: 'Menús & Manteles', isVip: false },
      { id: 'c12', firstName: 'Marta', lastName: 'López', companyName: 'Boutique Flor de Café', email: 'marta@flordecafe.com', phone: '+573124443322', city: 'Pereira', department: 'Risaralda', totalSpentCOP: 1890000, ordersCount: 3, lastOrderDate: '2025-02-11', preferredCategory: 'Bolsas Kraft & Tarjetas', isVip: false },
      { id: 'c13', firstName: 'Hernán', lastName: 'Salazar', companyName: 'Inmobiliaria del Café', email: 'hsalazar@inmocafe.co', phone: '+573158889900', city: 'Armenia', department: 'Quindío', totalSpentCOP: 2100000, ordersCount: 3, lastOrderDate: '2025-02-14', preferredCategory: 'Carpetas & Folletos', isVip: true },
      { id: 'c14', firstName: 'Paola', lastName: 'Valencia', companyName: 'Café Hacienda Villamaría', email: 'pvalencia@haciendavilla.co', phone: '+573012223344', city: 'Villamaría', department: 'Caldas', totalSpentCOP: 950000, ordersCount: 1, lastOrderDate: '2025-01-28', preferredCategory: 'Stickers Troquelados', isVip: false }
    ]
  },
  {
    id: 'SEG-METRO-CITIES',
    name: 'Prospectos Principales Ciudades (Bogotá, Medellín, Cali, B/quilla)',
    tag: 'Grandes Capitales',
    categoryType: 'LOCAL_CITIES',
    description: 'Clientes corporativos y emprendimientos ubicados en las principales áreas metropolitanas con envíos por transportadora exprés.',
    totalContacts: 3850,
    growthRate: '+32% este mes',
    criteria: {
      cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena']
    },
    avgTicketCOP: 1420000,
    topCities: ['Bogotá (40%)', 'Medellín (30%)', 'Cali (18%)', 'Barranquilla (12%)'],
    lastUpdated: 'Ayer',
    engagementRate: 35.8,
    contacts: [
      { id: 'c15', firstName: 'Gustavo', lastName: 'Mejía', companyName: 'Moda Urbana Colombia S.A.S', email: 'gmejia@modacolombia.com', phone: '+573176665544', city: 'Medellín', department: 'Antioquia', totalSpentCOP: 3800000, ordersCount: 4, lastOrderDate: '2025-02-09', preferredCategory: 'Tags & Etiquetas de Ropa', isVip: true },
      { id: 'c16', firstName: 'Diana', lastName: 'Álvarez', companyName: 'Editorial Innova Bogotá', email: 'dalvarez@editorialinnova.co', phone: '+573139998877', city: 'Bogotá', department: 'Cundinamarca', totalSpentCOP: 9200000, ordersCount: 7, lastOrderDate: '2025-02-18', preferredCategory: 'Libros & Revistas CTP', isVip: true },
      { id: 'c17', firstName: 'Javier', lastName: 'Pardo', companyName: 'Alimentos del Caribe Ltda', email: 'jpardo@alimentoscaribe.co', phone: '+573003332211', city: 'Barranquilla', department: 'Atlántico', totalSpentCOP: 2600000, ordersCount: 2, lastOrderDate: '2025-02-03', preferredCategory: 'Cajas Plegadizas', isVip: true },
      { id: 'c18', firstName: 'Valentina', lastName: 'Torres', companyName: 'Cosméticos Valle Real', email: 'vtorres@vallereal.com', phone: '+573117774433', city: 'Cali', department: 'Valle del Cauca', totalSpentCOP: 1950000, ordersCount: 2, lastOrderDate: '2025-01-30', preferredCategory: 'Etiquetas Vinilo', isVip: false }
    ]
  },
  {
    id: 'SEG-CART-RESCUE',
    name: 'Carritos & Cotizaciones Inconclusas (Últimos 30 días)',
    tag: 'Oportunidad Caliente',
    categoryType: 'CART_ABANDONMENT',
    description: 'Usuarios y empresas que personalizaron tirajes técnicos en el cotizador pero salieron antes de completar el pago.',
    totalContacts: 310,
    growthRate: '+12% esta semana',
    criteria: {
      abandonedCart: true,
      daysAgoMax: 30
    },
    avgTicketCOP: 720000,
    topCities: ['Manizales', 'Bogotá', 'Medellín', 'Pereira'],
    lastUpdated: 'Hace 12 min',
    engagementRate: 68.5,
    contacts: [
      { id: 'c19', firstName: 'Rodrigo', lastName: 'Moncada', companyName: 'Eventos & Bodas Andinas', email: 'rmoncada@eventosandinas.co', phone: '+573108881122', city: 'Manizales', department: 'Caldas', totalSpentCOP: 0, ordersCount: 0, lastOrderDate: '2025-02-23', preferredCategory: 'Tarjetas Premium & Sobres', isVip: false },
      { id: 'c20', firstName: 'Sonia', lastName: 'Prada', companyName: 'Cervecería Artesanal Montaña', email: 'sonia@cervezamontana.co', phone: '+573161112233', city: 'Pereira', department: 'Risaralda', totalSpentCOP: 450000, ordersCount: 1, lastOrderDate: '2025-02-22', preferredCategory: 'Etiquetas para Botella', isVip: false }
    ]
  }
];
