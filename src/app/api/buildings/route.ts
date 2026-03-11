import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const items = await prisma.building.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  

  const created = await prisma.building.create({
    data: {
      name: body.name,
      address: body.address ?? null,
    },
  });

  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = await req.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.building.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = await req.json();
    const id = String(body?.id ?? "");
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address =
      body?.address === null
        ? null
        : typeof body?.address === "string"
        ? body.address.trim()
        : undefined;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const updated = await prisma.building.update({
      where: { id },
      data: {
        name,
        ...(address !== undefined ? { address: address || null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Update failed" },
      { status: 500 }
    );
  }
}