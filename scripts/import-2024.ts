import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";

const prisma = new PrismaClient();

const ORG_NAME = "Copropriété Al Hoceïma";
const ORG_SLUG = "default";
const ADMIN_EMAIL = "admin@syndic.local";
const ADMIN_PASSWORD = "Admin123!";
const YEAR = 2024;

function parseCSV<T>(filename: string, parser: (cols: string[]) => T | null): T[] {
  const text = fs.readFileSync(filename, "utf-8");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const results: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map(c => c.trim());
    const row = parser(cols);
    if (row) results.push(row);
  }
  return results;
}

async function main() {
  console.log("📊 Import des données 2024...\n");
  console.time("Total");

  // 1. Organisation - use upsert
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME, isActive: true },
    create: { name: ORG_NAME, slug: ORG_SLUG, isActive: true },
  });
  console.log(`✅ Organisation: ${org.name}`);

  // 2. Admin
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN", isActive: true, passwordHash, name: "Admin", organizationId: org.id },
    create: {
      email: ADMIN_EMAIL,
      role: "ADMIN",
      isActive: true,
      passwordHash,
      name: "Admin",
      organizationId: org.id,
    },
  });
  console.log(`✅ Admin: ${ADMIN_EMAIL}`);

  // 3. Buildings
  const buildingsData = parseCSV<{ name: string }>("Buildings.csv", (cols) => ({ name: cols[0] }));
  const buildingsMap: Record<string, string> = {};
  
  // Delete existing buildings first
  await prisma.building.deleteMany({ where: { organizationId: org.id } });
  const buildings = await prisma.building.createMany({
    data: buildingsData.map(b => ({ organizationId: org.id, name: b.name })),
  });
  console.log(`✅ ${buildings.count} immeubles`);

  // Get building IDs
  const allBuildings = await prisma.building.findMany({ where: { organizationId: org.id } });
  for (const b of allBuildings) buildingsMap[b.name] = b.id;

  // 4. Units
  const unitsData = parseCSV<{ lotNumber: string; reference: string; type: string; building: string }>(
    "lots.csv",
    (cols) => ({
      lotNumber: cols[0],
      reference: cols[1],
      type: cols[2],
      building: cols[3],
    })
  );

  // Delete existing units first
  await prisma.unit.deleteMany({ where: { organizationId: org.id } });
  const units = await prisma.unit.createMany({
    data: unitsData.map(u => ({
      organizationId: org.id,
      lotNumber: u.lotNumber,
      reference: u.reference,
      type: "APARTMENT",
      buildingId: buildingsMap[u.building],
    })),
  });
  console.log(`✅ ${units.count} lots`);

  // Get unit IDs
  const allUnits = await prisma.unit.findMany({ where: { organizationId: org.id } });
  const unitsMap: Record<string, string> = {};
  for (const u of allUnits) {
    if (u.lotNumber) unitsMap[u.lotNumber] = u.id;
  }

  // 5. Owners
  const ownersData = parseCSV<{ cin: string; name: string; lotNumber: string; email: string; phone: string }>(
    "Owners.csv",
    (cols) => ({
      cin: cols[0],
      name: cols[1].trim(),
      lotNumber: cols[2].trim(),
      email: cols[3] || "",
      phone: cols[4] || "",
    })
  );

  // Delete existing ownerships first (FK to owners)
  await prisma.ownership.deleteMany({ where: { organizationId: org.id } });
  const owners = await prisma.owner.createMany({
    data: ownersData.map(o => ({
      organizationId: org.id,
      cin: o.cin,
      name: o.name,
      email: o.email || null,
      phone: o.phone || null,
    })),
    skipDuplicates: true,
  });
  console.log(`✅ ${owners.count} propriétaires`);

  // Get owner IDs by CIN
  const allOwners = await prisma.owner.findMany({ where: { organizationId: org.id } });
  const ownersMap: Record<string, string> = {};
  for (const o of allOwners) {
    if (o.cin) ownersMap[o.cin] = o.id;
  }

  // 6. Ownerships (link owners to units)
  const ownershipsData = ownersData
    .filter(o => unitsMap[o.lotNumber] && ownersMap[o.cin])
    .map(o => ({
      organizationId: org.id,
      ownerId: ownersMap[o.cin],
      unitId: unitsMap[o.lotNumber],
      startDate: new Date(`${YEAR}-01-01`),
    }));

  const ownerships = await prisma.ownership.createMany({
    data: ownershipsData,
  });
  console.log(`✅ ${ownerships.count} relations propriétaire-lot`);

  // 7. Internal Banks
  const banksData = [
    { id: "bank-bp", name: "Banque Populaire (BP)" },
    { id: "bank-tgr", name: "Trésorerie Générale (TGR)" },
  ];
  await prisma.internalBank.deleteMany({ where: { organizationId: org.id } });
  await prisma.internalBank.createMany({ data: banksData.map(b => ({ ...b, organizationId: org.id })) });
  console.log(`✅ ${banksData.length} comptes bancaires`);

  // 8. Payment Categories
  const categoriesData = [
    { id: "cat-telephonie", name: "Téléphone et électricité" },
    { id: "cat-social", name: "Social" },
    { id: "cat-paie", name: "Paie et primes" },
    { id: "cat-depenses", name: "Dépenses courantes" },
    { id: "cat-entretien", name: "Entretien espaces verts" },
    { id: "cat-bancaire", name: "Prestation bancaire" },
  ];
  await prisma.paymentCategory.deleteMany({ where: { organizationId: org.id } });
  await prisma.paymentCategory.createMany({
    data: categoriesData.map(c => ({ ...c, organizationId: org.id })),
  });
  console.log(`✅ ${categoriesData.length} catégories`);

  // 9. Suppliers (unique from expenses)
  const suppliersSet = new Map<string, string>();
  parseCSV<{ supplierName: string }>("depenses_2024.csv", (cols) => {
    if (cols[0]) suppliersSet.set(cols[0], `sup-${cols[0].substring(0, 30)}`);
    return null;
  });

  const suppliersData = Array.from(suppliersSet.entries()).map(([name, id]) => ({
    id,
    organizationId: org.id,
    name,
  }));
  await prisma.supplier.deleteMany({ where: { organizationId: org.id } });
  await prisma.supplier.createMany({ data: suppliersData, skipDuplicates: true });
  console.log(`✅ ${suppliersData.length} fournisseurs`);

  // Get supplier IDs
  const allSuppliers = await prisma.supplier.findMany({ where: { organizationId: org.id } });
  const suppliersMap: Record<string, string> = {};
  for (const s of allSuppliers) {
    if (s.name) suppliersMap[s.name] = s.id;
  }

  // 10. Fiscal Year
  await prisma.fiscalYear.upsert({
    where: { organizationId_year: { organizationId: org.id, year: YEAR } },
    update: {},
    create: {
      organizationId: org.id,
      year: YEAR,
      startsAt: new Date(`${YEAR}-01-01`),
      endsAt: new Date(`${YEAR}-12-31`),
    },
  });
  console.log(`✅ Exercice fiscal ${YEAR}`);

  // 11. Payments (depenses) - in batches
  console.log("📝 Import des dépenses...");
  await prisma.payment.deleteMany({ where: { organizationId: org.id } });
  const paymentsData = parseCSV<{
    supplierName: string;
    categoryName: string;
    method: string;
    amount: number;
    date: string;
    bankName: string;
    bankRef: string;
    note: string;
  }>("depenses_2024.csv", (cols) => {
    const amount = parseFloat(cols[3]) || 0;
    const method = cols[2].toUpperCase();
    return {
      supplierName: cols[0],
      categoryName: cols[1],
      method: ["CASH", "CHECK", "DEBIT", "TRANSFER"].includes(method) ? method : "CASH",
      amount,
      date: cols[4],
      bankName: cols[5],
      bankRef: cols[6] || "",
      note: cols[7] || "",
    };
  });

  const categoryMap: Record<string, string> = {
    "Téléphone et électricité": "cat-telephonie",
    "Social": "cat-social",
    "Paie et primes": "cat-paie",
    "Dépenses courantes": "cat-depenses",
    "Entretien espaces verts": "cat-entretien",
    "Prestation bancaire": "cat-bancaire",
  };

  const bankMap: Record<string, string> = {
    "BP": "bank-bp",
    "TGR": "bank-tgr",
  };

  let paymentNumber = 1;
  const BATCH_SIZE = 50;
  for (let i = 0; i < paymentsData.length; i += BATCH_SIZE) {
    const batch = paymentsData.slice(i, i + BATCH_SIZE);
    const paymentsBatch = batch.map(p => ({
      organizationId: org.id,
      paymentNumber: paymentNumber++,
      supplierId: suppliersMap[p.supplierName] || Object.values(suppliersMap)[0],
      categoryId: categoryMap[p.categoryName] || null,
      date: new Date(p.date),
      method: p.method as any,
      amount: p.amount,
      note: p.note || null,
      bankName: bankMap[p.bankName] || null,
      bankRef: p.bankRef || null,
    }));
    await prisma.payment.createMany({ data: paymentsBatch });
    if ((i + BATCH_SIZE) % 100 === 0) console.log(`   ${Math.min(i + BATCH_SIZE, paymentsData.length)}/${paymentsData.length}...`);
  }
  console.log(`✅ ${paymentsData.length} dépenses`);

  // 12. Receipts (paiements copropriétaires)
  console.log("📝 Import des reçus...");
  await prisma.receipt.deleteMany({ where: { organizationId: org.id } });
  const receiptsData = parseCSV<{
    lotNumber: string;
    amount: number;
    method: string;
    date: string;
    note: string;
  }>("receipts_2024.csv", (cols) => ({
    lotNumber: cols[0],
    amount: parseFloat(cols[1]) || 0,
    method: ["CASH", "CHECK", "DEBIT", "TRANSFER"].includes(cols[2].toUpperCase()) ? cols[2].toUpperCase() : "CASH",
    date: cols[3],
    note: cols[4] || "",
  }));

  // Get owner-unit relationships
  const allOwnerships = await prisma.ownership.findMany({
    where: { organizationId: org.id },
    include: { unit: true, owner: true },
  });
  const unitOwnerMap: Record<string, { ownerId: string; buildingId: string }> = {};
  for (const o of allOwnerships) {
    if (o.unit.buildingId) {
      unitOwnerMap[o.unit.lotNumber || ""] = { ownerId: o.ownerId, buildingId: o.unit.buildingId };
    }
  }

  let receiptNumber = 1;
  for (let i = 0; i < receiptsData.length; i += BATCH_SIZE) {
    const batch = receiptsData.slice(i, i + BATCH_SIZE);
    const receiptsBatch = batch
      .filter(r => unitOwnerMap[r.lotNumber])
      .map(r => {
        const info = unitOwnerMap[r.lotNumber];
        return {
          organizationId: org.id,
          receiptNumber: receiptNumber++,
          type: "CONTRIBUTION" as const,
          buildingId: info.buildingId,
          ownerId: info.ownerId,
          unitId: unitsMap[r.lotNumber],
          date: new Date(r.date),
          method: r.method as any,
          amount: r.amount,
          note: r.note || null,
          unallocatedAmount: 0,
        };
      });
    
    if (receiptsBatch.length > 0) {
      await prisma.receipt.createMany({ data: receiptsBatch });
    }
    if ((i + BATCH_SIZE) % 100 === 0) console.log(`   ${Math.min(i + BATCH_SIZE, receiptsData.length)}/${receiptsData.length}...`);
  }
  console.log(`✅ ${receiptsData.length} reçus`);

  // 13. AppSettings
  await prisma.appSettings.create({
    data: {
      organizationId: org.id,
      contributionType: "GLOBAL_FIXED",
      globalFixedAmount: 140,
      brandName: ORG_NAME,
      startYear: YEAR,
      startMonth: 1,
    },
  });
  console.log(`✅ Paramètres`);

  console.timeEnd("Total");
  console.log("\n🎉 Import terminé avec succès!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
