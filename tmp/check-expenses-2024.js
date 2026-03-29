const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  });
  if (!org) return console.log('Org not found');

  const expenses = await prisma.payment.groupBy({
    by: ['accountingPostId'],
    _sum: { amount: true },
    where: {
      organizationId: org.id,
      date: {
        gte: new Date('2024-01-01T00:00:00.000Z'),
        lt: new Date('2025-01-01T00:00:00.000Z')
      }
    }
  });

  const postIds = expenses.map(e => e.accountingPostId).filter(id => !!id);
  const posts = await prisma.accountingPost.findMany({
    where: { id: { in: postIds } }
  });

  const formatted = expenses.map(e => ({
    name: posts.find(p => p.id === e.accountingPostId)?.name || 'Sans poste',
    amount: Number(e._sum.amount || 0)
  }));

  const total = formatted.reduce((sum, e) => sum + e.amount, 0);
  console.log(`Total Expenses 2024: ${total} MAD`);
  formatted.forEach(e => {
    const pct = ((e.amount / total) * 100);
    console.log(`${e.name}: ${e.amount} MAD (${pct.toFixed(4)}%)`);
  });
}

main().finally(() => prisma.$disconnect());
