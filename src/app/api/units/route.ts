import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

type SortableUnit = {
  lotNumber: string | null;
  reference: string | null;
  building: { name: string } | null;
};

function sortLotNumber(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function getApplicablePeriod(
  periods: Array<{ startPeriod: Date; endPeriod: Date | null; amount: unknown }>,
  checkDate: Date
) {
  for (const period of periods) {
    if (checkDate >= period.startPeriod) {
      if (!period.endPeriod || checkDate <= period.endPeriod) {
        return Number(period.amount);
      }
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where =
      type && ["APARTMENT", "GARAGE", "COMMERCIAL"].includes(type)
        ? { organizationId: orgId!, type: type as "APARTMENT" | "GARAGE" | "COMMERCIAL" }
        : { organizationId: orgId! };

    const settings = await prisma.appSettings.findFirst({
      where: { organizationId: orgId! },
      select: {
        contributionType: true,
        globalFixedAmount: true,
      },
    });

    const items = await prisma.unit.findMany({
      where,
      select: {
        id: true,
        lotNumber: true,
        reference: true,
        type: true,
        surface: true,
        floor: true,
        overrideStart: true,
        startYear: true,
        startMonth: true,
        buildingId: true,
        building: {
          select: { id: true, name: true },
        },
        ownerships: {
          where: { endDate: null, organizationId: orgId! },
          take: 1,
          orderBy: { startDate: "desc" },
          select: {
            id: true,
            startDate: true,
            owner: {
              select: { id: true, firstName: true, name: true },
            },
          },
        },
        groupUnits: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                defaultAmount: true,
                periods: {
                  orderBy: { startPeriod: "desc" },
                  select: { id: true, startPeriod: true, endPeriod: true, amount: true },
                },
              },
            },
          },
        },
        contributionPeriods: {
          orderBy: { startPeriod: "desc" },
          select: { id: true, startPeriod: true, endPeriod: true, amount: true },
        },
      },
    });

    const globalPeriods = await prisma.contributionPeriod.findMany({
      where: {
        organizationId: orgId!,
        contributionType: "GLOBAL_FIXED",
        groupId: null,
        unitId: null,
      },
      orderBy: { startPeriod: "desc" },
    });

    const checkDate = new Date();
    const contributionType = settings?.contributionType ?? "GLOBAL_FIXED";

    items.sort((a: any, b: any) => {
      const aLot = sortLotNumber(a.lotNumber);
      const bLot = sortLotNumber(b.lotNumber);
      if (aLot !== bLot) return aLot - bLot;
      const buildingCompare = (a.building?.name ?? "ZZZZZZ").localeCompare(b.building?.name ?? "ZZZZZZ", "fr", {
        sensitivity: "base",
      });
      if (buildingCompare !== 0) return buildingCompare;
      return (a.reference ?? "").localeCompare(b.reference ?? "", "fr", { numeric: true, sensitivity: "base" });
    });

    const enrichedItems = items.map((item: any) => {
      let contributionAmount: number | null = null;
      try {
        if (contributionType === "GLOBAL_FIXED") {
          contributionAmount =
            getApplicablePeriod(globalPeriods, checkDate) ??
            (settings?.globalFixedAmount !== null && settings?.globalFixedAmount !== undefined
              ? Number(settings.globalFixedAmount)
              : null);
        } else if (contributionType === "GROUP_FIXED") {
          if (item.groupUnits) {
            for (const gu of item.groupUnits) {
              const amount = gu.group?.periods ? getApplicablePeriod(gu.group.periods, checkDate) : null;
              if (amount !== null) {
                contributionAmount = amount;
                break;
              }
              if (gu.group?.defaultAmount) {
                contributionAmount = Number(gu.group.defaultAmount);
                break;
              }
            }
          }
        } else if (contributionType === "SURFACE") {
          const amountPerSquareMeter = item.contributionPeriods ? getApplicablePeriod(item.contributionPeriods, checkDate) : null;
          if (amountPerSquareMeter !== null && item.surface) {
            contributionAmount = Number(item.surface) * amountPerSquareMeter;
          }
        }
      } catch (e) {
        console.error("Mapping error for unit", item.id, e);
      }

      // Final serialization cleanup for Decimal objects
      return JSON.parse(JSON.stringify({
        ...item,
        surface: item.surface ? Number(item.surface) : null,
        contributionAmount,
        activeOwnership: item.ownerships?.[0] ?? null,
      }, (key, value) => (typeof value === 'object' && value && value.constructor?.name === 'Decimal') ? Number(value) : value));
    });

    return NextResponse.json(enrichedItems);
  } catch (error: any) {
    console.error("CRITICAL API ERROR /api/units:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
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

  const body = await req.json();

const lotNumberRaw = body.lotNumber;

const lotNumber =
  typeof lotNumberRaw === "string" && lotNumberRaw.trim().length > 0
    ? lotNumberRaw.trim()
    : null;

  const reference =
    typeof body.reference === "string" && body.reference.trim().length > 0
      ? body.reference.trim()
      : lotNumber
      ? `Lot ${lotNumber}`
      : "";

  const type = body.type;
  const buildingId = typeof body.buildingId === "string" ? body.buildingId : "";

  const floor =
    body.floor === null || body.floor === undefined || body.floor === ""
      ? null
      : Number(body.floor);

  const surface =
    body.surface === null || body.surface === undefined || body.surface === ""
      ? null
      : Number(body.surface);


  if (surface !== null && (Number.isNaN(surface) || surface < 0)) {
    return NextResponse.json({ error: "Surface invalide" }, { status: 400 });
  }

  if (!reference) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 });
  }

  if (!["APARTMENT", "GARAGE", "COMMERCIAL"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (type === "APARTMENT" && !buildingId) {
    return NextResponse.json({ error: "buildingId is required for APARTMENT" }, { status: 400 });
  }

const existingLot = lotNumber
  ? await prisma.unit.findFirst({
  where: { lotNumber, organizationId: orgId! },
  select: { id: true },
})
  : null;

if (existingLot) {
  return NextResponse.json({ error: "lotNumber already exists" }, { status: 409 });
}


  const created = await prisma.unit.create({
    data: {
      organizationId: orgId!,
      lotNumber,
      reference,
      type,
      ...(type === "APARTMENT" ? { buildingId } : {}),
      floor: type === "APARTMENT" ? floor : null,
      surface: surface === null ? null : Math.round(surface * 100) / 100,
      overrideStart: !!body.overrideStart,
      startYear: body.startYear ? Number(body.startYear) : null,
      startMonth: body.startMonth ? Number(body.startMonth) : null,
    },
    include: { building: true },
  });

  return NextResponse.json(created);
}
