/*
  Warnings:

  - You are about to drop the column `buildingId` on the `Owner` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Owner" DROP CONSTRAINT "Owner_buildingId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_buildingId_fkey";

-- DropIndex
DROP INDEX "Owner_buildingId_idx";

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "startMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "startYear" INTEGER NOT NULL DEFAULT 2026;

-- AlterTable
ALTER TABLE "Owner" DROP COLUMN "buildingId";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankRef" TEXT,
ADD COLUMN     "paymentNumber" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "buildingId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentNumber_key" ON "Payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "Payment_paymentNumber_idx" ON "Payment"("paymentNumber");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;
