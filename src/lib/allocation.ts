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

  // 2. Fetch all Dues (Obligations) and Receipts (Payments) chronologically
  const [dues, receipts] = await Promise.all([
    tx.monthlyDue.findMany({
      where: { unitId, organizationId },
      orderBy: { period: "asc" },
      select: { id: true, amountDue: true, paidAmount: true, status: true },
    }),
    tx.receipt.findMany({
      where: { unitId, organizationId, type: ReceiptType.CONTRIBUTION },
      orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      select: { id: true, amount: true, unallocatedAmount: true },
    }),
  ]);

  const allocations: { receiptId: string; dueId: string; amount: number }[] = [];
  
  // Create a mutable working copy of due statuses starting from 0 (re-allocating everything)
  const workingDues = dues.map((d: any) => ({
    id: d.id,
    amountDue: Number(d.amountDue),
    paidAmount: 0,
    initialPaidAmount: Number(d.paidAmount),
    initialStatus: d.status,
  }));

  const workingReceipts = receipts.map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    unallocatedAmount: 0,
    initialUnallocatedAmount: Number(r.unallocatedAmount),
  }));

  // 3. FIFO Logic: apply each receipt to the earliest unpaid dues
  for (const wr of workingReceipts) {
    let remaining = wr.amount;

    for (const d of workingDues) {
      if (remaining <= 0) break;

      const deficit = d.amountDue - d.paidAmount;
      if (deficit <= 0) continue;

      const allocationAmount = remaining >= deficit ? deficit : remaining;
      d.paidAmount += allocationAmount;
      remaining -= allocationAmount;

      allocations.push({
        receiptId: wr.id,
        dueId: d.id,
        amount: allocationAmount,
      });
    }
    wr.unallocatedAmount = remaining;
  }

  // 4. Batch Updates for Dues (Only on changes)
  const dueUpdates = workingDues
    .filter((d: any) => {
      const status = d.paidAmount >= d.amountDue ? DueStatus.PAID : d.paidAmount > 0 ? DueStatus.PARTIAL : DueStatus.UNPAID;
      return d.paidAmount !== d.initialPaidAmount || status !== d.initialStatus;
    })
    .map((d: any) => {
      const status = d.paidAmount >= d.amountDue ? DueStatus.PAID : d.paidAmount > 0 ? DueStatus.PARTIAL : DueStatus.UNPAID;
      return tx.monthlyDue.update({
        where: { id: d.id },
        data: { paidAmount: d.paidAmount, status },
      });
    });

  // 5. Batch Updates for Receipts (Only on changes)
  const receiptUpdates = workingReceipts
    .filter((r: any) => r.unallocatedAmount !== r.initialUnallocatedAmount)
    .map((r: any) => tx.receipt.update({
      where: { id: r.id },
      data: { unallocatedAmount: r.unallocatedAmount },
    }));

  // 6. Execute all updates and create allocations
  if (allocations.length > 0) {
    await tx.receiptAllocation.createMany({ data: allocations });
  }

  // Run all updates in parallel (within the current transaction)
  if (dueUpdates.length > 0 || receiptUpdates.length > 0) {
    await Promise.all([...dueUpdates, ...receiptUpdates]);
  }

  console.log(`[ALLOCATION] Recalculation complete for Unit ${unitId}. ${allocations.length} allocations, ${dueUpdates.length} due updates, ${receiptUpdates.length} receipt updates.`);
}
