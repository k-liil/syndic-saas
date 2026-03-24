import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const gate = await requireAuth();

  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.otherReceipt.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const body = await req.json();

  const updated = await prisma.otherReceipt.update({
    where: { id },
    data: {
      description: body.description,
      type: body.type,
      amount: Number(body.amount),
      method: body.method,
      date: new Date(body.date),
      bankName: body.bankName || null,
      bankRef: body.bankRef || null,
      note: body.note || null
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const gate = await requireManager();

  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.otherReceipt.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.otherReceipt.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
