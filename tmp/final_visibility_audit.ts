import { PrismaClient } from "@prisma/client";

async function finalVisibilityCheck() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki";
    const units = await prisma.unit.findMany({
      where: { organizationId: orgId },
      select: { id: true, isActive: true, lotNumber: true, reference: true, type: true }
    });
    console.log("UNITS_COUNT:", units.length);
    console.log("UNITS_SAMPLE:", JSON.stringify(units.slice(0, 5), null, 2));
    
    const inactiveCount = units.filter(u => !u.isActive).length;
    console.log("INACTIVE_UNITS_COUNT:", inactiveCount);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

finalVisibilityCheck().catch(console.error);
