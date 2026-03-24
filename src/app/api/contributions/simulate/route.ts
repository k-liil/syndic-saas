import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

function getPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getApplicablePeriod(
  periods: Array<{ startPeriod: Date; endPeriod: Date | null; amount: any }>,
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

export async function POST(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const { period } = body;

  if (!period) {
    return NextResponse.json({ error: "Période requise (YYYY-MM)" }, { status: 400 });
  }

  const [year, month] = period.split("-").map(Number);
  const checkDate = new Date(year, month - 1, 15);

  const settings = await prisma.appSettings.findFirst({
    where: { organizationId: gate.organizationId ?? undefined },
  });

  const units = await prisma.unit.findMany({
    where: { organizationId: gate.organizationId ?? undefined, isActive: true },
    include: {
      groupUnits: {
        include: {
          group: {
            include: {
              periods: {
                orderBy: { startPeriod: "desc" },
              },
            },
          },
        },
      },
      contributionPeriods: {
        orderBy: { startPeriod: "desc" },
      },
    },
  });

  const globalPeriods = await prisma.contributionPeriod.findMany({
    where: {
      organizationId: gate.organizationId ?? undefined,
      contributionType: "GLOBAL_FIXED",
      groupId: null,
      unitId: null,
    },
    orderBy: { startPeriod: "asc" },
  });

  const results = units.map((unit) => {
    let calculatedAmount: number | null = null;
    let method = "";

    if (settings?.contributionType === "GLOBAL_FIXED") {
      calculatedAmount = getApplicablePeriod(globalPeriods, checkDate);
      method = "Montant global fixe";
    } else if (settings?.contributionType === "GROUP_FIXED") {
      for (const gu of unit.groupUnits) {
        const groupAmount = getApplicablePeriod(gu.group.periods, checkDate);
        if (groupAmount !== null) {
          calculatedAmount = groupAmount;
          method = `Groupe: ${gu.group.name}`;
          break;
        }
      }
      if (calculatedAmount === null) {
        method = "Groupe: Non configuré";
      }
    } else if (settings?.contributionType === "SURFACE") {
      const surfaceAmount = getApplicablePeriod(unit.contributionPeriods, checkDate);
      if (surfaceAmount !== null && unit.surface) {
        calculatedAmount = Number(unit.surface) * surfaceAmount;
        method = `${Number(unit.surface)} m² × ${surfaceAmount} = `;
      } else {
        method = unit.surface ? "Tantième: Non configuré" : "Surface non définie";
      }
    }

    return {
      unitId: unit.id,
      lotNumber: unit.lotNumber,
      reference: unit.reference,
      surface: unit.surface ? Number(unit.surface) : null,
      calculatedAmount,
      method,
    };
  });

  const configured = results.filter((r) => r.calculatedAmount !== null);
  const unconfigured = results.filter((r) => r.calculatedAmount === null);

  return NextResponse.json({
    period,
    contributionType: settings?.contributionType || "GLOBAL_FIXED",
    globalFixedAmount: settings?.globalFixedAmount ? Number(settings.globalFixedAmount) : null,
    configured,
    unconfigured,
    totalConfigured: configured.reduce((sum, r) => sum + (r.calculatedAmount || 0), 0),
  });
}
