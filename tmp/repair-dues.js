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

  console.log(`Starting optimized data repair for: ${org.name}`)

  // 1. Get all allocations for this org
  console.log("Fetching all allocations...")
  const allAllocations = await prisma.receiptAllocation.findMany({
    where: { receipt: { organizationId: org.id } },
    select: { dueId: true, amount: true }
  })

  // 2. Sum them up in memory
  const totalsByDue = new Map()
  for (const alloc of allAllocations) {
    const current = totalsByDue.get(alloc.dueId) || 0
    totalsByDue.set(alloc.dueId, current + Number(alloc.amount))
  }

  // 3. Get all dues for this org
  console.log("Fetching all dues...")
  const allDues = await prisma.monthlyDue.findMany({
    where: { organizationId: org.id },
    select: { id: true, amountDue: true, paidAmount: true, status: true }
  })

  console.log(`Analyzing ${allDues.length} dues...`)
  const updates = []

  for (const due of allDues) {
    const totalAllocated = totalsByDue.get(due.id) || 0
    const amountDue = Number(due.amountDue)
    
    let expectedStatus = 'UNPAID'
    if (totalAllocated >= amountDue) {
      expectedStatus = 'PAID'
    } else if (totalAllocated > 0) {
      expectedStatus = 'PARTIAL'
    }

    if (Number(due.paidAmount) !== totalAllocated || due.status !== expectedStatus) {
      updates.push(
        prisma.monthlyDue.update({
          where: { id: due.id },
          data: {
            paidAmount: totalAllocated,
            status: expectedStatus
          }
        })
      )
    }
  }

  console.log(`Found ${updates.length} dues to fix.`)

  // 4. Execute in batches of 100
  const BATCH_SIZE = 100
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    await prisma.$transaction(batch)
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`)
  }

  console.log('Repair complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
