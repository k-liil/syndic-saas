import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findReceipts() {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { 
        OR: [
          { receiptNumber: 1 },
          { receiptNumber: 2 }
        ]
      },
      include: {
        organization: { select: { name: true } },
        unit: { select: { lotNumber: true } },
        allocations: {
          include: {
            due: true
          }
        }
      }
    });

    console.log("RECEIPTS_FOUND:", JSON.stringify(receipts, null, 2));

  } catch (err) {
    console.error(err);
  }
}

findReceipts().catch(console.error).finally(() => prisma.$disconnect());
