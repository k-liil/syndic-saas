const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const duplicates = await prisma.receipt.groupBy({
    by: ['organizationId', 'receiptNumber'],
    where: {
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      organization: { name: 'Les Jardins de Cherrat' }
    },
    _count: {
      _all: true
    },
    having: {
      receiptNumber: {
        _count: {
          gt: 1
        }
      }
    }
  })
  
  console.log('--- Duplicate Receipt Numbers for 2025 ---')
  console.log(`Number of duplicated receipt numbers: ${duplicates.length}`)
  
  let totalDups = 0
  for (const d of duplicates) {
    totalDups += (d._count._all - 1)
  }
  console.log(`Total excess records: ${totalDups}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
