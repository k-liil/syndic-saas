import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkIntellak() {
  try {
    // 1. Find Intellak II organization
    const orgs = await prisma.organization.findMany({
      where: { name: { contains: "Intellak", mode: "insensitive" } }
    });
    console.log("ORGS_FOUND:", JSON.stringify(orgs, null, 2));

    for (const org of orgs) {
      console.log(`--- Checking ORG: ${org.name} (${org.id}) ---`);
      
      // 2. Get all groups for this org
      const groups = await prisma.contributionGroup.findMany({
        where: { organizationId: org.id },
        include: { _count: { select: { units: true } } }
      });
      console.log("GROUPS:", JSON.stringify(groups, null, 2));

      // 3. Get units in Immeuble 1
      const units = await prisma.unit.findMany({
        where: { 
          organizationId: org.id,
          building: { name: { contains: "Immeuble 1", mode: "insensitive" } }
        },
        include: {
          building: true,
          groupUnits: { include: { group: true } },
          dues: { orderBy: { period: "desc" }, take: 3 }
        }
      });
      console.log("UNITS_IN_IMMEUBLE_1:", JSON.stringify(units, null, 2));
    }

  } catch (err) {
    console.error(err);
  }
}

checkIntellak().catch(console.error).finally(() => prisma.$disconnect());
