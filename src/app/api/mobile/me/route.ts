/**
 * GET /api/mobile/me
 * Returns the authenticated user's profile including owner/unit info.
 * Used by the mobile app on startup to validate the stored token.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const userId = gate.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const owner = await prisma.owner.findFirst({
    where: { userId },
    include: {
      ownerships: {
        where: { endDate: null },
        include: {
          unit: { select: { id: true, reference: true, lotNumber: true } },
        },
        take: 1,
      },
    },
  });

  const org = gate.organizationId
    ? await prisma.organization.findUnique({
        where: { id: gate.organizationId },
        select: { id: true, name: true },
      })
    : null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
    organizationId: gate.organizationId,
    organizationName: org?.name ?? null,
    orgLogoUrl: org?.logoUrl ?? null,
    ownerId: owner?.id ?? null,
    unitId: owner?.ownerships?.[0]?.unit?.id ?? null,
    unitRef:
      owner?.ownerships?.[0]?.unit?.reference ??
      owner?.ownerships?.[0]?.unit?.lotNumber ??
      null,
  });
}
