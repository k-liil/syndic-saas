import { PrismaClient } from "@prisma/client";

async function main() {
  const url = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  const orgId = "cmo59283d0000pb0fwk5a4ie5";
  const orgName = "Démo";

  const [r, or, p, fy] = await Promise.all([
    prisma.receipt.count({ where: { organizationId: orgId } }),
    prisma.otherReceipt.count({ where: { organizationId: orgId } }),
    prisma.payment.count({ where: { organizationId: orgId } }),
    prisma.fiscalYear.findMany({ where: { organizationId: orgId } }),
  ]);

  console.log(`Org: ${orgName} (${orgId})`);
  console.log(`Recettes (Cotisations): ${r}`);
  console.log(`Autres Recettes: ${or}`);
  console.log(`Paiements: ${p}`);
  console.log(`Exercices existants: ${fy.length} (${fy.map(f => f.year).join(", ")})`);

  // Find unique years
  const [rDates, oDates, pDates] = await Promise.all([
    prisma.receipt.findMany({ where: { organizationId: orgId }, select: { date: true } }),
    prisma.otherReceipt.findMany({ where: { organizationId: orgId }, select: { date: true } }),
    prisma.payment.findMany({ where: { organizationId: orgId }, select: { date: true } }),
  ]);

  const yearsSet = new Set<number>();
  rDates.forEach(d => yearsSet.add(d.date.getUTCFullYear()));
  oDates.forEach(d => yearsSet.add(d.date.getUTCFullYear()));
  pDates.forEach(d => yearsSet.add(d.date.getUTCFullYear()));

  const allYears = Array.from(yearsSet).sort();
  console.log("\nAnnées avec transactions:", allYears);

  console.log("\n--- REQUETE SQL POUR INSERTION ---");
  const sql = allYears.map(year => {
    // Check if already exists in fy
    if (fy.some(f => f.year === year)) return `-- Année ${year} existe déjà`;
    
    // UUID v4 format roughly
    const id = `fy-${year}-${orgId.slice(-8)}`; 
    return `INSERT INTO "FiscalYear" ("id", "organizationId", "year", "startsAt", "endsAt", "createdAt") 
VALUES ('${id}', '${orgId}', ${year}, '${year}-01-01T00:00:00Z', '${year}-12-31T23:59:59Z', NOW())
ON CONFLICT ("organizationId", "year") DO NOTHING;`;
  }).join("\n");

  console.log(sql);
  await prisma.$disconnect();
}

main();
