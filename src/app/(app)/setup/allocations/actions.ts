"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { reallocateUnitContributions } from "@/lib/allocation";
import { ReceiptType, DueStatus } from "@prisma/client";

export async function getUnitAuditData(orgId: string, unitId: string) {
  try {
    const gate = await requireManager();
    if (!gate.ok || !orgId || !unitId)
      return { ok: false, error: "Non autorisé" };

    const [unit, dues, receipts, allocations] = await Promise.all([
      prisma.unit.findUnique({
        where: { id: unitId },
        include: { building: true },
      }),
      prisma.monthlyDue.findMany({
        where: { unitId, organizationId: orgId },
        orderBy: { period: "asc" },
      }),
      prisma.receipt.findMany({
        where: {
          unitId,
          organizationId: orgId,
          type: ReceiptType.CONTRIBUTION,
        },
        orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      }),
      prisma.receiptAllocation.findMany({
        where: {
          receipt: {
            unitId,
            organizationId: orgId,
            type: ReceiptType.CONTRIBUTION,
          },
        },
        include: {
          receipt: {
            select: { receiptNumber: true, date: true, amount: true },
          },
        },
      }),
    ]);

    return {
      ok: true,
      data: {
        unit,
        dues: dues.map((d) => ({
          ...d,
          amountDue: Number(d.amountDue),
          paidAmount: Number(d.paidAmount),
        })),
        receipts: receipts.map((r) => ({
          ...r,
          amount: Number(r.amount),
          unallocatedAmount: Number(r.unallocatedAmount),
        })),
        allocations: allocations.map((a) => ({
          ...a,
          amount: Number(a.amount),
        })),
      },
    };
  } catch (error) {
    console.error("Audit fetch failed:", error);
    return { ok: false, error: String(error) };
  }
}

export async function deleteReceiptAndReallocate(receiptId: string) {
  const logs: string[] = [];
  const log = (msg: string) =>
    logs.push(`[${new Date().toISOString()}] ${msg}`);

  try {
    const gate = await requireManager();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      select: { unitId: true, organizationId: true, receiptNumber: true },
    });

    if (!receipt || !receipt.unitId) {
      log("ERREUR: Reçu introuvable");
      return { ok: false, error: "Reçu introuvable", logs };
    }

    const unitId = receipt.unitId;
    log(
      `Demande de suppression du Reçu #${receipt.receiptNumber} pour l'unité ${unitId}`,
    );

    await prisma.$transaction(async (tx) => {
      // Deleting receipt cascades to allocations in schema?
      // Let's check schema again. Cascade is on Organization, not necessarily on Receipt -> Allocation.
      // In schema: receipt Receipt @relation(fields: [receiptId], references: [id])
      // No explicit onDelete: Cascade in schema for ReceiptAllocation. Let's delete manually to be safe.

      const deletedAllocations = await tx.receiptAllocation.deleteMany({
        where: { receiptId },
      });
      log(
        `Suppression de ${deletedAllocations.count} allocations existantes pour ce reçu...`,
      );

      log(`Lancement de l'allocation FIFO (le reçu est conservé)...`);
      await reallocateUnitContributions(
        tx,
        unitId,
        receipt.organizationId,
        logs,
      );
    });

    log(`Action terminée.`);
    revalidatePath("/setup/allocations");
    return { ok: true, logs };
  } catch (error) {
    log(`ERREUR: ${String(error)}`);
    console.error("Delete & Reallocate failed:", error);
    return { ok: false, error: String(error), logs };
  }
}

export async function forceRecalculateUnit(unitId: string, orgId: string) {
  const logs: string[] = [];
  const log = (msg: string) =>
    logs.push(`[${new Date().toISOString()}] ${msg}`);

  try {
    const gate = await requireManager();
    if (!gate.ok) return { ok: false, error: "Non autorisé" };

    log(`Démarrage du forçage de recalcul pour le lot ${unitId}...`);
    await prisma.$transaction(async (tx) => {
      await reallocateUnitContributions(tx, unitId, orgId, logs);
    });

    log(`Action terminée.`);
    revalidatePath("/setup/allocations");
    return { ok: true, logs };
  } catch (error) {
    log(`ERREUR: ${String(error)}`);
    console.error("Force recalculate failed:", error);
    return { ok: false, error: String(error), logs };
  }
}
