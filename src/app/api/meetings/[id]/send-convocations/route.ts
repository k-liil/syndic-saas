import { NextResponse } from "next/server";
import { MeetingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    include: { organization: { select: { name: true } } },
  });

  if (!meeting) return NextResponse.json({ error: "MEETING_NOT_FOUND" }, { status: 404 });

  const owners = await prisma.owner.findMany({
    where: {
      organizationId: orgId,
      email: { not: null },
      ownerships: { some: { organizationId: orgId, endDate: null } },
    },
    select: { id: true, email: true, userId: true, firstName: true, name: true },
  });

  const linkedUserIds = owners.map((owner) => owner.userId).filter((value): value is string => Boolean(value));

  if (linkedUserIds.length > 0) {
    await prisma.notification.createMany({
      data: linkedUserIds.map((userId) => ({
        userId,
        organizationId: orgId,
        type: "meeting_convocation",
        title: "Nouvelle convocation AG",
        message: `Convocation disponible pour ${meeting.title}`,
        link: `/organisation/assemblies/${meeting.id}`,
      })),
    });
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: MeetingStatus.CONVOCATIONS_SENT,
      convocationSentAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    recipients: owners.length,
    recipientsWithUserAccount: linkedUserIds.length,
    emails: owners.map((owner) => owner.email).filter(Boolean),
  });
}

