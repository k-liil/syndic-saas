import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const sectors = await prisma.supplierSector.findMany({
    where: { organizationId: orgId! },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(sectors);
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

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }

  const sector = await prisma.supplierSector.create({
    data: {
      organizationId: orgId!,
      name: body.name.trim(),
    },
  });

  return NextResponse.json(sector);
}

export async function PUT(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.supplierSector.findFirst({
    where: { id: body.id, organizationId: orgId! },
    select: { id: true, name: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "SECTOR_NOT_FOUND" }, { status: 404 });
  }

  const oldName = existing.name;
  const newName = typeof body.name === "string" ? body.name.trim() : undefined;

  const sector = await prisma.supplierSector.update({
    where: { id: body.id },
    data: {
      name: newName,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  if (newName && newName !== oldName) {
    await prisma.supplier.updateMany({
      where: { organizationId: orgId!, sector: oldName },
      data: { sector: newName }
    });
  }

  return NextResponse.json(sector);
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.supplierSector.findFirst({
    where: { id: body.id, organizationId: orgId! },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "SECTOR_NOT_FOUND" }, { status: 404 });
  }

  try {
    const sector = await prisma.supplierSector.delete({
      where: { id: body.id }
    });
    return NextResponse.json(sector);
  } catch (e: unknown) {
    return NextResponse.json({ error: "INTERNAL_ERROR_OR_IN_USE" }, { status: 400 });
  }
}
