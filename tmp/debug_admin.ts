import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debug() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@syndic.local' },
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

  if (!user) {
    console.log("User admin@syndic.local NOT FOUND");
    return;
  }

  console.log(`User: ${user.email} (Global Role: ${user.role})`);
  user.organizations.forEach(o => {
    console.log(`  - Org: ${o.organization.name} (Role in Org: ${o.role}, ID: ${o.organizationId})`);
  });
}

debug().catch(console.error).finally(() => prisma.$disconnect());
