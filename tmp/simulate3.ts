import { PrismaClient } from "@prisma/client";
import { reallocateUnitContributions } from "../src/lib/allocation";

const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.receipt.findMany({
    take: 1,
    where: { type: "CONTRIBUTION", allocations: { some: {} } },
  });
  
  if (receipts.length === 0) return;
  const target = receipts[0];
  
  const unitId = target.unitId;
  const orgId = target.organizationId;
  
  console.log("Testing on receipt:", target.id);
  console.log("Original amount:", target.amount);
  
  const allocsBefore = await prisma.receiptAllocation.findMany({
    where: { receiptId: target.id }
  });
  console.log("Allocations on this receipt before:", allocsBefore.length, allocsBefore.map(a => a.amount));
  
  // MODIFY AMOUNT
  const newAmount = Number(target.amount) + 50;
  await prisma.receipt.update({
    where: { id: target.id },
    data: { amount: newAmount }
  });
  console.log("Updated amount to:", newAmount);
  
  let logs: string[] = [];
  await reallocateUnitContributions(prisma, unitId!, orgId, logs);
  
  const allocsAfter = await prisma.receiptAllocation.findMany({
    where: { receiptId: target.id }
  });
  console.log("Allocations on this receipt after:", allocsAfter.length, allocsAfter.map(a => a.amount));
  
  // Revert back so we don't break data
  await prisma.receipt.update({
    where: { id: target.id },
    data: { amount: target.amount }
  });
  await reallocateUnitContributions(prisma, unitId!, orgId, logs);
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
