import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const superUser = await p.user.findUnique({ where: { email: "super@syndic.local" } });
  
  const userOrgs = await p.userOrganization.findMany({ 
    where: { userId: superUser?.id },
    include: { organization: true }
  });
  
  const payments = await p.payment.count({ where: { organizationId: "cmmyv5nxi0002num0zk6du1ki" } });
  
  console.log("Super user ID:", superUser?.id);
  console.log("\nUser organizations:");
  console.log(JSON.stringify(userOrgs, null, 2));
  
  console.log("\nPayments for Intellak II:", payments);
}

main().finally(() => p.$disconnect());
