-- CreateTable
CREATE TABLE "app_documents" (
    "collection" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_documents_pkey" PRIMARY KEY ("collection","id")
);

-- CreateIndex
CREATE INDEX "app_documents_collection_updatedAt_idx" ON "app_documents"("collection", "updatedAt");
