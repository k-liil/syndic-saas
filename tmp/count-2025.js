const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.receipt.count({
    where: {
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      type: 'CONTRIBUTION'
    }
  })
  console.log(`Total receipts for 2025: ${count}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
