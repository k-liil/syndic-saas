/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Unit_reference_key" ON "Unit"("reference");
