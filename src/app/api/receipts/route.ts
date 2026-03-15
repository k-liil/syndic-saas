import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { DueStatus } from "@prisma/client";

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonthsUTC(period: Date, months: number) {
  return new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + months, 1)
  );
}

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function toISODate(d: Date) {
  return new Date(d).toISOString();
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));

  const type = asString(searchParams.get("type")).trim();
  const rawYear = searchParams.get("year");
  const year = rawYear ? Number(rawYear) : null;
  const buildingId = asString(searchParams.get("buildingId")).trim();
  const ownerId = asString(searchParams.get("ownerId")).trim();
  const q = asString(searchParams.get("q")).trim();
  const method = asString(searchParams.get("method")).trim();

  const skip = (page - 1) * pageSize;

  const where: any = {
    organizationId: gate.organizationId,
  };

if (type) where.type = type;
if (year && Number.isFinite(year)) {
  where.date = {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}
if (buildingId) where.buildingId = buildingId;
if (ownerId) where.ownerId = ownerId;
if (method) where.method = method;

  if (q) {
    where.OR = [
      { note: { contains: q, mode: "insensitive" } },
      { bankName: { contains: q, mode: "insensitive" } },
      { bankRef: { contains: q, mode: "insensitive" } },
      { owner: { name: { contains: q, mode: "insensitive" } } },
      { owner: { cin: { contains: q, mode: "insensitive" } } },
      { building: { name: { contains: q, mode: "insensitive" } } },
      { unit: { lotNumber: { contains: q, mode: "insensitive" } } },
      { unit: { reference: { contains: q, mode: "insensitive" } } },
    ];
  }

const [items, total, totalAllAgg, totalCashAgg, totalTransferAgg, totalCheckAgg] =
  await prisma.$transaction([
    prisma.receipt.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ date: "desc" }, { receiptNumber: "desc" }],
      select: {
        id: true,
        receiptNumber: true,
        date: true,
        amount: true,
        method: true,
        note: true,
        bankName: true,
        bankRef: true,
        unallocatedAmount: true,
        owner: { select: { id: true, name: true, cin: true } },
        building: { select: { id: true, name: true } },
        unit: {
          select: { id: true, lotNumber: true, reference: true, type: true },
        },
      },
    }),
    prisma.receipt.count({ where }),
    prisma.receipt.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.receipt.aggregate({
      where: {
        ...where,
        method: "CASH",
      },
      _sum: { amount: true },
    }),
    prisma.receipt.aggregate({
      where: {
        ...where,
        method: "TRANSFER",
      },
      _sum: { amount: true },
    }),
    prisma.receipt.aggregate({
      where: {
        ...where,
        method: "CHECK",
      },
      _sum: { amount: true },
    }),
  ]);

return NextResponse.json({
  items: items.map((item) => ({
    ...item,
    amount: Number(item.amount ?? 0),
    unallocatedAmount: Number(item.unallocatedAmount ?? 0),
  })),
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  },
  totals: {
    all: Number(totalAllAgg._sum.amount ?? 0),
    cash: Number(totalCashAgg._sum.amount ?? 0),
    transfer: Number(totalTransferAgg._sum.amount ?? 0),
    check: Number(totalCheckAgg._sum.amount ?? 0),
  },
});

  return NextResponse.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = await req.json();

    const unitId = asString(body.unitId);
    const lotNumber = asString(body.lotNumber);

    const amount = Number(body.amount);
    const method = asString(body.method);
    const date = body.date ? new Date(body.date) : new Date();

    const note = asString(body.note).trim();
    const type = asString(body.type) || "CONTRIBUTION";

    const bankName = asString(body.bankName).trim();
    const checkNumber = asString(body.checkNumber).trim();

    if ((!unitId && !lotNumber) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid receipt payload" }, { status: 400 });
    }

    if (!["CASH", "TRANSFER", "CHECK"].includes(method)) {
      return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    }

    if ((method === "TRANSFER" || method === "CHECK") && !bankName) {
      return NextResponse.json(
        { error: "Bank required for transfer or check" },
        { status: 400 }
      );
    }

    if (method === "CHECK" && !checkNumber) {
      return NextResponse.json(
        { error: "Check number required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const unit = unitId
        ? await tx.unit.findFirst({
            where: { id: unitId, organizationId: gate.organizationId },
            select: {
              organizationId: true,
              id: true,
              lotNumber: true,
              buildingId: true,
              monthlyDueAmount: true,
              reference: true,
            },
          })
        : await tx.unit.findFirst({
            where: { lotNumber, organizationId: gate.organizationId },
            select: {
              organizationId: true,
              id: true,
              lotNumber: true,
              buildingId: true,
              monthlyDueAmount: true,
              reference: true,
            },
          });

      if (!unit) {
        throw new Error("Unit not found");
      }

      if (!unit.buildingId) {
        throw new Error("Unit has no building");
      }

      const ownership = await tx.ownership.findFirst({
        where: {
          organizationId: gate.organizationId,
          unitId: unit.id,
          endDate: null,
        },
        select: {
          ownerId: true,
        },
      });

      if (!ownership) {
        throw new Error("No active owner for this unit");
      }

      const ownerId = ownership.ownerId;

      const settings = await tx.appSettings.findFirst({
        where: { organizationId: gate.organizationId },
      });
      const startYear = settings?.startYear ?? 2026;
      const startMonth = settings?.startMonth ?? 1;
      const receiptStartNumber = settings?.receiptStartNumber ?? 1;

      const lastReceipt = await tx.receipt.findFirst({
        where: { organizationId: gate.organizationId },
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });

      let nextNumber: number;

      if (!lastReceipt) {
        nextNumber = receiptStartNumber;
      } else if (lastReceipt.receiptNumber < receiptStartNumber) {
        nextNumber = receiptStartNumber;
      } else {
        nextNumber = lastReceipt.receiptNumber + 1;
      }

      const startPeriod = new Date(Date.UTC(startYear, startMonth - 1, 1));
      const receiptPeriod = firstDayOfMonth(date);

      /* créer automatiquement l'exercice fiscal si nécessaire */
const fiscalYear = date.getUTCFullYear();

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

      const fee = unit.monthlyDueAmount ?? null;
      const MAX_FUTURE_MONTHS = 240;

      const receipt = await tx.receipt.create({
        data: {
          organizationId: gate.organizationId,
          receiptNumber: nextNumber,
          type,
          ownerId,
          buildingId: unit.buildingId,
          unitId: unit.id,
          amount,
          method: method as any,
          date,
          note: note || null,
          bankName: bankName || null,
          bankRef: checkNumber || null,
          unallocatedAmount: 0,
        },
        select: {
          id: true,
          receiptNumber: true,
        },
      });

      async function ensureDue(period: Date) {
        if (!fee || fee <= 0) return;

        await tx.monthlyDue.createMany({
          data: [
            {
              organizationId: gate.organizationId,
              unitId: unit.id,
              period,
              amountDue: fee,
              paidAmount: 0,
              status: DueStatus.UNPAID,
            },
          ],
          skipDuplicates: true,
        });
      }

      if (fee && fee > 0) {
        let cursor = startPeriod;
        while (cursor.getTime() <= receiptPeriod.getTime()) {
          await ensureDue(cursor);
          cursor = addMonthsUTC(cursor, 1);
        }
      }

      let remaining = amount;
      let futureOffset = 0;

      while (remaining > 0 && futureOffset <= MAX_FUTURE_MONTHS) {
        const dues = await tx.monthlyDue.findMany({
          where: {
            organizationId: gate.organizationId,
            unitId: unit.id,
            status: { in: [DueStatus.UNPAID, DueStatus.PARTIAL] },
            period: { gte: startPeriod },
          },
          orderBy: [{ period: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            amountDue: true,
            paidAmount: true,
            period: true,
          },
        });

        for (const due of dues) {
          if (remaining <= 0) break;

          const remainingDue = due.amountDue - due.paidAmount;
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

          const newPaidAmount = due.paidAmount + allocationAmount;

          await tx.monthlyDue.update({
            where: { id: due.id },
            data: {
              paidAmount: newPaidAmount,
              status:
                newPaidAmount >= due.amountDue
                  ? DueStatus.PAID
                  : DueStatus.PARTIAL,
            },
          });

          remaining -= allocationAmount;
        }

        if (remaining <= 0) break;

        futureOffset += 1;

        if (!fee || fee <= 0) break;

        const futurePeriod = addMonthsUTC(receiptPeriod, futureOffset);
        await ensureDue(futurePeriod);
      }

      if (remaining > 0) {
        await tx.receipt.update({
          where: { id: receipt.id },
          data: { unallocatedAmount: remaining },
        });
      }

      const allocs = await tx.receiptAllocation.findMany({
        where: { receiptId: receipt.id },
        select: {
          amount: true,
          due: {
            select: {
              period: true,
            },
          },
        },
        orderBy: {
          due: {
            period: "asc",
          },
        },
      });

      const periods = allocs.map((a) => a.due.period);
      const firstAllocated = periods[0] ?? null;
      const lastAllocated = periods.length
        ? periods[periods.length - 1]
        : null;

      return {
        ok: true,
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        unitRef: unit.reference,
        lotNumber: unit.lotNumber,
        receiptPeriod: toISODate(receiptPeriod),
        firstAllocatedPeriod: firstAllocated
          ? toISODate(firstAllocated)
          : null,
        lastAllocatedPeriod: lastAllocated
          ? toISODate(lastAllocated)
          : null,
        monthsTouched: new Set(
          periods.map((p) => p.toISOString().slice(0, 7))
        ).size,
        unallocatedAmount: remaining,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message ?? "Receipt failed" },
      { status: 500 }
    );
  }
}
