import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const owners = await prisma.owner.findMany({
    where: {
      name: {
        contains: q,
        mode: "insensitive",
      },
    },
    include: {
      ownerships: {
        where: {
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