import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  return superAdmin;
}

async function seedOrganizations() {
  console.log("Seeding organizations and settings...");

  // 1. Les Jardins de Cherrat
  const cherratId = "cmn1l60dv0001nucwyt4tcbef";
  await prisma.organization.upsert({
    where: { id: cherratId },
    update: { name: "Les Jardins de Cherrat", slug: "cherrat" },
    create: { id: cherratId, name: "Les Jardins de Cherrat", slug: "cherrat" },
  });

  await prisma.appSettings.upsert({
    where: { organizationId: cherratId },
    update: {
      brandName: "Les Jardins de Cherrat",
      startYear: 2024,
      startMonth: 1,
      receiptStartNumber: 10000,
      receiptUsePrefix: true,
      receiptPrefix: "E",
      paymentStartNumber: 10000,
      paymentUsePrefix: true,
      paymentPrefix: "P",
      openingBankBalance: 139541,
      contributionType: "GLOBAL_FIXED",
      globalFixedAmount: 6000,
    },
    create: {
      organizationId: cherratId,
      brandName: "Les Jardins de Cherrat",
      startYear: 2024,
      startMonth: 1,
      receiptStartNumber: 10000,
      receiptUsePrefix: true,
      receiptPrefix: "E",
      paymentStartNumber: 10000,
      paymentUsePrefix: true,
      paymentPrefix: "P",
      openingBankBalance: 139541,
      contributionType: "GLOBAL_FIXED",
      globalFixedAmount: 6000,
    },
  });

  await prisma.internalBank.upsert({
    where: { id: "cmn1vbly20001nuj05kzhe9su" },
    update: { name: "CIH Bank", isActive: true },
    create: {
      id: "cmn1vbly20001nuj05kzhe9su",
      organizationId: cherratId,
      name: "CIH Bank",
      isActive: true,
    },
  });

  // 2. Cité Intellak II
  const intellakId = "cmmyv5nxi0002num0zk6du1ki";
  await prisma.organization.upsert({
    where: { id: intellakId },
    update: { name: "Cité Intellak II", slug: "intellak" },
    create: { id: intellakId, name: "Cité Intellak II", slug: "intellak" },
  });

  await prisma.appSettings.upsert({
    where: { organizationId: intellakId },
    update: {
      brandName: "Cité Intellak II",
      startYear: 2024,
      startMonth: 1,
      globalFixedAmount: 140,
    },
    create: {
      organizationId: intellakId,
      brandName: "Cité Intellak II",
      startYear: 2024,
      startMonth: 1,
      globalFixedAmount: 140,
    },
  });
}

async function seedPagePermissions() {
  console.log("Seeding page visibility permissions...");
  
  const pages = [
    { href: "/setup/suppliers", manager: true },
    { href: "/setup/accounting-posts", manager: true },
    { href: "/setup/settings", manager: true },
    { href: "/setup/units", manager: true },
  ];

  for (const page of pages) {
    await prisma.pageVisibilitySetting.updateMany({
      where: { href: page.href },
      data: {
        admin: page.manager,
        manager: page.manager,
        operator: page.manager,
      },
    });
  }
}

async function main() {
  console.log("Seed starting...");
  await seedSuperAdmin();
  await seedOrganizations();
  await seedPagePermissions();
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
