-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "paymentPrefix" TEXT,
ADD COLUMN     "paymentStartNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "paymentUsePrefix" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptPrefix" TEXT,
ADD COLUMN     "receiptStartNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "receiptUsePrefix" BOOLEAN NOT NULL DEFAULT false;
