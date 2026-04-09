import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

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

    const groups = await prisma.contributionGroup.findMany({
      where: { organizationId: orgId },
      include: {
        units: {
          include: {
            unit: {
              select: { id: true, lotNumber: true, reference: true, surface: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Ensure Decimal serialization
    return NextResponse.json(JSON.parse(JSON.stringify(groups, (key, value) => 
      (typeof value === 'object' && value && value.constructor?.name === 'Decimal') ? Number(value) : value
    )));
  } catch (error: any) {
    console.error("CRITICAL API ERROR /api/contribution-groups:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { name, unitIds, defaultAmount } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nom du groupe requis" }, { status: 400 });
  }

  const group = await prisma.contributionGroup.create({
    data: {
      organizationId: orgId!,
      name: name.trim(),
      defaultAmount: defaultAmount ? Number(defaultAmount) : null,
      units: unitIds?.length
        ? {
            create: unitIds.map((unitId: string) => ({
              unitId,
            })),
          }
        : undefined,
    },
    include: {
      units: {
        include: {
          unit: true,
        },
      },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
