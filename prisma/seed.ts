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

  console.log("Super Admin ready:", superAdminEmail);
  return superAdmin;
}

async function main() {
  console.log("Seed starting...");
  await seedSuperAdmin();
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
