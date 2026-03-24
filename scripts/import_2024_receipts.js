/**
 * Import des recettes 2024 depuis liste-des-paiements_2024.xlsx
 *
 * Règles :
 *  - Seules les lignes dont la date est en 2024 sont traitées
 *  - Mode : "Paiement par virement" => TRANSFER
 *           "Paiement par chèque"   => CHECK  (bankRef = colonne Référence)
 *           "Paiement par versement"=> CASH
 *           null / vide              => CHECK  (bankRef = colonne Référence)
 *  - Banque pour TRANSFER et CHECK : CIH Bank (ID: cmn1vbly20001nuj05kzhe9su)
 *  - Colonne "Compte" ignorée
 *  - Colonne "Commentaire" => note
 *  - Supprimer d'abord toutes les recettes de type CONTRIBUTION de 2024 pour Cherrat
 */

const { PrismaClient } = require("@prisma/client");
const xlsx = require("xlsx");
const path = require("path");

const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";
const CIH_BANK_ID = "cmn1vbly20001nuj05kzhe9su";
const CIH_BANK_NAME = "CIH Bank";
const YEAR = 2024;

const p = new PrismaClient();

function parseDate(raw) {
  if (!raw) return null;
  // Format: "DD/MM/YYYY"
  const [day, month, year] = String(raw).split("/");
  if (!day || !month || !year) return null;
  return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`);
}

function parseMethod(mode) {
  if (!mode) return "CHECK";
  const m = String(mode).toLowerCase();
  if (m.includes("virement")) return "TRANSFER";
  if (m.includes("versement")) return "CASH";
  if (m.includes("cheque") || m.includes("chèque")) return "CHECK";
  return "CHECK";
}

async function main() {
  console.log("📂 Lecture du fichier Excel...");
  const wb = xlsx.readFile(path.join(__dirname, "../public/liste-des-paiements_2024.xlsx"));
  const ws = wb.Sheets[wb.SheetNames[0]];
  // ligne 0 = titre, ligne 1 = totaux, ligne 2 = headers → données à partir de ligne 3 (index 2)
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }).slice(2);

  // Filtrer uniquement les lignes 2024 avec un montant valide
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

  console.log(`📊 ${validRows.length} lignes 2024 valides trouvées (sur ${rows.length} total)`);

  // --- Supprimer les recettes CONTRIBUTION 2024 existantes pour Cherrat ---
  console.log("🗑️  Suppression des recettes CONTRIBUTION 2024 existantes...");
  const deleted = await p.receipt.deleteMany({
    where: {
      organizationId: ORG_ID,
      type: "CONTRIBUTION",
      date: {
        gte: new Date("2024-01-01T00:00:00Z"),
        lt: new Date("2025-01-01T00:00:00Z"),
      },
    },
  });
  console.log(`   → ${deleted.count} recette(s) supprimée(s)`);

  // Récupérer toutes les unités de l'org pour matcher par lotNumber/reference
  const units = await p.unit.findMany({
    where: { organizationId: ORG_ID },
    include: { building: true },
  });

  // Récupérer les ownerships actives pour associer owner aux unités
  const ownerships = await p.ownership.findMany({
    where: { organizationId: ORG_ID, endDate: null },
  });
  const ownerByUnit = Object.fromEntries(
    ownerships.map((o) => [o.unitId, o.ownerId])
  );

  // Récupérer le dernier numéro de reçu pour cette org
  const lastReceipt = await p.receipt.findFirst({
    where: { organizationId: ORG_ID },
    orderBy: { receiptNumber: "desc" },
  });
  let nextReceiptNumber = (lastReceipt?.receiptNumber ?? 0) + 1;

  let imported = 0;
  let errors = [];

  console.log("🚀 Import en cours...");

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const referenceCol = String(row[0] || "").trim(); // ex: PAF19241680001
    const modeRaw = row[1];
    const dateRaw = row[2];
    const biens = String(row[3] || "").trim(); // ex: F19, G22
    const montant = Number(row[5]);
    const commentaire = String(row[6] || "").trim();
    // colonne 7 (Compte) ignorée

    const date = parseDate(dateRaw);
    const method = parseMethod(modeRaw);

    // Chercher l'unité par reference ou lotNumber
    let unit = units.find(
      (u) =>
        u.reference?.toLowerCase() === biens.toLowerCase() ||
        u.lotNumber?.toLowerCase() === biens.toLowerCase()
    );

    if (!unit) {
      errors.push({ row: i + 3, error: `Lot introuvable: "${biens}"` });
      console.warn(`  ⚠️  Ligne ${i + 3}: lot "${biens}" non trouvé`);
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
      errors.push({ row: i + 3, error: err.message });
      console.error(`  ❌  Ligne ${i + 3}: ${err.message}`);
    }
  }

  console.log("\n✅ Import terminé");
  console.log(`   Importés : ${imported}`);
  console.log(`   Erreurs  : ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nDétail des erreurs:");
    errors.forEach((e) => console.log(`  Ligne ${e.row}: ${e.error}`));
  }
}

main()
  .catch((err) => {
    console.error("❌ Erreur fatale:", err);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
