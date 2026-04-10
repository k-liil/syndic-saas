const { PrismaClient } = require('@prisma/client');

async function checkProd() {
  const prodUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({
    datasources: { db: { url: prodUrl } }
  });

  try {
    console.log("Checking Production DB...");
    const cols = await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = 'ContributionGroup';`;
    console.log("Columns in Production ContributionGroup:", cols);
  } catch (err) {
    console.error("Production DB error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkProd();
