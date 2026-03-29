import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  });

  if (!org) {
    console.log("No organization found.");
    return;
  }

  const ownerships = await prisma.ownership.findMany({
    where: { organizationId: org.id },
    select: { startDate: true },
    take: 5
  });

  console.log("Samples of ownership start dates:");
  console.dir(ownerships, { depth: null });

  const settings = await prisma.appSettings.findUnique({
    where: { organizationId: org.id }
  });
  console.log("\nApp settings startYear/Month:");
  console.dir({ startYear: settings?.startYear, startMonth: settings?.startMonth });
}

main().catch(console.error).finally(() => prisma.$disconnect());
