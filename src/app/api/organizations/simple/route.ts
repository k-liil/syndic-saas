import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

export async function GET() {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let organizations;
  
  if (gate.isSuperAdmin) {
    organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        logoUrl: true,
      },
    });
  } else {
    const orgIds = gate.userOrganizations?.map(uo => uo.organizationId) || [];
    organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        logoUrl: true,
      },
    });
  }

  return NextResponse.json(organizations);
}
