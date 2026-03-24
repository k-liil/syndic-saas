import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Mise à jour des organisations...\n");

  const ORG1_NAME = "Cité Intellak II";
  const ORG1_SLUG = "cit-intellak-ii";
  
  const ORG2_NAME = "Les jardins de Bouznika";
  const ORG2_SLUG = "jardins-bouznika";

  const SUPER_ADMIN_EMAIL = "super@syndic.local";

  const SUPER_ADMIN = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
    include: { organizations: true },
  });

  if (!SUPER_ADMIN) {
    console.error("❌ Super Admin non trouvé");
    return;
  }

  console.log(`✅ Super Admin trouvé: ${SUPER_ADMIN.email}`);
  console.log(`   Organisations actuelles: ${SUPER_ADMIN.organizations.length}`);

  let org1 = await prisma.organization.findUnique({ where: { slug: ORG1_SLUG } });
  let org2 = await prisma.organization.findUnique({ where: { slug: ORG2_SLUG } });

  if (!org1) {
    org1 = await prisma.organization.create({
      data: { name: ORG1_NAME, slug: ORG1_SLUG, isActive: true },
    });
    console.log(`✅ Organisation 1 créée: ${ORG1_NAME}`);
  } else {
    await prisma.organization.update({
      where: { id: org1.id },
      data: { name: ORG1_NAME, isActive: true },
    });
    console.log(`✅ Organisation 1 mise à jour: ${ORG1_NAME}`);
  }

  if (!org2) {
    org2 = await prisma.organization.create({
      data: { name: ORG2_NAME, slug: ORG2_SLUG, isActive: true },
    });
    console.log(`✅ Organisation 2 créée: ${ORG2_NAME}`);
  } else {
    await prisma.organization.update({
      where: { id: org2.id },
      data: { name: ORG2_NAME, isActive: true },
    });
    console.log(`✅ Organisation 2 mise à jour: ${ORG2_NAME}`);
  }

  const existingOrgIds = SUPER_ADMIN.organizations.map((uo) => uo.organizationId);
  
  if (!existingOrgIds.includes(org1.id)) {
    await prisma.userOrganization.create({
      data: { userId: SUPER_ADMIN.id, organizationId: org1.id, role: "ADMIN" },
    });
    console.log(`✅ Super Admin ajouté à: ${ORG1_NAME}`);
  } else {
    console.log(`⏩ Super Admin déjà dans: ${ORG1_NAME}`);
  }

  if (!existingOrgIds.includes(org2.id)) {
    await prisma.userOrganization.create({
      data: { userId: SUPER_ADMIN.id, organizationId: org2.id, role: "ADMIN" },
    });
    console.log(`✅ Super Admin ajouté à: ${ORG2_NAME}`);
  } else {
    console.log(`⏩ Super Admin déjà dans: ${ORG2_NAME}`);
  }

  const allOrgs = await prisma.organization.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { units: true, owners: true } } },
  });

  console.log("\n📋 Organisations actives:");
  for (const org of allOrgs) {
    const hasAccess = existingOrgIds.includes(org.id) || [org1.id, org2.id].includes(org.id);
    console.log(`   - ${org.name} (${org.slug}) - ${org._count.units} lots, ${org._count.owners} propriétaires ${hasAccess ? "✓" : ""}`);
  }

  console.log("\n🎉 Mise à jour terminée!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
