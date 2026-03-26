import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debug() {
  const orgId = 'cmn1l60dv0001nucwyt4tcbef';
  const count = await prisma.supplier.count({
    where: { organizationId: orgId }
  });
  console.log(`Suppliers count for Org ${orgId}: ${count}`);
  
  const allSuppliers = await prisma.supplier.findMany({
    take: 5,
    select: { id: true, name: true, organizationId: true }
  });
  console.log("Sample Suppliers in DB:", JSON.stringify(allSuppliers, null, 2));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
