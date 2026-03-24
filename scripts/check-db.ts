import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const orgs = await p.organization.findMany({ select: { id: true, name: true, slug: true } });
  const settings = await p.appSettings.findMany({ select: { id: true, organizationId: true, brandName: true } });
  console.log("Orgs:", JSON.stringify(orgs, null, 2));
  console.log("Settings:", JSON.stringify(settings, null, 2));
}

main().finally(() => p.$disconnect());
