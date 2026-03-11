import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

async function getSingleton() {
  const existing = await prisma.appSettings.findFirst();
  if (existing) return existing;
  return prisma.appSettings.create({ data: {} });
}

export async function GET() {
  const s = await getSingleton();
  return NextResponse.json(s);
}

export async function PUT(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await req.json();

    const current = await getSingleton();

    const updated = await prisma.appSettings.update({
      where: { id: current.id },
      data: {

        brandName:
          typeof body.brandName === "string" && body.brandName.trim()
            ? body.brandName.trim()
            : current.brandName,

        brandColor:
          typeof body.brandColor === "string" && body.brandColor.trim()
            ? body.brandColor.trim()
            : current.brandColor,

        startYear:
          Number.isInteger(body.startYear) ? Number(body.startYear) : current.startYear,

        startMonth:
          Number.isInteger(body.startMonth) ? Number(body.startMonth) : current.startMonth,

        receiptStartNumber:
          Number.isInteger(body.receiptStartNumber)
            ? Number(body.receiptStartNumber)
            : current.receiptStartNumber,

        receiptUsePrefix:
          typeof body.receiptUsePrefix === "boolean"
            ? body.receiptUsePrefix
            : current.receiptUsePrefix,

        receiptPrefix:
          typeof body.receiptPrefix === "string"
            ? body.receiptPrefix
            : current.receiptPrefix,

        paymentStartNumber:
          Number.isInteger(body.paymentStartNumber)
            ? Number(body.paymentStartNumber)
            : current.paymentStartNumber,

        paymentUsePrefix:
          typeof body.paymentUsePrefix === "boolean"
            ? body.paymentUsePrefix
            : current.paymentUsePrefix,

        paymentPrefix:
          typeof body.paymentPrefix === "string"
            ? body.paymentPrefix
            : current.paymentPrefix,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("PUT /api/settings failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}