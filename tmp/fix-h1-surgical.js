const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const lot = 'H1'
  const receiptNum = 10908

  console.log(`[MANUAL FIX] Surgical repair for Lot ${lot}, Receipt #${receiptNum}`)

  const unit = await prisma.unit.findFirst({ where: { lotNumber: lot } })
  if (!unit) throw new Error('Unit not found')

  const receipt = await prisma.receipt.findFirst({
    where: { unitId: unit.id, receiptNumber: receiptNum }
  })
  if (!receipt) throw new Error('Receipt not found')

  // Pre-fetch all dues to avoid queries inside transaction loop as much as possible
  const dues = await prisma.monthlyDue.findMany({
    where: { unitId: unit.id },
    orderBy: { period: 'asc' }
  })

  // Pre-fetch ALL other allocations for this unit to calculate available balance per due
  const otherAllocations = await prisma.receiptAllocation.findMany({
    where: { 
      due: { unitId: unit.id },
      NOT: { receiptId: receipt.id }
    }
  })

  const totalsByDue = new Map()
  for (const a of otherAllocations) {
    const cur = totalsByDue.get(a.dueId) || 0
    totalsByDue.set(a.dueId, cur + Number(a.amount))
  }

  let remaining = Number(receipt.amount)
  const newAllocations = []

  for (const due of dues) {
    if (remaining <= 0) break
    
    const alreadyPaid = totalsByDue.get(due.id) || 0
    const balance = Number(due.amountDue) - alreadyPaid
    
    if (balance <= 0) continue

    const toPay = Math.min(remaining, balance)
    newAllocations.push({
      receiptId: receipt.id,
      dueId: due.id,
      amount: toPay
    })

    remaining -= toPay
  }

  await prisma.$transaction([
    prisma.receiptAllocation.deleteMany({ where: { receiptId: receipt.id } }),
    prisma.receiptAllocation.createMany({ data: newAllocations }),
    ...dues.map(d => {
       const allocAmount = newAllocations.find(a => a.dueId === d.id)?.amount || 0
       const alreadyPaid = totalsByDue.get(d.id) || 0
       const total = alreadyPaid + allocAmount
       const status = total >= Number(d.amountDue) ? 'PAID' : (total > 0 ? 'PARTIAL' : 'UNPAID')
       return prisma.monthlyDue.update({
         where: { id: d.id },
         data: { paidAmount: total, status }
       })
    }),
    prisma.receipt.update({
      where: { id: receipt.id },
      data: { unallocatedAmount: remaining }
    })
  ])

  console.log(`[SUCCESS] H1 repaired. ${newAllocations.length} months covered. Remaining: ${remaining}`)
}

main()
  .catch(err => console.error('[ERROR]', err))
  .finally(() => prisma.$disconnect())
