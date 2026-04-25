import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function naturalLotSort(
  a: { lotNumber: string | null; reference: string | null },
  b: { lotNumber: string | null; reference: string | null },
) {
  const collator = new Intl.Collator("fr", {
    numeric: true,
    sensitivity: "base",
  });

  const aValue = a.lotNumber || a.reference || "";
  const bValue = b.lotNumber || b.reference || "";

  return collator.compare(aValue, bValue);
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);

  const year = Number(searchParams.get("year"));
  const buildingId = searchParams.get("buildingId") || undefined;

  if (!year) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));

  const now = new Date();
  const currentMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const amountDueLimitDate = currentMonthDate < end ? currentMonthDate : new Date(end.getTime() + 1);

  const [buildings, totalPaidAmount, totalAmountDue] = await Promise.all([
    prisma.building.findMany({
      where: buildingId
        ? { id: buildingId, organizationId: orgId }
        : { organizationId: orgId },
      select: {
        id: true,
        name: true,
        units: {
          select: {
            id: true,
            lotNumber: true,
            reference: true,
            type: true,
            groupUnits: {
              select: {
                group: {
                  select: { frequency: true }
                }
              }
            },
            ownerships: {
              where: { endDate: null, organizationId: orgId },
              select: {
                owner: { select: { firstName: true, name: true } },
              },
            },
            dues: {
              where: {
                organizationId: orgId,
                period: {
                  gte: start,
                  lte: end,
                },
              },
              select: {
                period: true,
                status: true,
                paidAmount: true,
              },
            },
          },
        },
      },
    }),
    prisma.monthlyDue.groupBy({
      by: ["unitId"],
      where: {
        organizationId: orgId,
        period: { lte: end },
      },
      _sum: {
        paidAmount: true,
      },
    }),
    prisma.monthlyDue.groupBy({
      by: ["unitId"],
      where: {
        organizationId: orgId,
        period: { lt: amountDueLimitDate },
      },
      _sum: {
        amountDue: true,
      },
    }),
  ]);

  const paidMap = new Map(
    totalPaidAmount.map((b) => [b.unitId, Number(b._sum.paidAmount || 0)])
  );
  const dueMap = new Map(
    totalAmountDue.map((b) => [b.unitId, Number(b._sum.amountDue || 0)])
  );

  const balanceMap = new Map<string, number>();
  for (const b of buildings) {
    for (const u of b.units) {
      const p = paidMap.get(u.id) || 0;
      const d = dueMap.get(u.id) || 0;
      balanceMap.set(u.id, d - p);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i);

  const result = buildings.map((building) => ({
    ...building,
    units: [...building.units]
      .sort(naturalLotSort)
      .map((unit) => {
        const duesMap = new Map(
          unit.dues.map((d) => [
            new Date(d.period).getUTCMonth(),
            { status: d.status, paidAmount: Number(d.paidAmount) },
          ]),
        );

        const fullYear = months.map((m) => {
          const due = duesMap.get(m);
          return {
            month: m,
            status: due?.status || "UNPAID",
            paidAmount: due?.paidAmount || 0,
          };
        });

        return {
          ...unit,
          fullYear,
          frequency: unit.groupUnits?.[0]?.group?.frequency || "MONTHLY",
          totalBalance: balanceMap.get(unit.id) || 0,
        };
      }),
  }));

  return NextResponse.json(result);
}
