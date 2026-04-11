import { PrismaClient } from "@prisma/client";

async function checkGroupAssignment() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const unit = await prisma.unit.findFirst({
      where: { 
        lotNumber: "Imm1.A1", 
        organizationId: "cmmyv5nxi0002num0zk6du1ki" 
      },
      include: {
        groupUnits: { include: { group: true } }
      }
    });

    if (!unit) {
      console.log("UNIT_NOT_FOUND");
      return;
    }

    console.log("UNIT_GROUP_ASSIGNMENT:", JSON.stringify(unit.groupUnits, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkGroupAssignment().catch(console.error);
