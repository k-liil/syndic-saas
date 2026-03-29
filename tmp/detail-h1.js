const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dues = await prisma.monthlyDue.findMany({
    where: { 
      unit: { lotNumber: 'H1' },
      period: { 
        gte: new Date('2025-01-01'),
        lte: new Date('2026-12-31')
      }
    },
    orderBy: { period: 'asc' }
  })
  
  console.log('Mois    | Du     | Payé   | Statut')
  console.log('---------------------------------')
  dues.forEach(d => {
    console.log(`${d.period.toISOString().substring(0, 7)} | ${d.amountDue.toString().padEnd(6)} | ${d.paidAmount.toString().padEnd(6)} | ${d.status}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
