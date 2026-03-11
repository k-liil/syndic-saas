/*
  Warnings:

  - You are about to drop the column `buildingId` on the `Payment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_buildingId_fkey";

-- DropIndex
DROP INDEX "Payment_buildingId_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "buildingId";
