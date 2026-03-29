const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const stats = await prisma.receipt.aggregate({
    where: {
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      organization: { name: 'Les Jardins de Cherrat' }
    },
    _min: { receiptNumber: true },
    _max: { receiptNumber: true },
    _count: { _all: true }
  })
  
  console.log('--- 2025 Receipt Stats (Les Jardins de Cherrat) ---')
  console.log(`Count: ${stats._count._all}`)
  console.log(`Min Number: ${stats._min.receiptNumber}`)
  console.log(`Max Number: ${stats._max.receiptNumber}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
