import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.unit.findFirst({
    where: { id, organizationId: gate.organizationId ?? undefined },
  });

  if (!existing) {
    return NextResponse.json({ error: "Lot not found" }, { status: 404 });
  }

  const lotNumber = body.lotNumber === undefined ? existing.lotNumber : (body.lotNumber || null);
  const reference = body.reference === undefined || body.reference === null
    ? (existing.reference || (existing.lotNumber ? `Lot ${existing.lotNumber}` : ""))
    : (body.reference || (existing.lotNumber ? `Lot ${existing.lotNumber}` : ""));
  const type = body.type ?? existing.type;
  const buildingId = type === "APARTMENT" ? (body.buildingId || existing.buildingId) : null;
  const floor = body.floor === undefined ? existing.floor : (body.floor === null ? null : Number(body.floor));
  const surface = body.surface === undefined ? existing.surface : (body.surface === null ? null : Number(body.surface));

  if (type === "APARTMENT" && !buildingId) {
    return NextResponse.json({ error: "buildingId required for APARTMENT" }, { status: 400 });
  }

  const surfaceNum = surface !== null ? Number(surface) : null;
  if (surfaceNum !== null && (Number.isNaN(surfaceNum) || surfaceNum < 0)) {
    return NextResponse.json({ error: "Surface invalide" }, { status: 400 });
  }

  const updated = await prisma.unit.update({
    where: { id },
    data: {
      lotNumber,
      reference,
      type,
      buildingId,
      floor: type === "APARTMENT" ? floor : null,
      surface,
      overrideStart: body.overrideStart !== undefined ? !!body.overrideStart : existing.overrideStart,
      startYear: body.startYear !== undefined ? (body.startYear ? Number(body.startYear) : null) : existing.startYear,
      startMonth: body.startMonth !== undefined ? (body.startMonth ? Number(body.startMonth) : null) : existing.startMonth,
    },
    include: { building: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  const existing = await prisma.unit.findFirst({
    where: { id, organizationId: gate.organizationId ?? undefined },
    include: {
      _count: {
        select: {
          ownerships: true,
          receipts: true,
          dues: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Lot not found" }, { status: 404 });
  }

  if (existing._count.ownerships > 0 || existing._count.receipts > 0 || existing._count.dues > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer: ce lot a des paiements ou des copropriétaires associés" },
      { status: 409 }
    );
  }

  await prisma.unit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
