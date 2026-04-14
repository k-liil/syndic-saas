import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in some versions
    // We try it and ignore errors if already exists
    await prisma.$executeRawUnsafe('ALTER TYPE "PaymentMethod" ADD VALUE \'INTERNAL_TRANSFER\'');
    console.log('Enum updated successfully');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Enum value already exists, skipping.');
    } else {
      console.error('Failed to update enum:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
