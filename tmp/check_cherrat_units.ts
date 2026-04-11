import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkCherrat() {
  try {
    const cherratId = "cmn1l60dv0001nucwyt4tcbef"; // Les Jardins de Cherrat
    
    // Search for Appart 1 in Cherrat
    const units = await prisma.unit.findMany({
      where: { 
        organizationId: cherratId,
        reference: { contains: "Appart 1", mode: "insensitive" }
      },
      include: {
        building: true,
        groupUnits: { include: { group: true } },
        dues: { orderBy: { period: "desc" }, take: 3 }
      }
    });

    console.log("CHERRAT_UNITS_FOUND:", JSON.stringify(units, null, 2));

    // Also check if any group exists in Cherrat
    const groups = await prisma.contributionGroup.findMany({
      where: { organizationId: cherratId }
    });
    console.log("CHERRAT_GROUPS:", JSON.stringify(groups, null, 2));

  } catch (err) {
    console.error(err);
  }
}

checkCherrat().catch(console.error).finally(() => prisma.$disconnect());
