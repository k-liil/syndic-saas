import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const items = await prisma.fiscalYear.findMany({
      where: { organizationId: gate.organizationId },
      orderBy: [{ year: "desc" }],
      select: { id: true, year: true },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load fiscal years" },
      { status: 500 }
    );
  }
}
