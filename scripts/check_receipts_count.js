const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";

async function main() {
  const total = await p.receipt.count({ where: { organizationId: ORG_ID } });
  console.log("Total receipts:", total);

  const byYear = await p.receipt.groupBy({
    by: ["type"],
    where: { organizationId: ORG_ID },
    _count: { id: true },
  });
  console.log("By type:", JSON.stringify(byYear));

  // breakdown by year
  const allReceipts = await p.receipt.findMany({
    where: { organizationId: ORG_ID },
    select: { date: true, type: true },
  });

  const byYearMap = {};
  for (const r of allReceipts) {
    const y = r.date ? new Date(r.date).getFullYear() : "null";
    const k = `${y}-${r.type}`;
    byYearMap[k] = (byYearMap[k] || 0) + 1;
  }
  console.log("By year+type:", JSON.stringify(byYearMap, null, 2));

  // Fiscal years
  const fy = await p.fiscalYear.findMany({ where: { organizationId: ORG_ID }, orderBy: { year: "asc" } });
  console.log("Fiscal years:", JSON.stringify(fy.map(f => ({ id: f.id, year: f.year }))));
}

main().catch(console.error).finally(() => p.$disconnect());
