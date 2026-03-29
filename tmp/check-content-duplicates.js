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
    select: {
      unitId: true,
      amount: true,
      date: true,
      receiptNumber: true
    }
  })
  
  const groups = {}
  const duplicates = []
  
  for (const r of receipts) {
    const key = `${r.unitId}_${r.amount}_${r.date.toISOString()}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(r.receiptNumber)
    if (groups[key].length > 1) {
      duplicates.push({ key, numbers: groups[key] })
    }
  }
  
  console.log('--- Duplicate Content Receipts (Same Unit/Amount/Date) ---')
  console.log(`Number of duplicate groups: ${duplicates.length}`)
  if (duplicates.length > 0) {
    console.log('Sample duplicates:')
    console.log(duplicates.slice(0, 5))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
