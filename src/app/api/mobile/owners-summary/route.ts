import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { canManage } from "@/lib/roles";
import { DueStatus } from "@prisma/client";

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function GET(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    if (!canManage(gate.session.user?.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) return NextResponse.json([]);

    const [owners, ownerships, dues] = await Promise.all([
      prisma.owner.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          firstName: true,
          ownerships: {
            where: { endDate: null },
            select: { unit: { select: { reference: true, lotNumber: true } } },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.ownership.findMany({
        where: { organizationId: orgId, endDate: null },
        select: { unitId: true, ownerId: true },
      }),
      prisma.monthlyDue.findMany({
        where: {
          organizationId: orgId,
          status: { not: DueStatus.PAID },
          period: { lte: firstDayOfMonth(new Date()) },
        },
        select: { unitId: true, amountDue: true, paidAmount: true },
      }),
    ]);

    const unitToOwner = new Map(ownerships.map((o) => [o.unitId, o.ownerId]));
    const remainingByOwner = new Map<string, number>();
    for (const due of dues) {
      const ownerId = unitToOwner.get(due.unitId);
      if (ownerId) {
        const prev = remainingByOwner.get(ownerId) ?? 0;
        remainingByOwner.set(ownerId, prev + (Number(due.amountDue) - Number(due.paidAmount)));
      }
    }

    const result = owners.map((o) => ({
      id: o.id,
      name: o.name,
      firstName: o.firstName,
      primaryUnitRef:
        o.ownerships[0]?.unit?.reference ??
        o.ownerships[0]?.unit?.lotNumber ??
        null,
      remainingDueNow: Math.max(0, remainingByOwner.get(o.id) ?? 0),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET owners-summary crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
