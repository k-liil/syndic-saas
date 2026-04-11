import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function scanAll() {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            monthlyDues: {
              where: {
                period: {
                  gte: new Date("2026-01-01T00:00:00Z"),
                  lt: new Date("2027-01-01T00:00:00Z")
                }
              }
            }
          }
        }
      }
    });

    console.log("ORGS_SCAN_2026:", JSON.stringify(orgs, null, 2));

  } catch (err) {
    console.error(err);
  }
}

scanAll().catch(console.error).finally(() => prisma.$disconnect());
