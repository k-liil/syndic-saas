import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.fiscalYear.findMany({
      orderBy: [{ year: "desc" }],
      select: { id: true, year: true },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load fiscal years" },
      { status: 500 }
    );
  }
}