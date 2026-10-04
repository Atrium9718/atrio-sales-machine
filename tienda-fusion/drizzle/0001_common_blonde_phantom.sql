ALTER TABLE "users" ADD COLUMN "b2b_tier" text DEFAULT 'RETAIL' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "b2b_request" jsonb;