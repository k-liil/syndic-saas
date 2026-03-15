import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfYearUTC(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0));
}

function startOfNextYearUTC(year: number) {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
}

function monthIndexUTC(date: Date) {
  return date.getUTCMonth();
}

type Cell = {
  amountDue: number;
  paidAmount: number;
  remaining: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ buildingId: string }> }
) {
  try {
    const { buildingId } = await ctx.params;

    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

    if (!buildingId) {
      return NextResponse.json({ error: "buildingId missing" }, { status: 400 });
    }

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "invalid year" }, { status: 400 });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true },
    });

    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const owners = await prisma.owner.findMany({
      where: {
        ownerships: {
          some: {
            unit: {
              buildingId,
            },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const ownerships = await prisma.ownership.findMany({
      where: { ownerId: { in: owners.map((owner) => owner.id) } },
      select: { ownerId: true, unitId: true },
    });

    const allUnitIds = Array.from(new Set(ownerships.map((ownership) => ownership.unitId)));

    const units = allUnitIds.length
      ? await prisma.unit.findMany({
          where: { id: { in: allUnitIds } },
          select: { id: true, reference: true, type: true },
        })
      : [];

    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const ownerToUnitIds = new Map<string, string[]>();
    const ownerToAptRef = new Map<string, string>();

    for (const owner of owners) {
      ownerToUnitIds.set(owner.id, []);
      ownerToAptRef.set(owner.id, "-");
    }

    for (const ownership of ownerships) {
      ownerToUnitIds.get(ownership.ownerId)?.push(ownership.unitId);

      const unit = unitById.get(ownership.unitId);
      if (unit?.type === "APARTMENT") {
        ownerToAptRef.set(ownership.ownerId, unit.reference);
      }
    }

    const dues = allUnitIds.length
      ? await prisma.monthlyDue.findMany({
          where: {
            unitId: { in: allUnitIds },
            period: { gte: startOfYearUTC(year), lt: startOfNextYearUTC(year) },
          },
          select: {
            unitId: true,
            period: true,
            amountDue: true,
            paidAmount: true,
          },
        })
      : [];

    const dueByUnitMonth = new Map<string, { amountDue: number; paidAmount: number }>();

    for (const due of dues) {
      const month = monthIndexUTC(new Date(due.period));
      const key = `${due.unitId}:${month}`;
      const existing = dueByUnitMonth.get(key);
      const amountDue = Number(due.amountDue);
      const paidAmount = Number(due.paidAmount);

      if (!existing) {
        dueByUnitMonth.set(key, { amountDue, paidAmount });
      } else {
        existing.amountDue += amountDue;
        existing.paidAmount += paidAmount;
      }
    }

    const rows = owners
      .map((owner) => {
        const unitIds = ownerToUnitIds.get(owner.id) ?? [];
        const aptRef = ownerToAptRef.get(owner.id) ?? "-";

        const months: Cell[] = Array.from({ length: 12 }, () => ({
          amountDue: 0,
          paidAmount: 0,
          remaining: 0,
          status: "UNPAID",
        }));

        for (let month = 0; month < 12; month += 1) {
          let amountDue = 0;
          let paidAmount = 0;

          for (const unitId of unitIds) {
            const key = `${unitId}:${month}`;
            const value = dueByUnitMonth.get(key);

            if (value) {
              amountDue += value.amountDue;
              paidAmount += value.paidAmount;
            }
          }

          const remaining = Math.max(0, amountDue - paidAmount);
          const status: Cell["status"] =
            amountDue === 0 ? "UNPAID" : remaining === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

          months[month] = { amountDue, paidAmount, remaining, status };
        }

        return {
          ownerId: owner.id,
          ownerName: owner.name,
          aptRef,
          months,
        };
      })
      .sort((a, b) => a.aptRef.localeCompare(b.aptRef, "fr", { numeric: true }));

    return NextResponse.json({
      building,
      year,
      rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "year-matrix failed" }, { status: 500 });
  }
}
