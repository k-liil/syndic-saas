import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  });

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: org.id }
  });

  console.log("Settings:", settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
