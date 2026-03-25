import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UnitType, DueStatus } from "@prisma/client";
import { requireManager } from "@/lib/authz";
import { buildContributionStartPeriod } from "@/lib/contribution-start";

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

export async function POST(req: Request) {
  try {
    const gate = await requireManager();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await req.json();
    const buildingId = body.buildingId as string;
    const periodInput = body.period ? new Date(body.period) : new Date();

    if (!buildingId) {
      return NextResponse.json({ error: "buildingId required" }, { status: 400 });
    }

    const orgId = gate.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const period = firstDayOfMonth(periodInput);
    const settings = await prisma.appSettings.findFirst({
      where: { organizationId: orgId },
      select: { startYear: true, startMonth: true },
    });

    const units = await prisma.unit.findMany({
      where: {
        organizationId: orgId,
        buildingId,
        isActive: true,
        type: { in: [UnitType.APARTMENT, UnitType.GARAGE] },
      },
      select: {
        id: true,
        overrideStart: true,
        startYear: true,
        startMonth: true,
      },
    });

    const toCreate = units.flatMap((u) => {
      const startPeriod = buildContributionStartPeriod(
        {
          overrideStart: u.overrideStart,
          startYear: u.startYear,
          startMonth: u.startMonth,
        },
        settings,
      );

      if (period.getTime() < startPeriod.getTime()) {
        return [];
      }

      return [
        {
          unitId: u.id,
          organizationId: orgId,
          period,
          amountDue: 0,
          paidAmount: 0,
          status: DueStatus.UNPAID,
        },
      ];
    });

    const created = await prisma.monthlyDue.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      period,
      createdCount: created.count,
      unitsCount: units.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
