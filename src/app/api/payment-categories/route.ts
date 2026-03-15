import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const categories = await prisma.paymentCategory.findMany({
    where: { organizationId: gate.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "NAME_REQUIRED" },
      { status: 400 }
    );
  }

  const existing = await prisma.paymentCategory.findFirst({
    where: {
      organizationId: gate.organizationId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "CATEGORY_ALREADY_EXISTS" },
      { status: 400 }
    );
  }

  const category = await prisma.paymentCategory.create({
    data: {
      organizationId: gate.organizationId,
      name,
    },
  });

  return NextResponse.json({ category });
}
