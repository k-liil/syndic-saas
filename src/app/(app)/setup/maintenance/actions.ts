"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function togglePrismaLogging(enabled: boolean) {
  try {
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: { prismaLogging: enabled },
      create: { id: "global", prismaLogging: enabled },
    });

    const globalForPrisma = globalThis as any;
    globalForPrisma.isPrismaLoggingEnabled = enabled;

    revalidatePath("/setup/maintenance");
    return { ok: true };
  } catch (error) {
    console.error("Failed to toggle Prisma logging:", error);
    return { ok: false, error: String(error) };
  }
}
