import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkGroups() {
  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki"; // Cité Intellak II
    
    // 1. All groups
    const groups = await prisma.contributionGroup.findMany({
      where: { organizationId: orgId },
      include: { 
        _count: { select: { units: true } }
      }
    });
    console.log("GROUPS_IN_INTELLAK:", JSON.stringify(groups, null, 2));

    // 2. Units in this org to see if they have dues (ignoring building filter)
    const unitsWithDues = await prisma.unit.findMany({
      where: { 
        organizationId: orgId,
        dues: { some: {} }
      },
      take: 10,
      include: {
        dues: { take: 1 }
      }
    });
    console.log("UNITS_WITH_DUES_SAMPLE:", JSON.stringify(unitsWithDues, null, 2));

  } catch (err) {
    console.error(err);
  }
}

checkGroups().catch(console.error).finally(() => prisma.$disconnect());
