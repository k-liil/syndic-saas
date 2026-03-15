import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UnitType, DueStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/authz";

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await req.json();
    const buildingId = body.buildingId as string;
    const periodInput = body.period ? new Date(body.period) : new Date();

    if (!buildingId) {
      return NextResponse.json({ error: "buildingId required" }, { status: 400 });
    }

    const period = firstDayOfMonth(periodInput);

    // IMPORTANT:
    // - On ne génère que sur les lots qui ont monthlyDueAmount défini (>0)
    // - On limite au building + actifs
    // - On exclut COMMERCIAL (si tu veux l’inclure un jour, ce sera un switch)
    const units = await prisma.unit.findMany({
      where: {
        organizationId: gate.organizationId,
        buildingId,
        isActive: true,
        type: { in: [UnitType.APARTMENT, UnitType.GARAGE] },
      },
      select: { id: true, monthlyDueAmount: true },
    });

    const toCreate = units
      .map((u) => {
        const amount = u.monthlyDueAmount ?? null;
        if (!amount || amount <= 0) return null;

        return {
          unitId: u.id,
          organizationId: gate.organizationId,
          period,
          amountDue: amount,
          paidAmount: 0,
          status: DueStatus.UNPAID,
        };
      })
      .filter(Boolean) as Array<{
      unitId: string;
      period: Date;
      amountDue: number;
      paidAmount: number;
      status: DueStatus;
    }>;

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
