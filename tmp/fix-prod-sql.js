const { PrismaClient } = require('@prisma/client');

async function fixSchema() {
  const prodUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({
    datasources: { db: { url: prodUrl } }
  });

  try {
    console.log("Adding column 'defaultAmount' to 'ContributionGroup' via SQL...");
    // We use $executeRawUnsafe to run the DDL
    await prisma.$executeRawUnsafe(`ALTER TABLE "ContributionGroup" ADD COLUMN IF NOT EXISTS "defaultAmount" DECIMAL(10,2);`);
    console.log("SQL Command SUCCESS!");
  } catch (err) {
    console.error("SQL Migration FAILED:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
