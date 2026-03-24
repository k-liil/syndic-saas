import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);

  if (!orgId) {
    return NextResponse.json([]);
  }

  const items = await prisma.building.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  if (!gate.organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();

  const created = await prisma.building.create({
    data: {
      organizationId: gate.organizationId ?? undefined,
      name: body.name,
      address: body.address ?? null,
    },
  });

  return NextResponse.json(created);
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!gate.organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.building.findFirst({
      where: { id, organizationId: gate.organizationId ?? undefined },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "BUILDING_NOT_FOUND" }, { status: 404 });
    }

    await prisma.building.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: getErrorMessage(e) || "Delete failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!gate.organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
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

    const existing = await prisma.building.findFirst({
      where: { id, organizationId: gate.organizationId ?? undefined },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "BUILDING_NOT_FOUND" }, { status: 404 });
    }

    const updated = await prisma.building.update({
      where: { id },
      data: {
        name,
        ...(address !== undefined ? { address: address || null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: getErrorMessage(e) || "Update failed" },
      { status: 500 }
    );
  }
}
