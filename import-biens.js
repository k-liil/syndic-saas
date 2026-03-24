const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  const orgSlug = "les-jardins-de-cherrat";
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.error("Organisation introuvable !");
    return;
  }

  const wb = xlsx.readFile('Biens.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  let rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  rows = rows.filter(r => r["N° BIEN"] && String(r["N° BIEN"]).trim() !== "");

  // 1. Cleanup existing units for this org to allow re-mapping lot numbers
  console.log("Nettoyage des lots existants pour cette organisation...");
  // Use a query to delete all units for this organization
  // This will also delete Ownerships if there are no other constraints, 
  // but let's be safe and delete ownerships first if needed.
  await prisma.ownership.deleteMany({ where: { organizationId: org.id } });
  await prisma.unit.deleteMany({ where: { organizationId: org.id } });
  console.log("Nettoyage terminé.");

  // 2. Collect unique buildings
  const buildingNames = [...new Set(rows.map(r => r["Numéro d'immeuble"]).filter(Boolean))];
  const buildingsMap = {};
  for (const bName of buildingNames) {
    const b = await prisma.building.upsert({
      where: { organizationId_name: { organizationId: org.id, name: String(bName) } },
      create: { organizationId: org.id, name: String(bName) },
      update: {},
    });
    buildingsMap[bName] = b.id;
  }
  console.log(`Created/Verified ${Object.keys(buildingsMap).length} buildings.`);

  // 3. Process rows
  for (const r of rows) {
    const ownerName = r["Propriétaire"]?.trim();
    let ownerId = null;

    if (ownerName) {
      const owner = await prisma.owner.findFirst({
        where: { organizationId: org.id, name: ownerName }
      });
      if (owner) {
        ownerId = owner.id;
      } else {
        const newOwner = await prisma.owner.create({
          data: { organizationId: org.id, name: ownerName }
        });
        ownerId = newOwner.id;
      }
    }

    const typeStr = r["Type"]?.toLowerCase() || "";
    let unitType = "APARTMENT";
    if (typeStr.includes("garage")) unitType = "GARAGE";
    if (typeStr.includes("commercial")) unitType = "COMMERCIAL";

    let share = parseFloat(String(r["Tantième"]).replace(",", "."));
    if (isNaN(share)) share = 1;

    // Remove any letters or spaces from the Étage to get just the Int
    let floor = null;
    const floorRaw = r["Étage"];
    if (floorRaw !== "" && floorRaw !== null && floorRaw !== undefined) {
      if (typeof floorRaw === 'number') {
        floor = floorRaw;
      } else {
        const parsed = parseInt(String(floorRaw).replace(/\D/g, ""), 10);
        if (!isNaN(parsed)) floor = parsed;
      }
    }

    const code = String(r["Code"]).trim();
    const ref = String(r["N° BIEN"]).trim();

    // Now upserting with lotNumber = code
    const unit = await prisma.unit.create({
      data: {
        organizationId: org.id,
        buildingId: buildingsMap[r["Numéro d'immeuble"]] || null,
        reference: ref, // N° BIEN
        lotNumber: code, // Code (A1, A2...)
        type: unitType,
        floor: floor,
      }
    });

    if (ownerId) {
      await prisma.ownership.create({
        data: {
          organizationId: org.id,
          unitId: unit.id,
          ownerId: ownerId,
          startDate: new Date(),
        }
      });
    }
  }

  console.log("Importation terminée avec succès !");
}

main().catch(console.error).finally(() => prisma.$disconnect());
