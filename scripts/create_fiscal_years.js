const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";
const YEAR = 2024;

async function main() {
  const startsAt = new Date(Date.UTC(YEAR, 0, 1, 0, 0, 0));
  const endsAt = new Date(Date.UTC(YEAR, 11, 31, 23, 59, 59));

  const fy = await p.fiscalYear.upsert({
    where: { organizationId_year: { organizationId: ORG_ID, year: YEAR } },
    update: {},
    create: { organizationId: ORG_ID, year: YEAR, startsAt, endsAt },
  });
  console.log("✅ FiscalYear 2024:", JSON.stringify(fy));

  // Vérifier les paramètres de numérotation
  const settings = await p.appSettings.findFirst({ where: { organizationId: ORG_ID } });
  console.log("\n⚙️  Paramètres:");
  console.log(`   receiptUsePrefix: ${settings?.receiptUsePrefix}`);
  console.log(`   receiptPrefix: "${settings?.receiptPrefix}"`);

  // Vérifier les reçus
  const count = await p.receipt.count({ where: { organizationId: ORG_ID, type: "CONTRIBUTION" } });
  const agg = await p.receipt.aggregate({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION" },
    _min: { receiptNumber: true },
    _max: { receiptNumber: true },
  });
  console.log(`\n📊 Recettes: ${count} | N° ${agg._min.receiptNumber} → ${agg._max.receiptNumber}`);

  // Lister les years disponibles
  const years = await p.fiscalYear.findMany({ where: { organizationId: ORG_ID }, orderBy: { year: "asc" } });
  console.log("\n📅 Années fiscales:", years.map((y) => y.year));
}

main().catch(console.error).finally(() => p.$disconnect());
