import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
  for (const org of orgs) {
    const r = await prisma.receipt.count({ where: { organizationId: org.id } });
    const or = await prisma.otherReceipt.count({ where: { organizationId: org.id } });
    const p = await prisma.payment.count({ where: { organizationId: org.id } });
    const fy = await prisma.fiscalYear.count({ where: { organizationId: org.id } });
    console.log(`${org.name} (${org.slug}): R:${r}, OR:${or}, P:${p}, FY:${fy}`);
  }
}
main().finally(() => prisma.$disconnect());
