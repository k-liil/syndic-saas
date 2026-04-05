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

  const owners = await prisma.owner.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      ownerships: {
        where: {
          organizationId: orgId,
          endDate: null,
        },
        include: {
          unit: {
            include: {
              building: true,
            },
          },
        },
      },
    },
    take: 20,
  });

  const result = owners.flatMap((o: any) =>
    o.ownerships.map((own: any) => ({
      id: own.unit.id,
      reference: own.unit.reference,
      type: own.unit.type,
      buildingName: own.unit.building?.name ?? null,
      ownerName: o.name,
    }))
  );

  return NextResponse.json(result);
}
