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
      createdAt: true
    }
  })
  
  const dailyCounts = {}
  for (const r of receipts) {
    const day = r.createdAt.toISOString().slice(0, 10)
    dailyCounts[day] = (dailyCounts[day] || 0) + 1
  }
  
  console.log('--- Daily Creation Counts for 2025 Receipts (Les Jardins de Cherrat) ---')
  console.log(dailyCounts)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
