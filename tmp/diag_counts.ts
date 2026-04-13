import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const orCount = await prisma.otherReceipt.count();
  const ijCount = await prisma.importJob.count();
  console.log('OtherReceipt count:', orCount);
  console.log('ImportJob count:', ijCount);
  const lastJob = await prisma.importJob.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('Last ImportJob:', JSON.stringify(lastJob, null, 2));
}
run().finally(() => prisma.$disconnect());
