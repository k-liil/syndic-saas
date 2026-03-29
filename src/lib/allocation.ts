import { Prisma, PrismaClient, DueStatus, ReceiptType } from "@prisma/client";

/**
 * Completely recalculates all `ReceiptAllocation` for a given unit based on FIFO logic.
 * This ensures that if a receipt is deleted or inserted out of order, 
 * the oldest unpaid dues are always satisfied first.
 */
export async function reallocateUnitContributions(
  tx: any, 
  unitId: string,
  organizationId: string
) {
  if (!unitId || !organizationId) return;

  // 1. Wipe existing allocations for this unit's contribution receipts
  await tx.receiptAllocation.deleteMany({
    where: {
      receipt: {
        unitId,
        organizationId,
        type: ReceiptType.CONTRIBUTION,
      },
    },
  });

  // 2. Reset all internal MonthlyDue tracking to 0 paid
  await tx.monthlyDue.updateMany({
    where: { unitId, organizationId },
    data: { paidAmount: 0, status: DueStatus.UNPAID },
  });

  // 3. Fetch all Dues (Obligations) for this unit chronologically
  const dues = await tx.monthlyDue.findMany({
    where: { unitId, organizationId },
    orderBy: { period: "asc" },
  });

  // 4. Fetch all Receipts (Payments) for this unit chronologically
  const receipts = await tx.receipt.findMany({
    where: { unitId, organizationId, type: ReceiptType.CONTRIBUTION },
    orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
  });

  const allocations: { receiptId: string; dueId: string; amount: number }[] = [];
  
  // Create a mutable working copy of due statuses
  const workingDues = dues.map((d: any) => ({
    id: d.id,
    amountDue: Number(d.amountDue),
    paidAmount: Number(d.paidAmount), // initially 0
  }));

  // 5. FIFO Logic: apply each receipt to the earliest unpaid dues
  for (const receipt of receipts) {
    let remaining = Number(receipt.amount);

    for (const d of workingDues) {
      if (remaining <= 0) break;

      const dueTotal = d.amountDue;
      const currentlyPaid = d.paidAmount;
      const deficit = dueTotal - currentlyPaid;

      if (deficit <= 0) continue; // Due is already fully paid off

      // Calculate how much to allocate to the due
      const allocationAmount = remaining >= deficit ? deficit : remaining;

      d.paidAmount += allocationAmount;
      remaining -= allocationAmount;

      allocations.push({
        receiptId: receipt.id,
        dueId: d.id,
        amount: allocationAmount,
      });
    }

    // Keep track of what's left over
    await tx.receipt.update({
      where: { id: receipt.id },
      data: { unallocatedAmount: remaining },
    });
  }

  // 6. Build final allocations
  if (allocations.length > 0) {
    await tx.receiptAllocation.createMany({
      data: allocations,
    });
  }

  // 7. Save final statuses of dues
  for (const d of workingDues) {
    const status = d.paidAmount <= 0 ? DueStatus.UNPAID : d.paidAmount >= d.amountDue ? DueStatus.PAID : DueStatus.PARTIAL;
    await tx.monthlyDue.update({
      where: { id: d.id },
      data: { paidAmount: d.paidAmount, status },
    });
  }
}
