/*
  Warnings:

  - You are about to drop the column `buildingId` on the `FiscalYear` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[year]` on the table `FiscalYear` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FiscalYear" DROP CONSTRAINT "FiscalYear_buildingId_fkey";

-- DropIndex
DROP INDEX "FiscalYear_buildingId_idx";

-- DropIndex
DROP INDEX "FiscalYear_buildingId_year_key";

-- AlterTable
ALTER TABLE "FiscalYear" DROP COLUMN "buildingId";

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_year_key" ON "FiscalYear"("year");
