import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    let items: { id: string; year: number }[];

    if (orgId) {
      items = await prisma.fiscalYear.findMany({
        where: { organizationId: orgId },
        orderBy: [{ year: "desc" }],
        select: { id: true, year: true },
      });
    } else {
      items = [];
    }

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load fiscal years" },
      { status: 500 }
    );
  }
}
