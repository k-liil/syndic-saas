import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.vwyjpsatxrvpzhsqvqun:IIn3Yv1rKxAtI6U1@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  console.log('--- STARTING PROD REPAIR ---');
  try {
    // 1. Add missing column
    await prisma.$executeRawUnsafe('ALTER TABLE "InternalBank" ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(65,30) DEFAULT 0;');
    console.log('✅ Added openingBalance column');

    // 2. Ensure Intellak II has Banks
    const orgId = 'cmmyv5nxi0002num0zk6du1ki';
    const bankCount = await prisma.internalBank.count({ where: { organizationId: orgId } });
    if (bankCount === 0) {
      await prisma.internalBank.create({
        data: {
          organizationId: orgId,
          name: 'Banque Populaire (BP)',
          isActive: true,
          openingBalance: 0
        }
      });
      await prisma.internalBank.create({
        data: {
          organizationId: orgId,
          name: 'Trésorerie Générale (TGR)',
          isActive: true,
          openingBalance: 0
        }
      });
      console.log('✅ Restored BP and TGR in prod DB');
    } else {
      console.log('ℹ️ Banks already present in prod DB');
    }

  } catch (e) {
    console.error('❌ Error during prod repair:', e);
  } finally {
    await prisma.$disconnect();
    console.log('--- DONE ---');
  }
}

main();
