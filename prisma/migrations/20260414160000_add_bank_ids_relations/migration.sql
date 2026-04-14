-- AlterTable adding bankId to multiple tables
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "bankId" TEXT;
ALTER TABLE "OtherReceipt" ADD COLUMN IF NOT EXISTS "bankId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "bankId" TEXT;

-- AddForeignKey constraints
DO $$ BEGIN
    ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "InternalBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "OtherReceipt" ADD CONSTRAINT "OtherReceipt_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "InternalBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "InternalBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
