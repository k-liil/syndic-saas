import { PrismaClient } from '@prisma/client';
async function run() {
  const dbUrl = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const orCount = await prisma.otherReceipt.count();
    const ijCount = await prisma.importJob.count();
    console.log('--- DB: tlmhuseqfzlivnvfdzkb ---');
    console.log('OtherReceipt count:', orCount);
    console.log('ImportJob count:', ijCount);
    const lastJob = await prisma.importJob.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log('Last ImportJob:', JSON.stringify(lastJob, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
