const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DigitalVaultDocument" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "isVisibleToOwners" BOOLEAN NOT NULL DEFAULT false,
      "documentDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DigitalVaultDocument_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_organizationId_idx"
    ON "DigitalVaultDocument"("organizationId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_category_idx"
    ON "DigitalVaultDocument"("category")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_isVisibleToOwners_idx"
    ON "DigitalVaultDocument"("isVisibleToOwners")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DigitalVaultDocument_documentDate_idx"
    ON "DigitalVaultDocument"("documentDate")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'DigitalVaultDocument_organizationId_fkey'
      ) THEN
        ALTER TABLE "DigitalVaultDocument"
          ADD CONSTRAINT "DigitalVaultDocument_organizationId_fkey"
          FOREIGN KEY ("organizationId")
          REFERENCES "Organization"("id")
          ON DELETE RESTRICT
          ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log("DigitalVaultDocument table ensured");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
