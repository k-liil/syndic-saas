ALTER TABLE "AccountingPost"
ALTER COLUMN "isActive" SET DEFAULT false;

UPDATE "AccountingPost"
SET "isActive" = false
WHERE "isActive" = true;
