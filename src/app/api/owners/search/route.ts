import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const owners = await prisma.owner.findMany({
    where: {
      organizationId: gate.organizationId ?? undefined,
      name: {
        contains: q,
        mode: "insensitive",
      },
    },
    include: {
      ownerships: {
        where: {
          organizationId: gate.organizationId ?? undefined,
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

  const result = owners.flatMap((o) =>
    o.ownerships.map((own) => ({
      id: own.unit.id,
      reference: own.unit.reference,
      type: own.unit.type,
      buildingName: own.unit.building?.name ?? null,
      ownerName: o.name,
    }))
  );

  return NextResponse.json(result);
}
