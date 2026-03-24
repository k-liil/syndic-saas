const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClaimComment" (
      "id" TEXT NOT NULL,
      "claimId" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClaimComment_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClaimComment_claimId_createdAt_idx"
    ON "ClaimComment"("claimId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClaimComment_organizationId_createdAt_idx"
    ON "ClaimComment"("organizationId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClaimComment_userId_createdAt_idx"
    ON "ClaimComment"("userId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  console.log("ClaimComment table ensured");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
