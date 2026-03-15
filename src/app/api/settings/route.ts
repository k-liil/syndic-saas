import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { getOrganizationForUser, syncOrganizationName } from "@/lib/organization";

async function getSingleton(organizationId: string) {
  const existing = await prisma.appSettings.findFirst({
    where: { organizationId },
  });
  if (existing) return existing;
  return prisma.appSettings.create({
    data: {
      organizationId,
    },
  });
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const s = await getSingleton(gate.organizationId);
  const organization = await getOrganizationForUser((gate.session.user as any)?.id);

  return NextResponse.json({
    ...s,
    organization,
  });
}

export async function PUT(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = await req.json();

    const current = await getSingleton(gate.organizationId);

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

        openingCashBalance:
          Number.isFinite(Number(body.openingCashBalance))
            ? Number(body.openingCashBalance)
            : current.openingCashBalance,

        openingBankBalance:
          Number.isFinite(Number(body.openingBankBalance))
            ? Number(body.openingBankBalance)
            : current.openingBankBalance,
      },
    });

    if (typeof body.brandName === "string" && body.brandName.trim()) {
      await syncOrganizationName(gate.organizationId, body.brandName.trim());
    }

    const organization = await getOrganizationForUser((gate.session.user as any)?.id);

    return NextResponse.json({
      ...updated,
      organization,
    });
  } catch (e: any) {
    console.error("PUT /api/settings failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
