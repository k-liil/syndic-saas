const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const unit = await prisma.unit.findFirst({
    where: { lotNumber: 'H1' }
  })
  
  if (!unit) {
    console.error('Unit H1 not found')
    return
  }

  const settings = await prisma.organizationSettings.findFirst({
    where: { organizationId: unit.organizationId }
  })

  console.log('--- Unit H1 ---', unit.id)
  console.log('Unit Settings:', JSON.stringify({
    lotNumber: unit.lotNumber,
    startYear: unit.startYear,
    startMonth: unit.startMonth,
    overrideStart: unit.overrideStart
  }))
  console.log('Global Org Settings:', JSON.stringify(settings))

  const dues = await prisma.monthlyDue.findMany({
    where: { unitId: unit.id },
    orderBy: { period: 'asc' }
  })

  console.log('--- Monthly Dues (2025+) ---')
  for (const d of dues) {
    if (d.period.getFullYear() >= 2025) {
       console.log(`${d.period.toISOString().substring(0, 7)}: Due=${d.amountDue}, Paid=${d.paidAmount}, Status=${d.status}`)
    }
  }

  const receipts = await prisma.receipt.findMany({
    where: { unitId: unit.id },
    orderBy: { date: 'asc' }
  })

  console.log('--- Receipts ---')
  for (const r of receipts) {
    console.log(`${r.receiptNumber} (${r.date.toISOString().substring(0, 10)}): Amount=${r.amount}, Unallocated=${r.unallocatedAmount}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
