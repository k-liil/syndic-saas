const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";

async function main() {
  const settings = await p.appSettings.findFirst({ where: { organizationId: ORG_ID } });
  console.log("Settings:", JSON.stringify({
    receiptUsePrefix: settings?.receiptUsePrefix,
    receiptPrefix: settings?.receiptPrefix,
    receiptStartNumber: settings?.receiptStartNumber,
  }, null, 2));
}
main().catch(console.error).finally(() => p.$disconnect());
