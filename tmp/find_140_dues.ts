import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findDues() {
  try {
    const dues = await prisma.monthlyDue.findMany({
      where: {
        unit: { lotNumber: "Imm1.A1" }
      },
      include: {
        organization: { select: { id: true, name: true } },
        unit: { select: { lotNumber: true, reference: true } }
      },
      orderBy: { period: "desc" },
      take: 5
    });

    if (dues.length === 0) {
      console.log("NO_DUES_FOUND_FOR_IMM1A1");
      // Search for any due with amount 140
      const any140 = await prisma.monthlyDue.findMany({
        where: { amountDue: 140 },
        include: {
          organization: { select: { name: true } },
          unit: { select: { lotNumber: true } }
        },
        take: 5
      });
      console.log("SAMPLES_OF_140_DUES:", JSON.stringify(any140, null, 2));
    } else {
      console.log("DUES_FOUND_FOR_IMM1A1:", JSON.stringify(dues, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

findDues().catch(console.error).finally(() => prisma.$disconnect());
