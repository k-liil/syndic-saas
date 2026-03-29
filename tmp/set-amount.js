import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  });

  if (org) {
    await prisma.appSettings.update({
      where: { organizationId: org.id },
      data: { globalFixedAmount: 6000 }
    });
    console.log("Updated globalFixedAmount to 6000 for Les Jardins de Cherrat");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
