import { NextResponse } from "next/server";
import { MeetingStatus, MeetingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const q = asString(searchParams.get("q"));
  const status = asString(searchParams.get("status"));

  const items = await prisma.meeting.findMany({
    where: {
      organizationId: orgId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(Object.values(MeetingStatus).includes(status as MeetingStatus)
        ? { status: status as MeetingStatus }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      organization: { select: { id: true, name: true } },
      _count: { select: { resolutions: true, documents: true } },
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const title = asString(body.title);
  const location = asString(body.location) || null;
  const description = asString(body.description) || null;
  const type = body.type === MeetingType.EXTRAORDINARY ? MeetingType.EXTRAORDINARY : MeetingType.ORDINARY;
  const date = body.date ? new Date(body.date) : null;

  if (!title || !date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      organizationId: orgId,
      title,
      location,
      description,
      type,
      date,
      status: MeetingStatus.SCHEDULED,
    },
    include: {
      organization: { select: { id: true, name: true } },
      _count: { select: { resolutions: true, documents: true } },
    },
  });

  return NextResponse.json(meeting, { status: 201 });
}

