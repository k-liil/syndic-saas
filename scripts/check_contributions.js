const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";

async function main() {
  const s = await p.appSettings.findFirst({ where: { organizationId: ORG_ID } });
  console.log("globalFixedAmount:", s?.globalFixedAmount?.toString());
  console.log("startYear:", s?.startYear);
  console.log("startMonth:", s?.startMonth);
  console.log("contributionType:", s?.contributionType);
}
main().catch(console.error).finally(() => p.$disconnect());
