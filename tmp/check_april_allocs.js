const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const h1Unit = await prisma.unit.findFirst({ where: { lotNumber: "H1" } });
  const april2025 = await prisma.monthlyDue.findFirst({
    where: { unitId: h1Unit.id, period: new Date("2025-04-01") }
  });

  console.log("April 2025 Due:", JSON.stringify(april2025, null, 2));

  const allocs = await prisma.receiptAllocation.findMany({
    where: { dueId: april2025.id },
    include: { receipt: true }
  });

  console.log("Allocations for April 2025:", JSON.stringify(allocs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
