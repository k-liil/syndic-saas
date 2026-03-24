import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { asMeetingVoteRule } from "@/lib/meetings";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, _count: { select: { resolutions: true } } },
  });

  if (!meeting) return NextResponse.json({ error: "MEETING_NOT_FOUND" }, { status: 404 });

  const title = asString(body.title);
  if (!title) return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });

  const resolution = await prisma.meetingResolution.create({
    data: {
      meetingId: id,
      title,
      description: asString(body.description) || null,
      voteRule: asMeetingVoteRule(body.voteRule),
      orderIndex: meeting._count.resolutions + 1,
    },
  });

  return NextResponse.json(resolution, { status: 201 });
}

