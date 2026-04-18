
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.backupSchedule.findMany();
  console.log('--- Backup Schedules ---');
  console.dir(schedules, { depth: null });
  
  const recentAudits = await prisma.backupAudit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\n--- Recent Backup Audits ---');
  console.dir(recentAudits, { depth: null });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
