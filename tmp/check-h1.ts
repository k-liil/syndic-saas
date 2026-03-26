
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const unit = await prisma.unit.findFirst({
    where: { lotNumber: "H1" }
  });

  if (!unit) {
    console.log("Unit H1 not found");
    return;
  }

  const receipt = await prisma.receipt.findFirst({
    where: {
      unitId: unit.id,
      amount: 3000,
      date: {
        gte: new Date("2024-12-30"),
        lte: new Date("2024-12-31T23:59:59Z")
      }
    },
    include: {
      allocations: {
        include: {
          due: true
        }
      }
    }
  });

  if (!receipt) {
    console.log("Target receipt not found");
    const lastRec = await prisma.receipt.findFirst({ where: { unitId: unit.id }, orderBy: { date: 'desc' } });
    console.log("Last receipt for H1:", lastRec);
    return;
  }

  console.log(`Receipt #${receipt.receiptNumber}: ${receipt.amount} MAD on ${receipt.date.toISOString()}`);
  console.log("Allocations:");
  receipt.allocations.sort((a,b) => a.due.period.getTime() - b.due.period.getTime()).forEach(a => {
    console.log(`- Period: ${a.due.period.toISOString().slice(0,7)}, Amount: ${a.amount}`);
  });

  // Check what was paid BEFORE this receipt
  const firstAllocated = receipt.allocations[0]?.due.period;
  if (firstAllocated) {
     const previousDues = await prisma.monthlyDue.findMany({
       where: {
         unitId: unit.id,
         period: { lt: firstAllocated }
       },
       orderBy: { period: 'desc' },
       take: 12
     });
     console.log("\nDues before this receipt:");
     previousDues.reverse().forEach(d => {
       console.log(`${d.period.toISOString().slice(0,7)}: ${d.status} (Paid: ${d.paidAmount})`);
     });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
