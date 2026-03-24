const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const units = await p.unit.findMany({
    where: { organization: { slug: 'les-jardins-de-cherrat' } },
    take: 10,
    include: { building: true }
  });
  console.table(units.map(u => ({
    lotNumber: u.lotNumber,
    reference: u.reference,
    building: u.building?.name,
    floor: u.floor
  })));
}
main().finally(() => p.$disconnect());
