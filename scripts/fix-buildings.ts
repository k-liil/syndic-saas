import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const ORG_ID = "cmmyv5nxi0002num0zk6du1ki";
  const BUILDING_NAMES = ["Immeuble 1", "Immeuble 2", "Immeuble 3", "Immeuble 4", "Immeuble 5", "Immeuble 6"];

  const buildings = await p.building.findMany({
    where: { organizationId: ORG_ID },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total bâtiments pour Cité Intellak II: ${buildings.length}`);

  const toKeep = new Set<string>();
  const toDelete: string[] = [];

  BUILDING_NAMES.forEach((name) => {
    const found = buildings.find((b) => b.name === name && !toKeep.has(b.id));
    if (found) {
      toKeep.add(found.id);
    }
  });

  buildings.forEach((b) => {
    if (!toKeep.has(b.id)) {
      toDelete.push(b.id);
    }
  });

  console.log(`Bâtiments à garder: ${toKeep.size}`);
  console.log(`Bâtiments à supprimer: ${toDelete.length}`);

  if (toDelete.length > 0) {
    await p.building.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log("✅ Doublons supprimés");
  }

  const remaining = await p.building.findMany({
    where: { organizationId: ORG_ID },
    orderBy: { name: "asc" },
  });

  console.log(`\nBâtiments restants (${remaining.length}):`);
  remaining.forEach((b) => console.log(`  - ${b.name}`));
}

main().finally(() => p.$disconnect());
