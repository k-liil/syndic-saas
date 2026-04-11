import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkUserAccess() {
  try {
    const users = await prisma.user.findMany({
      include: {
        organizations: {
          include: {
            organization: { select: { name: true, id: true } }
          }
        }
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkUserAccess().catch(console.error).finally(() => prisma.$disconnect());
