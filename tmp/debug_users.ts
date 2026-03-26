import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debug() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      organizations: {
        select: {
          organizationId: true,
          role: true,
          organization: { select: { name: true } }
        }
      }
    }
  });

  console.log("--- USERS & ROLES ---");
  users.forEach(u => {
    console.log(`User: ${u.email} (Role: ${u.role})`);
    u.organizations.forEach(o => {
      console.log(`  - Org: ${o.organization.name} (Role: ${o.role}, ID: ${o.organizationId})`);
    });
  });

  const visibility = await prisma.pageVisibilitySetting.findFirst({
    where: { href: "/setup/suppliers" }
  });
  console.log("\n--- SUPPLIERS VISIBILITY ---");
  console.log(JSON.stringify(visibility, null, 2));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
