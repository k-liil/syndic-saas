const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUnits() {
  const orgId = "cmvy5nx10002num0zx6gvlk1";
  console.log(`Debugging units for org: ${orgId}`);

  try {
    const items = await prisma.unit.findMany({
      where: { organizationId: orgId },
      include: {
        building: true,
        ownerships: {
          where: { endDate: null, organizationId: orgId },
          take: 1,
          orderBy: { startDate: "desc" },
          include: { owner: true }
        },
        groupUnits: {
          include: {
            group: {
              include: {
                periods: { orderBy: { startPeriod: "desc" } }
              }
            }
          }
        },
        contributionPeriods: { orderBy: { startPeriod: "desc" } }
      }
    });

    console.log(`Found ${items.length} units.`);

    const settings = await prisma.appSettings.findFirst({
      where: { organizationId: orgId },
    });
    console.log(`Settings:`, settings);

    const globalPeriods = await prisma.contributionPeriod.findMany({
      where: {
        organizationId: orgId,
        contributionType: "GLOBAL_FIXED",
        groupId: null,
        unitId: null,
      },
      orderBy: { startPeriod: "desc" },
    });
    console.log(`Global periods: ${globalPeriods.length}`);

    // Simulate the sorting and mapping
    items.sort((a, b) => {
      const aLot = a.lotNumber ? (Number.isFinite(Number(a.lotNumber)) ? Number(a.lotNumber) : 999999) : 999999;
      const bLot = b.lotNumber ? (Number.isFinite(Number(b.lotNumber)) ? Number(b.lotNumber) : 999999) : 999999;
      if (aLot !== bLot) return aLot - bLot;
      return (a.building?.name ?? "").localeCompare(b.building?.name ?? "");
    });

    console.log("Sorting successful.");

    const enriched = items.map(item => {
       // Just testing the heavy logic
       return { id: item.id, ref: item.reference };
    });
    console.log("Mapping successful.");
    
    console.log("JSON Serialization test...");
    const json = JSON.stringify(items, (key, value) => {
        if (typeof value === 'object' && value && value.constructor?.name === 'Decimal') return Number(value);
        return value;
    });
    console.log("JSON Serialization successful.");

  } catch (err) {
    console.error("DEBUG ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

debugUnits();
