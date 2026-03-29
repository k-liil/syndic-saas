"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";
import { reallocateUnitContributions } from "@/lib/allocation";

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

export async function repairAllDues() {
  try {
    console.log("[MAINTENANCE] Starting system-wide dues repair...");

    // 1. Get ALL organizations
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });

    for (const org of orgs) {
      console.log(`[MAINTENANCE] Repairing: ${org.name}`);

      const allAllocations = await prisma.receiptAllocation.findMany({
        where: { receipt: { organizationId: org.id } },
        select: { dueId: true, amount: true }
      });

      const totalsByDue = new Map<string, number>();
      for (const alloc of allAllocations) {
        const current = totalsByDue.get(alloc.dueId) || 0;
        totalsByDue.set(alloc.dueId, current + Number(alloc.amount));
      }

      const allDues = await prisma.monthlyDue.findMany({
        where: { organizationId: org.id },
        select: { id: true, amountDue: true, paidAmount: true, status: true }
      });

      const updates: any[] = [];
      for (const due of allDues) {
        const totalAllocated = totalsByDue.get(due.id) || 0;
        const amountDue = Number(due.amountDue);
        
        let expectedStatus = 'UNPAID';
        if (totalAllocated >= amountDue) {
          expectedStatus = 'PAID';
        } else if (totalAllocated > 0) {
          expectedStatus = 'PARTIAL';
        }

        if (Number(due.paidAmount) !== totalAllocated || due.status !== expectedStatus) {
          updates.push(
            prisma.monthlyDue.update({
              where: { id: due.id },
              data: {
                paidAmount: totalAllocated,
                status: expectedStatus as any
              }
            })
          );
        }
      }

      console.log(`[MAINTENANCE] Found ${updates.length} fixes for ${org.name}`);

      // Batch updates
      const BATCH_SIZE = 100;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(batch);
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("Maintenance repair failed:", error);
    return { ok: false, error: String(error) };
  }
}

export async function searchUnitsInOrg(orgId: string, q: string) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok || !orgId) return [];

    const units = await prisma.unit.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { lotNumber: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        building: true,
      },
      take: 20,
    });

    return units.map((u) => ({
      id: u.id,
      lotNumber: u.lotNumber,
      reference: u.reference,
      buildingName: u.building?.name || "Sans bâtiment",
    }));
  } catch (error) {
    console.error("Unit search failed:", error);
    return [];
  }
}

export async function getOrganizations() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return [];

    return await prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return [];
  }
}

export async function reallocateUnitsFIFO(unitIds: string[]) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    console.log(`[MAINTENANCE] Starting FIFO reallocation for ${unitIds.length} units...`);

    for (const unitId of unitIds) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { organizationId: true, lotNumber: true },
      });

      if (!unit) continue;

      console.log(`[MAINTENANCE] Recalculating Unit: ${unit.lotNumber}`);

      await prisma.$transaction(
        async (tx) => {
          await reallocateUnitContributions(tx, unitId, unit.organizationId);
        },
        { timeout: 30000, maxWait: 10000 }
      );
    }

    revalidatePath("/setup/maintenance");
    return { ok: true };
  } catch (error) {
    console.error("FIFO Reallocation failed:", error);
    return { ok: false, error: String(error) };
  }
}
