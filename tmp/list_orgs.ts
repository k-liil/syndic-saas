import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listOrgs() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log(JSON.stringify(orgs, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listOrgs().catch(console.error).finally(() => prisma.$disconnect());
