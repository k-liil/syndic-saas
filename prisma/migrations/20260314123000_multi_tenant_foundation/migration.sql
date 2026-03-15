CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('org_default', 'Organisation par defaut', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "Owner" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Building" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Ownership" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "MonthlyDue" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Receipt" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "FiscalYear" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "InternalBank" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PaymentCategory" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "OtherReceipt" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ImportJob" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ImportJob" ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Owner" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Building" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Unit" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Ownership" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "MonthlyDue" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Payment" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Receipt" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "User" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "AppSettings" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "FiscalYear" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "InternalBank" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Supplier" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "PaymentCategory" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "OtherReceipt" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "ImportJob" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "ImportJob" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

ALTER TABLE "Owner" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Building" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Unit" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Ownership" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MonthlyDue" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Receipt" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AppSettings" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FiscalYear" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "InternalBank" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PaymentCategory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "OtherReceipt" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ImportJob" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ImportJob" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Owner" ADD CONSTRAINT "Owner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MonthlyDue" ADD CONSTRAINT "MonthlyDue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalBank" ADD CONSTRAINT "InternalBank_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentCategory" ADD CONSTRAINT "PaymentCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OtherReceipt" ADD CONSTRAINT "OtherReceipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Owner_cin_key";
CREATE UNIQUE INDEX "Owner_organizationId_cin_key" ON "Owner"("organizationId", "cin");
CREATE INDEX "Owner_organizationId_idx" ON "Owner"("organizationId");

DROP INDEX IF EXISTS "Unit_lotNumber_key";
CREATE UNIQUE INDEX "Unit_organizationId_lotNumber_key" ON "Unit"("organizationId", "lotNumber");
CREATE INDEX "Unit_organizationId_idx" ON "Unit"("organizationId");

DROP INDEX IF EXISTS "Payment_paymentNumber_key";
CREATE UNIQUE INDEX "Payment_organizationId_paymentNumber_key" ON "Payment"("organizationId", "paymentNumber");
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

DROP INDEX IF EXISTS "Receipt_receiptNumber_key";
CREATE UNIQUE INDEX "Receipt_organizationId_receiptNumber_key" ON "Receipt"("organizationId", "receiptNumber");
CREATE INDEX "Receipt_organizationId_idx" ON "Receipt"("organizationId");

DROP INDEX IF EXISTS "OtherReceipt_receiptNumber_key";
CREATE UNIQUE INDEX "OtherReceipt_organizationId_receiptNumber_key" ON "OtherReceipt"("organizationId", "receiptNumber");
CREATE INDEX "OtherReceipt_organizationId_idx" ON "OtherReceipt"("organizationId");

DROP INDEX IF EXISTS "FiscalYear_year_key";
CREATE UNIQUE INDEX "FiscalYear_organizationId_year_key" ON "FiscalYear"("organizationId", "year");
CREATE INDEX "FiscalYear_organizationId_idx" ON "FiscalYear"("organizationId");

CREATE UNIQUE INDEX "AppSettings_organizationId_key" ON "AppSettings"("organizationId");
CREATE INDEX "Ownership_organizationId_idx" ON "Ownership"("organizationId");
CREATE INDEX "MonthlyDue_organizationId_idx" ON "MonthlyDue"("organizationId");
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");
CREATE INDEX "InternalBank_organizationId_idx" ON "InternalBank"("organizationId");
CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");
CREATE INDEX "PaymentCategory_organizationId_idx" ON "PaymentCategory"("organizationId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "ImportJob_organizationId_idx" ON "ImportJob"("organizationId");
