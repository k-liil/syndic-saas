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
  
  const receiptIds = (await prisma.receipt.findMany({
    where: {
      organizationId: org.id,
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      }
    },
    select: { id: true }
  })).map(r => r.id)

  console.log(`Found ${receiptIds.length} leftovers to delete.`)

  if (receiptIds.length > 0) {
    const delAlloc = await prisma.receiptAllocation.deleteMany({
      where: { receiptId: { in: receiptIds } }
    })
    console.log(`Deleted ${delAlloc.count} allocations.`)

    const delReceipts = await prisma.receipt.deleteMany({
      where: { id: { in: receiptIds } }
    })
    console.log(`Deleted ${delReceipts.count} receipts.`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
