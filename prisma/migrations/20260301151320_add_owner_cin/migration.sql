/*
  Warnings:

  - A unique constraint covering the columns `[cin]` on the table `Owner` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "cin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_cin_key" ON "Owner"("cin");
