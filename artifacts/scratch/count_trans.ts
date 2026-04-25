import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
  for (const org of orgs) {
    const r = await prisma.receipt.count({ where: { organizationId: org.id } });
    const p = await prisma.payment.count({ where: { organizationId: org.id } });
    console.log(`${org.name} (${org.slug}): ${r} receipts, ${p} payments`);
  }
}
main().finally(() => prisma.$disconnect());
