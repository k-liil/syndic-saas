import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { DueStatus, PaymentMethod, ReceiptType } from "@prisma/client";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { getMonthlyContributionAmount } from "@/lib/contribution-amounts";
import { buildContributionStartPeriod } from "@/lib/contribution-start";
import { reallocateUnitContributions } from "@/lib/allocation";

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
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 }, totals: { all: 0, cash: 0, transfer: 0, check: 0 } });
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));

  const rawType = asString(searchParams.get("type")).trim();
  const rawYear = searchParams.get("year");
  const year = rawYear ? Number(rawYear) : null;
  const rawMonth = searchParams.get("month");
  const month = rawMonth ? Number(rawMonth) : null; // 1-12
  const buildingId = asString(searchParams.get("buildingId")).trim();
  const unitId = asString(searchParams.get("unitId")).trim();
  const ownerId = asString(searchParams.get("ownerId")).trim();
  const q = asString(searchParams.get("q")).trim();
  const method = asString(searchParams.get("method")).trim();
  const sortDir = (searchParams.get("sortDir") === "asc" ? "asc" : "desc") as "asc" | "desc";

  const skip = (page - 1) * pageSize;

  const where: any = {
    organizationId: orgId!,
  };

if (Object.values(ReceiptType).includes(rawType as ReceiptType)) {
  where.type = rawType as ReceiptType;
}
if (year && Number.isFinite(year)) {
  if (month && Number.isFinite(month) && month >= 1 && month <= 12) {
    // Filtrer sur un mois précis
    where.date = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    };
  } else {
    // Filtrer sur toute l'année
    where.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }
}
if (buildingId) where.buildingId = buildingId;
if (unitId) where.unitId = unitId;
if (ownerId) where.ownerId = ownerId;
if (method) where.method = method;

  if (q) {
    const conditions: any[] = [];
    const unitFields = ["lotNumber", "reference"];
    const otherFields = [
      { note: true },
      { bankName: true },
      { bankRef: true },
      { owner: ["name", "cin"] },
      { building: ["name"] },
    ];

    const getCondition = (field: string, term: string, mode: "startsWith" | "endsWith" | "contains" | "equals", path: string[] = []) => {
      let obj: any = { [mode]: term, mode: "insensitive" };
      let current = obj;
      
      // Build nested object if path exists
      const fullPath = [...path, field];
      const result: any = {};
      let pointer = result;
      for (let i = 0; i < fullPath.length - 1; i++) {
        pointer[fullPath[i]] = {};
        pointer = pointer[fullPath[i]];
      }
      pointer[fullPath[fullPath.length - 1]] = { [mode]: term, mode: "insensitive" };
      return result;
    };

    const buildConditions = (term: string, mode: "startsWith" | "endsWith" | "contains" | "equals") => {
      const results: any[] = [];
      unitFields.forEach(f => results.push(getCondition(f, term, mode, ["unit"])));
      results.push(getCondition("note", term, mode));
      results.push(getCondition("bankName", term, mode));
      results.push(getCondition("bankRef", term, mode));
      results.push(getCondition("name", term, mode, ["owner"]));
      results.push(getCondition("cin", term, mode, ["owner"]));
      results.push(getCondition("name", term, mode, ["building"]));
      return results;
    };

    if (q.startsWith("*") && q.endsWith("*")) {
      const term = q.slice(1, -1);
      if (term) conditions.push(...buildConditions(term, "contains"));
    } else if (q.endsWith("*")) {
      const term = q.slice(0, -1);
      if (term) conditions.push(...buildConditions(term, "startsWith"));
    } else if (q.startsWith("*")) {
      const term = q.slice(1);
      if (term) conditions.push(...buildConditions(term, "endsWith"));
    } else {
      conditions.push(...buildConditions(q, "equals"));
    }

    where.OR = conditions;
    console.log("[RECEIPTS] Search query:", q, "OR conditions count:", conditions.length);
  }

  console.log("[RECEIPTS] Fetching with where:", JSON.stringify(where, null, 2));

  // Skip aggregations if it's a specific modal request (unitId provided) to improve responsiveness
  if (unitId) {
     const items = await prisma.receipt.findMany({
       where,
       skip,
       take: pageSize,
       orderBy: [{ date: sortDir }, { receiptNumber: "desc" }],
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
         owner: { select: { id: true, name: true } },
         unit: { select: { id: true, lotNumber: true } }
       }
     });

     return NextResponse.json({
       items,
       pagination: { page, pageSize, total: items.length, totalPages: 1 },
       totals: { all: 0, cash: 0, transfer: 0, check: 0 }
     });
  }

  console.time(`[RECEIPTS_LIST] Parallel Queries ${orgId}`);

  const pItems = prisma.receipt.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: [{ date: sortDir }, { receiptNumber: "desc" }],
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
      owner: { select: { id: true, name: true, firstName: true, cin: true } },
      building: { select: { id: true, name: true } },
      unit: {
        select: { id: true, lotNumber: true, reference: true, type: true },
      },
      allocations: {
        select: {
          amount: true,
          due: {
            select: {
              period: true,
              status: true,
            },
          },
        },
        orderBy: {
          due: {
            period: "asc",
          },
        },
      },
    },
  });

  const pCount = prisma.receipt.count({ where });
  const pTotals = prisma.receipt.groupBy({
    where,
    by: ["method"],
    _sum: { amount: true },
    orderBy: { method: "asc" },
  });

  const [items, total, methodAgg] = await Promise.all([pItems, pCount, pTotals]);

  console.timeEnd(`[RECEIPTS_LIST] Parallel Queries ${orgId}`);

  const totals = {
    all: 0,
    cash: 0,
    transfer: 0,
    check: 0,
  };

  for (const m of methodAgg) {
    const amount = Number(m._sum?.amount ?? 0);
    totals.all += amount;
    if (m.method === "CASH") totals.cash = amount;
    if (m.method === "TRANSFER") totals.transfer = amount;
    if (m.method === "CHECK") totals.check = amount;
  }

  return NextResponse.json({
    items: items.map((item) => {
      const periods = item.allocations.map((a) => a.due.period);
      const isPartial = item.allocations.some((a) => a.due.status === "PARTIAL");

      return {
        ...item,
        amount: Number(item.amount ?? 0),
        unallocatedAmount: Number(item.unallocatedAmount ?? 0),
        firstPeriod: periods[0] ?? null,
        lastPeriod: periods[periods.length - 1] ?? null,
        isPartial,
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    totals,
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
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const unitId = asString(body.unitId);
    const lotNumber = asString(body.lotNumber);

    const amount = Number(body.amount);
    const method = asString(body.method);
    const date = body.date ? new Date(body.date) : new Date();

    const note = asString(body.note).trim();
    const type = Object.values(ReceiptType).includes(asString(body.type) as ReceiptType)
      ? (asString(body.type) as ReceiptType)
      : ReceiptType.CONTRIBUTION;

    const bankName = asString(body.bankName).trim();
    const checkNumber = asString(body.checkNumber).trim();

    if ((!unitId && !lotNumber) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid receipt payload" }, { status: 400 });
    }

    if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
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
            where: { id: unitId, organizationId: orgId! },
            select: {
              organizationId: true,
              id: true,
              lotNumber: true,
              buildingId: true,
              reference: true,
              overrideStart: true,
              startYear: true,
              startMonth: true,
            },
          })
        : await tx.unit.findFirst({
            where: { lotNumber, organizationId: orgId! },
            select: {
              organizationId: true,
              id: true,
              lotNumber: true,
              buildingId: true,
              reference: true,
              overrideStart: true,
              startYear: true,
              startMonth: true,
            },
          });

      if (!unit) {
        throw new Error("Unit not found");
      }

      if (!unit.buildingId) {
        throw new Error("Unit has no building");
      }

      const ensuredUnit = {
        ...unit,
        buildingId: unit.buildingId,
      };

      const ownership = await tx.ownership.findFirst({
        where: {
          organizationId: orgId!,
          unitId: unit.id,
          endDate: null,
        },
        select: {
          ownerId: true,
          startDate: true,
        },
      });

      if (!ownership) {
        throw new Error("No active owner for this unit");
      }

      const ownerId = ownership.ownerId;

      const settings = await tx.appSettings.findFirst({
        where: { organizationId: orgId! },
      });
      const startYear = settings?.startYear ?? 2026;
      const startMonth = settings?.startMonth ?? 1;
      const receiptStartNumber = settings?.receiptStartNumber ?? 1;

      const lastReceipt = await tx.receipt.findFirst({
        where: { organizationId: orgId! },
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

      const startPeriod = buildContributionStartPeriod(
        {
          overrideStart: unit.overrideStart,
          startYear: unit.startYear,
          startMonth: unit.startMonth,
        },
        settings,
      );
      const receiptPeriod = firstDayOfMonth(date);

      /* créer automatiquement l'exercice fiscal si nécessaire */
const fiscalYear = date.getUTCFullYear();

await tx.fiscalYear.upsert({
  where: {
    organizationId_year: {
      organizationId: orgId!,
      year: fiscalYear,
    },
  },
  update: {},
  create: {
    organizationId: orgId!,
    year: fiscalYear,
    startsAt: new Date(Date.UTC(fiscalYear, 0, 1)),
    endsAt: new Date(Date.UTC(fiscalYear, 11, 31)),
  },
});

      // TODO: Utiliser le nouveau système de contributions pour auto-créer les cotisations
      const fee = getMonthlyContributionAmount(
        settings?.globalFixedAmount !== null && settings?.globalFixedAmount !== undefined
          ? Number(settings.globalFixedAmount)
          : 0,
      );
      const MAX_FUTURE_MONTHS = 240;

      const receipt = await tx.receipt.create({
        data: {
          organizationId: orgId!,
          receiptNumber: nextNumber,
          type,
          ownerId,
          buildingId: ensuredUnit.buildingId,
          unitId: ensuredUnit.id,
          amount,
          method: method as PaymentMethod,
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
              organizationId: orgId!,
              unitId: ensuredUnit.id,
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
            organizationId: orgId!,
            unitId: ensuredUnit.id,
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

          const amountDue = Number(due.amountDue);
          const paidAmount = Number(due.paidAmount);
          const remainingDue = amountDue - paidAmount;
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

          const newPaidAmount = paidAmount + allocationAmount;

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

      if (type === "CONTRIBUTION") {
        await reallocateUnitContributions(tx, ensuredUnit.id, orgId!);
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

      const finalReceiptState = await tx.receipt.findUnique({
        where: { id: receipt.id },
        select: { unallocatedAmount: true },
      });

      console.time(`[RECEIPT_POST] Transaction for ${unit.lotNumber}`);
      console.timeEnd(`[RECEIPT_POST] Transaction for ${unit.lotNumber}`);
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
        unallocatedAmount: finalReceiptState?.unallocatedAmount ?? remaining,
      };
    }, { maxWait: 15000, timeout: 60000 });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error?.message ?? "Receipt failed" },
      { status: 500 }
    );
  }
}
