import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const ORG_ID = "cmmyv5nxi0002num0zk6du1ki";
  const OLD_ORG_ID = "cmmyq59pq0000nu5cw6tesqvb";

  console.log("=== Nettoyage des données ===\n");

  // Delete from OLD org first
  const oldReceipts = await p.receipt.count({ where: { organizationId: OLD_ORG_ID } });
  if (oldReceipts > 0) {
    console.log(`Suppression des ${oldReceipts} reçus de l'ancienne org...`);
    await p.receipt.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  }

  const oldBuildings = await p.building.count({ where: { organizationId: OLD_ORG_ID } });
  if (oldBuildings > 0) {
    console.log(`Suppression des ${oldBuildings} immeubles de l'ancienne org...`);
    await p.building.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Anciens immeubles supprimés");
  }

  // Delete from CITÉ INTELLAK II - order matters!
  console.log("\nNettoyage Cité Intellak II...");

  // 1. Delete receipts first (linked to buildings, owners, units)
  await p.receipt.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Reçus supprimés");

  // 2. Delete payments (linked to suppliers, categories)
  await p.payment.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Paiements supprimés");

  // 3. Delete ownerships (linked to owners and units)
  await p.ownership.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Ownerships supprimés");

  // 4. Delete units (may be linked to other tables)
  await p.unit.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Lots supprimés");

  // 5. Delete owners
  await p.owner.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Propriétaires supprimés");

  // 6. Delete buildings last
  await p.building.deleteMany({ where: { organizationId: ORG_ID } });
  console.log("✅ Immeubles supprimés");

  console.log("\n=== Terminé ===");
  console.log("Relancez le seed pour réimporter les données.");
}

main().finally(() => p.$disconnect());
