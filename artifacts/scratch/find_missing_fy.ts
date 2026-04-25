import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany();
  console.log(`Checking ${orgs.length} organizations...\n`);
  for (const org of orgs) {
    const r = await prisma.receipt.count({ where: { organizationId: org.id } });
    const or = await prisma.otherReceipt.count({ where: { organizationId: org.id } });
    const p = await prisma.payment.count({ where: { organizationId: org.id } });
    const fy = await prisma.fiscalYear.findMany({ where: { organizationId: org.id } });
    
    if (r > 0 || or > 0 || p > 0) {
      console.log(`- ${org.name} (${org.id})`);
      console.log(`  Transactions: Receipts: ${r}, Other: ${or}, Payments: ${p}`);
      console.log(`  Fiscal Years: ${fy.length} (${fy.map(f => f.year).join(", ")})`);
      
      if (fy.length === 0) {
        console.log("  !!! WARNING: Missing fiscal years !!!");
      }
      console.log("");
    }
  }
}
main().finally(() => prisma.$disconnect());
