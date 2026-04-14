import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- InternalBank Content Check ---');
  try {
    // We use queryRawUnsafe to avoid Prisma Client's schema expectations
    const banks: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "InternalBank"`);
    console.log(`Found ${banks.length} banks.`);
    console.log(JSON.stringify(banks, null, 2));
  } catch (err) {
    console.error('Error fetching banks:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
