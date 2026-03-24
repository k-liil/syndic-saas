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

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: orgId! },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { payments: true }
      }
    }
  });

  return NextResponse.json(suppliers);
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

  try {
    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "NAME_REQUIRED" },
        { status: 400 }
      );
    }
const existing = await prisma.supplier.findFirst({
  where: {
    organizationId: orgId,
    name: {
      equals: name,
      mode: "insensitive",
    },
  },
});

if (existing) {
  return NextResponse.json(
    { error: "SUPPLIER_ALREADY_EXISTS" },
    { status: 400 }
  );
}
    const supplier = await prisma.supplier.create({
      data: {
        organizationId: orgId,
        name,
        sector: typeof body.sector === "string" ? body.sector.trim() || null : null,
        contactName: typeof body.contactName === "string" ? body.contactName.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone : null,
        email: typeof body.email === "string" ? body.email : null,
        address: typeof body.address === "string" ? body.address : null,
        note: typeof body.note === "string" ? body.note : null,
        photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : null,
      },
    });

    return NextResponse.json(supplier);
  } catch (e: unknown) {
    console.error("POST /api/suppliers failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
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

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
    }

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/suppliers failed:", e);
    if (e.code === "P2003") {
      return NextResponse.json(
        { message: "Impossible de supprimer ce prestataire car des paiements y sont liés. Vous pouvez le désactiver (Inactif) à la place." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
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

  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID_REQUIRED" },
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findFirst({
      where: { id: body.id, organizationId: orgId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "SUPPLIER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id: body.id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        sector: typeof body.sector === "string" ? body.sector.trim() || null : undefined,
        contactName: typeof body.contactName === "string" ? body.contactName.trim() || null : undefined,
        phone: typeof body.phone === "string" ? body.phone : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        address: typeof body.address === "string" ? body.address : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
        photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
    });

    return NextResponse.json(supplier);
  } catch (e: unknown) {
    console.error("PUT /api/suppliers failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
