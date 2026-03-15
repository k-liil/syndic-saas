import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const banks = await prisma.internalBank.findMany({
    where: { organizationId: gate.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(banks);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }

  const bank = await prisma.internalBank.create({
    data: {
      organizationId: gate.organizationId,
      name: body.name.trim(),
    },
  });

  return NextResponse.json(bank);
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.internalBank.findFirst({
    where: { id: body.id, organizationId: gate.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "BANK_NOT_FOUND" }, { status: 404 });
  }

  const bank = await prisma.internalBank.update({
    where: { id: body.id },
    data: {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    },
  });

  return NextResponse.json(bank);
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.internalBank.findFirst({
    where: { id: body.id, organizationId: gate.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "BANK_NOT_FOUND" }, { status: 404 });
  }

  const bank = await prisma.internalBank.update({
    where: { id: body.id },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json(bank);
}
