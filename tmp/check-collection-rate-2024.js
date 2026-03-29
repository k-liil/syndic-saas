const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  });
  if (!org) return console.log('Org not found');

  const year = 2024;
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year + 1, 0, 1));

  const [ownersCount, paidOwners] = await Promise.all([
    prisma.owner.count({ where: { organizationId: org.id } }),
    prisma.receipt.groupBy({
      by: ['ownerId'],
      where: { organizationId: org.id, date: { gte: startDate, lt: endDate } }
    })
  ]);

  console.log({
    ownersCount,
    paidOwnersCount: paidOwners.length,
    collectionRate: (paidOwners.length / ownersCount * 100).toFixed(4)
  });
}

main().finally(() => prisma.$disconnect());
