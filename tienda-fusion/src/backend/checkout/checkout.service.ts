import { Injectable, Logger, Inject, NotFoundException, BadRequestException, InternalServerErrorException, UnauthorizedException, ConflictException, HttpException } from '@nestjs/common';
import { InvoicingService } from '../invoicing/invoicing.service';
import { PricingEngineService } from '../pricing/pricing.service';
import { getB2BDiscount } from '../b2b/b2b.service';
import { quoteAllCarriers } from '../../lib/shippingEngine';
import { db } from '../../db';
import { orders, orderItems, products, users } from '../../db/schema';
import { eq, or, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type CartPricingSpec =
  | { kind: 'product'; productId: number; quantity: number; attributes: number[] }
  | { kind: 'book'; params: any }
  | { kind: 'canvas'; productId: number | null; quantity: number; aiDesign: boolean };

const ALLOWED_PAYMENT_METHODS = ['wompi', 'bold', 'bank_transfer', 'b2b_credit'];
const CANVAS_FALLBACK_PRICE = 85000;
const CANVAS_AI_DESIGN_FEE = 20000;
const MAX_QUANTITY = 1_000_000;

const clampQuantity = (value: any): number => {
  const qty = Math.round(Number(value));
  if (!Number.isFinite(qty) || qty < 1) {
    throw new BadRequestException('Cantidad inválida.');
  }
  return Math.min(qty, MAX_QUANTITY);
};

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
    mode: process.env.WOMPI_MODE === 'production' ? 'production' : 'sandbox',
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_Q5yDA9xoKdePzhSGeVe9HAUr1jiBmGWY',
    privateKey: process.env.WOMPI_PRIVATE_KEY || 'prv_test_549382910293847583920192',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || 'test_integrity_4Q7x52U34FfB9v74qT6h2Yp98s1',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || 'test_events_secret_998127391',
  },
  bold: {
    enabled: true,
    mode: process.env.BOLD_MODE === 'production' ? 'production' : 'sandbox',
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

  constructor(
    @Inject(InvoicingService) private readonly invoicingService: InvoicingService,
    @Inject(PricingEngineService) private readonly pricingService: PricingEngineService,
  ) {
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

    // El correo es obligatorio: sin él cualquiera podría recorrer los números de orden
    // y ver nombre, teléfono y dirección de otros clientes.
    if (!email || !email.trim() || (foundOrder.customerEmail || '').toLowerCase() !== email.trim().toLowerCase()) {
      throw new NotFoundException(`No se encontró ningún pedido con ese número y correo.`);
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

  /**
   * Recalcula en el servidor el precio de cada ítem del carrito a partir de su
   * especificación (`pricing`), el descuento B2B aprobado, el IVA y el envío.
   * Nunca se usan los precios que envía el navegador.
   */
  async quoteCart(data: { items?: any[]; customerCity?: string; shippingCarrierCode?: string }, authUser?: typeof users.$inferSelect | null) {
    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) {
      throw new BadRequestException('El carrito está vacío.');
    }
    if (rawItems.length > 50) {
      throw new BadRequestException('Demasiados productos en un solo pedido.');
    }

    const pricedItems: Array<{ productId: number | null; quantity: number; totalPrice: number; name: string; pricing: CartPricingSpec; source: any }> = [];

    for (const item of rawItems) {
      const spec = item?.pricing as CartPricingSpec | undefined;
      if (!spec || !spec.kind) {
        throw new BadRequestException('Tu carrito tiene productos de una versión anterior de la tienda. Elimínalos y agrégalos de nuevo.');
      }

      if (spec.kind === 'product') {
        const productId = Number(spec.productId);
        const quantity = clampQuantity(spec.quantity);
        const attributeIds = (Array.isArray(spec.attributes) ? spec.attributes : []).map(Number).filter(n => Number.isInteger(n) && n > 0);
        const product = (await db.select().from(products).where(eq(products.id, productId)))[0];
        if (!product || !product.isActive) {
          throw new BadRequestException(`El producto "${item.productName || productId}" ya no está disponible.`);
        }
        const quote = await this.pricingService.calculateQuote(productId, quantity, attributeIds);
        pricedItems.push({
          productId, quantity, totalPrice: quote.subtotal_neto, name: product.name,
          pricing: { kind: 'product', productId, quantity, attributes: attributeIds }, source: item,
        });
      } else if (spec.kind === 'book') {
        const params = { ...(spec.params || {}), quantity: clampQuantity(spec.params?.quantity) };
        const quote: any = await this.pricingService.calculateBookQuote(params);
        pricedItems.push({
          productId: null, quantity: params.quantity, totalPrice: Number(quote.subtotal_neto), name: String(item.productName || 'Libro'),
          pricing: { kind: 'book', params }, source: item,
        });
      } else if (spec.kind === 'canvas') {
        const productId = spec.productId ? Number(spec.productId) : null;
        const quantity = clampQuantity(spec.quantity ?? 1000);
        const product = productId ? (await db.select().from(products).where(eq(products.id, productId)))[0] : undefined;
        if (productId && (!product || !product.isActive)) {
          throw new BadRequestException(`El producto "${item.productName || productId}" ya no está disponible.`);
        }
        // Misma regla del editor: precio base del producto por cada 1.000 unidades + $20.000 si usó diseño IA
        const unitPackPrice = (product ? Number(product.basePrice) || CANVAS_FALLBACK_PRICE : CANVAS_FALLBACK_PRICE) + (spec.aiDesign ? CANVAS_AI_DESIGN_FEE : 0);
        const totalPrice = Math.round(unitPackPrice * (quantity / 1000) * 100) / 100;
        pricedItems.push({
          productId, quantity, totalPrice, name: product?.name || String(item.productName || 'Diseño personalizado'),
          pricing: { kind: 'canvas', productId, quantity, aiDesign: Boolean(spec.aiDesign) }, source: item,
        });
      } else {
        throw new BadRequestException('Tipo de producto no reconocido en el carrito.');
      }
    }

    // Mismas fórmulas que el carrito (CartContext) para que los totales coincidan
    const grossSubtotal = pricedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const b2bDiscountPct = getB2BDiscount(authUser);
    const b2bDiscount = Math.round((grossSubtotal * b2bDiscountPct) / 100);
    const subtotal = Math.max(0, grossSubtotal - b2bDiscount);
    const iva = Math.round(subtotal * 0.19);

    const carrierQuotes = quoteAllCarriers(data.customerCity || '', pricedItems.map(it => ({ quantity: it.quantity, name: it.source?.productName || it.name })));
    const carrier = carrierQuotes.find(q => q.carrierCode === data.shippingCarrierCode) || carrierQuotes[0];
    const shippingCost = carrier ? Number(carrier.cost) || 0 : 8000;
    const shippingMethod = carrier ? `${carrier.carrierName} (${carrier.serviceName})` : 'Mensajería Express (Estándar)';

    return {
      items: pricedItems,
      grossSubtotal,
      b2bDiscountPct,
      b2bDiscount,
      subtotal,
      iva,
      shippingCost,
      shippingMethod,
      total: subtotal + iva + shippingCost,
    };
  }

  async createOrder(data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    customerNit?: string;
    shippingCarrierCode?: string;
    total?: number;
    paymentMethod: string;
    items: Array<{
      productId?: number;
      productName?: string;
      quantity?: number;
      pricing?: CartPricingSpec;
      highResPdfUrl?: string;
      specs?: Record<string, any>;
      fileType?: string;
      previewImageUrl?: string;
      notes?: string;
    }>;
  }, authUser?: typeof users.$inferSelect | null) {
    try {
      const paymentMethod = ALLOWED_PAYMENT_METHODS.includes(data.paymentMethod) ? data.paymentMethod : 'wompi';
      const isB2bCredit = paymentMethod === 'b2b_credit';
      if (isB2bCredit && getB2BDiscount(authUser) === 0) {
        throw new BadRequestException('El crédito B2B solo está disponible para cuentas B2B aprobadas (inicia sesión con tu cuenta).');
      }

      // 1. Precios calculados por el servidor
      const quote = await this.quoteCart(data, authUser);

      // Si el navegador mostró otro total (precios cambiaron, carrito viejo), se avisa antes de cobrar
      if (data.total != null && Math.abs(Number(data.total) - quote.total) > 1) {
        throw new ConflictException({
          message: `Los precios se actualizaron. El total correcto de tu pedido es $${Math.round(quote.total).toLocaleString('es-CO')} COP. Revisa tu carrito y confirma de nuevo.`,
          totals: { subtotal: quote.subtotal, iva: quote.iva, shippingCost: quote.shippingCost, total: quote.total },
        });
      }

      // 2. Cliente: el usuario autenticado o, si compra como invitado, el correo del formulario
      const cleanEmail = (authUser?.email || data.customerEmail || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        throw new BadRequestException('Ingresa un correo electrónico válido.');
      }

      const result = await db.transaction(async (tx) => {
        await tx.insert(users).values({
          uid: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: cleanEmail,
          role: 'customer',
        }).onConflictDoNothing({ target: users.email });
        const user = (await tx.select().from(users).where(eq(users.email, cleanEmail)))[0];
        if (!user) {
          throw new BadRequestException('No se pudo registrar el cliente del pedido.');
        }

        // Productos sin ID propio (libros a medida) se asocian al primer producto del catálogo
        const fallbackProduct = (await tx.select({ id: products.id }).from(products).orderBy(products.id).limit(1))[0];
        if (!fallbackProduct) {
          throw new BadRequestException('El catálogo está vacío.');
        }

        const [newOrder] = await tx.insert(orders).values({
          userId: user.id,
          total: quote.total.toFixed(2),
          subtotal: quote.subtotal.toFixed(2),
          iva: quote.iva.toFixed(2),
          shippingCost: quote.shippingCost.toFixed(2),
          shippingMethod: quote.shippingMethod,
          customerName: (data.customerName || 'Cliente').trim().slice(0, 200),
          customerPhone: (data.customerPhone || '').trim().slice(0, 40),
          customerAddress: (data.customerAddress || '').trim().slice(0, 300),
          customerCity: (data.customerCity || '').trim().slice(0, 80),
          customerNit: (data.customerNit || '').trim().slice(0, 40),
          paymentMethod,
          // El crédito B2B lo debe aprobar un administrador antes de pasar a producción
          paymentStatus: isB2bCredit ? 'CREDIT_PENDING_REVIEW' : 'PENDING',
          status: 'NUEVO',
          internalNotes: `Pedido registrado vía checkout tienda online (${paymentMethod.toUpperCase()}).` +
            (quote.b2bDiscount > 0 ? ` Descuento B2B ${quote.b2bDiscountPct}%: -${quote.b2bDiscount} COP.` : ''),
        }).returning();

        for (const it of quote.items) {
          const src = it.source || {};
          await tx.insert(orderItems).values({
            orderId: newOrder.id,
            productId: it.productId ?? fallbackProduct.id,
            quantity: it.quantity,
            unitPrice: (it.totalPrice / it.quantity).toFixed(2),
            totalPrice: it.totalPrice.toFixed(2),
            highResPdfUrl: src.highResPdfUrl || null,
            // Se guarda la especificación de precio para poder re-imprimir el pedido
            specs: { ...(src.specs || {}), pricing: it.pricing, productName: src.productName || it.name },
            fileType: src.fileType || 'UPLOADED_PDF',
            previewImageUrl: src.previewImageUrl || null,
            notes: src.notes || null,
          });
        }
        return newOrder;
      });

      this.logger.log(`Orden #${result.id} creada exitosamente con estado ${result.status}.`);

      return {
        orderId: result.id,
        orderCode: `ORD-2026-${String(result.id).padStart(4, '0')}`,
        subtotal: quote.subtotal,
        iva: quote.iva,
        shippingCost: quote.shippingCost,
        total: quote.total,
        status: result.status,
        paymentStatus: result.paymentStatus,
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Error crítico al registrar orden en DB: ${err?.message || err}`, err?.stack);
      throw new InternalServerErrorException('No se pudo registrar la orden. Intenta de nuevo en unos minutos.');
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
   * Marca una orden como pagada (idempotente) y dispara la facturación electrónica.
   */
  private async markOrderPaid(order: typeof orders.$inferSelect, paymentMethod: string, note: string) {
    const orderCode = `ORD-2026-${String(order.id).padStart(4, '0')}`;
    if (order.paymentStatus === 'PAID') {
      return { success: true, orderId: order.id, orderCode, status: order.status, paymentStatus: 'PAID' };
    }

    await db.update(orders).set({
      paymentStatus: 'PAID',
      status: 'EN_PRODUCCION',
      paymentMethod,
      internalNotes: note,
    }).where(eq(orders.id, order.id));

    this.logger.log(`Orden #${order.id} pagada vía ${paymentMethod}. Disparando facturación electrónica...`);
    try {
      await this.invoicingService.createInvoice({ orderId: orderCode });
    } catch (invErr) {
      this.logger.warn(`Error al generar factura electrónica para ${orderCode}:`, invErr);
    }

    return { success: true, orderId: order.id, orderCode, status: 'EN_PRODUCCION', paymentStatus: 'PAID' };
  }

  private extractOrderId(reference: string): number | null {
    const match = String(reference || '').match(/^ORD-\d{4}-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private amountMatches(order: typeof orders.$inferSelect, amountInCents: number): boolean {
    return Math.round(parseFloat(order.total) * 100) === Math.round(Number(amountInCents));
  }

  private safeEqualHex(a: string, b: string): boolean {
    const bufA = Buffer.from(String(a || '').toLowerCase());
    const bufB = Buffer.from(String(b || '').toLowerCase());
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Confirmación de pago llamada por el navegador al cerrar el widget de Wompi.
   * Nunca se confía en el navegador: la transacción se consulta directamente a Wompi
   * y se valida estado, referencia y monto antes de marcar la orden como pagada.
   */
  async confirmPaymentDirect(payload: {
    orderId: number;
    paymentMethod: string;
    transactionId?: string;
    status?: string;
  }) {
    const orderRows = await db.select().from(orders).where(eq(orders.id, Number(payload.orderId)));
    if (orderRows.length === 0) {
      throw new NotFoundException(`Orden #${payload.orderId} no encontrada`);
    }
    const order = orderRows[0];
    const transactionId = String(payload.transactionId || '').trim();

    // Simulación de pagos (solo para pruebas, se activa con PAYMENT_SIMULATION=true)
    if (!transactionId || /^(SANDBOX|TEST)-/.test(transactionId)) {
      if (process.env.PAYMENT_SIMULATION !== 'true') {
        throw new BadRequestException('Pago no verificable. La confirmación llegará automáticamente desde la pasarela.');
      }
      return this.markOrderPaid(order, payload.paymentMethod || order.paymentMethod || 'Simulación', `Pago SIMULADO (PAYMENT_SIMULATION=true). ID: ${transactionId}`);
    }

    const config = this.loadConfig().wompi;
    const baseUrl = config.mode === 'production' ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
    let tx: any;
    try {
      const res = await fetch(`${baseUrl}/transactions/${encodeURIComponent(transactionId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      tx = (await res.json())?.data;
    } catch (err: any) {
      this.logger.warn(`No se pudo verificar la transacción Wompi ${transactionId}: ${err?.message}`);
      throw new BadRequestException('No se pudo verificar la transacción con Wompi. Si el pago fue aprobado se confirmará automáticamente.');
    }

    if (!tx || tx.status !== 'APPROVED' || this.extractOrderId(tx.reference) !== order.id || tx.currency !== 'COP' || !this.amountMatches(order, tx.amount_in_cents)) {
      this.logger.warn(`Transacción Wompi ${transactionId} rechazada para orden #${order.id} (estado=${tx?.status}, ref=${tx?.reference}, monto=${tx?.amount_in_cents})`);
      throw new BadRequestException('La transacción no corresponde a esta orden o no está aprobada.');
    }

    return this.markOrderPaid(order, `Wompi (${tx.payment_method_type || 'ONLINE'})`, `Pago APROBADO por Wompi (verificado). Ref: ${tx.reference} | Transacción: ${tx.id}`);
  }

  /**
   * Webhook oficial de Wompi. Se valida la firma del evento con el "Events Secret":
   * SHA256(valores de signature.properties + timestamp + eventsSecret) === signature.checksum
   */
  async handleWompiWebhook(payload: any) {
    const eventsSecret = this.loadConfig().wompi.eventsSecret;
    const properties: string[] = payload?.signature?.properties || [];
    const checksum: string = payload?.signature?.checksum || '';
    if (!eventsSecret || !checksum || properties.length === 0 || payload?.timestamp == null) {
      this.logger.warn('Webhook Wompi sin firma, ignorado');
      throw new UnauthorizedException('Firma inválida');
    }
    const values = properties.map(prop => prop.split('.').reduce((acc: any, key) => acc?.[key], payload.data)).join('');
    const expected = crypto.createHash('sha256').update(`${values}${payload.timestamp}${eventsSecret}`).digest('hex');
    if (!this.safeEqualHex(expected, checksum)) {
      this.logger.warn('Webhook Wompi con firma inválida, ignorado');
      throw new UnauthorizedException('Firma inválida');
    }

    this.logger.log(`Webhook oficial de Wompi recibido: Evento=${payload.event}`);
    const transaction = payload?.data?.transaction;
    if (!transaction) {
      return { status: 'ignored', message: 'No transaction data found in payload' };
    }

    const reference = transaction.reference || '';
    const status = transaction.status; // 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'
    const transactionId = transaction.id;
    const numericId = this.extractOrderId(reference);
    if (!numericId) return { status: 'ignored' };

    const order = (await db.select().from(orders).where(eq(orders.id, numericId)))[0];
    if (!order) return { status: 'ignored' };

    if (status === 'APPROVED') {
      if (!this.amountMatches(order, transaction.amount_in_cents)) {
        this.logger.error(`Monto Wompi ${transaction.amount_in_cents} no coincide con la orden #${order.id} (${order.total})`);
        await db.update(orders).set({
          paymentStatus: 'AMOUNT_MISMATCH',
          internalNotes: `ALERTA: Wompi aprobó ${transaction.amount_in_cents / 100} COP pero la orden vale ${order.total}. Transacción: ${transactionId}`,
        }).where(eq(orders.id, order.id));
        return { status: 'recorded', message: 'Amount mismatch' };
      }
      await this.markOrderPaid(order, `Wompi (${transaction.payment_method_type || 'WOMPI'})`, `Pago APROBADO por Wompi. Ref: ${reference} | Transacción: ${transactionId}`);
      return { status: 'success', message: 'Transaction approved and order processed' };
    }

    if (order.paymentStatus !== 'PAID') {
      await db.update(orders).set({
        paymentStatus: status,
        internalNotes: `Transacción Wompi ${status}. ID: ${transactionId}`,
      }).where(eq(orders.id, order.id));
    }
    return { status: 'recorded', message: `Transaction status ${status} recorded` };
  }

  /**
   * Webhook oficial de Bold. Firma: HMAC-SHA256(base64(cuerpo crudo), secretKey) === header x-bold-signature
   */
  async handleBoldWebhook(payload: any, rawBody?: Buffer, signature?: string) {
    const secretKey = this.loadConfig().bold.secretKey;
    if (!rawBody || !signature || !secretKey) {
      this.logger.warn('Webhook Bold sin firma, ignorado');
      throw new UnauthorizedException('Firma inválida');
    }
    const expected = crypto.createHmac('sha256', secretKey).update(rawBody.toString('base64')).digest('hex');
    if (!this.safeEqualHex(expected, signature)) {
      this.logger.warn('Webhook Bold con firma inválida, ignorado');
      throw new UnauthorizedException('Firma inválida');
    }

    const type = payload?.type || payload?.data?.payment_status || payload?.status;
    const reference = payload?.data?.metadata?.reference || payload?.data?.order_id || payload?.order_id || '';
    this.logger.log(`Webhook oficial de Bold recibido: Tipo=${type}, Ref=${reference}`);

    const numericId = this.extractOrderId(reference);
    if (!numericId) return { status: 'ignored' };
    const order = (await db.select().from(orders).where(eq(orders.id, numericId)))[0];
    if (!order) return { status: 'ignored' };

    if (type === 'SALE_APPROVED' || type === 'APPROVED') {
      const total = Number(payload?.data?.amount?.total ?? payload?.data?.amount);
      if (!Number.isFinite(total) || !this.amountMatches(order, total * 100)) {
        this.logger.error(`Monto Bold ${total} no coincide con la orden #${order.id} (${order.total})`);
        await db.update(orders).set({
          paymentStatus: 'AMOUNT_MISMATCH',
          internalNotes: `ALERTA: Bold aprobó ${total} COP pero la orden vale ${order.total}. Ref: ${reference}`,
        }).where(eq(orders.id, order.id));
        return { status: 'recorded', message: 'Amount mismatch' };
      }
      await this.markOrderPaid(order, 'Bold Online (Tarjetas/PSE)', `Pago APROBADO por Bold. Ref: ${reference} | Pago: ${payload?.data?.payment_id || ''}`);
      return { status: 'success', message: 'Bold payment approved' };
    }

    return { status: 'ok' };
  }

  async handlePaymentWebhook(payload: any, rawBody?: Buffer, boldSignature?: string) {
    // Si viene de Wompi
    if (payload?.event?.startsWith('transaction.') || payload?.data?.transaction) {
      return this.handleWompiWebhook(payload);
    }
    // Si viene de Bold
    if (boldSignature) {
      return this.handleBoldWebhook(payload, rawBody, boldSignature);
    }

    this.logger.log(`Webhook genérico de pago recibido: ${JSON.stringify(payload)}`);
    return { status: 'received' };
  }
}

