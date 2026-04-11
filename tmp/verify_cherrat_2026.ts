import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkCherrat2026() {
  try {
    const orgId = "cmn1l60dv0001nucwyt4tcbef"; // Cherrat
    const units = await prisma.unit.findMany({
      where: {
        organizationId: orgId,
        lotNumber: { contains: "Imm1.A1", mode: "insensitive" }
      },
      include: {
        building: true,
        dues: {
          where: {
            period: {
              gte: new Date("2026-01-01T00:00:00Z"),
              lt: new Date("2027-01-01T00:00:00Z")
            }
          },
          orderBy: { period: "asc" }
        }
      }
    });

    console.log("CHERRAT_IMM1A1_2026:", JSON.stringify(units, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkCherrat2026().catch(console.error).finally(() => prisma.$disconnect());
