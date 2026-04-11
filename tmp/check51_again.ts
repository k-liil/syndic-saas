import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.receipt.findMany({
    where: { receiptNumber: 51 },
    include: {
      owner: true,
      allocations: {
        include: { due: true },
        orderBy: { due: { period: "asc" } }
      }
    }
  });

  for (const r of receipts) {
    if (r.owner?.cin?.includes("4_13") || r.owner?.name?.includes("TAHAR") || r.owner?.cinn === "CIN_4_13") {
      console.log("Found target receipt ID:", r.id);
      console.log("Amount:", r.amount);
      console.log("Unallocated:", r.unallocatedAmount);
      console.log("Allocations:");
      for (const a of r.allocations) {
        console.log(` - Due period ${a.due.period.toISOString().slice(0,10)} | Default: ${a.due.amountDue} | Allocated here: ${a.amount} | Total paid on due: ${a.due.paidAmount}`);
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
