import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkSettings() {
  try {
    const settings = await prisma.appSettings.findMany({
      include: {
        organization: { select: { name: true } }
      }
    });
    console.log(JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkSettings().catch(console.error).finally(() => prisma.$disconnect());
