import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: "Démo", mode: "insensitive" } },
  });

  if (!org) {
    console.log("Organisation 'Démo' introuvable.");
    return;
  }

  console.log(`Org: ${org.name} (${org.id})`);

  const [receiptCount, otherReceiptCount, paymentCount] = await Promise.all([
    prisma.receipt.count({ where: { organizationId: org.id } }),
    prisma.otherReceipt.count({ where: { organizationId: org.id } }),
    prisma.payment.count({ where: { organizationId: org.id } }),
  ]);

  console.log(`Recettes (Cotisations): ${receiptCount}`);
  console.log(`Autres Recettes: ${otherReceiptCount}`);
  console.log(`Paiements: ${paymentCount}`);

  // Find unique years
  const [rDates, oDates, pDates] = await Promise.all([
    prisma.receipt.findMany({ where: { organizationId: org.id }, select: { date: true } }),
    prisma.otherReceipt.findMany({ where: { organizationId: org.id }, select: { date: true } }),
    prisma.payment.findMany({ where: { organizationId: org.id }, select: { date: true } }),
  ]);

  const years = new Set<number>();
  rDates.forEach(d => years.add(d.date.getUTCFullYear()));
  oDates.forEach(d => years.add(d.date.getUTCFullYear()));
  pDates.forEach(d => years.add(d.date.getUTCFullYear()));

  console.log("\nAnnées trouvées dans les transactions:", Array.from(years).sort());

  console.log("\n--- REQUETE SQL POUR INSERTION ---");
  const sql = Array.from(years).map(year => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `fy_${year}_${org.id.slice(0, 8)}`;
    return `INSERT INTO "FiscalYear" ("id", "organizationId", "year", "startsAt", "endsAt", "createdAt") 
VALUES ('${id}', '${org.id}', ${year}, '${year}-01-01T00:00:00Z', '${year}-12-31T23:59:59Z', NOW())
ON CONFLICT ("organizationId", "year") DO NOTHING;`;
  }).join("\n");

  console.log(sql);
}

main().finally(() => prisma.$disconnect());
