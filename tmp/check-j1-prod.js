const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  const lot = 'J35';
  console.log(`Diagnosing Unit ${lot}...`);
  
  const unit = await prisma.unit.findFirst({
    where: { lotNumber: lot },
  });
  
  if (!unit) {
    console.error('Unit not found');
    return;
  }
  
  console.log(`Unit ID: ${unit.id}`);
  
  const dues = await prisma.monthlyDue.findMany({
    where: { unitId: unit.id },
    orderBy: { period: 'asc' }
  });
  
  const receipts = await prisma.receipt.findMany({
    where: { unitId: unit.id, type: 'CONTRIBUTION' },
    orderBy: [{ date: 'asc' }, { receiptNumber: 'asc' }]
  });
  
  const allocations = await prisma.receiptAllocation.findMany({
    where: { receipt: { unitId: unit.id } },
    include: { receipt: true, due: true }
  });
  
  console.log('\n--- DUES ---');
  dues.forEach(d => {
    if (new Date(d.period).getUTCFullYear() >= 2023) {
      console.log(`${d.period.toISOString().slice(0, 10)}: Due=${d.amountDue}, Paid=${d.paidAmount}, Status=${d.status}`);
    }
  });
  
  console.log('\n--- RECEIPTS ---');
  receipts.forEach(r => {
    console.log(`${r.date.toISOString().slice(0, 10)}: #${r.receiptNumber}, Amount=${r.amount}, Unallocated=${r.unallocatedAmount}`);
  });
  
  console.log('\n--- ALLOCATIONS (Current) ---');
  allocations.forEach(a => {
    if (new Date(a.due.period).getUTCFullYear() >= 2024) {
      console.log(`${a.due.period.toISOString().slice(0, 10)} <- Receipt #${a.receipt.receiptNumber}: ${a.amount}`);
    }
  });
  
  prisma.$disconnect();
}

diagnose();
