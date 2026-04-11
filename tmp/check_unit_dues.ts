import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkUnit() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        lotNumber: "Imm1.A1",
        building: { name: "Immeuble 1" }
      },
      include: {
        building: true,
        groupUnits: {
          include: {
            group: true
          }
        },
        contributionPeriods: {
          orderBy: { startPeriod: "desc" }
        },
        dues: {
          orderBy: { period: "desc" },
          take: 12
        }
      }
    });

    if (units.length === 0) {
      console.log("UNIT_NOT_FOUND");
      return;
    }

    console.log(JSON.stringify(units, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkUnit().catch(console.error).finally(() => prisma.$disconnect());
