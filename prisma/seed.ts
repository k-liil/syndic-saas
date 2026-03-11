import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

async function safeDeleteMany(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e: any) {
    if (e?.code === "P2021") return; // table does not exist
    if (String(e?.message || "").includes("does not exist")) return;
    throw e;
  }
}

async function seedAuthAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@syndic.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      isActive: true,
      passwordHash,
      name: "Admin",
    },
    create: {
      email: adminEmail,
      role: "ADMIN",
      isActive: true,
      passwordHash,
      name: "Admin",
    },
  });

  console.log("✅ Admin ready:", adminEmail);
}

async function main() {
  // Nettoyage soft (ignore si tables absentes)
  await safeDeleteMany(() => prisma.receiptAllocation.deleteMany());
  await safeDeleteMany(() => prisma.receipt.deleteMany());
  await safeDeleteMany(() => prisma.payment.deleteMany());
  await safeDeleteMany(() => prisma.monthlyDue.deleteMany());
  await safeDeleteMany(() => prisma.ownership.deleteMany());
  await safeDeleteMany(() => prisma.unit.deleteMany());
  await safeDeleteMany(() => prisma.owner.deleteMany());
  await safeDeleteMany(() => prisma.supplier.deleteMany());
  await safeDeleteMany(() => prisma.internalBank.deleteMany());
  await safeDeleteMany(() => prisma.fiscalYear.deleteMany());
  await safeDeleteMany(() => prisma.building.deleteMany());

  // 1) Auth
  await seedAuthAdmin();

  console.log("✅ Seed terminé");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });