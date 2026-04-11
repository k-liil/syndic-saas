import { PrismaClient } from "@prisma/client";

async function fixAmounts() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const orgId = "cmmyv5nxi0002num0zk6du1ki"; // Intellak II
    const groupId = "cmnrqbmsg0001q10f6osanq7p"; // Cotisation 130
    
    // 1. Get all units in this group
    const groupUnits = await prisma.contributionGroupUnit.findMany({
      where: { groupId: groupId },
      select: { unitId: true }
    });
    const unitIds = groupUnits.map(gu => gu.unitId);
    
    console.log(`Found ${unitIds.length} units in group Cotisation 130`);

    // 2. Update 2026 dues for these units
    const result = await prisma.monthlyDue.updateMany({
      where: {
        organizationId: orgId,
        unitId: { in: unitIds },
        period: {
          gte: new Date("2026-01-01T00:00:00Z"),
          lt: new Date("2027-01-01T00:00:00Z")
        },
        amountDue: 140 // Only update those that were incorrectly at 140
      },
      data: {
        amountDue: 130
      }
    });

    console.log(`Updated ${result.count} monthly dues from 140 to 130.`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmounts().catch(console.error);
