import { NextResponse } from "next/server";
import { MeetingResolutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { asMeetingVoteRule } from "@/lib/meetings";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type Params = { params: Promise<{ id: string; resolutionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id, resolutionId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const existing = await prisma.meetingResolution.findFirst({
    where: { id: resolutionId, meetingId: id, meeting: { organizationId: orgId } },
    select: { id: true },
  });

  if (!existing) return NextResponse.json({ error: "RESOLUTION_NOT_FOUND" }, { status: 404 });

  const nextStatus = Object.values(MeetingResolutionStatus).includes(body.status as MeetingResolutionStatus)
    ? (body.status as MeetingResolutionStatus)
    : undefined;

  const resolution = await prisma.meetingResolution.update({
    where: { id: resolutionId },
    data: {
      ...(body.title !== undefined ? { title: asString(body.title) } : {}),
      ...(body.description !== undefined ? { description: asString(body.description) || null } : {}),
      ...(body.voteRule !== undefined ? { voteRule: asMeetingVoteRule(body.voteRule) } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(body.votesFor !== undefined ? { votesFor: Math.max(0, Number(body.votesFor) || 0) } : {}),
      ...(body.votesAgainst !== undefined ? { votesAgainst: Math.max(0, Number(body.votesAgainst) || 0) } : {}),
      ...(body.abstentions !== undefined ? { abstentions: Math.max(0, Number(body.abstentions) || 0) } : {}),
    },
  });

  return NextResponse.json(resolution);
}

