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

  const searchConditions: any[] = [];
  const fields = ["lotNumber", "reference"];

  for (const field of fields) {
    if (q.startsWith("*") && q.endsWith("*")) {
      const term = q.slice(1, -1);
      if (term) searchConditions.push({ [field]: { contains: term, mode: "insensitive" } });
    } else if (q.endsWith("*")) {
      const term = q.slice(0, -1);
      if (term) searchConditions.push({ [field]: { startsWith: term, mode: "insensitive" } });
    } else if (q.startsWith("*")) {
      const term = q.slice(1);
      if (term) searchConditions.push({ [field]: { endsWith: term, mode: "insensitive" } });
    } else {
      searchConditions.push({ [field]: { equals: q, mode: "insensitive" } });
    }
  }

  const units = await prisma.unit.findMany({
    where: {
      organizationId: orgId,
      OR: searchConditions,
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