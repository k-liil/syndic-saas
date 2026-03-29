const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'Les Jardins de Cherrat' }
  })
  
  if (!org) {
    console.error('Organization not found')
    return
  }
  
  const all2025 = await prisma.receipt.findMany({
    where: {
      organizationId: org.id,
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      }
    },
    select: {
      id: true,
      receiptNumber: true,
      type: true,
      amount: true,
      date: true
    }
  })
  
  console.log(`Remaining 2025 receipts in ${org.name}: ${all2025.length}`)
  if (all2025.length > 0) {
    console.log('Sample remaining:', all2025.slice(0, 5))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
