import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const OLD_ORG_SLUG = "default";

  const oldOrg = await p.organization.findUnique({ where: { slug: OLD_ORG_SLUG } });
  if (!oldOrg) {
    console.log("Old org not found");
    return;
  }

  await p.appSettings.updateMany({
    where: { organizationId: oldOrg.id },
    data: { brandName: "Cité Intellak II" },
  });

  console.log(`✅ BrandName mis à jour pour "${oldOrg.name}"`);
}

main().finally(() => p.$disconnect());
