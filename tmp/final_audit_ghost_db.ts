import { PrismaClient } from "@prisma/client";

async function auditImm1A1() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki"; // Intellak II
    
    // 1. Audit unique LOT
    const unit = await prisma.unit.findFirst({
      where: { 
        lotNumber: "Imm1.A1", 
        organizationId: orgId 
      },
      include: {
        groupUnits: { include: { group: true } },
        contributionPeriods: true,
        dues: { 
          where: { period: { gte: new Date("2026-01-01T00:00:00Z") } },
          orderBy: { period: "asc" }
        }
      }
    });
    console.log("UNIT_DATA:", JSON.stringify(unit, null, 2));

    // 2. Audit de TOUS les GROUPES de l'organisation
    const allGroups = await prisma.contributionGroup.findMany({
       where: { organizationId: orgId },
       include: { _count: { select: { units: true } } }
    });
    console.log("ALL_GROUPS:", JSON.stringify(allGroups, null, 2));

    // 3. Audit des Périodes Globales
    const allPeriods = await prisma.contributionPeriod.findMany({
      where: { organizationId: orgId },
      include: { group: true, unit: true }
    });
    console.log("ALL_PERIODS:", JSON.stringify(allPeriods, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

auditImm1A1().catch(console.error);
