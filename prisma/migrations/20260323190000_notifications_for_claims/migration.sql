CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "claimId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_organizationId_isRead_createdAt_idx"
  ON "Notification"("userId", "organizationId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_organizationId_createdAt_idx"
  ON "Notification"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_claimId_idx"
  ON "Notification"("claimId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_userId_fkey'
      AND table_name = 'Notification'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_organizationId_fkey'
      AND table_name = 'Notification'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Notification_claimId_fkey'
      AND table_name = 'Notification'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_claimId_fkey"
      FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
