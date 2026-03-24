CREATE TABLE IF NOT EXISTS "ClaimComment" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClaimComment_claimId_createdAt_idx"
ON "ClaimComment"("claimId", "createdAt");

CREATE INDEX IF NOT EXISTS "ClaimComment_organizationId_createdAt_idx"
ON "ClaimComment"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "ClaimComment_userId_createdAt_idx"
ON "ClaimComment"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClaimComment_claimId_fkey'
      AND table_name = 'ClaimComment'
  ) THEN
    ALTER TABLE "ClaimComment"
      ADD CONSTRAINT "ClaimComment_claimId_fkey"
      FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClaimComment_organizationId_fkey'
      AND table_name = 'ClaimComment'
  ) THEN
    ALTER TABLE "ClaimComment"
      ADD CONSTRAINT "ClaimComment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClaimComment_userId_fkey'
      AND table_name = 'ClaimComment'
  ) THEN
    ALTER TABLE "ClaimComment"
      ADD CONSTRAINT "ClaimComment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
