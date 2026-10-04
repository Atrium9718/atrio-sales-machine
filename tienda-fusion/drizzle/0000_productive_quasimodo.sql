CREATE TABLE "attribute_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribute_id" integer NOT NULL,
	"label" text,
	"value_code" text,
	"extra_data" jsonb,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"control_type" text,
	"attribute_group" text,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "audiences" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"criteria" jsonb,
	"last_updated" timestamp DEFAULT now(),
	"engagement_rate" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'PAUSED' NOT NULL,
	"stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"active" boolean DEFAULT true,
	"display_order" integer,
	"description" text,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'DISCONNECTED' NOT NULL,
	"account_name" text,
	"metrics" jsonb
);
--> statement-breakpoint
CREATE TABLE "design_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"product_id" integer,
	"canvas_data" jsonb,
	"preview_url" text,
	"active" boolean DEFAULT true,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"desktop_image_url" text,
	"mobile_image_url" text,
	"link_type" text,
	"link_url" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"active" boolean DEFAULT true,
	"image_url" text,
	"link" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tag" text,
	"cta_text" text,
	"display_order" integer DEFAULT 0,
	"placement" text DEFAULT 'hero',
	"animation_type" text DEFAULT 'fade',
	"bg_type" text DEFAULT 'IMAGE',
	"bg_color" text DEFAULT '#0f172a',
	"gradient_from" text DEFAULT '#0f172a',
	"gradient_to" text DEFAULT '#14b8a6',
	"text_color" text DEFAULT '#ffffff',
	"overlay_opacity" integer DEFAULT 50,
	"is_popup" boolean DEFAULT false,
	"popup_config" jsonb,
	"extra_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "litho_cost_parameters" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_type" text NOT NULL,
	"cost_value" numeric(10, 4) NOT NULL,
	"extra_config" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"target_product" text NOT NULL,
	"target_audience" text NOT NULL,
	"channels" jsonb,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sent_date" timestamp,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue_generated" numeric(10, 2) DEFAULT '0',
	"content" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2),
	"high_res_pdf_url" text,
	"specs" jsonb,
	"file_type" text,
	"preview_image_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"total" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"subtotal" numeric(10, 2),
	"iva" numeric(10, 2),
	"customer_name" text,
	"customer_phone" text,
	"customer_address" text,
	"customer_city" text,
	"customer_nit" text,
	"shipping_method" text,
	"shipping_cost" numeric(10, 2),
	"payment_method" text,
	"payment_status" text,
	"tracking_number" text,
	"tracking_courier" text,
	"internal_notes" text
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"min_quantity" integer,
	"max_quantity" integer,
	"min_qty" integer,
	"max_qty" integer,
	"discount_percentage" numeric(5, 2),
	"fixed_price" numeric(10, 2),
	"conditions" jsonb
);
--> statement-breakpoint
CREATE TABLE "product_attribute_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_attribute_id" integer NOT NULL,
	"attribute_value_id" integer NOT NULL,
	"price_modifier" numeric(10, 2) DEFAULT '0',
	"weight_modifier" numeric(10, 2) DEFAULT '0',
	"days_modifier" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"attribute_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"config_mode" text,
	"base_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"base_quantity" integer DEFAULT 1 NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"quantity_step" integer DEFAULT 1 NOT NULL,
	"setup_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pricing_mode" text DEFAULT 'prorated' NOT NULL,
	"extra_config" jsonb,
	"image_url" text,
	"images" jsonb,
	"category" text DEFAULT 'General' NOT NULL,
	"thumbnail" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text,
	"email" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"password_hash" text,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_attribute_id_product_attributes_id_fk" FOREIGN KEY ("product_attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_value_id_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;