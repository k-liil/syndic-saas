import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const items = await prisma.ownership.findMany({
    orderBy: { startDate: "desc" },
    include: {
      owner: true,
      unit: { include: { building: true } },
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const unitId = typeof body.unitId === "string" ? body.unitId : "";
  const startDate = body.startDate ? new Date(body.startDate) : new Date();

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId is required" }, { status: 400 });
  }
  if (!unitId) {
    return NextResponse.json({ error: "unitId is required" }, { status: 400 });
  }
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  }

  // prevent duplicate active ownership for same owner+unit
  const existing = await prisma.ownership.findFirst({
    where: {
      ownerId,
      unitId,
      endDate: null,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This ownership already exists (active)." },
      { status: 409 }
    );
  }

  const created = await prisma.ownership.create({
    data: {
      ownerId,
      unitId,
      startDate,
    },
  });

  return NextResponse.json(created);
}