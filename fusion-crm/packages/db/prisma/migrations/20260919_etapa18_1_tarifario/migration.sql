-- ============================================================================
-- ETAPA 18.1 — CIMIENTO DEL TARIFARIO DE PRODUCCIÓN
-- Migración DDL para PostgreSQL
-- ============================================================================

-- Crear Enums
DO $$ BEGIN
  CREATE TYPE "TariffStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SheetFormat" AS ENUM ('S70X100', 'S60X90');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PrintTechnique" AS ENUM ('LITHO', 'DIGITAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FinishingService" AS ENUM ('CUT', 'TRIM', 'PERFORATION', 'BINDING', 'LAMINATION', 'HALF_CUT', 'DIE_CUT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FinishingMode" AS ENUM ('NONE', 'PER_RUN', 'MINIMUM', 'PER_THOUSAND', 'PER_UNIT', 'PER_M2', 'PER_LINEAR_CM', 'PER_CM2', 'PER_LOOP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TariffScope" AS ENUM ('DIGITAL', 'LITHO', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommercialTermType" AS ENUM ('DELIVERY_TIME', 'PAYMENT_TERM', 'VALIDITY', 'VAT', 'CLIENT_DISCOUNT', 'DESIGN_OWNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AssistMode" AS ENUM ('GUIDED', 'MANUAL_LITHO', 'WIDE_FORMAT', 'ON_DEMAND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. TariffVersion
CREATE TABLE IF NOT EXISTS "TariffVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "TariffStatus" NOT NULL DEFAULT 'DRAFT',
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "bleedCm" DECIMAL(10,2) NOT NULL DEFAULT 0.6,
  "gripMarginCm" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
  "defaultWastageSheets" INTEGER NOT NULL DEFAULT 200,
  "defaultLithoMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 30.0,
  "notes" TEXT,
  "sourceFileKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

-- Índices TariffVersion
CREATE UNIQUE INDEX IF NOT EXISTS "TariffVersion_organizationId_code_key" ON "TariffVersion"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "TariffVersion_organizationId_status_validFrom_idx" ON "TariffVersion"("organizationId", "status", "validFrom");

-- REGLA MAESTRA: Como máximo una versión PUBLISHED sin validTo por organización
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tariff_published_current" 
ON "TariffVersion" ("organizationId") 
WHERE "status" = 'PUBLISHED' AND "validTo" IS NULL;

-- 2. PaperTariffItem
CREATE TABLE IF NOT EXISTS "PaperTariffItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE RESTRICT,
  "family" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "paperTypeId" TEXT,
  "sheetFormat" "SheetFormat" NOT NULL,
  "pricePerSheet" DECIMAL(18,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaperTariffItem_tariffVersionId_name_sheetFormat_key" ON "PaperTariffItem"("tariffVersionId", "name", "sheetFormat");
CREATE INDEX IF NOT EXISTS "PaperTariffItem_organizationId_tariffVersionId_idx" ON "PaperTariffItem"("organizationId", "tariffVersionId");

-- 3. DigitalFormatTariff
CREATE TABLE IF NOT EXISTS "DigitalFormatTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "widthCm" DECIMAL(10,2) NOT NULL,
  "heightCm" DECIMAL(10,2) NOT NULL,
  "price1x0" DECIMAL(15,2) NOT NULL,
  "price4x0" DECIMAL(15,2) NOT NULL,
  "price4x4" DECIMAL(15,2) NOT NULL,
  "laminationUnitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "DigitalFormatTariff_organizationId_tariffVersionId_idx" ON "DigitalFormatTariff"("organizationId", "tariffVersionId");

-- 4. DigitalVolumeTier
CREATE TABLE IF NOT EXISTS "DigitalVolumeTier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "digitalFormatTariffId" TEXT NOT NULL REFERENCES "DigitalFormatTariff"("id") ON DELETE CASCADE,
  "minSheets" INTEGER NOT NULL,
  "maxSheets" INTEGER,
  "unitPrice" DECIMAL(15,2) NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalVolumeTier_digitalFormatTariffId_minSheets_key" ON "DigitalVolumeTier"("digitalFormatTariffId", "minSheets");
CREATE INDEX IF NOT EXISTS "DigitalVolumeTier_organizationId_digitalFormatTariffId_idx" ON "DigitalVolumeTier"("organizationId", "digitalFormatTariffId");

-- 5. LithoFormatTariff
CREATE TABLE IF NOT EXISTS "LithoFormatTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "machineLabel" TEXT,
  "printAreaWidthCm" DECIMAL(10,2) NOT NULL,
  "printAreaHeightCm" DECIMAL(10,2) NOT NULL,
  "plateUnitPrice" DECIMAL(15,2) NOT NULL,
  "pressPricePerThousand DECIMAL(15,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "LithoFormatTariff_organizationId_tariffVersionId_idx" ON "LithoFormatTariff"("organizationId", "tariffVersionId");

-- 6. SheetCut
CREATE TABLE IF NOT EXISTS "SheetCut" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "divisor" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "SheetCut_tariffVersionId_code_key" ON "SheetCut"("tariffVersionId", "code");
CREATE INDEX IF NOT EXISTS "SheetCut_organizationId_tariffVersionId_idx" ON "SheetCut"("organizationId", "tariffVersionId");

-- 7. SheetCutSize
CREATE TABLE IF NOT EXISTS "SheetCutSize" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "sheetCutId" TEXT NOT NULL REFERENCES "SheetCut"("id") ON DELETE CASCADE,
  "sheetFormat" "SheetFormat" NOT NULL,
  "widthCm" DECIMAL(10,2) NOT NULL,
  "heightCm" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "SheetCutSize_sheetCutId_sheetFormat_key" ON "SheetCutSize"("sheetCutId", "sheetFormat");
CREATE INDEX IF NOT EXISTS "SheetCutSize_organizationId_sheetCutId_idx" ON "SheetCutSize"("organizationId", "sheetCutId");

-- 8. InkSetTariff
CREATE TABLE IF NOT EXISTS "InkSetTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL,
  "plates" INTEGER NOT NULL,
  "technique" "PrintTechnique" NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "InkSetTariff_tariffVersionId_code_technique_key" ON "InkSetTariff"("tariffVersionId", "code", "technique");
CREATE INDEX IF NOT EXISTS "InkSetTariff_organizationId_tariffVersionId_idx" ON "InkSetTariff"("organizationId", "tariffVersionId");

-- 9. FinishingTariff
CREATE TABLE IF NOT EXISTS "FinishingTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "service" "FinishingService" NOT NULL,
  "mode" "FinishingMode" NOT NULL,
  "label" TEXT NOT NULL,
  "price" DECIMAL(15,2) NOT NULL,
  "minimumCharge" DECIMAL(15,2),
  "appliesTo" "TariffScope" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinishingTariff_tariffVersionId_service_label_key" ON "FinishingTariff"("tariffVersionId", "service", "label");
CREATE INDEX IF NOT EXISTS "FinishingTariff_organizationId_tariffVersionId_idx" ON "FinishingTariff"("organizationId", "tariffVersionId");

-- 10. CommercialTermTariff
CREATE TABLE IF NOT EXISTS "CommercialTermTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "type" "CommercialTermType" NOT NULL,
  "label" TEXT NOT NULL,
  "numericValue" DECIMAL(10,4),
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "CommercialTermTariff_organizationId_tariffVersionId_idx" ON "CommercialTermTariff"("organizationId", "tariffVersionId");

-- 11. WideFormatTariff
CREATE TABLE IF NOT EXISTS "WideFormatTariff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "pricePerMeter" DECIMAL(15,2) NOT NULL,
  "peerDiscountPerMeter" DECIMAL(15,2) NOT NULL DEFAULT 10000,
  "roundToNearest" INTEGER NOT NULL DEFAULT 500,
  "minimumCharge" DECIMAL(15,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "WideFormatTariff_organizationId_tariffVersionId_idx" ON "WideFormatTariff"("organizationId", "tariffVersionId");

-- 12. QuoteAssistRun
CREATE TABLE IF NOT EXISTS "QuoteAssistRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tariffVersionId" TEXT NOT NULL REFERENCES "TariffVersion"("id") ON DELETE RESTRICT,
  "engineVersion" TEXT NOT NULL,
  "quoteId" TEXT,
  "quoteItemIds" TEXT[],
  "technique" "PrintTechnique" NOT NULL,
  "mode" "AssistMode" NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "warnings" TEXT[],
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "QuoteAssistRun_organizationId_quoteId_idx" ON "QuoteAssistRun"("organizationId", "quoteId");
CREATE INDEX IF NOT EXISTS "QuoteAssistRun_organizationId_createdAt_idx" ON "QuoteAssistRun"("organizationId", "createdAt");

-- Alter Quote
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "tariffVersionId" TEXT REFERENCES "TariffVersion"("id") ON DELETE RESTRICT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "assistRunCount" INTEGER NOT NULL DEFAULT 0;

-- Alter QuoteItem
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "assistRunId" TEXT REFERENCES "QuoteAssistRun"("id") ON DELETE SET NULL;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "productionSpec" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "impositionPerSheet" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "plateCount" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "sheetsNeeded" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "printTechnique" "PrintTechnique";
