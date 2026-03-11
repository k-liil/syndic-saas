-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalYear_buildingId_idx" ON "FiscalYear"("buildingId");

-- CreateIndex
CREATE INDEX "FiscalYear_year_idx" ON "FiscalYear"("year");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_buildingId_year_key" ON "FiscalYear"("buildingId", "year");

-- AddForeignKey
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
