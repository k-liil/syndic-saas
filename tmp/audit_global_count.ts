import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function showAll() {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            units: true,
            monthlyDues: true,
            contributionGroups: true
          }
        }
      }
    });
    console.log(JSON.stringify(orgs, null, 2));
  } catch (err) {
    console.error(err);
  }
}

showAll().catch(console.error).finally(() => prisma.$disconnect());
