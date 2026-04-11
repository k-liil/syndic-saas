import { PrismaClient } from "@prisma/client";
import { reallocateUnitContributions } from "../src/lib/allocation";

const prisma = new PrismaClient();

async function main() {
  // Find a unit that has multiple allocations
  const allocs = await prisma.receiptAllocation.findMany({
    take: 10,
    include: { receipt: true, due: true },
  });
  
  if (allocs.length === 0) {
      console.log("No allocations found");
      return;
  }
  
  const unitId = allocs[0].receipt.unitId;
  const organizationId = allocs[0].receipt.organizationId;
  
  console.log("Testing on unit:", unitId);
  
  // Count before
  const allocsBefore = await prisma.receiptAllocation.count({
    where: { receipt: { unitId, organizationId } }
  });
  console.log("Allocations before:", allocsBefore);
  
  let logs: string[] = [];
  await reallocateUnitContributions(prisma, unitId!, organizationId, logs);
  
  // Count after
  const allocsAfter = await prisma.receiptAllocation.count({
    where: { receipt: { unitId, organizationId } }
  });
  console.log("Allocations after:", allocsAfter);
}

main().catch(console.error).finally(() => prisma.$disconnect());
