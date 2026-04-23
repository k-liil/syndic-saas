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

  // 1.4 Fetch essential data for target period calculation
  const [existingDues, receipts] = await Promise.all([
    tx.monthlyDue.findMany({
      where: { unitId, organizationId },
      select: { id: true, period: true, amountDue: true },
    }),
    tx.receipt.findMany({
      where: { unitId, organizationId, type: ReceiptType.CONTRIBUTION },
      orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      select: {
        id: true,
        amount: true,
        unallocatedAmount: true,
        receiptNumber: true,
        date: true,
      },
    }),
  ]);

  const now = new Date();
  const lastReceipt = receipts.length > 0 ? receipts[receipts.length - 1] : null;
  const lastDue = existingDues.length > 0 ? existingDues.reduce((prev: any, current: any) => (prev.period > current.period) ? prev : current) : null;
  
  const lastTargetDate = [
    lastReceipt?.date,
    lastDue?.period,
    now
  ].filter(Boolean).reduce((prev: any, current: any) => (prev! > current!) ? prev : current);

  // Ensure we go to the first of the month
  const targetPeriod = new Date(
    Date.UTC(lastTargetDate!.getUTCFullYear(), lastTargetDate!.getUTCMonth(), 1),
  );

  // New logic: Check if we should project further into the future to allow for "Advances"
  const totalMoneyAvailable = receipts.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const maxSafeFuture = new Date();
  maxSafeFuture.setUTCFullYear(maxSafeFuture.getUTCFullYear() + 2);

  let cursor = new Date(startPeriod);
  let createdCount = 0;
  let updatedCount = 0;
  const duesToCreate: any[] = [];
  const duesToUpdate: { id: string; amountDue: number }[] = [];

  // We keep tracking total dues generated to see if we've covered the available money
  let totalDuesAmount = 0;
  const pastDuesAmount = existingDues
    .filter((d: any) => new Date(d.period) < startPeriod)
    .reduce((sum: number, d: any) => sum + Number(d.amountDue), 0);
  totalDuesAmount = pastDuesAmount;

  while (
    cursor <= targetPeriod || 
    (totalDuesAmount < totalMoneyAvailable && cursor <= maxSafeFuture)
  ) {
    const { amount, frequency } = getApplicableContribution(
      unit as any,
      cursor,
      settings as any,
      globalPeriods,
    );

    const isDueMonth = 
      frequency === "MONTHLY" || 
      cursor.getUTCMonth() === startPeriod.getUTCMonth();

    if (amount > 0 && isDueMonth) {
      totalDuesAmount += amount;
      const existing = existingDues.find((d: any) => {
        const dDate = new Date(d.period);
        return (
          dDate.toISOString().slice(0, 7) === cursor.toISOString().slice(0, 7)
        );
      });

      if (existing) {
        if (Number(existing.amountDue) !== amount) {
          duesToUpdate.push({ id: existing.id, amountDue: amount });
        }
      } else {
        duesToCreate.push({
          organizationId,
          unitId,
          period: new Date(cursor),
          amountDue: amount,
          paidAmount: 0,
          status: DueStatus.UNPAID,
        });
      }
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

  if (duesToUpdate.length > 0) {
    for (const update of duesToUpdate) {
      await tx.monthlyDue.update({
        where: { id: update.id },
        data: { amountDue: update.amountDue },
      });
      updatedCount++;
    }
  }

  log(`Bilan des dettes : ${createdCount} créées, ${updatedCount} mises à jour (tarifs modifiés).`);

  // 1.5 Fetch current dues and receipts for reallocation (with all fields needed)
  const [completeDues, completeReceipts] = await Promise.all([
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

  log(`Trouvé ${completeDues.length} dettes et ${completeReceipts.length} reçus pour ce lot.`);

  const allocations: { receiptId: string; dueId: string; amount: number }[] = [];

  const workingDues = completeDues.map((d: any) => ({
    id: d.id,
    amountDue: Number(d.amountDue),
    paidAmount: 0,
    initialPaidAmount: Number(d.paidAmount),
    initialStatus: d.status,
  }));

  const workingReceipts = completeReceipts.map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    unallocatedAmount: 0,
    initialUnallocatedAmount: Number(r.unallocatedAmount),
    receiptNumber: r.receiptNumber,
  }));

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
      log(`Reçu #${wr.receiptNumber} alloue ${allocationAmount} DH à la dette de ${d.amountDue} DH (ID: ${d.id.slice(-6)}...).`);
    }
    wr.unallocatedAmount = remaining;
    if (remaining > 0) {
      log(`Reçu #${wr.receiptNumber} a un solde non alloué (AVANCE) de ${remaining} DH.`);
    }
  }

  const dueUpdatesNeeded = workingDues.filter((d: any) => {
    const currentStatus = d.paidAmount >= d.amountDue ? DueStatus.PAID : d.paidAmount > 0 ? DueStatus.PARTIAL : DueStatus.UNPAID;
    return d.paidAmount !== d.initialPaidAmount || currentStatus !== d.initialStatus;
  });

  const receiptUpdatesNeeded = workingReceipts.filter((r: any) => r.unallocatedAmount !== r.initialUnallocatedAmount);

  const dbOps: Promise<any>[] = [];
  if (allocations.length > 0) dbOps.push(tx.receiptAllocation.createMany({ data: allocations }));

  dueUpdatesNeeded.forEach((d: any) => {
    const status = d.paidAmount >= d.amountDue ? DueStatus.PAID : d.paidAmount > 0 ? DueStatus.PARTIAL : DueStatus.UNPAID;
    dbOps.push(tx.monthlyDue.update({ where: { id: d.id }, data: { paidAmount: d.paidAmount, status } }));
  });

  receiptUpdatesNeeded.forEach((r: any) => {
    dbOps.push(tx.receipt.update({ where: { id: r.id }, data: { unallocatedAmount: r.unallocatedAmount } }));
  });

  if (dbOps.length > 0) await Promise.all(dbOps);
  log(`--- Fin du recalcul FIFO avec succès ---`);
}
