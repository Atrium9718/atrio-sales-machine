import { pgTable, text, serial, timestamp, boolean, integer, jsonb, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('customer'),
  passwordHash: text('password_hash'),
  // Nivel B2B aprobado por un administrador (RETAIL = sin descuento)
  b2bTier: text('b2b_tier').notNull().default('RETAIL'),
  // Última solicitud B2B enviada desde el portal (datos de empresa + estado)
  b2bRequest: jsonb('b2b_request'),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: integer('parent_id'),
  active: boolean('active').default(true),
  displayOrder: integer('display_order'),
  description: text('description'),
  icon: text('icon'),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  configMode: text('config_mode'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull().default('0'),
  baseQuantity: integer('base_quantity').notNull().default(1),
  minQuantity: integer('min_quantity').notNull().default(1),
  quantityStep: integer('quantity_step').notNull().default(1),
  setupFee: decimal('setup_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  pricingMode: text('pricing_mode').notNull().default('prorated'),
  extraConfig: jsonb('extra_config'),
  imageUrl: text('image_url'),
  images: jsonb('images'),
  category: text('category').notNull().default('General'),
  thumbnail: text('thumbnail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const attributes = pgTable('attributes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  controlType: text('control_type'),
  attributeGroup: text('attribute_group'),
  type: text('type'),
});

export const attributeValues = pgTable('attribute_values', {
  id: serial('id').primaryKey(),
  attributeId: integer('attribute_id').references(() => attributes.id).notNull(),
  label: text('label'),
  valueCode: text('value_code'),
  extraData: jsonb('extra_data'),
  value: text('value'),
});

export const productAttributes = pgTable('product_attributes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  attributeId: integer('attribute_id').references(() => attributes.id).notNull(),
});

export const productAttributeValues = pgTable('product_attribute_values', {
  id: serial('id').primaryKey(),
  productAttributeId: integer('product_attribute_id').references(() => productAttributes.id).notNull(),
  attributeValueId: integer('attribute_value_id').references(() => attributeValues.id).notNull(),
  priceModifier: decimal('price_modifier', { precision: 10, scale: 2 }).default('0'),
  weightModifier: decimal('weight_modifier', { precision: 10, scale: 2 }).default('0'),
  daysModifier: integer('days_modifier').default(0),
});

export const pricingRules = pgTable('pricing_rules', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id),
  minQuantity: integer('min_quantity'),
  maxQuantity: integer('max_quantity'),
  minQty: integer('min_qty'),
  maxQty: integer('max_qty'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }),
  fixedPrice: decimal('fixed_price', { precision: 10, scale: 2 }),
  conditions: jsonb('conditions'),
});

export const lithoCostParameters = pgTable('litho_cost_parameters', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unitType: text('unit_type').notNull(),
  costValue: decimal('cost_value', { precision: 10, scale: 4 }).notNull(),
  extraConfig: jsonb('extra_config'),
  active: boolean('active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const homeBanners = pgTable('home_banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  desktopImageUrl: text('desktop_image_url'),
  mobileImageUrl: text('mobile_image_url'),
  linkType: text('link_type'),
  linkUrl: text('link_url'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  active: boolean('active').default(true),
  imageUrl: text('image_url'),
  link: text('link'),
  isActive: boolean('is_active').default(true).notNull(),
  tag: text('tag'),
  ctaText: text('cta_text'),
  displayOrder: integer('display_order').default(0),
  placement: text('placement').default('hero'),
  animationType: text('animation_type').default('fade'),
  bgType: text('bg_type').default('IMAGE'),
  bgColor: text('bg_color').default('#0f172a'),
  gradientFrom: text('gradient_from').default('#0f172a'),
  gradientTo: text('gradient_to').default('#14b8a6'),
  textColor: text('text_color').default('#ffffff'),
  overlayOpacity: integer('overlay_opacity').default(50),
  isPopup: boolean('is_popup').default(false),
  popupConfig: jsonb('popup_config'),
  extraConfig: jsonb('extra_config'),
});

export const designTemplates = pgTable('design_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  productId: integer('product_id').references(() => products.id),
  canvasData: jsonb('canvas_data'),
  previewUrl: text('preview_url'),
  active: boolean('active').default(true),
  isActive: boolean('is_active').default(true).notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  iva: decimal('iva', { precision: 10, scale: 2 }),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  customerAddress: text('customer_address'),
  customerCity: text('customer_city'),
  customerNit: text('customer_nit'),
  shippingMethod: text('shipping_method'),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status'),
  trackingNumber: text('tracking_number'),
  trackingCourier: text('tracking_courier'),
  internalNotes: text('internal_notes'),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  highResPdfUrl: text('high_res_pdf_url'),
  specs: jsonb('specs'),
  fileType: text('file_type'),
  previewImageUrl: text('preview_image_url'),
  notes: text('notes'),
});

export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  targetProduct: text('target_product').notNull(),
  targetAudience: text('target_audience').notNull(),
  channels: jsonb('channels'),
  status: text('status').notNull().default('DRAFT'),
  sentDate: timestamp('sent_date'),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  revenueGenerated: decimal('revenue_generated', { precision: 10, scale: 2 }).default('0'),
  content: jsonb('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const channels = pgTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('DISCONNECTED'),
  accountName: text('account_name'),
  metrics: jsonb('metrics'),
});

export const automations = pgTable('automations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  trigger: text('trigger').notNull(),
  action: text('action').notNull(),
  status: text('status').notNull().default('PAUSED'),
  stats: jsonb('stats'),
});

export const audiences = pgTable('audiences', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: integer('size').notNull().default(0),
  criteria: jsonb('criteria'),
  lastUpdated: timestamp('last_updated').defaultNow(),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 2 }).default('0'),
});

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

