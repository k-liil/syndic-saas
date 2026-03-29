const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const receipts = await prisma.receipt.findMany({
    where: {
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      organization: { name: 'Les Jardins de Cherrat' }
    },
    take: 20,
    orderBy: { receiptNumber: 'asc' },
    select: {
      receiptNumber: true,
      amount: true,
      unit: { select: { lotNumber: true } },
      owner: { select: { name: true } },
      createdAt: true
    }
  })
  
  console.log('--- Sample Receipts for 2025 (Les Jardins de Cherrat) ---')
  console.log(JSON.stringify(receipts, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
