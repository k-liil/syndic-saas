import { PrismaClient } from "@prisma/client";

async function checkUserOrgs() {
  const otherUrl = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  const prisma = new PrismaClient({ datasources: { db: { url: otherUrl } } });

  try {
    const userOrgs = await prisma.userOrganization.findMany({
      include: { 
        user: { select: { email: true, role: true } }, 
        organization: { select: { name: true } } 
      }
    });
    console.log("USER_ORGANIZATIONS:", JSON.stringify(userOrgs, null, 2));

    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" }
    });
    console.log("SUPER_ADMINS:", JSON.stringify(admins, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserOrgs().catch(console.error);
