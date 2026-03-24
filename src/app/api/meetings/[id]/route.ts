import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { asMeetingType } from "@/lib/meetings";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const gate = await requireAuth();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    include: {
      organization: { select: { id: true, name: true } },
      resolutions: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
    },
  });

  if (!meeting) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json(meeting);
}

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: asString(body.title) } : {}),
      ...(body.location !== undefined ? { location: asString(body.location) || null } : {}),
      ...(body.description !== undefined ? { description: asString(body.description) || null } : {}),
      ...(body.type !== undefined ? { type: asMeetingType(body.type) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
    },
    include: {
      organization: { select: { id: true, name: true } },
      resolutions: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
    },
  });

  return NextResponse.json(meeting);
}

