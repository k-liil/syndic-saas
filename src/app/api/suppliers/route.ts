import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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
        name,
        phone: typeof body.phone === "string" ? body.phone : null,
        email: typeof body.email === "string" ? body.email : null,
        address: typeof body.address === "string" ? body.address : null,
        note: typeof body.note === "string" ? body.note : null,
      },
    });

    return NextResponse.json(supplier);
  } catch (e: any) {
    console.error("POST /api/suppliers failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID_REQUIRED" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: { id: body.id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        phone: typeof body.phone === "string" ? body.phone : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        address: typeof body.address === "string" ? body.address : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
    });

    return NextResponse.json(supplier);
  } catch (e: any) {
    console.error("PUT /api/suppliers failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}