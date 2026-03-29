import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } })
  if (orgs.length === 0) {
    console.log("No organization found.")
    return
  }
  
  const org = orgs[0]
  console.log(`Analyzing for organization: ${org.name}`)

  const dues = await prisma.monthlyDue.aggregate({
    where: { organizationId: org.id },
    _sum: {
      amountDue: true,
      paidAmount: true
    }
  })

  const receipts = await prisma.receipt.aggregate({
    where: { 
      organizationId: org.id,
      type: 'CONTRIBUTION'
    },
    _sum: {
      amount: true
    },
    _count: true
  })

  const dueStatus = await prisma.monthlyDue.groupBy({
    by: ['status'],
    where: { organizationId: org.id },
    _count: true
  })

  // Get total by year for receipts
  const receiptsByYearRaw = await prisma.$queryRaw`
    SELECT 
      EXTRACT(YEAR FROM date) as year,
      SUM(amount) as total
    FROM "Receipt"
    WHERE "organizationId" = ${org.id} AND type = 'CONTRIBUTION'
    GROUP BY year
    ORDER BY year DESC
  `;

  console.log("\n--- Dues (Appels de fonds) ---")
  console.log(`Total Due (à payer) : ${dues._sum.amountDue || 0} MAD`)
  console.log(`Total Paid (payé)   : ${dues._sum.paidAmount || 0} MAD`)
  console.log(`Restant dû          : ${(Number(dues._sum.amountDue || 0) - Number(dues._sum.paidAmount || 0)).toFixed(2)} MAD`)
  
  console.log("\n--- Status des Appels de fonds ---")
  dueStatus.forEach(status => {
    console.log(`${status.status}: ${status._count} appels de fonds`)
  })

  console.log("\n--- Reçus de Cotisations (Paiements reçus) ---")
  console.log(`Total Reçus         : ${receipts._sum.amount || 0} MAD (${receipts._count} reçus)`)
  
  console.log("\n--- Paiements par année ---")
  receiptsByYearRaw.forEach(row => {
    console.log(`Année ${row.year}: ${row.total} MAD`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
