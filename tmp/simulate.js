const { PrismaClient } = require("@prisma/client");
const { reallocateUnitContributions } = require("./src/lib/allocation");

const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.receipt.findMany({
    where: { receiptNumber: 51 } // based on user screenshot
  });
  
  if (receipts.length === 0) {
      console.log("No receipt 51 found");
      return;
  }
  
  const target = receipts[0];
  console.log("Found receipt:", target);
  
  let logs = [];
  await reallocateUnitContributions(prisma, target.unitId, target.organizationId, logs);
  
  console.log("Logs:");
  console.log(logs.join("\n"));
  
  const afterUpdate = await prisma.receipt.findUnique({ where: { id: target.id } });
  console.log("Unallocated amount after:", afterUpdate.unallocatedAmount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
