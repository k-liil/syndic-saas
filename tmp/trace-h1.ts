
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const unit = await prisma.unit.findFirst({
    where: { lotNumber: "H1" }
  });

  if (!unit) return;

  const allReceipts = await prisma.receipt.findMany({
    where: { unitId: unit.id },
    orderBy: { date: 'asc' },
    include: {
      allocations: {
        include: {
          due: true
        }
      }
    }
  });

  console.log(`Receipts for H1:`);
  allReceipts.forEach(r => {
    const minPeriod = r.allocations.length > 0 ? r.allocations.sort((a,b) => a.due.period.getTime() - b.due.period.getTime())[0].due.period.toISOString().slice(0,7) : 'None';
    const maxPeriod = r.allocations.length > 0 ? r.allocations.sort((a,b) => a.due.period.getTime() - b.due.period.getTime())[r.allocations.length-1].due.period.toISOString().slice(0,7) : 'None';
    
    console.log(`- #${r.receiptNumber} (${r.amount} MAD, Date: ${r.date.toISOString().slice(0,10)}) -> covers ${minPeriod} to ${maxPeriod}`);
  });
}

main().finally(() => prisma.$disconnect());
