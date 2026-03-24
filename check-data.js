const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const orgs = await p.organization.findMany({ select: { id: true, name: true, slug: true }});
  console.log("Orgs:");
  console.table(orgs);
  
  for (const org of orgs) {
    const buildings = await p.building.findMany({ where: { organizationId: org.id }});
    console.log(`\n--- Buildings for ${org.name} ---`);
    console.log(buildings.map(b => b.name).join(', '));
  }
}
main().finally(() => p.$disconnect());
