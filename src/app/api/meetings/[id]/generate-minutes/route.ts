import { NextResponse } from "next/server";
import { MeetingDocumentType, MeetingStatus } from "@prisma/client";
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
    include: { resolutions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!meeting) return NextResponse.json({ error: "MEETING_NOT_FOUND" }, { status: 404 });

  const summary = [
    `Proces-verbal de ${meeting.title}`,
    `Date: ${meeting.date.toISOString().slice(0, 10)}`,
    `Type: ${meeting.type}`,
    "",
    ...meeting.resolutions.map(
      (resolution) =>
        `${resolution.orderIndex}. ${resolution.title} - ${resolution.status} (${resolution.votesFor}/${resolution.votesAgainst}/${resolution.abstentions})`,
    ),
  ].join("\n");

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: MeetingStatus.MINUTES_READY,
      minutesGeneratedAt: new Date(),
    },
  });

  const existing = await prisma.meetingDocument.findFirst({
    where: { meetingId: meeting.id, type: MeetingDocumentType.MINUTES },
    select: { id: true },
  });

  const fileUrl = `data:text/plain;base64,${Buffer.from(summary, "utf8").toString("base64")}`;
  const payload = {
    title: "Proces-verbal",
    fileName: `proces-verbal-${meeting.id}.txt`,
    fileUrl,
    mimeType: "text/plain",
    sizeBytes: Buffer.byteLength(summary, "utf8"),
  };

  if (existing) {
    await prisma.meetingDocument.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    await prisma.meetingDocument.create({
      data: {
        meetingId: meeting.id,
        type: MeetingDocumentType.MINUTES,
        ...payload,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

