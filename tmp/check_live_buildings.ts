import { PrismaClient } from "@prisma/client";

async function checkBuildings() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki";
    const buildings = await prisma.building.findMany({
      where: { organizationId: orgId }
    });
    console.log("BUILDINGS_FOUND:", JSON.stringify(buildings, null, 2));

    const unitWithoutBuilding = await prisma.unit.count({
       where: { organizationId: orgId, type: "APARTMENT", buildingId: null }
    });
    console.log("APARTMENTS_WITHOUT_BUILDING:", unitWithoutBuilding);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkBuildings().catch(console.error);
