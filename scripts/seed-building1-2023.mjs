import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Building 1 (Immeuble 1) - seed hardcoded from your screenshot.
 * Rule used:
 * - monthlyDueAmount inferred as 130 or 140 depending on values (260 => 2*130, 280 => 2*140, 1680 => 12*140, 1560 => 12*130, etc.)
 * - One garage detected (row 13 has "Garage 150" => garage exists). We attach a GARAGE unit with monthlyDueAmount=50.
 */

const BUILDING_NAME = "Building 1";

const apartments = [
  { no: 1,  owner: "LAHRACH YOUNES",        monthly: 130, garage: false },
  { no: 2,  owner: "YABOURI MED",           monthly: 140, garage: false },
  { no: 3,  owner: "EL BAKKALI IDRISSI",    monthly: 140, garage: false },
  { no: 4,  owner: "BALBOUL LAHCEN",        monthly: 140, garage: false },
  { no: 5,  owner: "IDRISSI MOKHTAR",       monthly: 140, garage: false },
  { no: 6,  owner: "HICHAM MANSOUR",        monthly: 140, garage: false },
  { no: 7,  owner: "BENJELLOUN AMINE",      monthly: 130, garage: false },
  { no: 8,  owner: "CHERKAOUI MOHAMED",     monthly: 140, garage: false },
  { no: 9,  owner: "HIMDI FAROUK",          monthly: 140, garage: false },
  { no: 10, owner: "BENHAMMOU MOHAMED",     monthly: 140, garage: false },
  { no: 11, owner: "BOUFOUS KHALID",        monthly: 130, garage: false },
  { no: 12, owner: "EL OUARCHITI MOHAMED",  monthly: 140, garage: false },
  { no: 13, owner: "HéritiersBENKARACHE",   monthly: 140, garage: true  }, // garage column shows 150 => garage exists
  { no: 14, owner: "Mme CHERKAOUI",         monthly: 140, garage: false },
  { no: 15, owner: "ALOU IHLUCINE",         monthly: 130, garage: false },
  { no: 16, owner: "Madame LATRACH",        monthly: 140, garage: false },
  { no: 17, owner: "LAZRAK",                monthly: 140, garage: false },
  { no: 18, owner: "KEZZOULI ABDELGHANI",   monthly: 140, garage: false },
  { no: 19, owner: "YOUSFI SANAE",          monthly: 130, garage: false },
  { no: 20, owner: "CHBANI KACEM",          monthly: 140, garage: false },
];

function aptRef(no) {
  return `APT-${String(no).padStart(2, "0")}`;
}
function garageRef(no) {
  return `APT-${String(no).padStart(2, "0")}-G`;
}

async function main() {
  console.log("Seeding Building 1...");

  // (Optional) Clean existing data to re-run safely
  // If you don't want to delete existing data, comment this block.
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.monthlyDue.deleteMany({});
  await prisma.ownership.deleteMany({});

  // Delete units of this building + building itself if it exists
  const existingBuilding = await prisma.building.findFirst({ where: { name: BUILDING_NAME } });
  if (existingBuilding) {
    await prisma.unit.deleteMany({ where: { buildingId: existingBuilding.id } });
    await prisma.building.delete({ where: { id: existingBuilding.id } });
  }

  // Also delete owners that match these names (to avoid duplicates)
  await prisma.owner.deleteMany({
    where: { name: { in: apartments.map((a) => a.owner) } },
  });

  // Create building
  const building = await prisma.building.create({
    data: { name: BUILDING_NAME, address: null },
  });

  // Create apartments + owners + ownerships (+ garages if needed)
  for (const a of apartments) {
    const owner = await prisma.owner.create({
      data: { name: a.owner, email: null, phone: null },
    });

    const apartment = await prisma.unit.create({
      data: {
        reference: aptRef(a.no),
        type: "APARTMENT",
        buildingId: building.id,
        monthlyDueAmount: a.monthly,
        // if your schema has isActive, keep it true; if not, Prisma will ignore unknown fields at compile time
        isActive: true,
      },
    });

    await prisma.ownership.create({
      data: { ownerId: owner.id, unitId: apartment.id, startDate: new Date() },
    });

    if (a.garage) {
      const g = await prisma.unit.create({
        data: {
          reference: garageRef(a.no),
          type: "GARAGE",
          buildingId: building.id,
          parentUnitId: apartment.id,
          monthlyDueAmount: 50,
          isActive: true,
        },
      });

      await prisma.ownership.create({
        data: { ownerId: owner.id, unitId: g.id, startDate: new Date() },
      });
    }
  }

  console.log(" Seed completed:", BUILDING_NAME);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
