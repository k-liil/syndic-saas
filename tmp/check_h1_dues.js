const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.appSettings.findFirst();
  console.log("Settings:", JSON.stringify(settings, null, 2));

  const h1Unit = await prisma.unit.findFirst({ where: { lotNumber: "H1" } });
  console.log("H1 Unit:", JSON.stringify(h1Unit, null, 2));

  const dues = await prisma.monthlyDue.findMany({
    where: { unitId: h1Unit.id, period: { gte: new Date("2024-01-01") } },
    orderBy: { period: "asc" },
  });
  console.log("Dues for H1:", JSON.stringify(dues, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
