import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureOrganizationAccountingPosts } from "../src/lib/accounting-post-defaults";

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "super@syndic.local";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash,
      name: "Super Admin",
    },
    create: {
      email: superAdminEmail,
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash,
      name: "Super Admin",
    },
  });

  console.log("Super Admin ready:", superAdminEmail);
  return superAdmin;
}

async function seedCherratOrg(superAdmin: { id: string }) {
  const org = await prisma.organization.upsert({
    where: { slug: "les-jardins-de-cherrat" },
    update: {
      name: "Les Jardins de Cherrat",
      address: "-Route cotiere Ouad Cherrat - Bouznika",
      city: "Bouznika",
      zipCode: "13100",
      email: "syndic.j.cherrat@gmail.com",
      phone: "0653545853",
      srmContact: "0653545853",
      rib: "230810466368922100540095",
      logoUrl: "/cherrat-logo.png",
    },
    create: {
      name: "Les Jardins de Cherrat",
      slug: "les-jardins-de-cherrat",
      address: "-Route cotiere Ouad Cherrat - Bouznika",
      city: "Bouznika",
      zipCode: "13100",
      email: "syndic.j.cherrat@gmail.com",
      phone: "0653545853",
      srmContact: "0653545853",
      rib: "230810466368922100540095",
      logoUrl: "/cherrat-logo.png",
      settings: {
        create: {
          brandName: "Les Jardins de Cherrat",
          contributionType: "GLOBAL_FIXED",
          globalFixedAmount: 0,
        },
      },
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: superAdmin.id,
        organizationId: org.id,
      },
    },
    update: { role: "ADMIN" },
    create: {
      userId: superAdmin.id,
      organizationId: org.id,
      role: "ADMIN",
    },
  });

  await ensureOrganizationAccountingPosts(prisma, org.id);

  console.log("Org 'Les Jardins de Cherrat' ready");
}

async function main() {
  console.log("Seed starting...");
  const superAdmin = await seedSuperAdmin();
  await seedCherratOrg(superAdmin);
  console.log("Seed completed!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
