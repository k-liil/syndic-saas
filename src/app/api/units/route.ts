import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where =
    type && ["APARTMENT", "GARAGE", "COMMERCIAL"].includes(type)
      ? { type: type as "APARTMENT" | "GARAGE" | "COMMERCIAL" }
      : undefined;

  const items = await prisma.unit.findMany({
    ...(where ? { where } : {}),
    include: { building: true },
  });

  items.sort((a: any, b: any) => {
    const aLot = a.lotNumber ?? Number.MAX_SAFE_INTEGER;
    const bLot = b.lotNumber ?? Number.MAX_SAFE_INTEGER;

    if (aLot !== bLot) return aLot - bLot;

    const buildingCompare = (a.building?.name ?? "ZZZZZZ").localeCompare(b.building?.name ?? "ZZZZZZ", "fr", {
      sensitivity: "base",
    });

    if (buildingCompare !== 0) return buildingCompare;

    const aRef = a.reference ?? "";
    const bRef = b.reference ?? "";

    return aRef.localeCompare(bRef, "fr", {
      numeric: true,
      sensitivity: "base",
    });
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

const lotNumberRaw = body.lotNumber;

const lotNumber =
  typeof lotNumberRaw === "string" && lotNumberRaw.trim().length > 0
    ? lotNumberRaw.trim()
    : null;

  const reference =
    typeof body.reference === "string" && body.reference.trim().length > 0
      ? body.reference.trim()
      : lotNumber
      ? `Lot ${lotNumber}`
      : "";

  const type = body.type;
  const buildingId = typeof body.buildingId === "string" ? body.buildingId : "";

  const monthlyDueAmount =
    body.monthlyDueAmount === null || body.monthlyDueAmount === undefined || body.monthlyDueAmount === ""
      ? null
      : Number(body.monthlyDueAmount);


  if (monthlyDueAmount !== null && (Number.isNaN(monthlyDueAmount) || monthlyDueAmount < 0)) {
    return NextResponse.json({ error: "Invalid monthlyDueAmount" }, { status: 400 });
  }

  if (!reference) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 });
  }

  if (!["APARTMENT", "GARAGE", "COMMERCIAL"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (type === "APARTMENT" && !buildingId) {
    return NextResponse.json({ error: "buildingId is required for APARTMENT" }, { status: 400 });
  }

const existingLot = await prisma.unit.findUnique({
  where: { lotNumber },
  select: { id: true },
});

if (existingLot) {
  return NextResponse.json({ error: "lotNumber already exists" }, { status: 409 });
}


  const created = await prisma.unit.create({
    data: {
      lotNumber,
      reference,
      type,
      ...(type === "APARTMENT" ? { buildingId } : {}),
      monthlyDueAmount: monthlyDueAmount === null ? null : Math.round(monthlyDueAmount),
    },
    include: { building: true },
  });

  return NextResponse.json(created);
}