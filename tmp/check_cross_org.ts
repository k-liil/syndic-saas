import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function crossOrgAudit() {
  try {
    // 1. Search for all units referencing "Appart 1"
    const units = await prisma.unit.findMany({
      where: {
        OR: [
          { reference: { contains: "Appart 1", mode: "insensitive" } },
          { lotNumber: { contains: "A1", mode: "insensitive" } }
        ]
      },
      include: {
        organization: { select: { name: true } },
        building: { select: { name: true } },
        groupUnits: { include: { group: true } },
        dues: { orderBy: { period: "desc" }, take: 3 }
      }
    });

    console.log("UNITS_FOUND:", JSON.stringify(units, null, 2));

    // 2. Search for all groups with defaultAmount = 140 or 130
    const groups = await prisma.contributionGroup.findMany({
      where: {
        OR: [
          { defaultAmount: 140 },
          { defaultAmount: 130 }
        ]
      },
      include: {
        organization: { select: { name: true } }
      }
    });

    console.log("GROUPS_FOUND:", JSON.stringify(groups, null, 2));

  } catch (err) {
    console.error(err);
  }
}

crossOrgAudit().catch(console.error).finally(() => prisma.$disconnect());
