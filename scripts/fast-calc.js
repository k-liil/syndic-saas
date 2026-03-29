const { PrismaClient, DueStatus, ReceiptType } = require("@prisma/client");

const prisma = new PrismaClient();

function firstDayOfMonth(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUTC(period, months) {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + months, 1));
}

function getMonthlyContributionAmount(annualAmount) {
  const normalized = Number(annualAmount ?? 0);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }
  return normalized / 12;
}

function periodKey(period) {
  return period.toISOString().slice(0, 10);
}

function buildContributionStartPeriod(ownerContributionStartAt, settingsStartYear, settingsStartMonth) {
  if (ownerContributionStartAt) {
    return firstDayOfMonth(new Date(ownerContributionStartAt));
  }
  return new Date(Date.UTC(settingsStartYear, (settingsStartMonth ?? 1) - 1, 1));
}

function ensurePeriodsUntil(periods, startPeriod, targetPeriod, fee) {
  if (periods.length === 0) {
    periods.push({
      period: new Date(startPeriod),
      amountDue: fee,
      paidAmount: 0,
    });
  }

  let cursor = new Date(periods[periods.length - 1].period);
  while (cursor.getTime() < targetPeriod.getTime()) {
    cursor = addMonthsUTC(cursor, 1);
    periods.push({
      period: new Date(cursor),
      amountDue: fee,
      paidAmount: 0,
    });
  }
}

async function main() {
  const orgName = process.argv.slice(2).join(" ").trim() || "Les Jardins de Cherrat";

  const org = await prisma.organization.findFirst({
    where: { name: orgName },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organisation introuvable: ${orgName}`);
  }

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: org.id },
  });

  if (!settings || settings.contributionType !== "GLOBAL_FIXED") {
    throw new Error(`Invalid settings type for ${org.name}`);
  }

  const monthlyFee = getMonthlyContributionAmount(settings.globalFixedAmount);
  if (monthlyFee <= 0) {
    throw new Error(`Montant mensuel invalide pour ${org.name}`);
  }

  const receipts = await prisma.receipt.findMany({
    where: {
      organizationId: org.id,
      type: ReceiptType.CONTRIBUTION,
    },
    orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
    select: {
      id: true,
      amount: true,
      date: true,
      unitId: true,
      receiptNumber: true,
    },
  });

  const units = await prisma.unit.findMany({
    where: { organizationId: org.id },
    include: {
      ownerships: {
        where: { endDate: null },
        select: { startDate: true }
      }
    }
  });

  console.log(`Processing ${units.length} units for ${org.name}...`);

  console.log("Cleaning old data...");
  await prisma.receiptAllocation.deleteMany({
    where: {
      receipt: { organizationId: org.id, type: ReceiptType.CONTRIBUTION },
    },
  });

  await prisma.monthlyDue.deleteMany({
    where: { organizationId: org.id },
  });

  const receiptsByUnit = new Map();
  for (const receipt of receipts) {
    const list = receiptsByUnit.get(receipt.unitId) ?? [];
    list.push(receipt);
    receiptsByUnit.set(receipt.unitId, list);
  }

  const now = new Date();
  const currentTarget = firstDayOfMonth(now);

  const allDuesToCreate = [];
  const allocationsToProcess = [];
  const receiptUpdatesToProcess = [];

  for (const unit of units) {
    const unitId = unit.id;
    const unitReceipts = receiptsByUnit.get(unitId) ?? [];
    const periods = [];
    const allocations = [];

    const ownerStartDate = unit.ownerships[0]?.startDate;
    const startPeriod = buildContributionStartPeriod(
      ownerStartDate,
      settings.startYear,
      settings.startMonth,
    );

    // Ensure we have dues at least until now (or the latest receipt)
    let maxTarget = currentTarget;
    for (const r of unitReceipts) {
      const rDate = firstDayOfMonth(new Date(r.date));
      if (rDate > maxTarget) maxTarget = rDate;
    }

    ensurePeriodsUntil(periods, startPeriod, maxTarget, monthlyFee);

    for (const receipt of unitReceipts) {
      let remaining = Number(receipt.amount);

      while (remaining > 0) {
        const due = periods.find((item) => item.paidAmount < item.amountDue);

        if (!due) {
          const nextPeriod =
            periods.length > 0
              ? addMonthsUTC(periods[periods.length - 1].period, 1)
              : new Date(startPeriod);

          periods.push({
            period: nextPeriod,
            amountDue: monthlyFee,
            paidAmount: 0,
          });
          continue;
        }

        const remainingDue = due.amountDue - due.paidAmount;
        const allocationAmount = remaining >= remainingDue ? remainingDue : remaining;

        due.paidAmount += allocationAmount;
        remaining -= allocationAmount;

        allocations.push({
          receiptId: receipt.id,
          unitId,
          periodKey: periodKey(due.period),
          amount: allocationAmount,
        });
      }

      receiptUpdatesToProcess.push({
        id: receipt.id,
        unallocatedAmount: remaining,
      });
    }

    const mergedPeriods = Array.from(
      periods.reduce((map, due) => {
        const key = periodKey(due.period);
        const existing = map.get(key);
        if (existing) {
          existing.paidAmount = Math.min(existing.amountDue, existing.paidAmount + due.paidAmount);
          return map;
        }

        map.set(key, { ...due });
        return map;
      }, new Map()).values(),
    ).sort((a, b) => a.period.getTime() - b.period.getTime());

    mergedPeriods.forEach(due => {
      allDuesToCreate.push({
        organizationId: org.id,
        unitId,
        period: due.period,
        amountDue: due.amountDue,
        paidAmount: due.paidAmount,
        status:
          due.paidAmount <= 0
            ? DueStatus.UNPAID
            : due.paidAmount >= due.amountDue
            ? DueStatus.PAID
            : DueStatus.PARTIAL,
      });
    });

    allocationsToProcess.push(...allocations);
  }

  console.log(`Creating ${allDuesToCreate.length} dues...`);
  // createMany is possible!
  await prisma.monthlyDue.createMany({
    data: allDuesToCreate
  });

  // Now we need the IDs to map allocations. Fetch all dues back!
  const createdDues = await prisma.monthlyDue.findMany({
    where: { organizationId: org.id },
    select: { id: true, unitId: true, period: true }
  });

  const dueIdMap = new Map();
  createdDues.forEach(d => {
    dueIdMap.set(`${d.unitId}_${periodKey(d.period)}`, d.id);
  });

  const finalAllocations = allocationsToProcess.map(alloc => ({
    receiptId: alloc.receiptId,
    dueId: dueIdMap.get(`${alloc.unitId}_${alloc.periodKey}`),
    amount: alloc.amount
  }));

  console.log(`Creating ${finalAllocations.length} allocations...`);
  // chunk allocations safely if needed
  const chunkSize = 5000;
  for (let i = 0; i < finalAllocations.length; i += chunkSize) {
      await prisma.receiptAllocation.createMany({
        data: finalAllocations.slice(i, i + chunkSize)
      });
  }

  // Updates receipts
  console.log(`Updating ${receiptUpdatesToProcess.length} receipts...`);
  for (const r of receiptUpdatesToProcess) {
    await prisma.receipt.update({
      where: { id: r.id },
      data: { unallocatedAmount: r.unallocatedAmount }
    });
  }

  console.log("Done!");
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
