import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const units = await prisma.unit.findMany({
    where: {
      organizationId: orgId,
      OR: [
        {
          lotNumber: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          reference: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      building: true,
ownerships: {
  where: {
    endDate: null,
  },
  orderBy: {
    startDate: "desc",
  },
  take: 1,
  include: {
    owner: true,
  },
},
    },
    take: 20,
  });

  const result = units.map((u) => ({
    id: u.id,
    lotNumber: u.lotNumber,
    reference: u.reference,
    type: u.type,
    buildingName: u.building?.name ?? null,
    ownerName: u.ownerships[0]?.owner?.name ?? null,
  }));

  return NextResponse.json(result);
}