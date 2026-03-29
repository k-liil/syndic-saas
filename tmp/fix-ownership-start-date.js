import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orgName = process.argv.slice(2).join(" ").trim() || "Les Jardins de Cherrat";

  const org = await prisma.organization.findFirst({
    where: { name: orgName }
  });

  if (!org) {
    console.log(`No organization found for: ${orgName}`);
    return;
  }

  // Update all ownerships for this organization
  const updateResult = await prisma.ownership.updateMany({
    where: { organizationId: org.id },
    data: { startDate: new Date('2024-01-01T00:00:00.000Z') }
  });

  console.log(`Updated ${updateResult.count} ownership entries to start at Jan 1st 2024.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
