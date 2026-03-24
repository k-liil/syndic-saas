import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const OLD_ORG_ID = "cmmyq59pq0000nu5cw6tesqvb";
  const OLD_ORG_NAME = "Copropriété Intellak II";

  console.log("=== Suppression de l'ancienne organisation ===\n");

  // Check what's in the old org
  const [buildings, units, owners, receipts, payments] = await Promise.all([
    p.building.count({ where: { organizationId: OLD_ORG_ID } }),
    p.unit.count({ where: { organizationId: OLD_ORG_ID } }),
    p.owner.count({ where: { organizationId: OLD_ORG_ID } }),
    p.receipt.count({ where: { organizationId: OLD_ORG_ID } }),
    p.payment.count({ where: { organizationId: OLD_ORG_ID } }),
  ]);

  console.log(`Dans "${OLD_ORG_NAME}":`);
  console.log(`  - Immeubles: ${buildings}`);
  console.log(`  - Lots: ${units}`);
  console.log(`  - Propriétaires: ${owners}`);
  console.log(`  - Reçus: ${receipts}`);
  console.log(`  - Paiements: ${payments}`);

  if (buildings > 0 || units > 0 || owners > 0 || receipts > 0 || payments > 0) {
    console.log("\n⚠️ L'organisation contient des données. Suppression en cascade...\n");

    await p.receipt.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Reçus supprimés");

    await p.payment.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Paiements supprimés");

    await p.ownership.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Ownerships supprimés");

    await p.unit.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Lots supprimés");

    await p.owner.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Propriétaires supprimés");

    await p.building.deleteMany({ where: { organizationId: OLD_ORG_ID } });
    console.log("✅ Immeubles supprimés");
  }

  await p.userOrganization.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Liens utilisateurs supprimés");

  await p.fiscalYear.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Exercices fiscaux supprimés");

  await p.internalBank.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Comptes bancaires supprimés");

  await p.paymentCategory.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Catégories supprimées");

  await p.supplier.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Fournisseurs supprimés");

  await p.appSettings.deleteMany({ where: { organizationId: OLD_ORG_ID } });
  console.log("✅ Paramètres supprimés");

  await p.organization.delete({ where: { id: OLD_ORG_ID } });
  console.log("✅ Organisation supprimée");

  console.log("\n=== Organisations restantes ===");
  const remaining = await p.organization.findMany({ orderBy: { name: "asc" } });
  for (const org of remaining) {
    console.log(`  - ${org.name} (${org.slug})`);
  }
}

main().finally(() => p.$disconnect());
