import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
  for (const org of orgs) {
    const fy = await prisma.fiscalYear.count({ where: { organizationId: org.id } });
    console.log(`${org.name} (${org.slug}): ${fy} fiscal years`);
  }
}
main().finally(() => prisma.$disconnect());
