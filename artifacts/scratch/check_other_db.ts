import { PrismaClient } from "@prisma/client";

async function main() {
  const url = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
  const prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
  });
  
  try {
    const orgs = await prisma.organization.findMany();
    console.log(`Found ${orgs.length} orgs in OTHER db:`);
    orgs.forEach(o => console.log(`- [${o.id}] ${o.name}`));
  } catch (err) {
    console.log("Failed to connect to OTHER db.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
