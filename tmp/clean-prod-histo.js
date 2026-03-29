const { PrismaClient, ReceiptType } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const histoCount = await prisma.receipt.count({
    where: {
      note: { startsWith: "Histo:" },
      type: ReceiptType.CONTRIBUTION
    }
  });
  console.log(`Histo receipts in prod: ${histoCount}`);

  if (histoCount > 0) {
    console.log("Deleting existing histo receipts to restart clean...");
    await prisma.receiptAllocation.deleteMany({
      where: {
        receipt: {
          note: { startsWith: "Histo:" }
        }
      }
    });
    const deleted = await prisma.receipt.deleteMany({
      where: {
        note: { startsWith: "Histo:" }
      }
    });
    console.log(`Deleted ${deleted.count} historical receipts.`);
  }
}

main().finally(() => prisma.$disconnect());
