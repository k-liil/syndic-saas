const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const orgCounts = await prisma.receipt.groupBy({
    by: ['organizationId'],
    where: {
      date: {
        gte: new Date('2025-01-01T00:00:00Z'),
        lt: new Date('2026-01-01T00:00:00Z'),
      },
      type: 'CONTRIBUTION'
    },
    _count: {
      _all: true
    }
  })
  
  console.log('--- Counts by Organization for 2025 ---')
  for (const oc of orgCounts) {
    const org = await prisma.organization.findUnique({
      where: { id: oc.organizationId },
      select: { name: true }
    })
    console.log(`Org: ${org?.name || oc.organizationId} | Count: ${oc._count._all}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
