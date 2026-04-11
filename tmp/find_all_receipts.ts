import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findAllReceipts() {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { unit: { lotNumber: "Imm1.A1" } },
      orderBy: { date: "desc" },
      include: { 
        organization: { select: { id: true, name: true } },
        allocations: { include: { due: true } }
      }
    });

    console.log("ALL_RECEIPTS_IMM1A1:", JSON.stringify(receipts, null, 2));

  } catch (err) {
    console.error(err);
  }
}

findAllReceipts().catch(console.error).finally(() => prisma.$disconnect());
