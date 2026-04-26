import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

export async function GET() {
  try {
    const gate = await requireAuth();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const orgs = await prisma.organization.findMany({
      where: gate.isSuperAdmin
        ? { isActive: true }
        : { isActive: true, userOrganizations: { some: { userId: gate.userId! } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, logoUrl: true },
    });

    return NextResponse.json(orgs);
  } catch (err) {
    console.error("GET mobile/organizations crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
