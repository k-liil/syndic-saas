import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfYearUTC(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0));
}
function startOfNextYearUTC(year: number) {
  return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
}
function monthIndexUTC(d: Date) {
  return d.getUTCMonth(); // 0..11
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

// 1) Owners de l’immeuble
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

// 2) Ownerships -> unitIds par owner + unité APARTMENT de référence
const ownerships = await prisma.ownership.findMany({
  where: { ownerId: { in: owners.map((o) => o.id) } },
  select: { ownerId: true, unitId: true },
});

const allUnitIds = Array.from(new Set(ownerships.map((o) => o.unitId)));

const units = allUnitIds.length
  ? await prisma.unit.findMany({
      where: { id: { in: allUnitIds } },
      select: { id: true, reference: true, type: true },
    })
  : [];

const unitById = new Map(units.map((u) => [u.id, u]));

const ownerToUnitIds = new Map<string, string[]>();
const ownerToAptRef = new Map<string, string>();

for (const o of owners) {
  ownerToUnitIds.set(o.id, []);
  ownerToAptRef.set(o.id, "—");
}

for (const os of ownerships) {
  ownerToUnitIds.get(os.ownerId)?.push(os.unitId);

  const u = unitById.get(os.unitId);
  // choisir l'appartement comme "clé" d'affichage
  if (u?.type === "APARTMENT") {
    ownerToAptRef.set(os.ownerId, u.reference);
  }
}

// 3) Toutes les dues de l’année pour ces units
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

    // 4) Index dues par (unitId, monthIndex)
    const dueByUnitMonth = new Map<string, { amountDue: number; paidAmount: number }>();
    for (const d of dues) {
      const m = monthIndexUTC(new Date(d.period));
      const key = `${d.unitId}:${m}`;
      const existing = dueByUnitMonth.get(key);
      if (!existing) {
        dueByUnitMonth.set(key, { amountDue: d.amountDue, paidAmount: d.paidAmount });
      } else {
        // normalement unique(unitId,period) => pas nécessaire,
        // mais au cas où: on agrège
        existing.amountDue += d.amountDue;
        existing.paidAmount += d.paidAmount;
      }
    }

    // 5) Construire la matrice owners x 12 mois
    const rows = owners.map((o) => {
      const unitIds = ownerToUnitIds.get(o.id) ?? [];
      const aptRef = ownerToAptRef.get(o.id) ?? "—";

      const months: Cell[] = Array.from({ length: 12 }).map(() => ({
        amountDue: 0,
        paidAmount: 0,
        remaining: 0,
        status: "UNPAID" as const,
      }));

    for (let m = 0; m < 12; m++) {
      let amountDue = 0;
      let paidAmount = 0;

      for (const unitId of unitIds) {
        const key = `${unitId}:${m}`;
        const v = dueByUnitMonth.get(key);
        if (v) {
          amountDue += v.amountDue;
          paidAmount += v.paidAmount;
        }
      }

      const remaining = Math.max(0, amountDue - paidAmount);
      const status: Cell["status"] =
        amountDue === 0
          ? "UNPAID"
          : remaining === 0
            ? "PAID"
            : paidAmount > 0
              ? "PARTIAL"
              : "UNPAID";

      months[m] = { amountDue, paidAmount, remaining, status };
    }

    return { ownerId: o.id, ownerName: o.name, aptRef, months };
  })
  // tri par appart d'abord (Apt 1, Apt 2, …)
  .sort((a, b) => (a.aptRef ?? "").localeCompare(b.aptRef ?? "", "fr", { numeric: true }));


    return NextResponse.json({
      building,
      year,
      rows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "year-matrix failed" }, { status: 500 });
  }
}
