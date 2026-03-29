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
  
  const deleted = await prisma.receipt.deleteMany({
    where: {
      organizationId: org.id,
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      type: 'CONTRIBUTION'
    }
  })
  
  console.log(`Successfully deleted ${deleted.count} receipts for 2025 in ${org.name}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
