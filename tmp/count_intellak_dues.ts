import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function countAll() {
  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki"; // Cité Intellak II
    const count = await prisma.monthlyDue.count({
      where: { organizationId: orgId }
    });
    console.log("COUNT_INTELLAK_DUES:", count);

    if (count > 0) {
      const dues = await prisma.monthlyDue.findMany({
        where: { organizationId: orgId },
        take: 10,
        include: { unit: { select: { lotNumber: true } } }
      });
      console.log("SAMPLES:", JSON.stringify(dues, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

countAll().catch(console.error).finally(() => prisma.$disconnect());
