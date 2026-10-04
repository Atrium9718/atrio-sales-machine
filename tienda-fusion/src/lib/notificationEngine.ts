/**
 * Motor Centralizado de Notificaciones Multicanal (WhatsApp Business & Correo Transaccional HTML)
 * para el flujo de producción litográfica, estados de taller y tracking de despachos.
 */

export interface OrderNotificationContext {
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  status: string;
  previousStatus?: string;
  trackingCourier?: string;
  trackingNumber?: string;
  total: number;
  subtotal: number;
  iva: number;
  shippingCost: number;
  items: Array<{
    name: string;
    quantity: number;
    specs?: any;
    price?: number;
  }>;
  createdAt: string;
  estimatedDeliveryDate?: string;
}

export interface NotificationTemplateResult {
  whatsAppText: string;
  whatsAppUrl: string;
  emailSubject: string;
  emailHtml: string;
  smsText: string;
}

export const WORKSHOP_STATUSES: Record<string, { label: string; icon: string; description: string; step: number }> = {
  NUEVO: {
    label: 'Nuevo Pedido Confirmado',
    icon: '🛒',
    description: 'Hemos recibido tu orden y fue aprobada para ingreso a programación.',
    step: 1
  },
  EN_DISEÑO: {
    label: 'Revisión Técnica & Pre-prensa',
    icon: '🔍',
    description: 'Tus artes están en inspección de perfiles de color CMYK, sangrados y resolución para montaje CTP.',
    step: 2
  },
  EN_PRODUCCION: {
    label: 'En Producción & Máquinas de Impresión',
    icon: '🖨️',
    description: 'Tus pliegos están siendo impresos en prensa offset / digital y pasando a acabados (plastificado, barniz, troquelado).',
    step: 3
  },
  LISTO_DESPACHO: {
    label: 'Terminado & Control de Calidad',
    icon: '📦',
    description: 'Material refilado, inspeccionado por control de calidad y empacado con rótulo de protección.',
    step: 4
  },
  ENVIADO: {
    label: 'Despachado en Ruta de Entrega',
    icon: '🚚',
    description: 'Tu paquete ha sido entregado a la transportadora con número de guía oficial.',
    step: 5
  },
  ENTREGADO: {
    label: 'Entregado a Satisfacción',
    icon: '🎉',
    description: 'Material recibido en destino.',
    step: 6
  },
  CANCELADO: {
    label: 'Orden Cancelada',
    icon: '❌',
    description: 'El pedido ha sido anulado.',
    step: 0
  }
};

const formatCOP = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Genera el paquete completo de mensajes (WhatsApp, Email HTML con diseño responsivo, SMS)
 */
export function buildOrderNotifications(ctx: OrderNotificationContext): NotificationTemplateResult {
  const customer = ctx.customerName || 'Estimado(a) Cliente';
  const cleanPhone = (ctx.customerPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone ? (cleanPhone.startsWith('57') ? cleanPhone : '57' + cleanPhone) : '';

  const trackingLink = ctx.trackingCourier?.toLowerCase().includes('coord') 
    ? `https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${ctx.trackingNumber}`
    : ctx.trackingCourier?.toLowerCase().includes('servi')
    ? `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${ctx.trackingNumber}`
    : ctx.trackingCourier?.toLowerCase().includes('envia') || ctx.trackingCourier?.toLowerCase().includes('envía')
    ? `https://envia.co/`
    : `https://tcc.com.co/rastreo/?guia=${ctx.trackingNumber}`;

  // 1. GENERACIÓN DE TEXTO WHATSAPP CON FORMATO ENRIQUECIDO
  let whatsAppText = '';

  switch (ctx.status) {
    case 'NUEVO':
      whatsAppText = 
`¡Hola *${customer}*! 👋 

¡Confirmamos la recepción de tu orden *${ctx.orderCode}* en *Fusión Gráfica*! 🏭✨

📋 *Detalle del Pedido:*
${ctx.items.map(i => `• ${i.quantity.toLocaleString('es-CO')}x ${i.name}`).join('\n')}

💰 *Total Cancelado:* ${formatCOP(ctx.total)}
📍 *Destino:* ${ctx.customerCity || 'Manizales'} - ${ctx.customerAddress || 'Dirección registrada'}

Tu pedido pasa de inmediato a nuestro equipo de *Pre-prensa* para validación de artes. Te avisaremos en cada avance de taller. 🚀`;
      break;

    case 'EN_DISEÑO':
      whatsAppText = 
`¡Hola *${customer}*! 👋

Tu orden *${ctx.orderCode}* se encuentra en nuestro departamento de *Pre-Prensa & Verificación Técnica* 🔍.

Estamos auditando:
✅ Perfiles de color y curvas CMYK
✅ Resolución de imágenes a 300 DPI
✅ Líneas de sangrado (bleed) y márgenes de seguridad

Una vez completado el visto bueno, transferiremos los pliegos a quemado de planchas CTP para impresión. 🖨️`;
      break;

    case 'EN_PRODUCCION':
      whatsAppText = 
`¡Hola *${customer}*! 🎉 

¡Excelentes noticias! Tu orden *${ctx.orderCode}* acaba de ingresar a nuestras *Máquinas de Impresión & Producción Litográfica* 🖨️✨.

⚙️ *Proceso en curso:* Impresión de pliegos, secado técnico y preparación para acabados (plastificado/troquelado).

Cuidamos cada detalle milimétrico para garantizar máxima nitidez y fidelidad de color.`;
      break;

    case 'LISTO_DESPACHO':
      whatsAppText = 
`¡Hola *${customer}*! 📦✨

Tu pedido *${ctx.orderCode}* ya está *TERMINADO* y aprobado por Control de Calidad.

📦 Ha sido debidamente refilado, fajado y empacado con protección para transporte.
${ctx.trackingCourier === 'Entrega en Taller' || ctx.trackingCourier?.includes('Taller') 
  ? '🏢 Ya puedes pasar a retirarlo por nuestra planta principal en Manizales.' 
  : '🚚 En las próximas horas la transportadora realizará la recolección para despacho a tu domicilio.'}`;
      break;

    case 'ENVIADO':
      whatsAppText = 
`¡Hola *${customer}*! 🚚💨

¡Tu pedido *${ctx.orderCode}* ha sido *DESPACHADO* con éxito!

📦 *Empresa de Transporte:* ${ctx.trackingCourier || 'Transportadora Nacional'}
🏷️ *Número de Guía:* ${ctx.trackingNumber || 'En asignación'}
📍 *Dirección de Destino:* ${ctx.customerAddress || ''}, ${ctx.customerCity || ''}

🔗 *Rastreo en Línea:* ${trackingLink}

¡Gracias por imprimir con Fusión Gráfica! Si necesitas asistencia adicional, escríbenos por este medio. ✨`;
      break;

    case 'ENTREGADO':
      whatsAppText = 
`¡Hola *${customer}*! 🎉✨

Confirmamos la *ENTREGA SATISFACTORIA* de tu pedido *${ctx.orderCode}*.

Esperamos que el acabado, brillo y precisión del material superen tus expectativas comerciales. 

⭐️ *¿Cómo calificarías tu experiencia con nuestra litografía?* Tu opinión nos ayuda a seguir mejorando cada día.

¡Un gusto trabajar para tu marca! 🤝`;
      break;

    default:
      whatsAppText = 
`¡Hola *${customer}*! 👋 Te saludamos desde *Fusión Gráfica* para actualizarte sobre tu orden *${ctx.orderCode}* (Estado actual: *${ctx.status}*). Estamos atentos ante cualquier inquietud.`;
      break;
  }

  const whatsAppUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsAppText)}` : '';

  // 2. GENERACIÓN DE CORREO ELECTRÓNICO TRANSACCIONAL HTML
  const statusBadge = WORKSHOP_STATUSES[ctx.status] || { label: ctx.status, icon: '📋', description: '', step: 1 };
  const emailSubject = `${statusBadge.icon} [${ctx.orderCode}] ${statusBadge.label} - Fusión Gráfica`;

  const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px 24px; }
    .status-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .status-title { font-size: 16px; font-weight: 800; color: #115e59; margin-bottom: 6px; }
    .status-desc { font-size: 13px; color: #0f766e; margin: 0; }
    .timeline { display: flex; justify-content: space-between; margin: 24px 0; padding: 0; list-style: none; }
    .order-info { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .order-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
    .order-table th { text-align: left; padding: 8px; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .order-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
    .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 10px; margin-top: 16px; text-align: center; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>FUSIÓN GRÁFICA</h1>
      <p>Litografía Comercial & Packaging Offset de Alta Precisión</p>
    </div>
    
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Hola <strong>${customer}</strong>,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Queremos informarte sobre el estado en tiempo real de tu orden de producción <strong>${ctx.orderCode}</strong>.
      </p>

      <div class="status-box">
        <div style="font-size: 28px; margin-bottom: 4px;">${statusBadge.icon}</div>
        <div class="status-title">${statusBadge.label}</div>
        <p class="status-desc">${statusBadge.description}</p>
      </div>

      ${ctx.trackingNumber ? `
      <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 13px;">🚚 Información de Despacho & Guía</h4>
        <p style="margin: 0; font-size: 12px; color: #1e3a8a;">
          <strong>Transportadora:</strong> ${ctx.trackingCourier || 'Transportadora Oficial'}<br>
          <strong>Número de Guía:</strong> ${ctx.trackingNumber}<br>
          <strong>Destino:</strong> ${ctx.customerAddress || ''}, ${ctx.customerCity || ''}
        </p>
        <div style="text-align: center;">
          <a href="${trackingLink}" class="btn" style="background: #2563eb;" target="_blank">Rastrear Mi Envío en Línea</a>
        </div>
      </div>
      ` : ''}

      <div class="order-info">
        <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Resumen del Pedido</h4>
        <table class="order-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ctx.items.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td style="text-align: center;">${item.quantity.toLocaleString('es-CO')}</td>
                <td style="text-align: right; font-weight: bold;">${item.price ? formatCOP(item.price) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Subtotal Neto:</span>
            <span>${formatCOP(ctx.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Flete / Envío:</span>
            <span>${formatCOP(ctx.shippingCost)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">IVA (19%):</span>
            <span>${formatCOP(ctx.iva)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; color: #0f766e; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
            <span>Total Liquidado:</span>
            <span>${formatCOP(ctx.total)}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 12px; color: #64748b;">¿Tienes dudas sobre tu trabajo gráfico? Contáctanos por WhatsApp al <strong>+57 311 829 3847</strong></p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>Fusión Gráfica S.A.S.</strong> | NIT: 901.458.921-3</p>
      <p style="margin: 0;">Zona Industrial Juanchito, Manzana 4 Bodega 12, Manizales - Caldas, Colombia</p>
    </div>
  </div>
</body>
</html>
  `;

  // 3. SMS CORTO TRANSACCIONAL
  const smsText = `FUSION GRAFICA: Tu orden ${ctx.orderCode} está ${statusBadge.label}. ${ctx.trackingNumber ? `Guía: ${ctx.trackingNumber} (${ctx.trackingCourier})` : ''} Info: wa.me/573118293847`;

  return {
    whatsAppText,
    whatsAppUrl,
    emailSubject,
    emailHtml,
    smsText,
  };
}
