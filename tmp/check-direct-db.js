const { PrismaClient } = require('@prisma/client');

async function checkDirect() {
  const directUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@db.tlmhuseqfzlivnvfdzkb.supabase.co:5432/postgres";
  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } }
  });

  try {
    console.log("Checking Direct Production DB (5432)...");
    const cols = await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = 'ContributionGroup';`;
    console.log("Columns:", cols);
  } catch (err) {
    console.error("Direct connection FAILED:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirect();
