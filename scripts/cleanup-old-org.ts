import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const SUPER_ADMIN_EMAIL = "super@syndic.local";
  const OLD_ORG_SLUG = "default";
  const OLD_ORG_NAME = "Copropriété Intellak II";
  const NEW_ORG_SLUG = "cit-intellak-ii";

  const superAdmin = await p.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!superAdmin) {
    console.error("Super Admin not found");
    return;
  }

  const oldOrg = await p.organization.findUnique({ where: { slug: OLD_ORG_SLUG } });
  if (!oldOrg) {
    console.log("Old org not found");
    return;
  }

  const newOrg = await p.organization.findUnique({ where: { slug: NEW_ORG_SLUG } });

  console.log(`Old org: ${oldOrg.name} (${oldOrg.id})`);
  console.log(`New org: ${newOrg?.name} (${newOrg?.id})`);

  const userOrgs = await p.userOrganization.findMany({ where: { userId: superAdmin.id } });
  console.log(`\nSuper Admin organizations: ${userOrgs.length}`);
  for (const uo of userOrgs) {
    const org = await p.organization.findUnique({ where: { id: uo.organizationId } });
    console.log(`  - ${org?.name} (${org?.slug})`);
  }

  const shouldDelete = await new Promise((resolve) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(
      `\nSupprimer l'ancienne organisation "${OLD_ORG_NAME}" et ses données? (y/N): `,
      (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === "y");
      }
    );
  });

  if (shouldDelete) {
    await p.userOrganization.deleteMany({ where: { organizationId: oldOrg.id } });
    await p.organization.delete({ where: { id: oldOrg.id } });
    console.log(`✅ Organisation "${OLD_ORG_NAME}" supprimée`);
  }
}

main().finally(() => p.$disconnect());
