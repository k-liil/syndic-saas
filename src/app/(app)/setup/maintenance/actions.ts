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

export async function getFiscalYearsAudit() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        settings: {
          select: { startYear: true }
        },
        fiscalYears: {
          orderBy: { year: "desc" }
        }
      }
    });

    const auditData: any[] = [];

    for (const org of orgs) {
      const startYear = org.settings[0]?.startYear || 2026;
      
      for (const fy of org.fiscalYears) {
        // Count dependencies for this year
        const start = fy.startsAt;
        const end = fy.endsAt;

        const [receiptCount, otherReceiptCount, paymentCount, dueCount] = await Promise.all([
          prisma.receipt.count({
            where: { organizationId: org.id, date: { gte: start, lte: end } }
          }),
          prisma.otherReceipt.count({
            where: { organizationId: org.id, date: { gte: start, lte: end } }
          }),
          prisma.payment.count({
            where: { organizationId: org.id, date: { gte: start, lte: end } }
          }),
          prisma.monthlyDue.count({
            where: { organizationId: org.id, period: { gte: start, lte: end } }
          })
        ]);

        auditData.push({
          id: fy.id,
          orgId: org.id,
          orgName: org.name,
          year: fy.year,
          isStartYear: fy.year === startYear,
          receiptCount,
          otherReceiptCount,
          paymentCount,
          dueCount,
          isDeletable: receiptCount === 0 && otherReceiptCount === 0 && paymentCount === 0 && fy.year !== startYear
        });
      }
    }

    return { ok: true, data: auditData };
  } catch (error) {
    console.error("Fiscal year audit failed:", error);
    return { ok: false, error: String(error) };
  }
}

export async function deleteFiscalYearSafe(fyId: string) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    const fy = await prisma.fiscalYear.findUnique({
      where: { id: fyId },
      include: {
        organization: {
          include: { settings: true }
        }
      }
    });

    if (!fy) return { ok: false, error: "Exercice introuvable" };

    const startYear = fy.organization.settings[0]?.startYear || 2026;
    if (fy.year === startYear) {
      return { ok: false, error: "Impossible de supprimer l'exercice de démarrage de l'organisation." };
    }

    // Double check counts before deletion
    const [receiptCount, otherReceiptCount, paymentCount] = await Promise.all([
      prisma.receipt.count({
        where: { organizationId: fy.organizationId, date: { gte: fy.startsAt, lte: fy.endsAt } }
      }),
      prisma.otherReceipt.count({
        where: { organizationId: fy.organizationId, date: { gte: fy.startsAt, lte: fy.endsAt } }
      }),
      prisma.payment.count({
        where: { organizationId: fy.organizationId, date: { gte: fy.startsAt, lte: fy.endsAt } }
      })
    ]);

    if (receiptCount > 0 || otherReceiptCount > 0 || paymentCount > 0) {
      return { ok: false, error: "Cet exercice contient des données comptables et ne peut pas être supprimé." };
    }

    console.log(`[MAINTENANCE] Deleting Fiscal Year ${fy.year} for ${fy.organization.name}`);

    await prisma.$transaction(async (tx) => {
      // Delete associated MonthlyDues
      await tx.monthlyDue.deleteMany({
        where: {
          organizationId: fy.organizationId,
          period: { gte: fy.startsAt, lte: fy.endsAt }
        }
      });

      // Delete the fiscal year itself
      await tx.fiscalYear.delete({
        where: { id: fyId }
      });
    });

    revalidatePath("/setup/maintenance");
    return { ok: true };
  } catch (error) {
    console.error("Failed to delete fiscal year:", error);
    return { ok: false, error: String(error) };
  }
}
