import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const receipts = await prisma.receipt.findMany({ select: { organizationId: true } });
  const ids = new Set(receipts.map(r => r.organizationId));
  console.log("Org IDs in Receipts table:", Array.from(ids));
  
  const payments = await prisma.payment.findMany({ select: { organizationId: true } });
  const pIds = new Set(payments.map(p => p.organizationId));
  console.log("Org IDs in Payments table:", Array.from(pIds));
}
main().finally(() => prisma.$disconnect());
