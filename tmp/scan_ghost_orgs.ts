import { PrismaClient } from "@prisma/client";

async function scanGhostDB() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

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
    console.log("GHOST_ORGS_2026:", JSON.stringify(orgs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

scanGhostDB().catch(console.error);
