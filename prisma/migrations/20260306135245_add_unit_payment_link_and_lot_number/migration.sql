/*
  Warnings:

  - A unique constraint covering the columns `[lotNumber]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "lotNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Payment_unitId_idx" ON "Payment"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_lotNumber_key" ON "Unit"("lotNumber");

-- CreateIndex
CREATE INDEX "Unit_lotNumber_idx" ON "Unit"("lotNumber");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
