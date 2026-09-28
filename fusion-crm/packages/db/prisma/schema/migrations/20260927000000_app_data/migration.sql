-- AlterTable
ALTER TABLE "ProductionProject" ADD COLUMN     "appData" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "appData" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "appData" JSONB NOT NULL DEFAULT '{}';

