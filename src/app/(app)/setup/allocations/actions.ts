"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { reallocateUnitContributions } from "@/lib/allocation";
import { ReceiptType, DueStatus } from "@prisma/client";

export async function getUnitAuditData(orgId: string, unitId: string) {
  try {
    const gate = await requireManager();
    if (!gate.ok || !orgId || !unitId) return { ok: false, error: "Non autorisé" };

    const [unit, dues, receipts, allocations] = await Promise.all([
      prisma.unit.findUnique({
        where: { id: unitId },
        include: { building: true }
      }),
      prisma.monthlyDue.findMany({
        where: { unitId, organizationId: orgId },
        orderBy: { period: "asc" }
      }),
      prisma.receipt.findMany({
        where: { unitId, organizationId: orgId, type: ReceiptType.CONTRIBUTION },
        orderBy: [{ date: "asc" }, { receiptNumber: "asc" }]
      }),
      prisma.receiptAllocation.findMany({
        where: {
          receipt: { unitId, organizationId: orgId, type: ReceiptType.CONTRIBUTION }
        },
        include: {
          receipt: {
            select: { receiptNumber: true, date: true, amount: true }
          }
        }
      })
    ]);

    return {
      ok: true,
      data: {
        unit,
        dues: dues.map(d => ({
          ...d,
          amountDue: Number(d.amountDue),
          paidAmount: Number(d.paidAmount)
        })),
        receipts: receipts.map(r => ({
          ...r,
          amount: Number(r.amount),
          unallocatedAmount: Number(r.unallocatedAmount)
        })),
        allocations: allocations.map(a => ({
          ...a,
          amount: Number(a.amount)
        }))
      }
    };
  } catch (error) {
    console.error("Audit fetch failed:", error);
    return { ok: false, error: String(error) };
  }
}

export async function deleteReceiptAndReallocate(receiptId: string) {
  try {
    const gate = await requireManager();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      select: { unitId: true, organizationId: true, receiptNumber: true }
    });

    if (!receipt || !receipt.unitId) return { ok: false, error: "Reçu introuvable" };

    console.log(`[AUDIT] Deleting Receipt #${receipt.receiptNumber} and reallocating Unit ${receipt.unitId}`);

    await prisma.$transaction(async (tx) => {
      // Deleting receipt cascades to allocations in schema? 
      // Let's check schema again. Cascade is on Organization, not necessarily on Receipt -> Allocation.
      // In schema: receipt Receipt @relation(fields: [receiptId], references: [id])
      // No explicit onDelete: Cascade in schema for ReceiptAllocation. Let's delete manually to be safe.
      
      await tx.receiptAllocation.deleteMany({
        where: { receiptId }
      });

      await tx.receipt.delete({
        where: { id: receiptId }
      });

      // Recalculate FIFO
      await reallocateUnitContributions(tx, receipt.unitId!, receipt.organizationId);
    });

    revalidatePath("/setup/allocations");
    return { ok: true };
  } catch (error) {
    console.error("Delete & Reallocate failed:", error);
    return { ok: false, error: String(error) };
  }
}

export async function forceRecalculateUnit(unitId: string, orgId: string) {
  try {
    const gate = await requireManager();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    await prisma.$transaction(async (tx) => {
      await reallocateUnitContributions(tx, unitId, orgId);
    });

    revalidatePath("/setup/allocations");
    return { ok: true };
  } catch (error) {
    console.error("Force recalculate failed:", error);
    return { ok: false, error: String(error) };
  }
}
