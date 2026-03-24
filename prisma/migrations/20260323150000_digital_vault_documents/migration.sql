CREATE TABLE IF NOT EXISTS "DigitalVaultDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isVisibleToOwners" BOOLEAN NOT NULL DEFAULT false,
  "documentDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DigitalVaultDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_organizationId_idx" ON "DigitalVaultDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_category_idx" ON "DigitalVaultDocument"("category");
CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_isVisibleToOwners_idx" ON "DigitalVaultDocument"("isVisibleToOwners");
CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_documentDate_idx" ON "DigitalVaultDocument"("documentDate");
