import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} orgs:`);
  orgs.forEach(o => console.log(`- [${o.id}] ${o.name} (Slug: ${o.slug})`));
}
main().finally(() => prisma.$disconnect());
