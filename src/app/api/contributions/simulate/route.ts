import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getApplicableContribution } from "@/lib/contribution-engine";

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
  const checkDate = new Date(Date.UTC(year, month - 1, 15));

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
    const { amount, method } = getApplicableContribution(
      unit as any,
      checkDate,
      settings as any,
      globalPeriods
    );

    return {
      unitId: unit.id,
      lotNumber: unit.lotNumber,
      reference: unit.reference,
      surface: unit.surface ? Number(unit.surface) : null,
      calculatedAmount: amount,
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
