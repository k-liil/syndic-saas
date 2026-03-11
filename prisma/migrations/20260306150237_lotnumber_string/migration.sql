-- DropIndex
DROP INDEX "Unit_reference_key";

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "lotNumber" SET DATA TYPE TEXT;
