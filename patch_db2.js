const { PrismaClient } = require('@prisma/client');

async function patchDb(url, name) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log(`--- Patching DB: ${name} ---`);
  try {
    const enumQuery = await prisma.$queryRawUnsafe('SELECT enum_range(NULL::"PaymentMethod")');
    const values = enumQuery[0].enum_range;
    
    if (!values.includes('BANK_DEPOSIT')) {
      console.log('Adding BANK_DEPOSIT to PaymentMethod enum...');
      await prisma.$executeRawUnsafe('ALTER TYPE "PaymentMethod" ADD VALUE \'BANK_DEPOSIT\'');
      console.log('Successfully added BANK_DEPOSIT');
    } else {
      console.log('BANK_DEPOSIT already exists in enum.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const url2 = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
  await patchDb(url2, 'tlmhuseqfzlivnvfdzkb');
}

main();
