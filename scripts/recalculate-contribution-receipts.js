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

function buildContributionStartPeriod(unitOverride, settings) {
  if (unitOverride?.overrideStart && unitOverride.startYear && unitOverride.startMonth) {
    return new Date(Date.UTC(unitOverride.startYear, unitOverride.startMonth - 1, 1));
  }

  const startYear = settings?.startYear ?? new Date().getUTCFullYear();
  const startMonth = settings?.startMonth ?? 1;
  return new Date(Date.UTC(startYear, startMonth - 1, 1));
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
    select: {
      startYear: true,
      startMonth: true,
      globalFixedAmount: true,
      contributionType: true,
    },
  });

  if (!settings) {
    throw new Error(`Parametres introuvables pour ${org.name}`);
  }

  if (settings.contributionType !== "GLOBAL_FIXED") {
    throw new Error(`Le script gere seulement GLOBAL_FIXED. Type actuel: ${settings.contributionType}`);
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
    orderBy: [{ unitId: "asc" }, { date: "asc" }, { receiptNumber: "asc" }],
    select: {
      id: true,
      amount: true,
      date: true,
      unitId: true,
      receiptNumber: true,
      unit: {
        select: {
          overrideStart: true,
          startYear: true,
          startMonth: true,
          ownerships: {
            where: {
              endDate: null,
            },
            select: {
              startDate: true,
            },
          },
        },
      },
    },
  });

  await prisma.receiptAllocation.deleteMany({
    where: {
      receipt: {
        organizationId: org.id,
        type: ReceiptType.CONTRIBUTION,
      },
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

  let processedUnits = 0;
  let processedReceipts = 0;

  for (const [unitId, unitReceipts] of receiptsByUnit.entries()) {
    const periods = [];
    const allocations = [];
    const receiptUpdates = [];

    for (const receipt of unitReceipts) {
      const receiptPeriod = firstDayOfMonth(new Date(receipt.date));
      const startPeriod = buildContributionStartPeriod(
        receipt.unit,
        settings
      );
      ensurePeriodsUntil(periods, startPeriod, receiptPeriod, monthlyFee);

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
          periodKey: periodKey(due.period),
          amount: allocationAmount,
        });
      }

      receiptUpdates.push({
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

        map.set(key, {
          period: due.period,
          amountDue: due.amountDue,
          paidAmount: Math.min(due.amountDue, due.paidAmount),
        });
        return map;
      }, new Map()).values(),
    ).sort((a, b) => a.period.getTime() - b.period.getTime());

    await prisma.$transaction(async (tx) => {
      const createdDues = [];

      for (const due of mergedPeriods) {
        const created = await tx.monthlyDue.upsert({
          where: {
            organizationId_unitId_period: {
              organizationId: org.id,
              unitId,
              period: due.period,
            },
          },
          update: {
            amountDue: due.amountDue,
            paidAmount: due.paidAmount,
            status:
              due.paidAmount <= 0
                ? DueStatus.UNPAID
                : due.paidAmount >= due.amountDue
                ? DueStatus.PAID
                : DueStatus.PARTIAL,
          },
          create: {
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
          },
          select: {
            id: true,
            period: true,
          },
        });

        createdDues.push(created);
      }

      const dueIdByPeriod = new Map(
        createdDues.map((item) => [periodKey(item.period), item.id]),
      );

      if (allocations.length > 0) {
        await tx.receiptAllocation.createMany({
          data: allocations.map((allocation) => ({
            receiptId: allocation.receiptId,
            dueId: dueIdByPeriod.get(allocation.periodKey),
            amount: allocation.amount,
          })),
        });
      }

      for (const receiptUpdate of receiptUpdates) {
        await tx.receipt.update({
          where: { id: receiptUpdate.id },
          data: { unallocatedAmount: receiptUpdate.unallocatedAmount },
        });
      }
    }, {
      maxWait: 10000,
      timeout: 120000,
    });

    processedUnits += 1;
    processedReceipts += unitReceipts.length;

    if (processedUnits % 20 === 0) {
      console.log(`Processed units ${processedUnits}/${receiptsByUnit.size} | receipts ${processedReceipts}/${receipts.length}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        organization: org.name,
        receiptCount: receipts.length,
        unitCount: receiptsByUnit.size,
        monthlyFee,
        processedUnits,
        processedReceipts,
      },
      null,
      2,
    ),
  );
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
