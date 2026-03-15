import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { DueStatus, PaymentMethod, ReceiptType } from "@prisma/client";

type Row = {
  lotNumber: string;
  amount: number;
  method?: string;
  date?: string;
  note?: string;
};

type Body =
  | { action: "start"; totalRows: number }
  | {
      action: "batch";
      jobId: string;
      rows: Row[];
      offset?: number;
      isLastBatch?: boolean;
    };

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUTC(period: Date, months: number) {
  return new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + months, 1)
  );
}

function parseMethod(value?: string): PaymentMethod {
  const method = (value ?? "CASH").trim().toUpperCase();

  if (method === "TRANSFER") return PaymentMethod.TRANSFER;
  if (method === "CHECK") return PaymentMethod.CHECK;
  return PaymentMethod.CASH;
}

async function processInParallel<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number
) {
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    await Promise.all(slice.map(worker));
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await req.json()) as Body;

  if (body.action === "start") {
    const job = await prisma.importJob.create({
      data: {
        organizationId: gate.organizationId,
        type: "receipts",
        totalRows: body.totalRows,
        processed: 0,
        status: "processing",
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      totalRows: job.totalRows,
      processed: job.processed,
    });
  }

  const job = await prisma.importJob.findUnique({
    where: { id: body.jobId },
  });

  if (!job || job.organizationId !== gate.organizationId) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  let imported = 0;
  const errors: { row: number; error: string }[] = [];

  const lotNumbers = Array.from(
    new Set(
      body.rows
        .map((row) => row.lotNumber?.trim())
        .filter((lotNumber): lotNumber is string => Boolean(lotNumber))
    )
  );

  const units = await prisma.unit.findMany({
    where: {
      lotNumber: {
        in: lotNumbers,
      },
      organizationId: gate.organizationId,
    },
    select: {
      id: true,
      lotNumber: true,
      buildingId: true,
      monthlyDueAmount: true,
    },
  });

  const unitsByLotNumber = new Map<string, (typeof units)[number]>();

  for (const unit of units) {
    if (unit.lotNumber) {
      unitsByLotNumber.set(unit.lotNumber, unit);
    }
  }

  const ownerships = await prisma.ownership.findMany({
    where: {
      unitId: {
        in: units.map((unit) => unit.id),
      },
      organizationId: gate.organizationId,
      endDate: null,
    },
    select: {
      unitId: true,
      ownerId: true,
    },
  });

  const ownershipByUnitId = new Map(
    ownerships.map((ownership) => [ownership.unitId, ownership])
  );

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: gate.organizationId },
    select: {
      startYear: true,
      startMonth: true,
      receiptStartNumber: true,
    },
  });

  const startYear = settings?.startYear ?? 2026;
  const startMonth = settings?.startMonth ?? 1;
  const receiptStartNumber = settings?.receiptStartNumber ?? 1;
  const startPeriod = new Date(Date.UTC(startYear, startMonth - 1, 1));

  const lastReceipt = await prisma.receipt.findFirst({
    where: { organizationId: gate.organizationId },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });

  let nextReceiptNumber = !lastReceipt
    ? receiptStartNumber
    : lastReceipt.receiptNumber < receiptStartNumber
    ? receiptStartNumber
    : lastReceipt.receiptNumber + 1;
  const validRows: Array<{
    row: Row;
    rowNo: number;
    unit: (typeof units)[number];
    ownership: { unitId: string; ownerId: string };
    amount: number;
    receiptDate: Date;
    method: PaymentMethod;
    note: string;
    receiptNumber: number;
  }> = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowNo = (body.offset ?? 0) + i + 2;
    const unit = unitsByLotNumber.get(row.lotNumber?.trim());

    if (!unit) {
      errors.push({
        row: rowNo,
        error: `Lot ${row.lotNumber} : lot introuvable`,
      });
      continue;
    }

    if (!unit.buildingId) {
      errors.push({
        row: rowNo,
        error: `Lot ${row.lotNumber} : aucun immeuble lie`,
      });
      continue;
    }

    const ownership = ownershipByUnitId.get(unit.id);
    if (!ownership) {
      errors.push({
        row: rowNo,
        error: `Lot ${row.lotNumber} : aucun proprietaire actif`,
      });
      continue;
    }

    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({
        row: rowNo,
        error: `Lot ${row.lotNumber} : montant invalide`,
      });
      continue;
    }

    const receiptDate = row.date ? new Date(row.date) : new Date();
    if (Number.isNaN(receiptDate.getTime())) {
      errors.push({
        row: rowNo,
        error: `Lot ${row.lotNumber} : date invalide`,
      });
      continue;
    }

    validRows.push({
      row,
      rowNo,
      unit,
      ownership,
      amount,
      receiptDate,
      method: parseMethod(row.method),
      note: (row.note ?? "").trim(),
      receiptNumber: nextReceiptNumber,
    });

    nextReceiptNumber += 1;
  }

  const rowsByUnit = new Map<string, typeof validRows>();
  for (const item of validRows) {
    const current = rowsByUnit.get(item.unit.id) ?? [];
    current.push(item);
    rowsByUnit.set(item.unit.id, current);
  }

  const groups = Array.from(rowsByUnit.values());

  await processInParallel(
    groups,
    async (group) => {
      for (const item of group) {
        try {
          await prisma.$transaction(async (tx) => {
            const receiptPeriod = firstDayOfMonth(item.receiptDate);
            const fiscalYear = item.receiptDate.getUTCFullYear();
            const fee = Number(item.unit.monthlyDueAmount ?? 0);
            const maxFutureMonths = 240;

            await tx.fiscalYear.upsert({
              where: {
                organizationId_year: {
                  organizationId: gate.organizationId,
                  year: fiscalYear,
                },
              },
              update: {},
              create: {
                organizationId: gate.organizationId,
                year: fiscalYear,
                startsAt: new Date(Date.UTC(fiscalYear, 0, 1)),
                endsAt: new Date(Date.UTC(fiscalYear, 11, 31)),
              },
            });

            const receipt = await tx.receipt.create({
              data: {
                receiptNumber: item.receiptNumber,
                organizationId: gate.organizationId,
                type: ReceiptType.CONTRIBUTION,
                ownerId: item.ownership.ownerId,
                buildingId: item.unit.buildingId,
                unitId: item.unit.id,
                amount: item.amount,
                method: item.method,
                date: item.receiptDate,
                note: item.note || null,
                bankName: null,
                bankRef: null,
                unallocatedAmount: 0,
              },
              select: {
                id: true,
              },
            });

            async function ensureDue(period: Date) {
              if (fee <= 0) return;

              await tx.monthlyDue.createMany({
                data: [
                  {
                    unitId: item.unit.id,
                    organizationId: gate.organizationId,
                    period,
                    amountDue: fee,
                    paidAmount: 0,
                    status: DueStatus.UNPAID,
                  },
                ],
                skipDuplicates: true,
              });
            }

            if (fee > 0) {
              let cursor = startPeriod;
              while (cursor.getTime() <= receiptPeriod.getTime()) {
                await ensureDue(cursor);
                cursor = addMonthsUTC(cursor, 1);
              }
            }

            let remaining = item.amount;
            let futureOffset = 0;

            while (remaining > 0 && futureOffset <= maxFutureMonths) {
              const dues = await tx.monthlyDue.findMany({
                where: {
                  unitId: item.unit.id,
                  organizationId: gate.organizationId,
                  status: { in: [DueStatus.UNPAID, DueStatus.PARTIAL] },
                  period: { gte: startPeriod },
                },
                orderBy: [{ period: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  amountDue: true,
                  paidAmount: true,
                },
              });

              for (const due of dues) {
                if (remaining <= 0) break;

                const remainingDue = Number(due.amountDue) - Number(due.paidAmount);
                if (remainingDue <= 0) continue;

                const allocationAmount =
                  remaining >= remainingDue ? remainingDue : remaining;

                await tx.receiptAllocation.create({
                  data: {
                    receiptId: receipt.id,
                    dueId: due.id,
                    amount: allocationAmount,
                  },
                });

                const newPaidAmount = Number(due.paidAmount) + allocationAmount;
                const amountDue = Number(due.amountDue);

                await tx.monthlyDue.update({
                  where: { id: due.id },
                  data: {
                    paidAmount: newPaidAmount,
                    status:
                      newPaidAmount >= amountDue
                        ? DueStatus.PAID
                        : DueStatus.PARTIAL,
                  },
                });

                remaining -= allocationAmount;
              }

              if (remaining <= 0) break;

              futureOffset += 1;

              if (fee <= 0) break;

              const futurePeriod = addMonthsUTC(receiptPeriod, futureOffset);
              await ensureDue(futurePeriod);
            }

            if (remaining > 0) {
              await tx.receipt.update({
                where: { id: receipt.id },
                data: { unallocatedAmount: remaining },
              });
            }
          }, {
            maxWait: 10000,
            timeout: 60000,
          });

          imported += 1;
        } catch (error: any) {
          errors.push({
            row: item.rowNo,
            error: error?.message ?? "Import failed",
          });
        }
      }
    },
    4
  );

  const processed = job.processed + body.rows.length;

  const updated = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      processed,
      status: body.isLastBatch ? "done" : "processing",
    },
  });

  return NextResponse.json({
    ok: true,
    imported,
    errors,
    processed: updated.processed,
    totalRows: updated.totalRows,
    status: updated.status,
  });
}
