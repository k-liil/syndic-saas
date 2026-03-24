const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const org = await p.organization.findFirst({
    where: { name: { contains: "Cherrat", mode: "insensitive" } },
  });
  console.log("Org:", JSON.stringify(org));

  const banks = await p.internalBank.findMany({
    where: { organizationId: org.id },
  });
  console.log("Banks:", JSON.stringify(banks));
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
