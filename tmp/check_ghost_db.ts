import { PrismaClient } from "@prisma/client";

async function checkOtherDB() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: otherUrl
      }
    }
  });

  try {
    const units = await prisma.unit.findMany({
      where: {
        lotNumber: { contains: "Imm1.A1", mode: "insensitive" }
      },
      include: {
        organization: { select: { name: true } },
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

    console.log("GHOST_DB_IMM1A1_2026:", JSON.stringify(units, null, 2));

    if (units.length > 0) {
      const settings = await prisma.appSettings.findFirst({
        where: { organizationId: units[0].organizationId }
      });
      console.log("GHOST_DB_SETTINGS:", JSON.stringify(settings, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOtherDB().catch(console.error);
