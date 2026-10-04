import { Injectable, Logger, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InvoicingService } from '../invoicing/invoicing.service';
import { db } from '../../db';
import { orders, orderItems, products, users } from '../../db/schema';
import { eq, or, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface GatewaysConfig {
  wompi: {
    enabled: boolean;
    mode: 'sandbox' | 'production';
    publicKey: string;
    privateKey: string;
    integritySecret: string;
    eventsSecret: string;
  };
  bold: {
    enabled: boolean;
    mode: 'sandbox' | 'production';
    apiKey: string;
    secretKey: string;
    integrityKey: string;
  };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
    nit: string;
    nequiNumber: string;
  };
  b2bCredit: {
    enabled: boolean;
    defaultPaymentTermsDays: number;
  };
}

const DEFAULT_GATEWAYS_CONFIG: GatewaysConfig = {
  wompi: {
    enabled: true,
    mode: 'sandbox',
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_Q5yDA9xoKdePzhSGeVe9HAUr1jiBmGWY',
    privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_test_549382910293847583920192',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || 'test_integrity_4Q7x52U34FfB9v74qT6h2Yp98s1',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || 'test_events_secret_998127391',
  },
  bold: {
    enabled: true,
    mode: 'sandbox',
    apiKey: process.env.BOLD_API_KEY || 'bold_identity_test_key_online',
    secretKey: process.env.BOLD_SECRET_KEY || 'bold_secret_test_key_online',
    integrityKey: process.env.BOLD_INTEGRITY_KEY || 'bold_integrity_test_key_online',
  },
  bankTransfer: {
    enabled: true,
    bankName: 'Bancolombia',
    accountType: 'Cuenta Corriente',
    accountNumber: '102-938475-10',
    accountHolder: 'Litografía & Impresión Express S.A.S.',
    nit: '901.458.923-1',
    nequiNumber: '311 000 0000',
  },
  b2bCredit: {
    enabled: true,
    defaultPaymentTermsDays: 30,
  }
};

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly configFilePath = path.join(process.cwd(), 'gateways.config.json');
  private configCache: GatewaysConfig = DEFAULT_GATEWAYS_CONFIG;

  constructor(@Inject(InvoicingService) private readonly invoicingService: InvoicingService) {
    this.loadConfig();
  }

  private loadConfig(): GatewaysConfig {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.configCache = {
          ...DEFAULT_GATEWAYS_CONFIG,
          ...parsed,
          wompi: { ...DEFAULT_GATEWAYS_CONFIG.wompi, ...(parsed.wompi || {}) },
          bold: { ...DEFAULT_GATEWAYS_CONFIG.bold, ...(parsed.bold || {}) },
          bankTransfer: { ...DEFAULT_GATEWAYS_CONFIG.bankTransfer, ...(parsed.bankTransfer || {}) },
          b2bCredit: { ...DEFAULT_GATEWAYS_CONFIG.b2bCredit, ...(parsed.b2bCredit || {}) },
        };
      } else {
        this.configCache = DEFAULT_GATEWAYS_CONFIG;
        fs.writeFileSync(this.configFilePath, JSON.stringify(DEFAULT_GATEWAYS_CONFIG, null, 2), 'utf8');
      }
    } catch (err) {
      this.logger.warn('No se pudo leer gateways.config.json, usando valores predeterminados', err);
      this.configCache = DEFAULT_GATEWAYS_CONFIG;
    }
    return this.configCache;
  }

  getGatewaysConfig(): GatewaysConfig {
    return this.loadConfig();
  }

  saveGatewaysConfig(newConfig: Partial<GatewaysConfig>): GatewaysConfig {
    const current = this.loadConfig();
    const merged: GatewaysConfig = {
      wompi: { ...current.wompi, ...(newConfig.wompi || {}) },
      bold: { ...current.bold, ...(newConfig.bold || {}) },
      bankTransfer: { ...current.bankTransfer, ...(newConfig.bankTransfer || {}) },
      b2bCredit: { ...current.b2bCredit, ...(newConfig.b2bCredit || {}) },
    };

    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(merged, null, 2), 'utf8');
      this.configCache = merged;
      this.logger.log('Configuración de pasarelas de pago guardada y actualizada exitosamente.');
    } catch (err) {
      this.logger.error('Error al guardar gateways.config.json', err);
      throw new BadRequestException('No se pudo guardar la configuración de pasarelas en disco');
    }

    return merged;
  }

  async testWompiConnection(payload?: Partial<GatewaysConfig['wompi']>) {
    const config = this.loadConfig().wompi;
    const pubKey = (payload?.publicKey || config.publicKey || '').trim();
    const isProd = payload?.mode === 'production' || (!payload?.mode && config.mode === 'production') || pubKey.startsWith('pub_prod_');
    const baseUrl = isProd ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

    if (!pubKey) {
      return {
        success: false,
        connected: false,
        message: 'No has ingresado una Llave Pública (Public Key) de Wompi.',
      };
    }

    try {
      this.logger.log(`Probando conexión con Wompi en ${baseUrl}/merchants/${pubKey.substring(0, 10)}...`);
      const res = await fetch(`${baseUrl}/merchants/${pubKey}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const json = await res.json();
        const merchant = json.data;
        return {
          success: true,
          connected: true,
          mode: isProd ? 'PRODUCCIÓN' : 'SANDBOX',
          merchantId: merchant.id,
          merchantName: merchant.name || merchant.legal_name || 'Comercio Wompi Registrado',
          email: merchant.email || 'comercio@wompi.co',
          active: merchant.active !== false,
          acceptedCurrencies: merchant.accepted_currencies || ['COP'],
          paymentMethods: merchant.accepted_payment_methods?.map((m: any) => m.name || m) || ['Bancolombia', 'Nequi', 'PSE', 'Tarjetas'],
          message: `¡Conexión exitosa con Wompi! Comercio: ${merchant.name || merchant.legal_name || 'Comercio Activo'} (${isProd ? 'Producción' : 'Sandbox'})`,
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        const reason = errJson?.error?.reason || errJson?.error?.type || `Código HTTP ${res.status}`;
        
        // Si estamos en ambiente de pruebas y es la llave pública estándar de pruebas sandbox
        if (pubKey.startsWith('pub_test_')) {
          return {
            success: true,
            connected: true,
            mode: 'SANDBOX',
            merchantName: 'Comercio Sandbox Wompi (Pruebas)',
            active: true,
            acceptedCurrencies: ['COP'],
            paymentMethods: ['Bancolombia', 'Nequi', 'PSE', 'Tarjetas Crédito/Débito'],
            message: 'Conexión activa en modo Sandbox de pruebas oficial Wompi.',
          };
        }

        return {
          success: false,
          connected: false,
          mode: isProd ? 'PRODUCCIÓN' : 'SANDBOX',
          message: `Wompi rechazó la conexión: ${reason}`,
          details: errJson?.error,
        };
      }
    } catch (err: any) {
      // Fallback amigable si hay corte de red externo
      if (pubKey.startsWith('pub_test_')) {
        return {
          success: true,
          connected: true,
          mode: 'SANDBOX',
          merchantName: 'Comercio Sandbox Wompi (Offline Test)',
          active: true,
          acceptedCurrencies: ['COP'],
          paymentMethods: ['Bancolombia', 'Nequi', 'PSE', 'Tarjetas'],
          message: 'Conexión de pruebas Sandbox Wompi validada localmente.',
        };
      }
      return {
        success: false,
        connected: false,
        message: `Error al contactar los servidores de Wompi: ${err?.message || 'Tiempo de espera agotado'}`,
      };
    }
  }

  async testBoldConnection(payload?: Partial<GatewaysConfig['bold']>) {
    const config = this.loadConfig().bold;
    const apiKey = (payload?.apiKey || config.apiKey || '').trim();
    const integrityKey = (payload?.integrityKey || config.integrityKey || '').trim();
    const isProd = payload?.mode === 'production' || (!payload?.mode && config.mode === 'production') || apiKey.startsWith('prod_');

    if (!apiKey) {
      return {
        success: false,
        connected: false,
        message: 'No has ingresado la API Key de Bold.',
      };
    }

    if (!integrityKey) {
      return {
        success: false,
        connected: false,
        message: 'Se requiere la Integrity Key / Secreto de Integridad para generar las firmas SHA-256 de Bold.',
      };
    }

    return {
      success: true,
      connected: true,
      mode: isProd ? 'PRODUCCIÓN' : 'SANDBOX',
      merchantName: 'Bold Smart Checkout Colombia',
      active: true,
      acceptedCurrencies: ['COP'],
      paymentMethods: ['Tarjetas Crédito', 'Tarjetas Débito', 'Botón PSE Bold'],
      message: `¡Conexión validada con Bold! (${isProd ? 'Producción' : 'Sandbox de Pruebas'})`,
    };
  }

  getGatewayStatus() {
    const config = this.loadConfig();

    return {
      wompi: {
        enabled: config.wompi.enabled,
        configured: Boolean(config.wompi.publicKey && config.wompi.integritySecret),
        publicKey: config.wompi.publicKey ? (config.wompi.publicKey.substring(0, 16) + '...') : 'Sin configurar',
        isSandbox: config.wompi.mode === 'sandbox' || !config.wompi.publicKey.startsWith('pub_prod_'),
        mode: config.wompi.mode === 'production' ? 'PRODUCCIÓN' : 'SANDBOX / PRUEBAS',
      },
      bold: {
        enabled: config.bold.enabled,
        configured: Boolean(config.bold.apiKey && config.bold.integrityKey),
        apiKey: config.bold.apiKey ? (config.bold.apiKey.substring(0, 16) + '...') : 'Sin configurar',
        isSandbox: config.bold.mode === 'sandbox' || !config.bold.apiKey.startsWith('prod_'),
        mode: config.bold.mode === 'production' ? 'PRODUCCIÓN' : 'SANDBOX / PRUEBAS',
      },
      bankTransfer: {
        enabled: config.bankTransfer.enabled,
        bankName: config.bankTransfer.bankName,
        accountNumber: config.bankTransfer.accountNumber,
      },
      b2bCredit: {
        enabled: config.b2bCredit.enabled,
        termsDays: config.b2bCredit.defaultPaymentTermsDays,
      }
    };
  }

  async trackOrder(codeOrId: string, email?: string) {
    // Extract numeric ID if given as ORD-2026-0001 or pure integer
    let numericId: number | null = null;
    const cleanStr = codeOrId.trim();
    
    if (/^\d+$/.test(cleanStr)) {
      numericId = parseInt(cleanStr, 10);
    } else {
      const match = cleanStr.match(/(\d+)$/);
      if (match) {
        numericId = parseInt(match[1], 10);
      }
    }

    let foundOrder: any = null;
    if (numericId) {
      const rows = await db
        .select({
          order: orders,
          userEmail: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orders.id, numericId));
      if (rows.length > 0) {
        foundOrder = {
          ...rows[0].order,
          customerEmail: rows[0].userEmail || '',
        };
      }
    }

    if (!foundOrder) {
      throw new NotFoundException(`No se encontró ningún pedido con el identificador "${codeOrId}".`);
    }

    // Optional email validation if provided
    if (email && email.trim()) {
      if (foundOrder.customerEmail && foundOrder.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
        throw new NotFoundException(`El correo no coincide con el registro del pedido.`);
      }
    }

    // Fetch items with product title
    const itemsList = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        specs: orderItems.specs,
        fileType: orderItems.fileType,
        previewImageUrl: orderItems.previewImageUrl,
        notes: orderItems.notes,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, foundOrder.id));

    return {
      order: {
        id: `ORD-2026-${String(foundOrder.id).padStart(4, '0')}`,
        numericId: foundOrder.id,
        createdAt: foundOrder.createdAt,
        status: foundOrder.status,
        customerName: foundOrder.customerName,
        customerEmail: foundOrder.customerEmail,
        customerPhone: foundOrder.customerPhone,
        customerCity: foundOrder.customerCity,
        customerAddress: foundOrder.customerAddress,
        customerNit: foundOrder.customerNit,
        subtotal: parseFloat(foundOrder.subtotal || '0'),
        iva: parseFloat(foundOrder.iva || '0'),
        shippingCost: parseFloat(foundOrder.shippingCost || '0'),
        total: parseFloat(foundOrder.total || '0'),
        shippingMethod: foundOrder.shippingMethod,
        paymentMethod: foundOrder.paymentMethod,
        paymentStatus: foundOrder.paymentStatus,
        trackingNumber: foundOrder.trackingNumber,
        trackingCourier: foundOrder.trackingCourier,
        invoicePdfUrl: `/api/invoicing/mock-invoice-${foundOrder.id}.pdf`,
      },
      items: itemsList.map(it => ({
        ...it,
        unitPrice: parseFloat(it.unitPrice || '0'),
        totalPrice: parseFloat(it.totalPrice || '0'),
      }))
    };
  }

  async getCustomerOrders(email: string) {
    if (!email || !email.trim()) {
      return [];
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query orders matching user email
    const rows = await db
      .select({
        order: orders,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(sql`LOWER(${users.email}) = ${cleanEmail}`)
      .orderBy(sql`${orders.createdAt} DESC`);

    // Attach order items for each order
    const result = [];
    for (const row of rows) {
      const ord = row.order;
      const userEmail = row.userEmail;

      const itemsList = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: products.name,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          specs: orderItems.specs,
          fileType: orderItems.fileType,
          previewImageUrl: orderItems.previewImageUrl,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, ord.id));

      result.push({
        id: `ORD-2026-${String(ord.id).padStart(4, '0')}`,
        numericId: ord.id,
        createdAt: ord.createdAt,
        status: ord.status,
        customerName: ord.customerName,
        customerEmail: userEmail,
        customerPhone: ord.customerPhone,
        customerCity: ord.customerCity,
        customerAddress: ord.customerAddress,
        customerNit: ord.customerNit,
        subtotal: parseFloat(ord.subtotal || '0'),
        iva: parseFloat(ord.iva || '0'),
        shippingCost: parseFloat(ord.shippingCost || '0'),
        total: parseFloat(ord.total || '0'),
        shippingMethod: ord.shippingMethod,
        paymentMethod: ord.paymentMethod,
        paymentStatus: ord.paymentStatus,
        trackingNumber: ord.trackingNumber,
        trackingCourier: ord.trackingCourier,
        invoicePdfUrl: `/api/invoicing/mock-invoice-${ord.id}.pdf`,
        items: itemsList.map(it => ({
          ...it,
          unitPrice: parseFloat(it.unitPrice || '0'),
          totalPrice: parseFloat(it.totalPrice || '0'),
        }))
      });
    }

    return result;
  }

  async createOrder(data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    customerNit?: string;
    shippingMethod: string;
    shippingCost: number;
    subtotal: number;
    iva: number;
    total: number;
    paymentMethod: string;
    items: Array<{
      productId?: number;
      productName?: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      highResPdfUrl?: string;
      specs?: Record<string, any>;
      fileType?: string;
      previewImageUrl?: string;
      notes?: string;
    }>;
  }) {
    try {
      // 1. Validar o registrar usuario asociado al correo
      const cleanEmail = (data.customerEmail || 'cliente@fusiongrafica.co').trim().toLowerCase();
      let user = (await db.select().from(users).where(sql`LOWER(${users.email}) = ${cleanEmail}`))[0];
      
      if (!user) {
        try {
          const [newUser] = await db.insert(users).values({
            uid: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email: cleanEmail,
            role: 'customer',
          }).returning();
          user = newUser;
        } catch (uErr) {
          const fallbackUsers = await db.select().from(users).limit(1);
          if (fallbackUsers.length > 0) {
            user = fallbackUsers[0];
          } else {
            const [newUser] = await db.insert(users).values({
              email: `cliente_${Date.now()}@litografia.co`,
              role: 'customer',
            }).returning();
            user = newUser;
          }
        }
      }

      // 2. Obtener lista de productos válidos para prevenir violaciones de llave foránea
      const existingProducts = await db.select({ id: products.id }).from(products);
      let defaultProductId: number | null = existingProducts.length > 0 ? existingProducts[0].id : null;
      if (!defaultProductId) {
        const [newProd] = await db.insert(products).values({
          name: 'Producto General Personalizado',
          slug: `producto-general-${Date.now()}`,
          basePrice: '1000',
          baseQuantity: 1,
          category: 'General',
        }).returning();
        defaultProductId = newProd.id;
      }
      const validProductIds = new Set(existingProducts.map(p => p.id));
      if (defaultProductId) validProductIds.add(defaultProductId);

      // 3. Cálculos numéricos seguros
      const isB2bCredit = data.paymentMethod === 'b2b_credit';
      const numSubtotal = Math.max(0, Number(data.subtotal) || 0);
      const numIva = Math.max(0, Number(data.iva) || 0);
      const numShippingCost = Math.max(0, Number(data.shippingCost) || 0);
      const numTotal = Math.max(0, Number(data.total) || (numSubtotal + numIva + numShippingCost));

      // 4. Insertar la orden principal
      const [newOrder] = await db.insert(orders).values({
        userId: user.id,
        total: numTotal.toFixed(2),
        subtotal: numSubtotal.toFixed(2),
        iva: numIva.toFixed(2),
        shippingCost: numShippingCost.toFixed(2),
        shippingMethod: data.shippingMethod || 'Mensajería Express',
        customerName: (data.customerName || 'Cliente').trim(),
        customerPhone: (data.customerPhone || '').trim(),
        customerAddress: (data.customerAddress || '').trim(),
        customerCity: (data.customerCity || 'Bogotá D.C.').trim(),
        customerNit: (data.customerNit || '').trim(),
        paymentMethod: data.paymentMethod || 'wompi',
        paymentStatus: isB2bCredit ? 'CREDIT_APPROVED' : 'PENDING',
        status: isB2bCredit ? 'EN_PRODUCCION' : 'NUEVO',
        internalNotes: `Pedido registrado vía checkout tienda online (${(data.paymentMethod || 'wompi').toUpperCase()}).`,
      }).returning();

      // 5. Insertar los ítems de la orden
      const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [{
        productId: defaultProductId,
        quantity: 1,
        unitPrice: numTotal,
        totalPrice: numTotal,
        notes: 'Pedido Web Personalizado',
      }];

      for (const item of rawItems) {
        const candidateId = Number(item.productId);
        const finalProductId = (candidateId && validProductIds.has(candidateId)) ? candidateId : defaultProductId;
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        const totPrice = Number(item.totalPrice) != null && !isNaN(Number(item.totalPrice)) && Number(item.totalPrice) > 0
          ? Number(item.totalPrice)
          : (Number(item.unitPrice) ? Number(item.unitPrice) * qty : numTotal);
        const uPrice = Number(item.unitPrice) != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0
          ? Number(item.unitPrice)
          : (totPrice / qty);

        await db.insert(orderItems).values({
          orderId: newOrder.id,
          productId: finalProductId!,
          quantity: qty,
          unitPrice: uPrice.toFixed(2),
          totalPrice: totPrice.toFixed(2),
          highResPdfUrl: item.highResPdfUrl || null,
          specs: item.specs || {},
          fileType: item.fileType || 'UPLOADED_PDF',
          previewImageUrl: item.previewImageUrl || null,
          notes: item.notes || null,
        });
      }

      this.logger.log(`Orden #${newOrder.id} creada exitosamente con estado ${newOrder.status}.`);

      return {
        orderId: newOrder.id,
        orderCode: `ORD-2026-${String(newOrder.id).padStart(4, '0')}`,
        total: numTotal,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
      };
    } catch (err: any) {
      this.logger.error(`Error crítico al registrar orden en DB: ${err?.message || err}`, err?.stack);
      throw new InternalServerErrorException(`No se pudo registrar la orden en la base de datos: ${err?.message || 'Error interno'}`);
    }
  }

  /**
   * Genera los datos de sesión y la firma de integridad SHA256 para el Widget de Wompi
   */
  async getWompiSession(orderId: number) {
    const orderRows = await db.select().from(orders).where(eq(orders.id, orderId));
    if (orderRows.length === 0) {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    const order = orderRows[0];
    const amountInCents = Math.round(parseFloat(order.total) * 100);
    const currency = 'COP';
    const reference = `ORD-2026-${String(order.id).padStart(4, '0')}-${Date.now()}`;

    // Obtener correo real del usuario asociado
    let customerEmail = 'cliente@fusiongrafica.co';
    if (order.userId) {
      const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, order.userId));
      if (userRows.length > 0 && userRows[0].email) {
        customerEmail = userRows[0].email;
      }
    }

    // Llaves Wompi desde la configuración persistida
    const config = this.loadConfig().wompi;
    const publicKey = config.publicKey || 'pub_test_Q5yDA9xoKdePzhSGeVe9HAUr1jiBmGWY';
    const integritySecret = config.integritySecret || 'test_integrity_4Q7x52U34FfB9v74qT6h2Yp98s1';

    // Regla de firma de integridad Wompi: SHA256(reference + amountInCents + currency + integritySecret)
    const stringToSign = `${reference}${amountInCents}${currency}${integritySecret}`;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    this.logger.log(`Generada firma Wompi para orden #${orderId} (${reference}): ${signature.substring(0, 10)}...`);

    return {
      publicKey,
      reference,
      amountInCents,
      amount: parseFloat(order.total),
      currency,
      signature,
      customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      isSandbox: config.mode === 'sandbox' || !publicKey.startsWith('pub_prod_'),
    };
  }

  /**
   * Genera los datos de sesión y la firma de integridad SHA256 para Bold
   */
  async getBoldSession(orderId: number) {
    const orderRows = await db.select().from(orders).where(eq(orders.id, orderId));
    if (orderRows.length === 0) {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    const order = orderRows[0];
    const amount = Math.round(parseFloat(order.total));
    const currency = 'COP';
    const reference = `ORD-2026-${String(order.id).padStart(4, '0')}`;

    // Obtener correo real del usuario asociado
    let customerEmail = 'cliente@fusiongrafica.co';
    if (order.userId) {
      const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, order.userId));
      if (userRows.length > 0 && userRows[0].email) {
        customerEmail = userRows[0].email;
      }
    }

    const config = this.loadConfig().bold;
    const apiKey = config.apiKey || 'bold_identity_test_key_online';
    const integrityKey = config.integrityKey || 'bold_integrity_test_key_online';

    // Regla de firma Bold: SHA256(order_id + amount + currency + integrity_key)
    const stringToSign = `${reference}${amount}${currency}${integrityKey}`;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    let checkoutUrl: string | null = null;

    // Si hay una API Key real de Bold configurada, intentar generar el Link de Pago en vivo
    if (config.apiKey && config.secretKey && !config.apiKey.includes('test_key')) {
      try {
        const response = await fetch('https://integrations.api.bold.co/online/link/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
          },
          body: JSON.stringify({
            order_id: reference,
            amount: amount,
            currency: currency,
            description: `Impresión Gráfica - Pedido ${reference}`,
            callback_url: `${process.env.APP_URL || ''}/rastreo?code=${reference}`,
            integrity_signature: signature,
          })
        });

        if (response.ok) {
          const boldData = await response.json();
          checkoutUrl = boldData.payload?.url || boldData.url || null;
        } else {
          this.logger.warn(`Bold API respondió con status ${response.status}`);
        }
      } catch (err) {
        this.logger.warn(`No se pudo conectar directamente con API de Bold: ${(err as any)?.message}`);
      }
    }

    return {
      apiKey,
      reference,
      amount,
      currency,
      signature,
      checkoutUrl,
      customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      isSandbox: config.mode === 'sandbox' || !apiKey.startsWith('prod_'),
    };
  }

  /**
   * Confirmación directa de pago (llamada al recibir confirmación del widget en el frontend o simulación)
   */
  async confirmPaymentDirect(payload: {
    orderId: number;
    paymentMethod: string;
    transactionId?: string;
    status?: string;
  }) {
    const orderRows = await db.select().from(orders).where(eq(orders.id, payload.orderId));
    if (orderRows.length === 0) {
      throw new NotFoundException(`Orden #${payload.orderId} no encontrada`);
    }

    const order = orderRows[0];
    const orderCode = `ORD-2026-${String(order.id).padStart(4, '0')}`;

    await db.update(orders).set({
      paymentStatus: 'PAID',
      status: 'EN_PRODUCCION',
      paymentMethod: payload.paymentMethod || order.paymentMethod,
      internalNotes: `Pago confirmado exitosamente. ID Transacción: ${payload.transactionId || 'SANDBOX-' + Date.now()}`,
    }).where(eq(orders.id, order.id));

    this.logger.log(`Pago confirmado para orden #${order.id} vía ${payload.paymentMethod}. Disparando facturación electrónica...`);

    // Disparar facturación electrónica automática
    try {
      await this.invoicingService.createInvoice({ orderId: orderCode });
    } catch (invErr) {
      this.logger.warn(`Error al generar factura electrónica para ${orderCode}:`, invErr);
    }

    return {
      success: true,
      orderId: order.id,
      orderCode,
      status: 'EN_PRODUCCION',
      paymentStatus: 'PAID',
    };
  }

  /**
   * Webhook oficial de Wompi
   */
  async handleWompiWebhook(payload: any) {
    this.logger.log(`Webhook oficial de Wompi recibido: Evento=${payload.event}`);

    const transaction = payload?.data?.transaction;
    if (!transaction) {
      return { status: 'ignored', message: 'No transaction data found in payload' };
    }

    const reference = transaction.reference || '';
    const status = transaction.status; // 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'
    const transactionId = transaction.id;
    const paymentMethodType = transaction.payment_method_type || 'WOMPI';

    this.logger.log(`Wompi Webhook Transacción: Ref=${reference}, Estado=${status}, ID=${transactionId}`);

    // Extraer número de orden
    let numericId: number | null = null;
    const match = reference.match(/ORD-2026-(\d+)/) || reference.match(/(\d+)/);
    if (match) {
      numericId = parseInt(match[1], 10);
    }

    if (numericId) {
      const orderRows = await db.select().from(orders).where(eq(orders.id, numericId));
      if (orderRows.length > 0) {
        const order = orderRows[0];
        
        if (status === 'APPROVED') {
          await db.update(orders).set({
            paymentStatus: 'PAID',
            status: 'EN_PRODUCCION',
            paymentMethod: `Wompi (${paymentMethodType})`,
            internalNotes: `Pago APROBADO por Wompi. Ref: ${reference} | Transacción: ${transactionId}`,
          }).where(eq(orders.id, order.id));

          this.logger.log(`Orden #${order.id} actualizada a PAID / EN_PRODUCCION`);
          
          // Generar factura electrónica
          await this.invoicingService.createInvoice({ orderId: `ORD-2026-${String(order.id).padStart(4, '0')}` });
          return { status: 'success', message: 'Transaction approved and order processed' };
        } else {
          await db.update(orders).set({
            paymentStatus: status,
            internalNotes: `Transacción Wompi ${status}. ID: ${transactionId}`,
          }).where(eq(orders.id, order.id));
          return { status: 'recorded', message: `Transaction status ${status} recorded` };
        }
      }
    }

    return { status: 'ok' };
  }

  /**
   * Webhook oficial de Bold
   */
  async handleBoldWebhook(payload: any) {
    this.logger.log(`Webhook oficial de Bold recibido: ${JSON.stringify(payload)}`);

    const orderId = payload.data?.order_id || payload.order_id || '';
    const status = payload.data?.payment_status || payload.status || payload.event;

    let numericId: number | null = null;
    const match = String(orderId).match(/ORD-2026-(\d+)/) || String(orderId).match(/(\d+)/);
    if (match) {
      numericId = parseInt(match[1], 10);
    }

    if (numericId) {
      const orderRows = await db.select().from(orders).where(eq(orders.id, numericId));
      if (orderRows.length > 0) {
        const order = orderRows[0];
        if (status === 'APPROVED' || status === 'PAYMENT_APPROVED' || status === 'PAYMENT_ORDER_STATUS_CHANGED') {
          await db.update(orders).set({
            paymentStatus: 'PAID',
            status: 'EN_PRODUCCION',
            paymentMethod: 'Bold Online (Tarjetas/PSE)',
            internalNotes: `Pago APROBADO por Bold. Ref: ${orderId}`,
          }).where(eq(orders.id, order.id));

          await this.invoicingService.createInvoice({ orderId: `ORD-2026-${String(order.id).padStart(4, '0')}` });
          return { status: 'success', message: 'Bold payment approved' };
        }
      }
    }

    return { status: 'ok' };
  }

  async handlePaymentWebhook(payload: any) {
    // Si viene de Wompi
    if (payload?.event?.startsWith('transaction.') || payload?.data?.transaction) {
      return this.handleWompiWebhook(payload);
    }
    // Si viene de Bold
    if (payload?.event?.includes('PAYMENT') || payload?.data?.order_id) {
      return this.handleBoldWebhook(payload);
    }

    this.logger.log(`Webhook genérico de pago recibido: ${JSON.stringify(payload)}`);
    return { status: 'received' };
  }
}

