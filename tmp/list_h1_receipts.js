const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const h1Unit = await prisma.unit.findFirst({ where: { lotNumber: "H1" } });
  const receipts = await prisma.receipt.findMany({
    where: { unitId: h1Unit.id },
    orderBy: { date: "asc" },
    include: { allocations: { include: { due: true } } }
  });

  for (const r of receipts) {
    console.log(`Receipt ${r.receiptNumber} (${r.date.toISOString()}): Amount ${r.amount}`);
    for (const a of r.allocations) {
      console.log(`  - ${a.due.period.toISOString()} : ${a.amount} (Status: ${a.due.status})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
