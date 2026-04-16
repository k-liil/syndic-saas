import { DueStatus, ReceiptType } from "@prisma/client";
import { buildContributionStartPeriod, getApplicableContribution } from "./contribution-engine";

/**
 * Completely recalculates all `ReceiptAllocation` for a given unit based on FIFO logic.
 * This ensures that if a receipt is deleted or inserted out of order,
 * the oldest unpaid dues are always satisfied first.
 */
export async function reallocateUnitContributions(
  tx: any,
  unitId: string,
  organizationId: string,
  logger?: string[],
) {
  if (!unitId || !organizationId) return;

  const log = (msg: string) => {
    if (logger) logger.push(`[${new Date().toISOString()}] ${msg}`);
  };

  log(`--- Début du recalcul FIFO pour le lot ${unitId} ---`);

  // 1. Fetch all dependencies for sync
  const [unit, settings, globalPeriods] = await Promise.all([
    tx.unit.findUnique({
      where: { id: unitId },
      include: {
        groupUnits: {
          include: {
            group: {
              include: {
                periods: { orderBy: { startPeriod: "desc" } },
              },
            },
          },
        },
        contributionPeriods: { orderBy: { startPeriod: "desc" } },
      },
    }),
    tx.appSettings.findFirst({
      where: { organizationId },
    }),
    tx.contributionPeriod.findMany({
      where: {
        organizationId,
        contributionType: "GLOBAL_FIXED",
        groupId: null,
        unitId: null,
      },
      orderBy: { startPeriod: "asc" },
    }),
  ]);

  if (!unit || !settings) {
    log(`ERREUR: Lot ou paramètres introuvables.`);
    return;
  }

  // 1.2 Determine valid period
  const startPeriod = buildContributionStartPeriod(unit, settings);
  const startPeriodISO = startPeriod.toISOString();
  log(`Période de début effective : ${startPeriodISO.slice(0, 7)}`);

  // 1. Wipe ALL existing allocations for this unit's contribution receipts
  // This MUST happen before cleaning up monthly dues to avoid foreign key violations.
  await tx.receiptAllocation.deleteMany({
    where: {
      receipt: {
        unitId,
        organizationId,
        type: ReceiptType.CONTRIBUTION,
      },
    },
  });
  log(`Suppression des anciennes allocations terminées.`);

  // 1.3 Cleanup invalid dues (before start date)
  const deleteRes = await tx.monthlyDue.deleteMany({
    where: {
      unitId,
      organizationId,
      period: { lt: startPeriod },
    },
  });
  if (deleteRes.count > 0) {
    log(`Supprimé ${deleteRes.count} dettes hors-période (avant la date de début).`);
  }

  // 1.4 Generate missing dues if needed (up to last receipt or today)
  const lastReceipt = await tx.receipt.findFirst({
    where: { unitId, organizationId, type: ReceiptType.CONTRIBUTION },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const now = new Date();
  const lastTargetDate =
    lastReceipt?.date && lastReceipt.date > now ? lastReceipt.date : now;
  // Ensure we go to the first of the month
  const targetPeriod = new Date(
    Date.UTC(lastTargetDate.getUTCFullYear(), lastTargetDate.getUTCMonth(), 1),
  );

  let cursor = new Date(startPeriod);
  let createdCount = 0;
  const duesToCreate: any[] = [];

  while (cursor <= targetPeriod) {
    const { amount } = getApplicableContribution(
      unit as any,
      cursor,
      settings as any,
      globalPeriods,
    );
    if (amount > 0) {
      duesToCreate.push({
        organizationId,
        unitId,
        period: new Date(cursor),
        amountDue: amount,
        paidAmount: 0,
        status: DueStatus.UNPAID,
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  if (duesToCreate.length > 0) {
    const res = await tx.monthlyDue.createMany({
      data: duesToCreate,
      skipDuplicates: true,
    });
    createdCount = res.count;
  }
  log(`Généré ${createdCount} dettes mensuelles manquantes (batch).`);

  // 1.5 Fetch current dues and receipts for reallocation

  const [dues, receipts] = await Promise.all([
    tx.monthlyDue.findMany({
      where: { unitId, organizationId },
      orderBy: { period: "asc" },
      select: { id: true, amountDue: true, paidAmount: true, status: true },
    }),
    tx.receipt.findMany({
      where: { unitId, organizationId, type: ReceiptType.CONTRIBUTION },
      orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      select: {
        id: true,
        amount: true,
        unallocatedAmount: true,
        receiptNumber: true,
      },
    }),
  ]);

  log(`Trouvé ${dues.length} dettes et ${receipts.length} reçus pour ce lot.`);

  const allocations: { receiptId: string; dueId: string; amount: number }[] =
    [];

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
    receiptNumber: r.receiptNumber,
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
      log(
        `Reçu #${wr.receiptNumber} alloue ${allocationAmount} DH à la dette de ${d.amountDue} DH (ID: ${d.id.slice(-6)}...). Restant dû: ${deficit - allocationAmount} DH.`,
      );
    }
    wr.unallocatedAmount = remaining;
    if (remaining > 0) {
      log(
        `Reçu #${wr.receiptNumber} a un solde non alloué (AVANCE) de ${remaining} DH.`,
      );
    }
  }

  // 4. Batch Updates for Dues (Only on changes)
  const dueUpdatesNeeded = workingDues.filter((d: any) => {
    const currentStatus =
      d.paidAmount >= d.amountDue
        ? DueStatus.PAID
        : d.paidAmount > 0
          ? DueStatus.PARTIAL
          : DueStatus.UNPAID;
    return (
      d.paidAmount !== d.initialPaidAmount || currentStatus !== d.initialStatus
    );
  });

  // 5. Batch Updates for Receipts (Only on changes)
  const receiptUpdatesNeeded = workingReceipts.filter(
    (r: any) => r.unallocatedAmount !== r.initialUnallocatedAmount,
  );

  console.time(`[ALLOCATION] DB Updates for ${unitId}`);
  log(
    `Préparation des mises à jour: ${dueUpdatesNeeded.length} dettes modifiées, ${receiptUpdatesNeeded.length} reçus modifiés, ${allocations.length} nouvelles allocations à insérer.`,
  );

  // 6. Execute all updates and create allocations
  const dbOps: Promise<any>[] = [];

  if (allocations.length > 0) {
    dbOps.push(tx.receiptAllocation.createMany({ data: allocations }));
  }

  // Collect Dues updates in parallel
  dueUpdatesNeeded.forEach((d: any) => {
    const status =
      d.paidAmount >= d.amountDue
        ? DueStatus.PAID
        : d.paidAmount > 0
          ? DueStatus.PARTIAL
          : DueStatus.UNPAID;
    dbOps.push(
      tx.monthlyDue.update({
        where: { id: d.id },
        data: { paidAmount: d.paidAmount, status },
      }),
    );
  });

  // Collect Receipts updates in parallel
  receiptUpdatesNeeded.forEach((r: any) => {
    dbOps.push(
      tx.receipt.update({
        where: { id: r.id },
        data: { unallocatedAmount: r.unallocatedAmount },
      }),
    );
  });

  // Run all DB operations in parallel within the same transaction
  if (dbOps.length > 0) {
    await Promise.all(dbOps);
  }

  console.timeEnd(`[ALLOCATION] DB Updates for ${unitId}`);
  log(`--- Fin du recalcul FIFO avec succès ---`);
}
