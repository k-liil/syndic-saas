-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "PaymentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_categoryId_idx" ON "Payment"("categoryId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PaymentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
