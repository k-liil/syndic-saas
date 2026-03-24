const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";

  const total = await p.receipt.count({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION", date: { gte: new Date("2024-01-01"), lt: new Date("2025-01-01") } },
  });

  const byMethod = await p.receipt.groupBy({
    by: ["method"],
    where: { organizationId: ORG_ID, type: "CONTRIBUTION", date: { gte: new Date("2024-01-01"), lt: new Date("2025-01-01") } },
    _count: { id: true },
    _sum: { amount: true },
  });

  const samples = await p.receipt.findMany({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION", date: { gte: new Date("2024-01-01"), lt: new Date("2025-01-01") } },
    orderBy: { receiptNumber: "asc" },
    take: 5,
    select: { receiptNumber: true, date: true, method: true, amount: true, bankName: true, bankRef: true, unit: { select: { reference: true } }, note: true },
  });

  console.log(`\nTotal recettes 2024: ${total}`);
  console.log("\nPar méthode:");
  byMethod.forEach((m) => console.log(`  ${m.method}: ${m._count.id} recettes, ${m._sum.amount} MAD`));
  console.log("\nEchantillon (5 premières):");
  samples.forEach((r) => console.log(JSON.stringify({ n: r.receiptNumber, date: r.date?.toISOString().slice(0,10), method: r.method, amount: r.amount, bank: r.bankName, ref: r.bankRef, lot: r.unit?.reference, note: r.note?.slice(0,30) })));
}

main().catch(console.error).finally(() => p.$disconnect());
