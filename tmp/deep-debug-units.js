const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUnits() {
  const orgId = "cmmyv5nxi0002num0zk6du1ki";
  console.log(`Debugging units for org: ${orgId}`);

  try {
    const units = await prisma.unit.findMany({
      where: { organizationId: orgId },
      include: {
        building: true,
        groupUnits: { include: { group: { include: { periods: true } } } },
        contributionPeriods: true
      }
    });

    console.log(`Fetched ${units.length} units.`);

    // 1. Check for missing building relation
    const missingBuilding = units.filter(u => u.type === 'APARTMENT' && !u.buildingId);
    if (missingBuilding.length > 0) {
      console.log(`[ALERT] ${missingBuilding.length} apartments have NO buildingId! ID example: ${missingBuilding[0].id}`);
    }

    // 2. Check for null references
    const nullRefs = units.filter(u => !u.reference);
    if (nullRefs.length > 0) {
      console.log(`[ALERT] ${nullRefs.length} units have NO reference!`);
    }

    // 3. Test sorting
    try {
      units.sort((a, b) => {
        const aLot = a.lotNumber ? (Number(a.lotNumber) || 999999) : 999999;
        const bLot = b.lotNumber ? (Number(b.lotNumber) || 999999) : 999999;
        if (aLot !== bLot) return aLot - bLot;
        return (a.building?.name ?? "").localeCompare(b.building?.name ?? "");
      });
      console.log("Sort test passed.");
    } catch (e) {
      console.error("Sort test FAILED:", e);
    }

    // 4. Test serialization
    try {
       const json = JSON.stringify(units, (key, value) => {
         if (typeof value === 'object' && value && value.constructor?.name === 'Decimal') return Number(value);
         return value;
       });
       console.log("Serialization test passed.");
    } catch (e) {
       console.error("Serialization test FAILED:", e);
    }

  } catch (err) {
    console.error("CRITICAL SCRIPT ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

debugUnits();
