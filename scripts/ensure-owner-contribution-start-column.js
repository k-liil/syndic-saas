const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Owner"
    ADD COLUMN IF NOT EXISTS "contributionStartAt" TIMESTAMP(3)
  `);

  console.log('Owner.contributionStartAt ensured');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
