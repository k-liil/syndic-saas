import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } })
  console.log(`Found ${orgs.length} organizations.`)
  
  for (const org of orgs) {
    console.log(`\n========================================`)
    console.log(`Organization: ${org.name} (${org.id})`)

    const dues = await prisma.monthlyDue.aggregate({
      where: { organizationId: org.id },
      _sum: { amountDue: true, paidAmount: true },
      _count: true
    })

    const receipts = await prisma.receipt.aggregate({
      where: { organizationId: org.id },
      _sum: { amount: true },
      _count: true
    })

    const owners = await prisma.owner.count({ where: { organizationId: org.id } })
    const units = await prisma.unit.count({ where: { organizationId: org.id } })

    console.log(`- Copropriétaires : ${owners}`)
    console.log(`- Lots : ${units}`)
    console.log(`- Appels de fonds : ${dues._count} (Total dû: ${dues._sum.amountDue || 0}, Payé: ${dues._sum.paidAmount || 0})`)
    console.log(`- Reçus : ${receipts._count} (Total: ${receipts._sum.amount || 0})`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
