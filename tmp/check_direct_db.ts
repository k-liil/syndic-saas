import { PrismaClient } from "@prisma/client";
// We force the use of the direct URL if available, though Prisma usually handles it via schema.
// Here we just use the default PrismaClient which should use DATABASE_URL from .env
const prisma = new PrismaClient();

async function check2026Data() {
  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki"; // Intellak II
    
    // Count ALL dues for 2026
    const count = await prisma.monthlyDue.count({
      where: {
        organizationId: orgId,
        period: {
          gte: new Date("2026-01-01T00:00:00Z"),
          lt: new Date("2027-01-01T00:00:00Z")
        }
      }
    });
    console.log("COUNT_2026_DUES:", count);

    // If count is 0, list some recent receipts regardless of date
    const recentReceipts = await prisma.receipt.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    console.log("RECENT_RECEIPTS_METADATA:", JSON.stringify(recentReceipts, null, 2));

  } catch (err) {
    console.error(err);
  }
}

check2026Data().catch(console.error).finally(() => prisma.$disconnect());
