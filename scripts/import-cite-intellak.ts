import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";

const prisma = new PrismaClient();

const ORG_NAME = "Cité Intellak II";
const ORG_SLUG = "cit-intellak-ii";
const SUPER_ADMIN_EMAIL = "super@syndic.local";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";
const ADMIN_EMAIL = "admin@cit-intellak.local";
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
  console.log("📊 Import Cité Intellak II...\n");
  console.time("Total");

  // 1. Create Super Admin (without organization)
  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { role: "SUPER_ADMIN", isActive: true, passwordHash: superAdminHash, name: "Super Admin" },
    create: {
      email: SUPER_ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: superAdminHash,
      name: "Super Admin",
    },
  });
  console.log(`✅ Super Admin: ${SUPER_ADMIN_EMAIL}`);

  // 2. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME, isActive: true },
    create: { name: ORG_NAME, slug: ORG_SLUG, isActive: true },
  });
  console.log(`✅ Organisation: ${ORG_NAME}`);

  // 3. Create Admin for this org
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN", isActive: true, passwordHash: adminHash, name: "Admin" },
    create: {
      email: ADMIN_EMAIL,
      role: "ADMIN",
      isActive: true,
      passwordHash: adminHash,
      name: "Admin",
    },
  });

  // Link admin to org
  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    update: { role: "ADMIN" },
    create: { userId: adminUser.id, organizationId: org.id, role: "ADMIN" },
  });
  console.log(`✅ Admin Org: ${ADMIN_EMAIL}`);

  // 4. Buildings
  const buildingsData = parseCSV<{ name: string }>("Buildings.csv", (cols) => ({ name: cols[0] }));
  const buildingsMap: Record<string, string> = {};
  
  const buildings = await prisma.building.createMany({
    data: buildingsData.map(b => ({ organizationId: org.id, name: b.name })),
    skipDuplicates: true,
  });
  console.log(`✅ ${buildings.count} immeubles`);

  const allBuildings = await prisma.building.findMany({ where: { organizationId: org.id } });
  for (const b of allBuildings) buildingsMap[b.name] = b.id;

  // 5. Units
  const unitsData = parseCSV<{ lotNumber: string; reference: string; type: string; building: string }>(
    "lots.csv",
    (cols) => ({
      lotNumber: cols[0],
      reference: cols[1],
      type: cols[2],
      building: cols[3],
    })
  );

  const units = await prisma.unit.createMany({
    data: unitsData.map(u => ({
      organizationId: org.id,
      lotNumber: u.lotNumber,
      reference: u.reference,
      type: "APARTMENT",
      buildingId: buildingsMap[u.building],
    })),
    skipDuplicates: true,
  });
  console.log(`✅ ${units.count} lots`);

  const allUnits = await prisma.unit.findMany({ where: { organizationId: org.id } });
  const unitsMap: Record<string, string> = {};
  for (const u of allUnits) {
    if (u.lotNumber) unitsMap[u.lotNumber] = u.id;
  }

  // 6. Owners
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

  const allOwners = await prisma.owner.findMany({ where: { organizationId: org.id } });
  const ownersMap: Record<string, string> = {};
  for (const o of allOwners) {
    if (o.cin) ownersMap[o.cin] = o.id;
  }

  // 7. Ownerships
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

  // 8. Internal Banks
  const banksData = [
    { name: "Banque Populaire (BP)" },
    { name: "Trésorerie Générale (TGR)" },
  ];
  for (const bank of banksData) {
    await prisma.internalBank.upsert({
      where: { id: `bank-${org.id}-${bank.name}` },
      update: {},
      create: { id: `bank-${org.id}-${bank.name}`, organizationId: org.id, name: bank.name },
    });
  }
  console.log(`✅ ${banksData.length} comptes bancaires`);

  // 9. Payment Categories
  const categoriesData = [
    { name: "Téléphone et électricité" },
    { name: "Social" },
    { name: "Paie et primes" },
    { name: "Dépenses courantes" },
    { name: "Entretien espaces verts" },
    { name: "Prestation bancaire" },
  ];
  for (const cat of categoriesData) {
    await prisma.paymentCategory.upsert({
      where: { id: `cat-${org.id}-${cat.name}` },
      update: {},
      create: { id: `cat-${org.id}-${cat.name}`, organizationId: org.id, name: cat.name },
    });
  }
  console.log(`✅ ${categoriesData.length} catégories`);

  // 10. Suppliers
  const suppliersSet = new Set<string>();
  parseCSV<{ supplierName: string }>("depenses_2024.csv", (cols) => {
    if (cols[0]) suppliersSet.add(cols[0]);
    return null;
  });

  const supplierIds: Record<string, string> = {};
  for (const name of suppliersSet) {
    const id = `sup-${org.id}-${name.substring(0, 25)}`;
    await prisma.supplier.upsert({
      where: { id },
      update: {},
      create: { id, organizationId: org.id, name },
    });
    supplierIds[name] = id;
  }
  console.log(`✅ ${suppliersSet.size} fournisseurs`);

  const allSuppliers = await prisma.supplier.findMany({ where: { organizationId: org.id } });
  const suppliersMap: Record<string, string> = {};
  for (const s of allSuppliers) {
    if (s.name) suppliersMap[s.name] = s.id;
  }

  // 11. Fiscal Year
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

  // 12. Payments
  console.log("📝 Import des dépenses...");
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

  const categoryMap: Record<string, string> = {};
  const allCategories = await prisma.paymentCategory.findMany({ where: { organizationId: org.id } });
  for (const c of allCategories) {
    if (c.name) categoryMap[c.name] = c.id;
  }

  const bankMap: Record<string, string> = {};
  const allBanks = await prisma.internalBank.findMany({ where: { organizationId: org.id } });
  for (const b of allBanks) {
    bankMap[b.name] = b.id;
  }

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
    await prisma.payment.createMany({ data: paymentsBatch, skipDuplicates: true });
  }
  console.log(`✅ ${paymentsData.length} dépenses`);

  // 13. Receipts
  console.log("📝 Import des reçus...");
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
      await prisma.receipt.createMany({ data: receiptsBatch, skipDuplicates: true });
    }
  }
  console.log(`✅ ${receiptsData.length} reçus`);

  // 14. AppSettings
  await prisma.appSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
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
  console.log("\n🎉 Import Cité Intellak II terminé!");
  console.log("\nComptes:");
  console.log("  Super Admin: ", SUPER_ADMIN_EMAIL, "/", SUPER_ADMIN_PASSWORD);
  console.log("  Admin Org:   ", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
