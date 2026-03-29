const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const unitsCount = await prisma.unit.count();
  const unitsWithDues = await prisma.monthlyDue.groupBy({
    by: ['unitId'],
  });
  
  console.log(`Total units: ${unitsCount}`);
  console.log(`Units with dues: ${unitsWithDues.length}`);
  console.log(`Units without dues: ${unitsCount - unitsWithDues.length}`);
}

main().finally(() => prisma.$disconnect());
