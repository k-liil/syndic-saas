import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { syncOrganizationName } from "@/lib/organization";
import { getOrgIdFromRequest } from "@/lib/org-utils";

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

function getErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toDecimalString(
  value: unknown,
  fallback: unknown,
  options?: { nullable?: boolean }
): string | null {
  const nullable = options?.nullable === true;

  const normalize = (raw: unknown): string | null => {
    if (raw == null) return nullable ? null : "0";

    if (typeof raw === "number") {
      return Number.isFinite(raw) ? raw.toString() : null;
    }

    if (typeof raw === "string") {
      const v = raw.trim();
      if (!v) return nullable ? null : "0";
      const normalized = v.replace(",", ".");
      return Number.isFinite(Number(normalized)) ? normalized : null;
    }

    if (
      typeof raw === "object" &&
      raw !== null &&
      "toString" in raw &&
      typeof (raw as { toString: () => string }).toString === "function"
    ) {
      const s = (raw as { toString: () => string }).toString();
      const normalized = s.trim().replace(",", ".");
      return Number.isFinite(Number(normalized)) ? normalized : null;
    }

    return null;
  };

  const parsed = normalize(value);
  if (parsed !== null) return parsed;

  const fallbackParsed = normalize(fallback);
  if (fallbackParsed !== null) return fallbackParsed;

  return nullable ? null : "0";
}

export async function GET(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const s = await getSingleton(orgId);
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({
    ...s,
    organization,
  });
}

export async function PUT(req: Request) {
  try {
    const gate = await requireManager();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();

    const current = await getSingleton(orgId);

    const updateData: any = {

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
          toDecimalString(body.openingCashBalance, current.openingCashBalance) ?? "0",

        openingBankBalance:
          toDecimalString(body.openingBankBalance, current.openingBankBalance) ?? "0",
        
        contributionType:
          typeof body.contributionType === "string"
            ? body.contributionType
            : current.contributionType,

        globalFixedAmount:
          toDecimalString(body.globalFixedAmount, current.globalFixedAmount, {
            nullable: true,
          }),
    };

    const updated = await prisma.appSettings.update({
      where: { id: current.id },
      data: updateData,
    });

    if (typeof body.brandName === "string" && body.brandName.trim()) {
      await syncOrganizationName(orgId!, body.brandName.trim());
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({
      ...updated,
      organization,
    });
  } catch (e) {
    console.error("PUT /api/settings failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireManager();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();
    const current = await getSingleton(orgId);

    const data: any = {};
    if (body.brandName !== undefined) data.brandName = body.brandName;
    if (body.brandColor !== undefined) data.brandColor = body.brandColor;
    if (body.startYear !== undefined) data.startYear = body.startYear;
    if (body.startMonth !== undefined) data.startMonth = body.startMonth;
    if (body.receiptStartNumber !== undefined) data.receiptStartNumber = body.receiptStartNumber;
    if (body.receiptUsePrefix !== undefined) data.receiptUsePrefix = body.receiptUsePrefix;
    if (body.receiptPrefix !== undefined) data.receiptPrefix = body.receiptPrefix;
    if (body.paymentStartNumber !== undefined) data.paymentStartNumber = body.paymentStartNumber;
    if (body.paymentUsePrefix !== undefined) data.paymentUsePrefix = body.paymentUsePrefix;
    if (body.paymentPrefix !== undefined) data.paymentPrefix = body.paymentPrefix;
    if (body.openingCashBalance !== undefined) {
      data.openingCashBalance = toDecimalString(
        body.openingCashBalance,
        current.openingCashBalance
      );
    }
    if (body.openingBankBalance !== undefined) {
      data.openingBankBalance = toDecimalString(
        body.openingBankBalance,
        current.openingBankBalance
      );
    }
    if (body.contributionType !== undefined) data.contributionType = body.contributionType;
    if (body.globalFixedAmount !== undefined) {
      data.globalFixedAmount = toDecimalString(
        body.globalFixedAmount,
        current.globalFixedAmount,
        { nullable: true }
      );
    }

    const updated = await prisma.appSettings.update({
      where: { id: current.id },
      data,
    });

    if (data.brandName) {
      await syncOrganizationName(orgId!, data.brandName);
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/settings failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}
