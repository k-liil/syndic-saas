const { PrismaClient } = require('@prisma/client');

async function checkDb(url, name) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log(`--- Checking DB: ${name} ---`);
  try {
    const count = await prisma.receipt.count();
    console.log('Receipt count:', count);
    
    const enumQuery = await prisma.$queryRawUnsafe('SELECT enum_range(NULL::"PaymentMethod")');
    console.log('Enum values:', enumQuery[0].enum_range);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const url1 = "postgresql://postgres.sowxbyunzughfjuhwedy:63gnhwkrmobmaIYs@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
  const url2 = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
  const url3 = "postgresql://postgres.vwyjpsatxrvpzhsqvqun:IIn3Yv1rKxAtI6U1@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
  
  await checkDb(url1, 'sowxbyunzughfjuhwedy');
  await checkDb(url2, 'tlmhuseqfzlivnvfdzkb');
  await checkDb(url3, 'vwyjpsatxrvpzhsqvqun (FOUND IN REPAIR_PROD_DB.TS)');
}

main();
