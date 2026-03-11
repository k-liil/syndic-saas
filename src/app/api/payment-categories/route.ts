import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.paymentCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const body = await req.json();

  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "NAME_REQUIRED" },
      { status: 400 }
    );
  }

  const existing = await prisma.paymentCategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "CATEGORY_ALREADY_EXISTS" },
      { status: 400 }
    );
  }

  const category = await prisma.paymentCategory.create({
    data: {
      name,
    },
  });

  return NextResponse.json({ category });
}