import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const gate = await requireAdmin();

  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const buildings = await prisma.building.findMany({
    where: { organizationId: gate.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return NextResponse.json(buildings);
}
