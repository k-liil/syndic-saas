/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `unallocatedAmount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `PaymentAllocation` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `supplierId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_unitId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_dueId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_paymentId_fkey";

-- DropIndex
DROP INDEX "Payment_ownerId_idx";

-- DropIndex
DROP INDEX "Payment_unitId_idx";

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "openingBankBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingCashBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "ownerId",
DROP COLUMN "unallocatedAmount",
DROP COLUMN "unitId",
ADD COLUMN     "supplierId" TEXT NOT NULL;

-- DropTable
DROP TABLE "PaymentAllocation";

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_supplierId_idx" ON "Payment"("supplierId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
