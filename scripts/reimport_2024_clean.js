/**
 * Nettoyage complet + réimport propre 2024
 */
const { PrismaClient } = require("@prisma/client");
const xlsx = require("xlsx");
const path = require("path");

const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";
const CIH_BANK_NAME = "CIH Bank";
const YEAR = 2024;

const p = new PrismaClient();

function parseDate(raw) {
  if (!raw) return null;
  const [day, month, year] = String(raw).split("/");
  if (!day || !month || !year) return null;
  return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`);
}

function parseMethod(mode) {
  if (!mode) return "CHECK";
  const m = String(mode).toLowerCase();
  if (m.includes("virement")) return "TRANSFER";
  if (m.includes("versement")) return "CASH";
  return "CHECK";
}

async function main() {
  // -------------------------------------------------------
  // 1. Supprimer TOUTES les recettes CONTRIBUTION de Cherrat
  // -------------------------------------------------------
  console.log("🗑️  Suppression de TOUTES les recettes CONTRIBUTION pour Cherrat...");

  // Supprimer d'abord les ReceiptAllocations liées
  const receipts = await p.receipt.findMany({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION" },
    select: { id: true },
  });
  const ids = receipts.map((r) => r.id);
  console.log(`   → ${ids.length} recettes trouvées`);

  if (ids.length > 0) {
    const delAlloc = await p.receiptAllocation.deleteMany({
      where: { receiptId: { in: ids } },
    });
    console.log(`   → ${delAlloc.count} allocation(s) supprimée(s)`);

    const del = await p.receipt.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`   → ${del.count} recette(s) supprimée(s)`);
  }

  // -------------------------------------------------------
  // 2. Lire le fichier Excel
  // -------------------------------------------------------
  console.log("\n📂 Lecture du fichier Excel...");
  const wb = xlsx.readFile(path.join(__dirname, "../public/liste-des-paiements_2024.xlsx"));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(2);

  const validRows = rows.filter((r) => {
    const d = parseDate(r[2]);
    if (!d) return false;
    if (d.getFullYear() !== YEAR) return false;
    const montant = Number(r[5]);
    if (!montant || montant <= 0) return false;
    const biens = String(r[3] || "").trim();
    if (!biens) return false;
    return true;
  });

  console.log(`📊 ${validRows.length} lignes 2024 valides`);

  // -------------------------------------------------------
  // 3. Récupérer les unités et ownerships
  // -------------------------------------------------------
  const units = await p.unit.findMany({
    where: { organizationId: ORG_ID },
    include: { building: true },
  });

  const ownerships = await p.ownership.findMany({
    where: { organizationId: ORG_ID, endDate: null },
  });
  const ownerByUnit = Object.fromEntries(ownerships.map((o) => [o.unitId, o.ownerId]));

  // Récupérer le dernier numéro de reçu (toutes orgs confondues pour éviter les doublons)
  const lastReceipt = await p.receipt.findFirst({
    where: { organizationId: ORG_ID },
    orderBy: { receiptNumber: "desc" },
  });
  let nextReceiptNumber = (lastReceipt?.receiptNumber ?? 0) + 1;
  console.log(`\n🔢 Prochain numéro de reçu: ${nextReceiptNumber}`);

  // -------------------------------------------------------
  // 4. Import
  // -------------------------------------------------------
  let imported = 0;
  let errors = [];

  console.log("🚀 Import en cours...");

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const referenceCol = String(row[0] || "").trim();
    const modeRaw = row[1];
    const dateRaw = row[2];
    const biens = String(row[3] || "").trim();
    const montant = Number(row[5]);
    const commentaire = String(row[6] || "").trim();

    const date = parseDate(dateRaw);
    const method = parseMethod(modeRaw);

    // Chercher l'unité
    let unit = units.find(
      (u) =>
        u.reference?.toLowerCase() === biens.toLowerCase() ||
        u.lotNumber?.toLowerCase() === biens.toLowerCase()
    );

    if (!unit) {
      errors.push({ row: i + 3, biens, error: `Lot introuvable: "${biens}"` });
      continue;
    }

    const bankName = method === "TRANSFER" || method === "CHECK" ? CIH_BANK_NAME : null;
    const bankRef = method === "CHECK" ? referenceCol : null;

    try {
      await p.receipt.create({
        data: {
          organizationId: ORG_ID,
          unitId: unit.id,
          ownerId: ownerByUnit[unit.id] ?? null,
          buildingId: unit.buildingId ?? null,
          receiptNumber: nextReceiptNumber++,
          type: "CONTRIBUTION",
          method,
          amount: montant,
          date,
          note: commentaire || null,
          bankName: bankName ?? null,
          bankRef: bankRef ?? null,
        },
      });
      imported++;
    } catch (err) {
      errors.push({ row: i + 3, biens, error: err.message });
    }
  }

  // -------------------------------------------------------
  // 5. Créer ou vérifier le FiscalYear 2024
  // -------------------------------------------------------
  console.log("\n📅 Vérification / création du FiscalYear 2024...");
  const existing = await p.fiscalYear.findFirst({
    where: { organizationId: ORG_ID, year: YEAR },
  });

  if (!existing) {
    await p.fiscalYear.create({
      data: {
        organizationId: ORG_ID,
        year: YEAR,
        startDate: new Date(`${YEAR}-01-01T00:00:00Z`),
        endDate: new Date(`${YEAR}-12-31T23:59:59Z`),
        isActive: true,
      },
    });
    console.log("   → FiscalYear 2024 créé ✅");
  } else {
    console.log("   → FiscalYear 2024 existait déjà");
  }

  // -------------------------------------------------------
  // 6. Résultat
  // -------------------------------------------------------
  console.log("\n✅ Import terminé");
  console.log(`   Importés : ${imported}`);
  console.log(`   Erreurs  : ${errors.length}`);
  if (errors.length > 0) {
    console.log("Détail des erreurs:");
    errors.slice(0, 20).forEach((e) => console.log(`  Ligne ${e.row} (lot: ${e.biens}): ${e.error}`));
  }

  const finalCount = await p.receipt.count({ where: { organizationId: ORG_ID, type: "CONTRIBUTION" } });
  console.log(`\nTotal final en BDD: ${finalCount} recettes`);
}

main()
  .catch((err) => {
    console.error("❌ Erreur fatale:", err.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
