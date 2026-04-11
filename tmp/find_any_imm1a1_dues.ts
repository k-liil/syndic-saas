import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findImm1A1Dues() {
  try {
    const dues = await prisma.monthlyDue.findMany({
      where: {
        unit: { lotNumber: { contains: "Imm1.A1", mode: "insensitive" } }
      },
      include: {
        organization: { select: { name: true } },
        unit: { select: { lotNumber: true, reference: true, organizationId: true } }
      }
    });
    console.log("DUES_FOUND:", JSON.stringify(dues, null, 2));
    
    if (dues.length === 0) {
       console.log("STILL_NOTHING_IN_DB");
    }
  } catch (err) {
    console.error(err);
  }
}

findImm1A1Dues().catch(console.error).finally(() => prisma.$disconnect());
