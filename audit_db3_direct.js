const { PrismaClient } = require('@prisma/client');

async function checkDb(url, name) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log(`--- Checking DB: ${name} ---`);
  try {
    const enumQuery = await prisma.$queryRawUnsafe('SELECT enum_range(NULL::"PaymentMethod")');
    console.log('Enum values:', enumQuery[0].enum_range);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Direct host for vwyjpsatxrvpzhsqvqun
  const url3 = "postgresql://postgres.vwyjpsatxrvpzhsqvqun:IIn3Yv1rKxAtI6U1@db.vwyjpsatxrvpzhsqvqun.supabase.co:5432/postgres";
  await checkDb(url3, 'vwyjpsatxrvpzhsqvqun (DIRECT)');
}

main();
